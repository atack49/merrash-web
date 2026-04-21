import { buildChatbotReply, getWhatsappUrl, ChatHistoryItem } from '@/lib/chatbot/merrashChatbot';

export interface ProcessChatbotInput {
    message: string;
    conversationId: string;
    history?: ChatHistoryItem[];
    origin: string;
}

export interface ProcessChatbotOutput {
    reply: string;
    intent?: string;
    actions?: Array<{ id: string; label: string; value: string; userText: string }>;
    whatsappUrl?: string;
    appointmentCreated?: boolean;
    appointmentId?: string;
    error?: string;
}

import { generateGroqChatbotReply, generatePublicHostedChatbotReply, generateTeamReviewedChatbotReply } from '@/lib/chatbot/openaiChatbot';
import { getChatbotSettings } from '@/lib/chatbotSettings';
import { BookingData, decideBookingFlow } from '@/lib/chatbot/bookingAssistant';
import { getGoogleCalendarSettings } from '@/lib/calendarSettings';
import { sendAppointmentToGoogleCalendar } from '@/lib/calendarWebhook';
import { parsePreferredDate, parsePreferredTime, validateBusinessDay, validateBusinessSlot } from '@/lib/chatbot/businessSchedule';
import { getChatMemory, saveChatMemory } from '@/lib/chatbot/chatMemory';
import { getHolidayForDate } from '@/lib/holidayCalendar';
import { MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE, MAX_APPOINTMENTS_PER_HOUR_TOTAL } from '@/lib/appointments/capacityRules';
import { SERVICES } from '@/lib/data';
import { prisma } from '@/lib/db';

const DEFAULT_WHATSAPP_NUMBER = '527224958550';
const DEFAULT_CHATBOT_MODE = 'auto';
const ALLOWED_CHATBOT_MODES = ['auto', 'local', 'public', 'team', 'groq'];
const ALLOWED_AUTO_PROVIDERS = ['groq', 'team', 'public', 'local'] as const;
type AutoProvider = (typeof ALLOWED_AUTO_PROVIDERS)[number];

const parseAutoProviderOrder = (value?: string): AutoProvider[] => {
    const fallback: AutoProvider[] = ['groq', 'team', 'public', 'local'];
    if (!value) return fallback;

    const parsed = value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item): item is AutoProvider => ALLOWED_AUTO_PROVIDERS.includes(item as AutoProvider));

    if (parsed.length === 0) return fallback;
    return [...new Set(parsed)];
};

type ManageIntent = 'none' | 'cancel' | 'reschedule' | 'availability';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const DATE_REGEX = /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/;
const TIME_REGEX = /\b(\d{1,2}:\d{2})\b/;
const CONFIRM_BOOKING_TOKEN = '__CONFIRM_BOOKING__';
const EDIT_BOOKING_TOKEN = '__EDIT_BOOKING__';

const detectManageIntent = (text: string): ManageIntent => {
    const normalized = text.toLowerCase();

    if (/(cancel|cancelar|eliminar|borrar).*(cita)|\bcancelar\b|\beliminar\b/.test(normalized)) {
        return 'cancel';
    }

    if (/(reagendar|reprogramar|mover|cambiar).*(cita|fecha|hora)|\breagendar\b|\breprogramar\b/.test(normalized)) {
        return 'reschedule';
    }

    if (/(agend|agendarme|agendame|reserv|apartar|quiero una cita|quiero cita|programar cita|me anotas)/.test(normalized)) {
        return 'none';
    }

    if (/(disponibilidad|disponible|hay lugar|hay espacio|tienen espacio|hay horario|atienden|agenda).*(fecha|hora|domingo|lunes|martes|miercoles|jueves|viernes|sabado)|\bdisponibilidad\b/.test(normalized)) {
        return 'availability';
    }

    return 'none';
};

const extractEmail = (text: string): string | null => {
    const match = text.match(EMAIL_REGEX);
    return match?.[0]?.toLowerCase() ?? null;
};

const hasInvalidEmailCandidate = (text: string) => {
    const hasAtPattern = /\S+@\S*/.test(text);
    const hasValidEmail = EMAIL_REGEX.test(text);
    return hasAtPattern && !hasValidEmail;
};

const extractDate = (text: string): string | null => {
    const match = text.match(DATE_REGEX);
    return match?.[1] ?? null;
};

const extractTime = (text: string): string | null => {
    const match = text.match(TIME_REGEX);
    return match?.[1] ?? null;
};

const isConfirmMessage = (text: string) => {
    const normalized = text.toLowerCase();
    return (
        normalized.includes(CONFIRM_BOOKING_TOKEN.toLowerCase()) ||
        /(\bsi\b|\bsí\b|confirmo|confirmar|\bdale\b|\bva\b|\bok\b|de acuerdo|adelante)/.test(normalized)
    );
};

const isStrongConfirmMessage = (text: string) => {
    const normalized = text.toLowerCase();
    return normalized.includes(CONFIRM_BOOKING_TOKEN.toLowerCase()) || /(confirmo|confirmar|confirmación|confirmacion)/.test(normalized);
};

const isInfoInquiryMessage = (text: string) => {
    const normalized = text.toLowerCase();
    return /(horario|ubicación|ubicacion|dirección|direccion|servicios|tratamientos|precio|costo|información|informacion|recomienda|recomendación|recomendacion|recuerdame|recuérdame|recordame|cu[aá]l era|sirve|beneficio|beneficios|m[aá]s informaci[oó]n|mas informaci[oó]n|qu[eé] es|qu[eé] hace|para qu[eé])/.test(
        normalized
    );
};

const hasAnyBookingData = (data?: BookingData) => {
    return Boolean(data && Object.values(data).some(Boolean));
};

const isBookingInfoInterruption = (text: string) => {
    const normalized = text.toLowerCase();
    return /(recuerdame|recuérdame|recordame|cu[aá]l era|sirve para|para qu[eé]|qu[eé] es|qu[eé] hace|beneficios|beneficio|m[aá]s info|m[aá]s informaci[oó]n|mas informaci[oó]n|expl[ií]came|dime m[aá]s)/.test(
        normalized
    );
};

const isRecommendationRecallQuestion = (text: string) => {
    const normalized = text.toLowerCase();
    return /(cu[aá]l era|recuerdame|recuérdame|recordame|que me recomendaste|qu[eé] me recomendaste|me habias dicho|me hab[ií]as dicho)/.test(
        normalized
    );
};

const isOnlyPunctuationMessage = (text: string) => {
    return /^[\s¡!¿?.,;:]+$/.test(text);
};

const isSimpleGreetingMessage = (text: string) => {
    const normalized = text
        .toLowerCase()
        .trim()
        .replace(/[¡!¿?.,]/g, '');

    if (!normalized) return false;

    const hasGreetingWord = /\b(hola|buenas|buen dia|buen día|buenas tardes|buenas noches|hey|que tal|qué tal)\b/.test(normalized);
    const hasBookingSignal = /(agend|cita|reserv|disponibilidad|fecha|hora|servicio|precio|correo|telefono|teléfono)/.test(normalized);

    return hasGreetingWord && !hasBookingSignal && normalized.length <= 40;
};

const isEditMessage = (text: string) => {
    const normalized = text.toLowerCase();
    return normalized.includes(EDIT_BOOKING_TOKEN.toLowerCase()) || /(editar|corregir|cambiar datos|modificar datos)/.test(normalized);
};

const getSingleFieldPrompt = (field: string, withIntro = false) => {
    const intro = withIntro ? 'Listo, te ayudo a agendar rápido ' : '';

    const promptByField: Record<string, string> = {
        nombre: '¿Con qué nombre registramos la cita?',
        email: '¿Qué correo usamos para tu cita?',
        'teléfono': '¿Me compartes tu número de teléfono?',
        servicio: '¿Qué servicio deseas reservar?',
        fecha: '¿Qué fecha te acomoda? Puedes elegirla en el calendario ',
        hora: '¿Qué horario prefieres? Te muestro opciones disponibles ',
    };

    const question = promptByField[field] || 'Compárteme ese dato para continuar.';
    return intro ? `${intro}\n\n${question}` : question;
};

const formatMissingFieldsPrompt = (missingFields: string[]) => {
    if (missingFields.length === 0) {
        return 'Ya casi terminamos con tu cita. ¿Qué te gustaría ajustar?';
    }

    if (missingFields.length === 1) {
        return `Para cerrar tu cita solo me falta este dato: ${missingFields[0]}.`;
    }

    return `Para agendarte solo me faltan estos datos: ${missingFields.join(', ')}.`;
};

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const CHATBOT_HISTORY_LIMIT = Number(process.env.CHATBOT_HISTORY_LIMIT || '120');
const CHATBOT_SERVICE_CACHE_TTL_MS = Number(process.env.CHATBOT_SERVICE_CACHE_TTL_MS || '60000');

