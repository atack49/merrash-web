import { NextRequest, NextResponse } from 'next/server';
import { buildChatbotReply, getWhatsappUrl, ChatHistoryItem } from '@/lib/chatbot/merrashChatbot';
import { generatePublicHostedChatbotReply, generateTeamReviewedChatbotReply } from '@/lib/chatbot/openaiChatbot';
import { getChatbotSettings } from '@/lib/chatbotSettings';
import { BookingData, decideBookingFlow } from '@/lib/chatbot/bookingAssistant';
import { getGoogleCalendarSettings } from '@/lib/calendarSettings';
import { sendAppointmentToGoogleCalendar } from '@/lib/calendarWebhook';
import { parsePreferredDate, parsePreferredTime, validateBusinessDay, validateBusinessSlot } from '@/lib/chatbot/businessSchedule';
import { getChatMemory, saveChatMemory } from '@/lib/chatbot/chatMemory';
import { getHolidayForDate } from '@/lib/holidayCalendar';
import { prisma } from '@/lib/db';

const DEFAULT_WHATSAPP_NUMBER = '527224958550';
const DEFAULT_CHATBOT_MODE = 'auto';
const ALLOWED_CHATBOT_MODES = ['auto', 'local', 'public', 'team'];
const ALLOWED_AUTO_PROVIDERS = ['team', 'public', 'local'] as const;
type AutoProvider = (typeof ALLOWED_AUTO_PROVIDERS)[number];

const parseAutoProviderOrder = (value?: string): AutoProvider[] => {
    const fallback: AutoProvider[] = ['team', 'public', 'local'];
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

    if (/(disponibilidad|disponible|hay lugar|hay espacio|tienen espacio|hay horario|atienden|agenda).*(fecha|hora|domingo|lunes|martes|miercoles|jueves|viernes|sabado)|\bdisponibilidad\b/.test(normalized)) {
        return 'availability';
    }

    return 'none';
};

const extractEmail = (text: string): string | null => {
    const match = text.match(EMAIL_REGEX);
    return match?.[0]?.toLowerCase() ?? null;
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
    return /(horario|ubicación|ubicacion|dirección|direccion|servicios|tratamientos|precio|costo|información|informacion|recomienda|recomendación|recomendacion)/.test(
        normalized
    );
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
    const intro = withIntro ? 'Listo, te ayudo a agendar rápido ✨' : '';

    const promptByField: Record<string, string> = {
        nombre: '¿Con qué nombre registramos la cita?',
        email: '¿Qué correo usamos para tu cita?',
        'teléfono': '¿Me compartes tu número de teléfono?',
        servicio: '¿Qué servicio deseas reservar?',
        fecha: '¿Qué fecha te acomoda? Puedes elegirla en el calendario 👇',
        hora: '¿Qué horario prefieres? Te muestro opciones disponibles 👇',
    };

    const question = promptByField[field] || 'Compárteme ese dato para continuar.';
    return intro ? `${intro}\n\n${question}` : question;
};

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MAX_APPOINTMENTS_PER_SERVICE_SLOT = 2;

const normalizeText = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

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

    if (!service) {
        return { isoDate, slots: template };
    }

    const appointments = await prisma.appointment.findMany({
        where: {
            preferredDate: isoDate,
            status: { in: ['pending', 'confirmed'] },
            service,
        },
        select: { preferredTime: true },
    });

    const occupiedCountBySlot = new Map<string, number>();
    for (const appointment of appointments) {
        const slot = normalizeTimeInput(appointment.preferredTime || undefined) || appointment.preferredTime;
        if (!slot) continue;
        occupiedCountBySlot.set(slot, (occupiedCountBySlot.get(slot) || 0) + 1);
    }

    const available = template.filter((slot) => (occupiedCountBySlot.get(slot) || 0) < MAX_APPOINTMENTS_PER_SERVICE_SLOT);
    return { isoDate, slots: available };
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

    let scanned = 0;
    while (actions.length < 6 && scanned < 30) {
        scanned += 1;
        cursor.setDate(cursor.getDate() + 1);
        const day = cursor.getDay();
        if (day === 0) continue;

        const iso = toIsoDate(cursor);
        const holiday = await getHolidayForDate(iso);
        if (holiday) continue;

        const available = await getAvailableTimeSlots(iso, service);
        const label = formatIsoShortLabel(iso);

        if (available.slots.length === 0) {
            fullDays.push(label);
            continue;
        }

        actions.push({
            id: `date-${iso}`,
            label,
            value: iso,
            userText: `📅 ${label}`,
        });
    }

    return { actions, fullDays: fullDays.slice(0, 4) };
};

const buildTimeActionsByService = async (dateInput?: string, service?: string) => {
    const available = await getAvailableTimeSlots(dateInput, service);
    return available.slots.map((slot) => ({
        id: `time-${slot}`,
        label: slot,
        value: slot,
        userText: `🕒 ${slot}`,
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

const mergeBookingData = (base?: BookingData, incoming?: BookingData): BookingData | undefined => {
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
        if (incomingName && incomingName.length >= 2) return incomingName;
        return baseName;
    };

    const merged: BookingData = {
        name: pickBestName(),
        email: incoming?.email || base?.email,
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

    return 'No pude confirmar tu cita automáticamente en este momento. Ya guardé tu solicitud y te ayudo a terminarla por WhatsApp ahora mismo 🙏';
};

const normalizeDateForStorage = (value?: string) => {
    const normalized = normalizeDateInput(value);
    return normalized || value;
};

const normalizeTimeForStorage = (value?: string) => {
    const normalized = normalizeTimeInput(value);
    return normalized || value;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const message = String(body?.message ?? '').trim();
        const conversationId = String(body?.conversationId ?? '').trim();
        const requestHistory = Array.isArray(body?.history)
            ? (body.history as ChatHistoryItem[])
                  .filter((item) => item && (item.role === 'user' || item.role === 'bot') && typeof item.text === 'string')
                  .slice(-400)
            : [];

        if (!message) {
            return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
        }

        const memory = conversationId ? await getChatMemory(conversationId) : null;
        const baseHistory = requestHistory.length > 0 ? requestHistory : memory?.history || [];
        const history = [...baseHistory];

        if (history.length === 0 || history[history.length - 1]?.role !== 'user' || history[history.length - 1]?.text !== message) {
            history.push({ role: 'user', text: message });
        }

        const rememberAndRespond = async (
            payload: Record<string, unknown>,
            options?: { bookingDraft?: BookingData; pendingConfirmation?: boolean }
        ) => {
            if (conversationId) {
                await saveChatMemory(conversationId, {
                    history: [...history, { role: 'bot', text: String(payload.reply || '') }],
                    bookingDraft: options?.bookingDraft,
                    pendingConfirmation: options?.pendingConfirmation,
                });
            }

            return NextResponse.json(payload);
        };

        const dbContact = await prisma.contactInfo.findUnique({
            where: { id: 'default' },
        });
        const services = await prisma.service.findMany({
            where: { active: true },
            select: { title: true, category: true, description: true },
            orderBy: { order: 'asc' },
        });

        const dbPhones = dbContact
            ? (typeof dbContact.phones === 'string' ? JSON.parse(dbContact.phones) : dbContact.phones)
            : [];
        const parsedHours = dbContact?.hours ? JSON.parse(dbContact.hours) : null;
        const fileSettings = await getChatbotSettings();
        const googleSettings = await getGoogleCalendarSettings();
        const serviceTitles = services.map((service) => service.title);
        const whatsappNumber = process.env.WHATSAPP_CHATBOT_NUMBER || dbPhones?.[0] || DEFAULT_WHATSAPP_NUMBER;
        const localResult = buildChatbotReply(message, history, { services: serviceTitles, serviceCatalog: services });

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
                            reply: dayValidation.message,
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
                    return rememberAndRespond({
                        reply: `Sí, ese horario se ve disponible ✅ (${normalizedDate || date} ${normalizedTime || time || ''}). Si me dices el servicio, te confirmo cupo exacto.`,
                        intent: 'CONSULTAR_DISPONIBILIDAD',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                    });
                }

                const occupiedCount = await countServiceAppointmentsForSlot(normalizedDate, normalizedTime, requestedService);

                if (occupiedCount < MAX_APPOINTMENTS_PER_SERVICE_SLOT) {
                    return rememberAndRespond({
                        reply: `Sí, ese horario se ve disponible para ${requestedService} ✅ (${normalizedDate || date} ${normalizedTime || time || ''})`,
                        intent: 'CONSULTAR_DISPONIBILIDAD',
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero revisar disponibilidad.\n\nMensaje: ${message}`),
                    });
                }

                const alternatives = normalizedDate ? await buildTimeActionsByService(normalizedDate, requestedService) : [];
                if (alternatives.length > 0) {
                    return rememberAndRespond({
                        reply: `Para ${requestedService}, ese horario ya llenó cupo. En ${normalizedDate} todavía tengo estos espacios: ${alternatives
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
                    reply: `Para ${requestedService}, ese horario ya está lleno. Te propongo otras fechas disponibles 👇`,
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

            if (conflictCount >= MAX_APPOINTMENTS_PER_SERVICE_SLOT) {
                return rememberAndRespond({
                    reply: `Ese horario (${newDate} ${newTime}) ya llenó cupo para ${appointment.service || 'ese servicio'}. Dime otra fecha u hora y la actualizo.`,
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

                const serviceSlotLoad = await countServiceAppointmentsForSlot(normalizedDate, normalizedTime, data.service || undefined);
                if (serviceSlotLoad >= MAX_APPOINTMENTS_PER_SERVICE_SLOT) {
                    const timeActions = await buildTimeActionsByService(normalizedDate || data.preferredDate, data.service);
                    return rememberAndRespond(
                        {
                            reply: `Ese horario ya llenó cupo para ${data.service}. Elige otra hora disponible 👇`,
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
                        reply: 'Perfecto 👍 Cambiemos la fecha. Elige una opción sugerida o selecciónala en el calendario 👇',
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
                                ? 'Perfecto 👍 Cambiemos la hora. Te muestro horarios disponibles 👇'
                                : 'Para cambiar la hora primero necesito una fecha disponible. Elígela en el calendario 👇',
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
                    reply: 'Perfecto 👍 Dime qué dato quieres cambiar (nombre, email, teléfono, servicio, fecha u hora) y te actualizo el resumen.',
                    intent: 'AGENDAR',
                    whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero editar datos de mi cita.\n\nMensaje: ${message}`),
                    appointmentCreated: false,
                },
                { bookingDraft: memory.bookingDraft, pendingConfirmation: false }
            );
        }

        const shouldHandleBookingFlow = bookingDecision.shouldHandle || Boolean(memory?.bookingDraft);

        if (shouldHandleBookingFlow && (!isInfoInquiryMessage(message) || Boolean(memory?.bookingDraft))) {
            const mergedDraft = mergeBookingData(memory?.bookingDraft, bookingDecision.data);
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

            if (requestedEditField === 'fecha') {
                const dateSuggestions = await buildDateSuggestions(mergedDraft?.service);
                return rememberAndRespond(
                    {
                        reply: 'Perfecto 👍 Cambiemos la fecha. Elige una opción sugerida o selecciónala en el calendario 👇',
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
                                ? 'Perfecto 👍 Cambiemos la hora. Selecciona una nueva hora disponible 👇'
                                : 'Para cambiar la hora, primero elige una fecha disponible 👇',
                        intent: 'AGENDAR',
                        actions: timeActions.length > 0 ? timeActions : (await buildDateSuggestions(mergedDraft?.service)).actions,
                        whatsappUrl: getWhatsappUrl(whatsappNumber, `Hola, quiero editar la hora de mi cita.\n\nMensaje: ${message}`),
                        appointmentCreated: false,
                    },
                    { bookingDraft: mergedDraft, pendingConfirmation: false }
                );
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
                    const previewMessage = `Perfecto, te resumo tu cita 👇\n\nNombre: ${data.name}\nServicio: ${data.service}\nFecha: ${data.preferredDate}\nHora: ${data.preferredTime}\nEmail: ${data.email}\nTel: ${data.phone}\n\nSi todo está bien, toca el botón “Confirmar cita” ✅`;

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

                const serviceSlotLoad = await countServiceAppointmentsForSlot(normalizedDate, normalizedTime, data.service || undefined);
                if (serviceSlotLoad >= MAX_APPOINTMENTS_PER_SERVICE_SLOT) {
                    const timeActions = await buildTimeActionsByService(normalizedDate || data.preferredDate, data.service);
                    return rememberAndRespond({
                        reply: `Ese horario ya llenó cupo para ${data.service}. Elige otra hora disponible 👇`,
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

            if (nextField === 'fecha') {
                const dateSuggestions = await buildDateSuggestions(mergedDraft?.service);
                actions = dateSuggestions.actions;
                if (dateSuggestions.fullDays.length > 0) {
                    guidedPrompt = `${baseGuidedPrompt}\n\n⚠️ Días llenos recientes: ${dateSuggestions.fullDays.join(', ')}.`;
                }
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
        const userTurns = history.filter((item) => item.role === 'user').length;
        const isGreetingTurn = isSimpleGreetingMessage(message) && userTurns <= 2;
        const configuredMode = (fileSettings?.mode || process.env.CHATBOT_MODE || DEFAULT_CHATBOT_MODE).toLowerCase();
        const chatbotMode = ALLOWED_CHATBOT_MODES.includes(configuredMode) ? configuredMode : DEFAULT_CHATBOT_MODE;

        if (!isGreetingTurn && !localResult.isOffTopic && chatbotMode !== 'local') {
            const aiInput = {
                message,
                history,
                services: services.map((service) => service.title),
                serviceCatalog: services,
                contactAddress: dbContact?.address,
                contactHoursWeekdays: parsedHours?.weekdays,
                contactHoursSaturday: parsedHours?.saturday,
            };

            let modelReply: string | null = null;

            const runProvider = async (provider: AutoProvider): Promise<string | null> => {
                if (provider === 'team') {
                    return generateTeamReviewedChatbotReply(aiInput);
                }
                if (provider === 'public') {
                    return generatePublicHostedChatbotReply(aiInput);
                }
                return null;
            };

            if (chatbotMode === 'team') {
                modelReply = await generateTeamReviewedChatbotReply(aiInput);
                if (!modelReply) {
                    modelReply = await generatePublicHostedChatbotReply(aiInput);
                }
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

            if (modelReply) {
                reply = modelReply;
            }
        }

        const whatsappMessage = `Hola, quiero continuar por WhatsApp.\n\nMensaje: ${message}`;

        return rememberAndRespond({
            reply,
            intent,
            whatsappUrl: getWhatsappUrl(whatsappNumber, whatsappMessage),
        });
    } catch (error) {
        console.error('Error in chatbot route:', error);
        return NextResponse.json({ error: 'Error procesando chatbot' }, { status: 500 });
    }
}