type ChatbotService = { title: string; category: string | null; description: string | null };
type ChatbotBaseDataCache = {
    fetchedAt: number;
    services: ChatbotService[];
};

let chatbotBaseDataCache: ChatbotBaseDataCache | null = null;

const normalizeText = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const findMentionedServices = (text: string, services: string[]) => {
    const normalizedText = normalizeText(text);
    return services.filter((service) => normalizedText.includes(normalizeText(service)));
};

const getLatestBotSuggestedServices = (history: ChatHistoryItem[], services: string[]) => {
    const recentBotMessages = [...history].reverse().filter((item) => item.role === 'bot').slice(0, 6);

    for (const item of recentBotMessages) {
        const found = findMentionedServices(item.text, services);
        if (found.length > 0) {
            return found;
        }
    }

    return [] as string[];
};

const getLatestUserMentionedService = (history: ChatHistoryItem[], services: string[]) => {
    const recentUserMessages = [...history].reverse().filter((item) => item.role === 'user').slice(0, 10);

    for (const item of recentUserMessages) {
        const found = findMentionedServices(item.text, services);
        if (found.length === 1) {
            return found[0];
        }
    }

    return undefined;
};

const formatServiceList = (services: string[]) => {
    if (services.length === 0) return '';
    if (services.length === 1) return services[0];
    if (services.length === 2) return `${services[0]} y ${services[1]}`;
    return `${services[0]}, ${services[1]} y ${services[2]}`;
};

const isIndirectServiceReference = (text: string) => {
    const normalized = normalizeText(text);
    return /(el que me (recomend|ayuda|dijiste|indicaste|suger)|el (recomendado|sugerido|primero|de cuerpo|de mente|de espiritu)|ese (mismo|servicio|tratamiento)?|agendame ese|el de (cuerpo|mente|espiritu|piel|dolor|estres|ansiedad)|el que (sirve|ayuda)|el mencionado)/.test(
        normalized
    );
};

const resolveIndirectService = (
    message: string,
    history: ChatHistoryItem[],
    serviceTitles: string[],
    serviceCatalog: Array<{ title: string; category?: string | null }>
): string | undefined => {
    const candidates = getLatestBotSuggestedServices(history, serviceTitles);
    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0];

    const normalizedMsg = normalizeText(message);
    const hasCuerpoHint = /(cuerpo|fisico|muscular|dolor|corporal|masaje|rehabilit|intravenosa|facial|acupuntura)/.test(normalizedMsg);
    const hasMenteHint = /(mente|mental|estres|emocional|ansiedad|insomnio|reiki|healy|cuantico|integral)/.test(normalizedMsg);
    const hasEspirituHint = /(espiritu|espiritual|energia|tarot|arborolog|constelac)/.test(normalizedMsg);

    if (hasCuerpoHint || hasMenteHint || hasEspirituHint) {
        const hintCategory = hasCuerpoHint ? 'cuerpo' : hasMenteHint ? 'mente' : 'espiritu';
        const match = candidates.find((candidate) => {
            const svc = serviceCatalog.find((s) => normalizeText(s.title) === normalizeText(candidate));
            return svc?.category && normalizeText(svc.category).includes(hintCategory);
        });
        if (match) return match;
    }

    return candidates[0];
};

const detectServiceFromMessage = (messageText: string, services: string[]) => {
    const normalizedMessage = normalizeText(messageText);
    return services.find((service) => normalizedMessage.includes(normalizeText(service)));
};

const detectRequestedEditField = (text: string): 'fecha' | 'hora' | 'servicio' | 'email' | 'teléfono' | 'nombre' | null => {
    const normalized = normalizeText(text).trim();
    if (!normalized) return null;

    if (/^(fecha|dia|calendario)$/.test(normalized)) return 'fecha';
    if (/^(hora|horario)$/.test(normalized)) return 'hora';
    if (/^(servicio|tratamiento)$/.test(normalized)) return 'servicio';
    if (/^(email|correo|correo electronico)$/.test(normalized)) return 'email';
    if (/^(telefono|numero|cel|celular|movil)$/.test(normalized)) return 'teléfono';
    if (/^(nombre|cliente)$/.test(normalized)) return 'nombre';

    return null;
};

const toIsoDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const normalizeDateInput = (value?: string) => {
    if (!value) return null;
    const parsed = parsePreferredDate(value);
    if (!parsed) return null;
    return toIsoDate(parsed);
};

const normalizeTimeInput = (value?: string) => {
    if (!value) return null;
    const parsed = parsePreferredTime(value);
    if (parsed === null) return null;
    const hours = String(Math.floor(parsed / 60)).padStart(2, '0');
    const minutes = String(parsed % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const STATIC_SERVICE_CATALOG: ChatbotService[] = SERVICES
    .filter((service) => service.active)
    .map((service) => ({
        title: service.title,
        category: service.category || null,
        description: service.description || null,
    }));

const normalizeServicesPayload = (payload: unknown): ChatbotService[] => {
    if (!Array.isArray(payload)) return [];

    return payload
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
            const row = item as Record<string, unknown>;
            return {
                title: String(row.title || '').trim(),
                category: String(row.category || '').trim() || null,
                description: String(row.description || '').trim() || null,
            };
        })
        .filter((service) => service.title.length > 0);
};

const fetchServicesFromWebsite = async (origin: string) => {
    const response = await fetch(`${origin}/api/services`, {
        cache: 'no-store',
        headers: {
            'x-chatbot-source': 'internal',
        },
    });

    if (!response.ok) {
        return [] as ChatbotService[];
    }

    const payload = await response.json();
    return normalizeServicesPayload(payload);
};

const getCachedChatbotBaseData = async (origin: string) => {
    const now = Date.now();
    if (chatbotBaseDataCache && now - chatbotBaseDataCache.fetchedAt < CHATBOT_SERVICE_CACHE_TTL_MS) {
        return chatbotBaseDataCache;
    }

    let services = STATIC_SERVICE_CATALOG;
    try {
        const websiteServices = await fetchServicesFromWebsite(origin);
        if (websiteServices.length > 0) {
            services = websiteServices;
        }
    } catch {
        services = STATIC_SERVICE_CATALOG;
    }

    chatbotBaseDataCache = {
        fetchedAt: now,
        services,
    };

    return chatbotBaseDataCache;
};

const getSlotTemplateForDate = (isoDate: string) => {
    const dayValidation = validateBusinessDay(isoDate);
    if (!dayValidation.ok) return [] as string[];
    const daySchedule = dayValidation.daySchedule;
    if (!daySchedule) return [] as string[];

    const slots: string[] = [];
    for (let minute = daySchedule.open; minute + 60 <= daySchedule.close; minute += 60) {
        const hh = String(Math.floor(minute / 60)).padStart(2, '0');
        const mm = String(minute % 60).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
    }

    return slots;
};

const getAvailableTimeSlots = async (dateInput?: string, service?: string) => {
    const isoDate = normalizeDateInput(dateInput);
    if (!isoDate) return { isoDate: null, slots: [] as string[] };

    const holiday = await getHolidayForDate(isoDate);
    if (holiday) return { isoDate, slots: [] as string[] };

    const template = getSlotTemplateForDate(isoDate);
    if (template.length === 0) return { isoDate, slots: [] as string[] };

    const appointments = await prisma.appointment.findMany({
        where: {
            preferredDate: isoDate,
            status: { in: ['pending', 'confirmed'] },
        },
        select: { preferredTime: true, service: true },
    });

    const totalCountBySlot = new Map<string, number>();
    const serviceCountBySlot = new Map<string, number>();
    const normalizedService = service ? normalizeText(service) : '';

    for (const appointment of appointments) {
        const slot = normalizeTimeInput(appointment.preferredTime || undefined) || appointment.preferredTime;
        if (!slot) continue;

        totalCountBySlot.set(slot, (totalCountBySlot.get(slot) || 0) + 1);

        if (normalizedService && appointment.service && normalizeText(appointment.service) === normalizedService) {
            serviceCountBySlot.set(slot, (serviceCountBySlot.get(slot) || 0) + 1);
        }
    }

    const available = template.filter((slot) => {
        const totalCount = totalCountBySlot.get(slot) || 0;
        const perServiceCount = serviceCountBySlot.get(slot) || 0;

        const totalAvailable = totalCount < MAX_APPOINTMENTS_PER_HOUR_TOTAL;
        const serviceAvailable = !normalizedService || perServiceCount < MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE;

        return totalAvailable && serviceAvailable;
    });

    return { isoDate, slots: available };
};

const getOccupiedCountByDateSlot = async (isoDates: string[]) => {
    if (isoDates.length === 0) {
        return new Map<string, Map<string, { total: number; byService: Map<string, number> }>>();
    }

    const appointments = await prisma.appointment.findMany({
        where: {
            preferredDate: { in: isoDates },
            status: { in: ['pending', 'confirmed'] },
        },
        select: { preferredDate: true, preferredTime: true, service: true },
    });

    const occupiedByDate = new Map<string, Map<string, { total: number; byService: Map<string, number> }>>();
    for (const appointment of appointments) {
        if (!appointment.preferredDate) continue;

        const slot = normalizeTimeInput(appointment.preferredTime || undefined) || appointment.preferredTime;
        if (!slot) continue;

        const slots = occupiedByDate.get(appointment.preferredDate) || new Map<string, { total: number; byService: Map<string, number> }>();
        const current = slots.get(slot) || { total: 0, byService: new Map<string, number>() };
        current.total += 1;

        if (appointment.service) {
            const serviceKey = normalizeText(appointment.service);
            current.byService.set(serviceKey, (current.byService.get(serviceKey) || 0) + 1);
        }

        slots.set(slot, current);
        occupiedByDate.set(appointment.preferredDate, slots);
    }

    return occupiedByDate;
};

const formatIsoShortLabel = (isoDate: string) => {
    const parsed = parsePreferredDate(isoDate);
    if (!parsed) return isoDate;
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mon = MONTH_SHORT[parsed.getMonth()] || String(parsed.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mon}`;
};

const buildDateSuggestions = async (service?: string) => {
    const actions: Array<{ id: string; label: string; value: string; userText: string }> = [];
    const fullDays: string[] = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    const candidateDays: Array<{ iso: string; label: string }> = [];

    let scanned = 0;
    while (candidateDays.length < 12 && scanned < 30) {
        scanned += 1;
        cursor.setDate(cursor.getDate() + 1);
        const day = cursor.getDay();
        if (day === 0) continue;

        const iso = toIsoDate(cursor);
        const holiday = await getHolidayForDate(iso);
        if (holiday) continue;

        const label = formatIsoShortLabel(iso);
        candidateDays.push({ iso, label });
    }

    const occupiedByDate = await getOccupiedCountByDateSlot(candidateDays.map((item) => item.iso));
    const normalizedService = service ? normalizeText(service) : '';

    for (const day of candidateDays) {
        const template = getSlotTemplateForDate(day.iso);
        const occupiedSlots = occupiedByDate.get(day.iso) || new Map<string, { total: number; byService: Map<string, number> }>();
        const availableSlots = template.filter((slot) => {
            const usage = occupiedSlots.get(slot);
            const total = usage?.total || 0;
            const perService = normalizedService ? usage?.byService.get(normalizedService) || 0 : 0;

            const totalAvailable = total < MAX_APPOINTMENTS_PER_HOUR_TOTAL;
            const serviceAvailable = !normalizedService || perService < MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE;
            return totalAvailable && serviceAvailable;
        });

        if (availableSlots.length === 0) {
            fullDays.push(day.label);
            continue;
        }

        actions.push({
            id: `date-${day.iso}`,
            label: day.label,
            value: day.iso,
            userText: ` ${day.label}`,
        });

        if (actions.length >= 6) {
            break;
        }
    }

    return { actions, fullDays: fullDays.slice(0, 4) };
};

const buildTimeActionsByService = async (dateInput?: string, service?: string) => {
    const available = await getAvailableTimeSlots(dateInput, service);
    return available.slots.map((slot) => ({
        id: `time-${slot}`,
        label: slot,
        value: slot,
        userText: ` ${slot}`,
    }));
};

const buildServiceActions = (services: Array<{ title: string }>) => {
    return services.map((service, index) => ({
        id: `service-${index}`,
        label: service.title,
        value: service.title,
        userText: ` ${service.title}`,
    }));
};

const countServiceAppointmentsForSlot = async (isoDate?: string | null, time?: string | null, service?: string, excludeId?: string) => {
    if (!isoDate || !time || !service) return 0;

    return prisma.appointment.count({
        where: {
            ...(excludeId ? { id: { not: excludeId } } : {}),
            preferredDate: isoDate,
            preferredTime: time,
            service,
            status: { in: ['pending', 'confirmed'] },
        },
    });
};

const countTotalAppointmentsForSlot = async (isoDate?: string | null, time?: string | null, excludeId?: string) => {
    if (!isoDate || !time) return 0;

    return prisma.appointment.count({
        where: {
            ...(excludeId ? { id: { not: excludeId } } : {}),
            preferredDate: isoDate,
            preferredTime: time,
            status: { in: ['pending', 'confirmed'] },
        },
    });
};

const mergeBookingData = (base?: BookingData, incoming?: BookingData): BookingData | undefined => {
        const sanitizeEmail = (value?: string) => {
            if (!value) return undefined;
            const email = value.trim().toLowerCase();
            const basic = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (!basic.test(email)) return undefined;
            if (email.includes('..')) return undefined;

            const [localPart, domainPart] = email.split('@');
            if (!localPart || !domainPart) return undefined;
            if (localPart.startsWith('.') || localPart.endsWith('.')) return undefined;
            if (domainPart.startsWith('.') || domainPart.endsWith('.')) return undefined;

            return email;
        };

    const sanitizeName = (value?: string) => {
        if (!value) return undefined;
        const cleaned = value
            .replace(/(?:mi nombre es|me llamo|soy)\s*/gi, '')
            .replace(/[,:;.!?]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleaned) return undefined;

        const tokens = cleaned
            .split(' ')
            .filter(Boolean)
            .filter((token) => /^[a-záéíóúñ]{2,30}$/i.test(token));

        if (tokens.length === 0) return undefined;
        return tokens.slice(0, 2).join(' ');
    };

    const pickBestName = () => {
        const incomingName = sanitizeName(incoming?.name);
        const baseName = sanitizeName(base?.name);

        if (incomingName && incoming?.service && normalizeText(incomingName) === normalizeText(incoming.service)) {
            return baseName;
        }

        if (incomingName && incomingName.length >= 2) return incomingName;
        return baseName;
    };

    const merged: BookingData = {
        name: pickBestName(),
        email: sanitizeEmail(incoming?.email) || sanitizeEmail(base?.email),
        phone: incoming?.phone || base?.phone,
        preferredDate: incoming?.preferredDate || base?.preferredDate,
        preferredTime: incoming?.preferredTime || base?.preferredTime,
        service: incoming?.service || base?.service,
    };

    const hasAny = Object.values(merged).some(Boolean);
    return hasAny ? merged : undefined;
};

const hasCompleteBookingData = (data?: BookingData) => {
    return Boolean(data?.name && data?.email && data?.phone && data?.preferredDate && data?.preferredTime && data?.service);
};

const getBookingMissingFields = (data?: BookingData) => {
    if (!data) {
        return ['nombre', 'email', 'teléfono', 'servicio', 'fecha', 'hora'];
    }

    return [
        !data.name ? 'nombre' : null,
        !data.email ? 'email' : null,
        !data.phone ? 'teléfono' : null,
        !data.service ? 'servicio' : null,
        !data.preferredDate ? 'fecha' : null,
        !data.preferredTime ? 'hora' : null,
    ].filter(Boolean) as string[];
};

const APPOINTMENT_BASE_SELECT = {
    id: true,
    email: true,
    phone: true,
    preferredDate: true,
    preferredTime: true,
    service: true,
    notes: true,
    status: true,
    createdAt: true,
    updatedAt: true,
};

const getConfirmationErrorMessage = (error: unknown) => {
    const raw =
        typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: string }).message || '')
            : String(error || '');
    const normalized = raw.toLowerCase();

    if (
        normalized.includes('customername') ||
        normalized.includes('googleeventid') ||
        normalized.includes('column') ||
        normalized.includes('does not exist')
    ) {
        return 'No pude confirmar la cita porque falta sincronizar la base de datos del chatbot. Ejecuta npx prisma db push y vuelve a intentar.';
    }

    return 'No pude confirmar tu cita automáticamente en este momento. Ya guardé tu solicitud y te ayudo a terminarla por WhatsApp ahora mismo ';
};

const normalizeDateForStorage = (value?: string) => {
    const normalized = normalizeDateInput(value);
    return normalized || value;
};

const normalizeTimeForStorage = (value?: string) => {
    const normalized = normalizeTimeInput(value);
    return normalized || value;
};

export async function processChatbotMessage(input: ProcessChatbotInput): Promise<ProcessChatbotOutput> {
    try {
        const message = String(input.message ?? '').trim();
        const conversationId = String(input.conversationId ?? '').trim();
        const requestHistory = Array.isArray(input.history)
            ? (input.history as ChatHistoryItem[])
                  .filter((item) => item && (item.role === 'user' || item.role === 'bot') && typeof item.text === 'string')
                .slice(-CHATBOT_HISTORY_LIMIT)
            : [];

        if (!message) {
            return { reply: 'Mensaje vacío', error: 'Mensaje vacío' };
        }

        const memory = conversationId ? await getChatMemory(conversationId) : null;
        const baseHistory = requestHistory.length > 0 ? requestHistory : memory?.history || [];
        const history = [...baseHistory];

        if (history.length === 0 || history[history.length - 1]?.role !== 'user' || history[history.length - 1]?.text !== message) {
            history.push({ role: 'user', text: message });
        }

        const rememberAndRespond = async (
            payload: ProcessChatbotOutput,
            options?: { bookingDraft?: BookingData; pendingConfirmation?: boolean }
        ) => {
            if (conversationId) {
                const nextHistory: ChatHistoryItem[] = [...history, { role: 'bot', text: String(payload.reply || '') }];
                await saveChatMemory(conversationId, {
                    history: nextHistory.slice(-CHATBOT_HISTORY_LIMIT),
                    bookingDraft: options?.bookingDraft,
                    pendingConfirmation: options?.pendingConfirmation,
                });
            }

            return payload as ProcessChatbotOutput;
        };

        const { services } = await getCachedChatbotBaseData(input.origin);
        const fileSettings = await getChatbotSettings();
        const googleSettings = await getGoogleCalendarSettings();
        const serviceTitles = services.map((service) => service.title);
        const whatsappNumber = process.env.WHATSAPP_CHATBOT_NUMBER || DEFAULT_WHATSAPP_NUMBER;
        const localResult = buildChatbotReply(message, history, { services: serviceTitles, serviceCatalog: services });
        const configuredMode = (fileSettings?.mode || process.env.CHATBOT_MODE || DEFAULT_CHATBOT_MODE).toLowerCase();
        const chatbotMode = ALLOWED_CHATBOT_MODES.includes(configuredMode) ? configuredMode : DEFAULT_CHATBOT_MODE;

        const getSmartReply = async (messageText: string, historyItems: ChatHistoryItem[]) => {
            const local = buildChatbotReply(messageText, historyItems, { services: serviceTitles, serviceCatalog: services });
            const userTurns = historyItems.filter((item) => item.role === 'user').length;
            const isGreetingTurn = isSimpleGreetingMessage(messageText) && userTurns <= 2;

            if (isGreetingTurn || local.isOffTopic || chatbotMode === 'local') {
                return local.reply;
            }

            const aiInput = {
                message: messageText,
                history: historyItems,
                services: services.map((service) => service.title),
                serviceCatalog: services,
            };

            const runProvider = async (provider: AutoProvider): Promise<string | null> => {
                if (provider === 'groq') {
                    return generateGroqChatbotReply(aiInput);
                }
                if (provider === 'team') {
                    return generateTeamReviewedChatbotReply(aiInput);
                }
                if (provider === 'public') {
                    return generatePublicHostedChatbotReply(aiInput);
                }
                return null;
            };

            let modelReply: string | null = null;

            if (chatbotMode === 'team') {
                modelReply = await generateTeamReviewedChatbotReply(aiInput);
                if (!modelReply) {
                    modelReply = await generatePublicHostedChatbotReply(aiInput);
                }
                if (!modelReply) {
                    modelReply = await generateGroqChatbotReply(aiInput);
                }
            } else if (chatbotMode === 'groq') {
                modelReply = await generateGroqChatbotReply(aiInput);
            } else if (chatbotMode === 'public') {
                modelReply = await generatePublicHostedChatbotReply(aiInput);
            } else if (chatbotMode === 'auto') {
                const providerOrder = parseAutoProviderOrder(process.env.CHATBOT_AUTO_PROVIDER_ORDER);
                for (const provider of providerOrder) {
                    if (provider === 'local') {
                        break;
                    }
                    modelReply = await runProvider(provider);
                    if (modelReply) {
                        break;
                    }
                }
            }

            return modelReply || local.reply;
        };

        const manageIntent = detectManageIntent(message);
        if (manageIntent !== 'none') {
            const email = extractEmail(message);
            const date = extractDate(message);
            const time = extractTime(message);

            if (manageIntent === 'availability') {
                const requestedService = detectServiceFromMessage(message, serviceTitles);
                const normalizedDate = date ? normalizeDateForStorage(date) : date;
                const normalizedTime = time ? normalizeTimeForStorage(time) : time;

                if (normalizedDate) {
                    const holiday = await getHolidayForDate(normalizedDate);
                    if (holiday) {
                        return rememberAndRespond({
                            reply: `Ese día es festivo (${holiday.name}) y no lo estamos tomando para agenda automática. ¿Te propongo otro día?`,
                            intent: 'CONSULTAR_DISPONIBILIDAD',
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                        });
                    }
                }

                if (!date && !time) {
                    const dateSuggestions = await buildDateSuggestions(requestedService);
                    const fullDaysNote =
                        dateSuggestions.fullDays.length > 0
                            ? `\n\nDías llenos recientes: ${dateSuggestions.fullDays.join(', ')}.`
                            : '';
                    return rememberAndRespond({
                        reply: `Claro ✅ Te puedo mostrar horarios disponibles. Elige una fecha sugerida o escríbela (ejemplo 22/04).${fullDaysNote}`,
                        intent: 'CONSULTAR_DISPONIBILIDAD',
                        actions: dateSuggestions.actions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                    });
                }

                if (date && time) {
                    const slotValidation = validateBusinessSlot(date, time);
                    if (!slotValidation.ok) {
                        return rememberAndRespond({
                            reply: `${slotValidation.message} Si quieres, te doy opciones disponibles.`,
                            intent: 'CONSULTAR_DISPONIBILIDAD',
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                        });
                    }
                } else if (date) {
                    const dayValidation = validateBusinessDay(date);
                    if (!dayValidation.ok) {
                        return rememberAndRespond({
                            reply: dayValidation.message || 'Lo siento, esa fecha no es válida para agendar.',
                            intent: 'CONSULTAR_DISPONIBILIDAD',
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                        });
                    }
                }

                if (normalizedDate && !normalizedTime) {
                    const dayAvailability = await getAvailableTimeSlots(normalizedDate, requestedService);

                    if (dayAvailability.slots.length === 0) {
                        const dateSuggestions = await buildDateSuggestions(requestedService);
                        const extra =
                            dateSuggestions.fullDays.length > 0
                                ? `\n\nDías llenos recientes: ${dateSuggestions.fullDays.join(', ')}.`
                                : '';
                        return rememberAndRespond({
                            reply: `Ese día ya está lleno y no tiene horarios disponibles 😕. Elige otra fecha de la lista.${extra}`,
                            intent: 'CONSULTAR_DISPONIBILIDAD',
                            actions: dateSuggestions.actions,
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                        });
                    }

                    const timeActions = dayAvailability.slots.slice(0, 10).map((slot) => ({
                        id: `time-${slot}`,
                        label: slot,
                        value: slot,
                        userText: `🕒 ${slot}`,
                    }));
                    const preview = dayAvailability.slots.slice(0, 6).join(', ');

                    return rememberAndRespond({
                        reply: `Para ${normalizedDate}, estos horarios están disponibles ✅\n${preview}`,
                        intent: 'CONSULTAR_DISPONIBILIDAD',
                        actions: timeActions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                    });
                }

                if (!requestedService) {
                    const totalLoad = await countTotalAppointmentsForSlot(normalizedDate, normalizedTime);
                    if (totalLoad >= MAX_APPOINTMENTS_PER_HOUR_TOTAL) {
                        return rememberAndRespond({
                            reply: `Perdón 🙏 ese horario (${normalizedDate || date} ${normalizedTime || time || ''}) ya está lleno. ¿Me compartes otra hora y te ayudo enseguida?`,
                            intent: 'CONSULTAR_DISPONIBILIDAD',
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                        });
                    }

                    return rememberAndRespond({
                        reply: `Sí, ese horario se ve disponible ✅ (${normalizedDate || date} ${normalizedTime || time || ''}). Si me dices el servicio, te confirmo cupo exacto.`,
                        intent: 'CONSULTAR_DISPONIBILIDAD',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                    });
                }

                const [totalLoad, serviceLoad] = await Promise.all([
                    countTotalAppointmentsForSlot(normalizedDate, normalizedTime),
                    countServiceAppointmentsForSlot(normalizedDate, normalizedTime, requestedService),
                ]);

                if (totalLoad >= MAX_APPOINTMENTS_PER_HOUR_TOTAL) {
                    const alternatives = normalizedDate ? await buildTimeActionsByService(normalizedDate, requestedService) : [];
                    if (alternatives.length > 0) {
                        return rememberAndRespond({
                            reply: `Perdón 🙏 ese horario ya está lleno. En ${normalizedDate} todavía tengo estos horarios: ${alternatives
                                .slice(0, 6)
                                .map((item) => item.value)
                                .join(', ')}`,
                            intent: 'CONSULTAR_DISPONIBILIDAD',
                            actions: alternatives,
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                        });
                    }

                    const dateSuggestions = await buildDateSuggestions(requestedService);
                    return rememberAndRespond({
                        reply: `Perdón 🙏 ese horario ya está lleno. Te propongo otras fechas disponibles 👇`,
                        intent: 'CONSULTAR_DISPONIBILIDAD',
                        actions: dateSuggestions.actions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                    });
                }

                if (serviceLoad < MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE) {
                    return rememberAndRespond({
                        reply: `Sí, ese horario se ve disponible para ${requestedService} ✅ (${normalizedDate || date} ${normalizedTime || time || ''})`,
                        intent: 'CONSULTAR_DISPONIBILIDAD',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                    });
                }

                const alternatives = normalizedDate ? await buildTimeActionsByService(normalizedDate, requestedService) : [];
                if (alternatives.length > 0) {
                    return rememberAndRespond({
                        reply: `Perdón 🙏 para ${requestedService}, ese horario ya está lleno. En ${normalizedDate} todavía tengo estos espacios: ${alternatives
                            .slice(0, 6)
                            .map((item) => item.value)
                            .join(', ')}`,
                        intent: 'CONSULTAR_DISPONIBILIDAD',
                        actions: alternatives,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                    });
                }

                const dateSuggestions = await buildDateSuggestions(requestedService);
                return rememberAndRespond({
                    reply: `Perdón 🙏 para ${requestedService}, ese horario ya está lleno. Te propongo otras fechas disponibles 👇`,
                    intent: 'CONSULTAR_DISPONIBILIDAD',
                    actions: dateSuggestions.actions,
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                });
            }

            if (!email) {
                return rememberAndRespond({
                    reply: 'Para ayudarte con esa gestión necesito tu correo de la cita ✉️ (ejemplo: nombre@correo.com).',
                    intent: manageIntent === 'cancel' ? 'CANCELAR_CITA' : 'REAGENDAR_CITA',
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero gestionar mi cita.\n\nMensaje: ${message}`),
                });
            }

            const appointment = await prisma.appointment.findFirst({
                where: {
                    email,
                    status: { in: ['pending', 'confirmed'] },
                    ...(date ? { preferredDate: date } : {}),
                    ...(time ? { preferredTime: time } : {}),
                },
                orderBy: { createdAt: 'desc' },
                select: APPOINTMENT_BASE_SELECT,
            });

            if (!appointment) {
                return rememberAndRespond({
                    reply: 'No encontré una cita activa con esos datos. Envíame el correo correcto y, si puedes, fecha y hora actuales para ubicarla rápido.',
                    intent: manageIntent === 'cancel' ? 'CANCELAR_CITA' : 'REAGENDAR_CITA',
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero gestionar mi cita.\n\nMensaje: ${message}`),
                });
            }

            if (manageIntent === 'cancel') {
                await prisma.appointment.update({
                    where: { id: appointment.id },
                    data: { status: 'cancelled' },
                });

                return rememberAndRespond({
                    reply: `Listo, tu cita quedó cancelada ✅\n\nServicio: ${appointment.service || 'Sin especificar'}\nFecha: ${appointment.preferredDate || 'Sin fecha'}\nHora: ${appointment.preferredTime || 'Sin hora'}`,
                    intent: 'CANCELAR_CITA',
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, cancelé mi cita ${appointment.id} y quiero confirmar.`),
                });
            }

            const newDate = date;
            const newTime = time;
            const normalizedNewDate = newDate ? normalizeDateForStorage(newDate) : newDate;
            const normalizedNewTime = newTime ? normalizeTimeForStorage(newTime) : newTime;

            if (normalizedNewDate) {
                const holiday = await getHolidayForDate(normalizedNewDate);
                if (holiday) {
                    return rememberAndRespond({
                        reply: `Ese día es festivo (${holiday.name}). Dame otra fecha y hora para reagendar.`,
                        intent: 'REAGENDAR_CITA',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero reagendar mi cita.\n\nMensaje: ${message}`),
                    });
                }
            }

            if (!newDate || !newTime) {
                return rememberAndRespond({
                    reply: 'Para reagendar necesito la nueva fecha y hora (ejemplo: “quiero cambiar mi cita al 25/04 a las 16:00 usando correo nombre@correo.com”).',
                    intent: 'REAGENDAR_CITA',
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero reagendar mi cita.\n\nMensaje: ${message}`),
                });
            }

            const rescheduleSlotValidation = validateBusinessSlot(newDate, newTime);
            if (!rescheduleSlotValidation.ok) {
                return rememberAndRespond({
                    reply: `${rescheduleSlotValidation.message} Dime otra fecha/hora y la actualizo.`,
                    intent: 'REAGENDAR_CITA',
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero reagendar mi cita.\n\nMensaje: ${message}`),
                });
            }

            const conflictCount = await countServiceAppointmentsForSlot(
                normalizedNewDate,
                normalizedNewTime,
                appointment.service || undefined,
                appointment.id
            );

            const totalConflictCount = await countTotalAppointmentsForSlot(
                normalizedNewDate,
                normalizedNewTime,
                appointment.id
            );

            if (totalConflictCount >= MAX_APPOINTMENTS_PER_HOUR_TOTAL) {
                return rememberAndRespond({
                    reply: `Perdón 🙏 ese horario (${newDate} ${newTime}) ya está lleno. Dime otra fecha u hora y la actualizo.`,
                    intent: 'REAGENDAR_CITA',
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero reagendar mi cita y ese horario estaba ocupado.`),
                });
            }

            if (conflictCount >= MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE) {
                return rememberAndRespond({
                    reply: `Perdón 🙏 para ${appointment.service || 'ese servicio'} ese horario ya está lleno. Dime otra fecha u hora y la actualizo.`,
                    intent: 'REAGENDAR_CITA',
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero reagendar mi cita y ese horario estaba ocupado.`),
                });
            }

            const updated = await prisma.appointment.update({
                where: { id: appointment.id },
                data: {
                    preferredDate: normalizedNewDate,
                    preferredTime: normalizedNewTime,
                    status: 'pending',
                },
                select: APPOINTMENT_BASE_SELECT,
            });

            return rememberAndRespond({
                reply: `Perfecto, tu cita fue reagendada ✅\n\nNueva fecha: ${newDate}\nNueva hora: ${newTime}`,
                intent: 'REAGENDAR_CITA',
                whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, reagendé mi cita ${updated.id} al ${newDate} ${newTime}.`),
            });
        }

        if (memory?.pendingConfirmation && isConfirmMessage(message) && hasCompleteBookingData(memory.bookingDraft)) {
            const data = memory.bookingDraft!;
            const normalizedDate = normalizeDateForStorage(data.preferredDate);
            const normalizedTime = normalizeTimeForStorage(data.preferredTime);
            try {
                if (normalizedDate) {
                    const holiday = await getHolidayForDate(normalizedDate);
                    if (holiday) {
                        return rememberAndRespond(
                            {
                                reply: `Ese día es festivo (${holiday.name}) y no puedo confirmar esa cita automática. Compárteme otra fecha/hora.`,
                                intent: 'AGENDAR',
                                whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero continuar por WhatsApp para agendar.\n\nMensaje: ${message}`),
                                appointmentCreated: false,
                            },
                            { bookingDraft: data, pendingConfirmation: false }
                        );
                    }
                }

                const slotValidation = validateBusinessSlot(data.preferredDate!, data.preferredTime!);
                if (!slotValidation.ok) {
                    const whatsappMessage = `Hola, quiero continuar por WhatsApp para agendar.\n\nMensaje: ${message}`;
                    return rememberAndRespond(
                        {
                            reply: `${slotValidation.message} Compárteme otra opción y te la registro de inmediato.`,
                            intent: 'AGENDAR',
                            whatsappUrl: getWhatsappUrl(whatsappNumber, whatsappMessage),
                            appointmentCreated: false,
                        },
                        { bookingDraft: data, pendingConfirmation: false }
                    );
                }

                const existing = await prisma.appointment.findFirst({
                    where: {
                        email: data.email,
                        preferredDate: normalizedDate,
                        preferredTime: normalizedTime,
                        service: data.service,
                    },
                    orderBy: { createdAt: 'desc' },
                    select: APPOINTMENT_BASE_SELECT,
                });

                if (existing) {
                    const dedupeMessage = `Ya tengo registrada una cita muy similar para ti ✅\n\nServicio: ${existing.service || 'Sin especificar'}\nFecha: ${existing.preferredDate || 'Sin fecha'}\nHora: ${existing.preferredTime || 'Sin hora'}\n\nSi quieres cambiarla, te ayudo ahora.`;
                    const whatsappMessage = `Hola, quiero continuar por WhatsApp para revisar mi cita.\n\nMensaje: ${message}`;

                    return rememberAndRespond(
                        {
                            reply: dedupeMessage,
                            intent: 'AGENDAR',
                            whatsappUrl: getWhatsappUrl(whatsappNumber, whatsappMessage),
                            appointmentCreated: false,
                        },
                        { bookingDraft: undefined, pendingConfirmation: false }
                    );
                }

                const [totalSlotLoad, serviceSlotLoad] = await Promise.all([
                    countTotalAppointmentsForSlot(normalizedDate, normalizedTime),
                    countServiceAppointmentsForSlot(normalizedDate, normalizedTime, data.service || undefined),
                ]);

                if (totalSlotLoad >= MAX_APPOINTMENTS_PER_HOUR_TOTAL) {
                    const timeActions = await buildTimeActionsByService(normalizedDate || data.preferredDate, data.service);
                    return rememberAndRespond(
                        {
                            reply: 'Perdón 🙏 ese horario ya está lleno. ¿Me compartes otra hora? 👇',
                            intent: 'AGENDAR',
                            actions: timeActions,
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero otra hora para ${data.service}.\n\nMensaje: ${message}`),
                            appointmentCreated: false,
                        },
                        { bookingDraft: data, pendingConfirmation: false }
                    );
                }

                if (serviceSlotLoad >= MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE) {
                    const timeActions = await buildTimeActionsByService(normalizedDate || data.preferredDate, data.service);
                    return rememberAndRespond(
                        {
                            reply: `Perdón 🙏 para ${data.service} ese horario ya está lleno. ¿Me compartes otra hora? 👇`,
                            intent: 'AGENDAR',
                            actions: timeActions,
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero otra hora para ${data.service}.\n\nMensaje: ${message}`),
                            appointmentCreated: false,
                        },
                        { bookingDraft: data, pendingConfirmation: false }
                    );
                }

                const created = await prisma.appointment.create({
                    data: {
                        source: 'google',
                        email: data.email!,
                        phone: data.phone,
                        preferredDate: normalizedDate,
                        preferredTime: normalizedTime,
                        service: data.service,
                        notes: `Generada por chatbot web. Cliente: ${data.name}`,
                        status: 'pending',
                    },
                    select: APPOINTMENT_BASE_SELECT,
                }).catch(async () =>
                    prisma.appointment.create({
                        data: {
                            email: data.email!,
                            phone: data.phone,
                            preferredDate: normalizedDate,
                            preferredTime: normalizedTime,
                            service: data.service,
                            notes: `Generada por chatbot web. Cliente: ${data.name}`,
                            status: 'pending',
                        },
                        select: {
                            id: true,
                            email: true,
                            phone: true,
                            preferredDate: true,
                            preferredTime: true,
                            service: true,
                            notes: true,
                            status: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    })
                );

                const webhookResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                    action: 'create',
                    name: data.name || 'Cliente',
                    email: data.email!,
                    phone: data.phone,
                    service: data.service,
                    preferredDate: data.preferredDate,
                    preferredTime: data.preferredTime,
                    notes: `Cita creada desde chatbot web. ID: ${created.id}`,
                    source: 'chatbot-web',
                });

                if (webhookResult.sent && webhookResult.eventId) {
                    try {
                        await prisma.appointment.update({
                            where: { id: created.id },
                            data: { googleEventId: webhookResult.eventId },
                            select: { id: true },
                        });
                    } catch {
                    }
                }

                const confirmationMessage = `¡Listo! Ya registré tu cita 🎉\n\nServicio: ${data.service}\nFecha: ${data.preferredDate}\nHora: ${data.preferredTime}\n\nTe contactaremos para confirmar.`;
                const whatsappMessage = `Hola, ya registré mi cita en la web.\n\nID: ${created.id}\nServicio: ${data.service}\nFecha: ${data.preferredDate}\nHora: ${data.preferredTime}`;

                return rememberAndRespond(
                    {
                        reply: confirmationMessage,
                        intent: 'CONFIRMAR',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, whatsappMessage),
                        appointmentCreated: true,
                        appointmentId: created.id,
                    },
                    { bookingDraft: undefined, pendingConfirmation: false }
                );
            } catch (confirmationError) {
                console.error('Error confirming appointment from chatbot memory:', confirmationError);
                return rememberAndRespond(
                    {
                        reply: getConfirmationErrorMessage(confirmationError),
                        intent: 'CONFIRMAR',
                        whatsappUrl: getWhatsappUrl(
                            whatsappNumber,
                            `Hola, intenté confirmar mi cita pero falló en web.\nNombre: ${data.name}\nServicio: ${data.service}\nFecha: ${data.preferredDate}\nHora: ${data.preferredTime}\nEmail: ${data.email}\nTel: ${data.phone}`
                        ),
                        appointmentCreated: false,
                    },
                    { bookingDraft: data, pendingConfirmation: true }
                );
            }
        }

        if (!memory?.pendingConfirmation && isStrongConfirmMessage(message)) {
            return rememberAndRespond({
                reply: '¡Claro! Para confirmar una cita necesito primero los datos de reserva (servicio, fecha, hora, nombre, correo y teléfono). Si quieres, la armamos aquí mismo en un minuto ✅',
                intent: 'CONFIRMAR',
                whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero confirmar una cita.

Mensaje: ${message}`),
                appointmentCreated: false,
            });
        }

        const bookingDecision = decideBookingFlow(message, history, serviceTitles);

        if (memory?.pendingConfirmation && isEditMessage(message) && memory.bookingDraft) {
            const normalizedEditMessage = message.toLowerCase();
            const wantsDateEdit = /(fecha|dia|día|calendario)/.test(normalizedEditMessage);
            const wantsTimeEdit = /(hora|horario)/.test(normalizedEditMessage);

            if (wantsDateEdit) {
                const dateSuggestions = await buildDateSuggestions(memory.bookingDraft.service);
                return rememberAndRespond(
                    {
                        reply: 'Perfecto 👍 Cambiemos la fecha. Elige una sugerencia o escríbeme la nueva fecha 👇',
                        intent: 'AGENDAR',
                        actions: dateSuggestions.actions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero editar la fecha de mi cita.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    },
                    { bookingDraft: memory.bookingDraft, pendingConfirmation: false }
                );
            }

            if (wantsTimeEdit) {
                const timeActions = await buildTimeActionsByService(memory.bookingDraft.preferredDate, memory.bookingDraft.service);
                return rememberAndRespond(
                    {
                        reply:
                            timeActions.length > 0
                                ? 'Perfecto 👍 Cambiemos la hora. Elige una opción o escríbeme el nuevo horario 👇'
                                : 'Para cambiar la hora primero necesito una fecha disponible. Dime otra fecha 👇',
                        intent: 'AGENDAR',
                            actions: timeActions.length > 0 ? timeActions : (await buildDateSuggestions(memory.bookingDraft.service)).actions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero editar la hora de mi cita.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    },
                    { bookingDraft: memory.bookingDraft, pendingConfirmation: false }
                );
            }

            return rememberAndRespond(
                {
                    reply: 'Perfecto 👍 ¿Qué te faltó editar (nombre, email, teléfono, servicio, fecha u hora)?',
                    intent: 'AGENDAR',
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero editar datos de mi cita.\n\nMensaje: ${message}`),
                    appointmentCreated: false,
                },
                { bookingDraft: memory.bookingDraft, pendingConfirmation: false }
            );
        }

        const shouldHandleBookingFlow = bookingDecision.shouldHandle || Boolean(memory?.bookingDraft);

        if (shouldHandleBookingFlow && (!isInfoInquiryMessage(message) || Boolean(memory?.bookingDraft))) {
            const hasInvalidEmailInMessage = hasInvalidEmailCandidate(message);
            const recentContextService =
                !bookingDecision.data?.service && !memory?.bookingDraft?.service
                    ? getLatestUserMentionedService(history, serviceTitles) || getLatestBotSuggestedServices(history, serviceTitles)[0]
                    : undefined;

            const resolvedService =
                !bookingDecision.data?.service && isIndirectServiceReference(message)
                    ? resolveIndirectService(message, history, serviceTitles, services)
                    : undefined;

            const bookingDataWithService = resolvedService
                ? { ...bookingDecision.data, service: resolvedService }
                : recentContextService
                  ? { ...bookingDecision.data, service: recentContextService }
                : bookingDecision.data;

            const mergedDraft = mergeBookingData(memory?.bookingDraft, bookingDataWithService);
            const requestedEditField = memory?.bookingDraft ? detectRequestedEditField(message) : null;

            if (mergedDraft?.preferredDate) {
                const dayValidation = validateBusinessDay(mergedDraft.preferredDate);
                if (!dayValidation.ok) {
                    const dateSuggestions = await buildDateSuggestions();
                    return rememberAndRespond(
                        {
                            reply: `${dayValidation.message} Elige otra fecha y te sigo ayudando 👇`,
                            intent: 'AGENDAR',
                            actions: dateSuggestions.actions,
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero continuar por WhatsApp para agendar.

Mensaje: ${message}`),
                            appointmentCreated: false,
                        },
                        { bookingDraft: mergedDraft, pendingConfirmation: false }
                    );
                }
            }

            const effectiveMissingFields = getBookingMissingFields(mergedDraft);

            if (
                memory?.bookingDraft &&
                isBookingInfoInterruption(message) &&
                !requestedEditField &&
                !hasAnyBookingData(bookingDecision.data) &&
                !isConfirmMessage(message)
            ) {
                const nextField = effectiveMissingFields[0];
                const infoReply = await getSmartReply(message, history);
                const recallCandidates = mergedDraft?.service
                    ? [mergedDraft.service]
                    : getLatestBotSuggestedServices(history, serviceTitles);
                const recallPrefix =
                    isRecommendationRecallQuestion(message) && recallCandidates.length > 0
                        ? `Claro 👌 Te había recomendado ${formatServiceList(recallCandidates)} para ese objetivo.`
                        : '';
                const composedInfoReply = recallPrefix ? `${recallPrefix}\n\n${infoReply}` : infoReply;
                const followUp = nextField ? `\n\nSi quieres, seguimos con tu cita. ${getSingleFieldPrompt(nextField, false)}` : '';
                let actions: Array<{ id: string; label: string; value: string; userText: string }> | undefined;

                if (nextField === 'fecha') {
                    actions = (await buildDateSuggestions(mergedDraft?.service)).actions;
                } else if (nextField === 'hora') {
                    actions = await buildTimeActionsByService(mergedDraft?.preferredDate, mergedDraft?.service);
                }

                return rememberAndRespond(
                    {
                        reply: `${composedInfoReply}${followUp}`,
                        intent: 'AGENDAR',
                        actions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero continuar por WhatsApp para agendar.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    },
                    { bookingDraft: mergedDraft, pendingConfirmation: false }
                );
            }

            if (memory?.bookingDraft && isOnlyPunctuationMessage(message)) {
                const nextField = effectiveMissingFields[0];
                const currentService = mergedDraft?.service ? ` para ${mergedDraft.service}` : '';
                const reply = nextField
                    ? `Seguimos con tu cita${currentService}. ${getSingleFieldPrompt(nextField, false)}`
                    : 'Seguimos con tu cita 👍';

                return rememberAndRespond(
                    {
                        reply,
                        intent: 'AGENDAR',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero continuar por WhatsApp para agendar.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    },
                    { bookingDraft: mergedDraft, pendingConfirmation: false }
                );
            }

            if (requestedEditField === 'fecha') {
                const dateSuggestions = await buildDateSuggestions(mergedDraft?.service);
                return rememberAndRespond(
                    {
                        reply: 'Perfecto 👍 Cambiemos la fecha. Elige una sugerencia o escríbeme la nueva fecha 👇',
                        intent: 'AGENDAR',
                        actions: dateSuggestions.actions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero editar la fecha de mi cita.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    },
                    { bookingDraft: mergedDraft, pendingConfirmation: false }
                );
            }

            if (requestedEditField === 'hora') {
                const timeActions = await buildTimeActionsByService(mergedDraft?.preferredDate, mergedDraft?.service);
                return rememberAndRespond(
                    {
                        reply:
                            timeActions.length > 0
                                ? 'Perfecto 👍 Cambiemos la hora. Elige una opción o escríbeme el nuevo horario 👇'
                                : 'Para cambiar la hora, primero ajusta una fecha disponible 👇',
                        intent: 'AGENDAR',
                        actions: timeActions.length > 0 ? timeActions : (await buildDateSuggestions(mergedDraft?.service)).actions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero editar la hora de mi cita.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    },
                    { bookingDraft: mergedDraft, pendingConfirmation: false }
                );
            }

            if (requestedEditField === 'servicio') {
                return rememberAndRespond(
                    {
                        reply: 'Perfecto 👍 Ahora vamos con tu servicio. ¿Tienes uno en mente o prefieres que te recomiende según lo que buscas?',
                        intent: 'AGENDAR',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero editar el servicio de mi cita.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    },
                    { bookingDraft: mergedDraft, pendingConfirmation: false }
                );
            }

            // If the user already gave service/date/time, validate availability early
            // before asking for name/email/phone so we can offer a new slot immediately.
            if (
                mergedDraft?.service &&
                mergedDraft?.preferredDate &&
                mergedDraft?.preferredTime &&
                effectiveMissingFields.length > 0
            ) {
                const normalizedDate = normalizeDateForStorage(mergedDraft.preferredDate);
                const normalizedTime = normalizeTimeForStorage(mergedDraft.preferredTime);

                if (normalizedDate && normalizedTime) {
                    const holiday = await getHolidayForDate(normalizedDate);
                    if (holiday) {
                        const dateSuggestions = await buildDateSuggestions(mergedDraft.service);
                        return rememberAndRespond(
                            {
                                reply: `Perdón 🙏 ese día es festivo (${holiday.name}) y no lo tengo disponible. ¿Te parece elegir otra fecha? 👇`,
                                intent: 'AGENDAR',
                                actions: dateSuggestions.actions,
                                whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero continuar por WhatsApp para agendar.\n\nMensaje: ${message}`),
                                appointmentCreated: false,
                            },
                            { bookingDraft: mergedDraft, pendingConfirmation: false }
                        );
                    }

                    const [totalSlotLoad, serviceSlotLoad] = await Promise.all([
                        countTotalAppointmentsForSlot(normalizedDate, normalizedTime),
                        countServiceAppointmentsForSlot(normalizedDate, normalizedTime, mergedDraft.service),
                    ]);

                    if (totalSlotLoad >= MAX_APPOINTMENTS_PER_HOUR_TOTAL) {
                        const timeActions = await buildTimeActionsByService(normalizedDate, mergedDraft.service);
                        const fallbackDates = await buildDateSuggestions(mergedDraft.service);
                        return rememberAndRespond(
                            {
                                reply: `Perdón 🙏 ese horario ya está lleno. ¿Me compartes otra hora para ${mergedDraft.preferredDate}?`,
                                intent: 'AGENDAR',
                                actions: timeActions.length > 0 ? timeActions : fallbackDates.actions,
                                whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero otra hora para ${mergedDraft.service}.\n\nMensaje: ${message}`),
                                appointmentCreated: false,
                            },
                            { bookingDraft: mergedDraft, pendingConfirmation: false }
                        );
                    }

                    if (serviceSlotLoad >= MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE) {
                        const timeActions = await buildTimeActionsByService(normalizedDate, mergedDraft.service);
                        const fallbackDates = await buildDateSuggestions(mergedDraft.service);
                        return rememberAndRespond(
                            {
                                reply: `Perdón 🙏 para ${mergedDraft.service} ese horario ya está lleno. ¿Me compartes otra hora?`,
                                intent: 'AGENDAR',
                                actions: timeActions.length > 0 ? timeActions : fallbackDates.actions,
                                whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero otra hora para ${mergedDraft.service}.\n\nMensaje: ${message}`),
                                appointmentCreated: false,
                            },
                            { bookingDraft: mergedDraft, pendingConfirmation: false }
                        );
                    }
                }
            }

            const isReadyWithMergedDraft = effectiveMissingFields.length === 0;

            if (isReadyWithMergedDraft) {
                const data = mergedDraft || bookingDecision.data;
                const normalizedDate = normalizeDateForStorage(data.preferredDate);
                const normalizedTime = normalizeTimeForStorage(data.preferredTime);

                if (normalizedDate) {
                    const holiday = await getHolidayForDate(normalizedDate);
                    if (holiday) {
                        return rememberAndRespond(
                            {
                                reply: `Ese día es festivo (${holiday.name}) y no puedo agendarlo automático. Dame otra fecha y hora 🙌`,
                                intent: 'AGENDAR',
                                whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero continuar por WhatsApp para agendar.\n\nMensaje: ${message}`),
                                appointmentCreated: false,
                            },
                            { bookingDraft: data, pendingConfirmation: false }
                        );
                    }
                }

                if (!isConfirmMessage(message)) {
                    const previewMessage = `Perfecto, te resumo tu cita 👇\n\nNombre: ${data.name}\nServicio: ${data.service}\nFecha: ${data.preferredDate}\nHora: ${data.preferredTime}\nEmail: ${data.email}\nTel: ${data.phone}\n\nSi todo está bien, responde “confirmar cita” y la registro ✅`;

                    return rememberAndRespond(
                        {
                            reply: previewMessage,
                            intent: 'CONFIRMAR',
                            actions: [
                                {
                                    id: 'confirm-booking',
                                    label: 'Confirmar cita',
                                    value: CONFIRM_BOOKING_TOKEN,
                                    userText: '✅ Confirmar cita',
                                },
                                {
                                    id: 'edit-booking',
                                    label: 'Editar datos',
                                    value: EDIT_BOOKING_TOKEN,
                                    userText: '✏️ Editar datos',
                                },
                            ],
                            whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero confirmar mi cita.\n\nMensaje: ${message}`),
                            appointmentCreated: false,
                        },
                        { bookingDraft: data, pendingConfirmation: true }
                    );
                }

                const slotValidation = validateBusinessSlot(data.preferredDate!, data.preferredTime!);
                if (!slotValidation.ok) {
                    const whatsappMessage = `Hola, quiero continuar por WhatsApp para agendar.\n\nMensaje: ${message}`;
                    return rememberAndRespond({
                        reply: `${slotValidation.message} Compárteme otra opción y te la registro de inmediato.`,
                        intent: 'AGENDAR',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, whatsappMessage),
                        appointmentCreated: false,
                    });
                }

                const existing = await prisma.appointment.findFirst({
                    where: {
                        email: data.email,
                        preferredDate: normalizedDate,
                        preferredTime: normalizedTime,
                        service: data.service,
                    },
                    orderBy: { createdAt: 'desc' },
                    select: APPOINTMENT_BASE_SELECT,
                });

                if (existing) {
                    const dedupeMessage = `Ya tengo registrada una cita muy similar para ti ✅\n\nServicio: ${existing.service || 'Sin especificar'}\nFecha: ${existing.preferredDate || 'Sin fecha'}\nHora: ${existing.preferredTime || 'Sin hora'}\n\nSi quieres cambiarla, te ayudo ahora.`;
                    const whatsappMessage = `Hola, quiero continuar por WhatsApp para revisar mi cita.\n\nMensaje: ${message}`;

                    return rememberAndRespond({
                        reply: dedupeMessage,
                        intent: 'AGENDAR',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, whatsappMessage),
                        appointmentCreated: false,
                    });
                }

                const [totalSlotLoad, serviceSlotLoad] = await Promise.all([
                    countTotalAppointmentsForSlot(normalizedDate, normalizedTime),
                    countServiceAppointmentsForSlot(normalizedDate, normalizedTime, data.service || undefined),
                ]);

                if (totalSlotLoad >= MAX_APPOINTMENTS_PER_HOUR_TOTAL) {
                    const timeActions = await buildTimeActionsByService(normalizedDate || data.preferredDate, data.service);
                    return rememberAndRespond({
                        reply: 'Perdón 🙏 ese horario ya está lleno. ¿Me compartes otra hora? 👇',
                        intent: 'AGENDAR',
                        actions: timeActions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero otra hora para ${data.service}.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    });
                }

                if (serviceSlotLoad >= MAX_APPOINTMENTS_PER_HOUR_PER_SERVICE) {
                    const timeActions = await buildTimeActionsByService(normalizedDate || data.preferredDate, data.service);
                    return rememberAndRespond({
                        reply: `Perdón 🙏 para ${data.service} ese horario ya está lleno. ¿Me compartes otra hora? 👇`,
                        intent: 'AGENDAR',
                        actions: timeActions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero otra hora para ${data.service}.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    });
                }

                const created = await prisma.appointment.create({
                    data: {
                        source: 'google',
                        email: data.email!,
                        phone: data.phone,
                        preferredDate: normalizedDate,
                        preferredTime: normalizedTime,
                        service: data.service,
                        notes: `Generada por chatbot web. Cliente: ${data.name}`,
                        status: 'pending',
                    },
                    select: APPOINTMENT_BASE_SELECT,
                }).catch(async () =>
                    prisma.appointment.create({
                        data: {
                            email: data.email!,
                            phone: data.phone,
                            preferredDate: normalizedDate,
                            preferredTime: normalizedTime,
                            service: data.service,
                            notes: `Generada por chatbot web. Cliente: ${data.name}`,
                            status: 'pending',
                        },
                        select: {
                            id: true,
                            email: true,
                            phone: true,
                            preferredDate: true,
                            preferredTime: true,
                            service: true,
                            notes: true,
                            status: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    })
                );

                const webhookResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                    action: 'create',
                    name: data.name || 'Cliente',
                    email: data.email!,
                    phone: data.phone,
                    service: data.service,
                    preferredDate: data.preferredDate,
                    preferredTime: data.preferredTime,
                    notes: `Cita creada desde chatbot web. ID: ${created.id}`,
                    source: 'chatbot-web',
                });

                if (webhookResult.sent && webhookResult.eventId) {
                    try {
                        await prisma.appointment.update({
                            where: { id: created.id },
                            data: { googleEventId: webhookResult.eventId },
                            select: { id: true },
                        });
                    } catch {
                    }
                }

                const confirmationMessage = `¡Listo! Ya registré tu cita 🎉\n\nServicio: ${data.service}\nFecha: ${data.preferredDate}\nHora: ${data.preferredTime}\n\nTe contactaremos para confirmar.`;
                const whatsappMessage = `Hola, ya registré mi cita en la web.\n\nID: ${created.id}\nServicio: ${data.service}\nFecha: ${data.preferredDate}\nHora: ${data.preferredTime}`;

                return rememberAndRespond(
                    {
                        reply: confirmationMessage,
                        intent: 'CONFIRMAR',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, whatsappMessage),
                        appointmentCreated: true,
                        appointmentId: created.id,
                    },
                    { bookingDraft: undefined, pendingConfirmation: false }
                );
            }

            const whatsappMessage = `Hola, quiero continuar por WhatsApp para agendar.\n\nMensaje: ${message}`;
            const isFirstGuidedTurn = !memory?.bookingDraft;
            const nextField = effectiveMissingFields[0];
            const baseGuidedPrompt = getSingleFieldPrompt(nextField, isFirstGuidedTurn);

            let guidedPrompt = baseGuidedPrompt;
            let actions: Array<{ id: string; label: string; value: string; userText: string }> | undefined;

            if (effectiveMissingFields.length >= 3) {
                guidedPrompt = isFirstGuidedTurn
                    ? `Listo, te ayudo a agendar rápido ✨\n\n${formatMissingFieldsPrompt(effectiveMissingFields)}`
                    : formatMissingFieldsPrompt(effectiveMissingFields);
            }

            if (hasInvalidEmailInMessage && !mergedDraft?.email) {
                guidedPrompt = 'Tu correo parece incompleto 🙏 ¿Me lo compartes de nuevo? Ejemplo: nombre@correo.com';
            }

            if (!isFirstGuidedTurn && hasAnyBookingData(bookingDecision.data)) {
                guidedPrompt = `Perfecto, ya anoté ese dato ✅\n\n${guidedPrompt}`;
            }

            if (
                hasAnyBookingData(bookingDecision.data) &&
                mergedDraft?.service &&
                mergedDraft?.preferredDate &&
                mergedDraft?.preferredTime &&
                effectiveMissingFields.length > 0
            ) {
                guidedPrompt = `Perfecto, intento ${mergedDraft.service} para ${mergedDraft.preferredDate} a las ${mergedDraft.preferredTime} 👌\n\n${guidedPrompt}`;
            }

            if (nextField === 'fecha') {
                const dateSuggestions = await buildDateSuggestions(mergedDraft?.service);
                actions = dateSuggestions.actions;
                if (dateSuggestions.fullDays.length > 0) {
                    guidedPrompt = `${baseGuidedPrompt}\n\n⚠️ Días llenos recientes: ${dateSuggestions.fullDays.join(', ')}.`;
                }
            } else if (nextField === 'servicio') {
                guidedPrompt = '¿Cuál servicio te interesa? Puedo recomendarte uno o prefieres elegir de nuestra lista 💆';
            } else if (nextField === 'hora') {
                const timeActions = await buildTimeActionsByService(mergedDraft?.preferredDate, mergedDraft?.service);
                if (timeActions.length === 0) {
                    const dateSuggestions = await buildDateSuggestions(mergedDraft?.service);
                    guidedPrompt = 'Ese día ya está lleno o fuera de horario. Elige otra fecha disponible 👇';
                    actions = dateSuggestions.actions;
                } else {
                    const slotsPreview = timeActions
                        .slice(0, 6)
                        .map((slot) => slot.value)
                        .join(', ');
                    guidedPrompt = `${baseGuidedPrompt}\n\nHorarios disponibles: ${slotsPreview}`;
                    actions = timeActions;
                }
            }

            return rememberAndRespond(
                {
                    reply: guidedPrompt,
                    intent: 'AGENDAR',
                    actions,
                    whatsappUrl: getWhatsappUrl(whatsappNumber, whatsappMessage),
                    appointmentCreated: false,
                },
                { bookingDraft: mergedDraft, pendingConfirmation: false }
            );
        }

        let reply = localResult.reply;
        const intent = localResult.intent;

        if (!localResult.isOffTopic) {
            reply = await getSmartReply(message, history);
        }

        const whatsappMessage = `Hola, quiero continuar por WhatsApp.\n\nMensaje: ${message}`;

        return rememberAndRespond({
            reply,
            intent,
            whatsappUrl: getWhatsappUrl(whatsappNumber, whatsappMessage),
        });
    } catch (error) {
        console.error('Error in chatbot route:', error);
        return { reply: 'Disculpa, ocurrió un error procesando tu mensaje.', error: 'Error procesando chatbot' };
    }
}
