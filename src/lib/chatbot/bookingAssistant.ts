import { ChatHistoryItem } from '@/lib/chatbot/merrashChatbot';

export type BookingData = {
    name?: string;
    email?: string;
    phone?: string;
    preferredDate?: string;
    preferredTime?: string;
    service?: string;
};

export type BookingDecision = {
    shouldHandle: boolean;
    isReadyToCreate: boolean;
    missingFields: string[];
    data: BookingData;
};

const normalize = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const BOOKING_INTENT_REGEX =
    /(agend|agnda|agenda|cita|reserv|apartar|apartame|programar|anotame|anota|apunta|turno|sesion|hazme una agenda|hacer una agenda|armame una agenda|sacame cita|sacarme cita|quiero agendarme|agendame|hora para|hay espacio|hay disponibilidad)/;

const DATE_HINT_REGEX =
    /(hoy|manana|pasado manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo|proxim|esta semana|la otra semana|en\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)|\d{1,2}[/-]\d{1,2}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+de\s+[a-záéíóúñ]+)/;

const TIME_HINT_REGEX = /(am|pm|:\d{2}|a las\s*\d{1,2}|mediodia|medio dia|de la tarde|de la manana|de la noche|hrs?)/;

const NAME_STOPWORDS = new Set([
    'mi',
    'correo',
    'electonico',
    'electronico',
    'numero',
    'número',
    'telefono',
    'teléfono',
    'de',
    'del',
    'para',
    'por',
    'una',
    'uno',
    'el',
    'la',
    'los',
    'las',
    'dia',
    'día',
    'lunes',
    'martes',
    'miercoles',
    'miércoles',
    'jueves',
    'viernes',
    'sabado',
    'sábado',
    'domingo',
    'am',
    'pm',
    'hora',
    'horario',
    'fecha',
    'email',
    'editar',
    'datos',
    'agendame',
    'agéndame',
    'agenda',
    'cita',
    'servicio',
]);

const cleanNameCandidate = (candidate: string, services: string[]) => {
    const cleaned = candidate
        .replace(/[,:;.!?]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) return undefined;

    const tokens = cleaned
        .split(' ')
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => /^[a-záéíóúñ]{2,30}$/i.test(token));

    if (tokens.length === 0) return undefined;

    const filtered = tokens.filter((token) => !NAME_STOPWORDS.has(normalize(token)));
    if (filtered.length === 0) return undefined;

    const serviceWords = services
        .flatMap((service) => normalize(service).split(' '))
        .filter((word) => word.length >= 4);

    const withoutServiceWords = filtered.filter((token) => !serviceWords.includes(normalize(token)));
    if (withoutServiceWords.length === 0 && filtered.length > 0) {
        return undefined;
    }

    const picked = withoutServiceWords.slice(0, 2);

    if (picked.length === 0) return undefined;

    return picked.join(' ');
};

const extractName = (text: string, services: string[]) => {
    const match = text.match(/(?:me llamo|mi nombre es|soy|nombre)\s*[:\-]?\s*([a-záéíóúñ\s]{2,50})/i);
    if (match?.[1]?.trim()) {
        return cleanNameCandidate(match[1], services);
    }

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch?.index !== undefined) {
        const beforeEmail = text.slice(0, emailMatch.index).trim();
        const candidateTokens = beforeEmail
            .split(/\s+/)
            .map((token) => token.trim())
            .filter(Boolean)
            .filter((token) => /^[a-záéíóúñ]{2,30}$/i.test(token));

        if (candidateTokens.length > 0) {
            const candidate = candidateTokens.slice(-2).join(' ');
            if (/^[a-záéíóúñ]{2,30}(\s+[a-záéíóúñ]{2,30})?$/i.test(candidate || '')) {
                return cleanNameCandidate(candidate, services);
            }
        }
    }

    const firstChunk = text.split(',')[0]?.trim();
    const looksLikeSimpleName = /^[a-záéíóúñ]{2,30}(\s+[a-záéíóúñ]{2,30})?$/i.test(firstChunk || '');
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
    if (firstChunk && looksLikeSimpleName && hasEmail) {
        return cleanNameCandidate(firstChunk, services);
    }

    const cleaned = text.trim();
    const isSingleName = /^[a-záéíóúñ]{2,30}$/i.test(cleaned);
    if (isSingleName) {
        return cleanNameCandidate(cleaned, services);
    }

    const isTwoWordName = /^[a-záéíóúñ]{2,30}\s+[a-záéíóúñ]{2,30}$/i.test(cleaned);
    if (isTwoWordName) {
        return cleanNameCandidate(cleaned, services);
    }

    // Handle mixed payloads like "axel axel@gmailcom" where email is malformed but name is usable.
    if (text.includes('@')) {
        const firstToken = text.trim().split(/\s+/)[0] || '';
        if (/^[a-záéíóúñ]{2,30}$/i.test(firstToken)) {
            return cleanNameCandidate(firstToken, services);
        }
    }

    return undefined;
};

const extractEmail = (text: string) => {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match?.[0]?.trim();
};

const normalizePhoneCandidate = (candidate: string) => {
    const compact = candidate.replace(/\s+/g, ' ').trim();

    // Prevent accidental phone capture from date-like values.
    if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(compact) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(compact)) {
        return undefined;
    }

    // Date + time strings can produce 10-12 digits and be misdetected as phone.
    if (/\d{1,2}:\d{2}/.test(compact)) {
        return undefined;
    }

    const cleaned = candidate.replace(/[^\d+]/g, '');
    const normalized = cleaned.startsWith('+')
        ? `+${cleaned.slice(1).replace(/\D/g, '')}`
        : cleaned.replace(/\D/g, '');

    const digits = normalized.replace(/^\+/, '');
    if (digits.length < 10 || digits.length > 15) return undefined;

    return normalized;
};

const extractPhone = (text: string) => {
    const contextual = text.match(
        /(?:tel|telefono|teléfono|cel|celular|movil|móvil|whatsapp|wa|número|numero|contacto)\s*(?:es|:)?\s*(\+?\d[\d\s\-().]{8,}\d)/i
    );
    if (contextual?.[1]) {
        const normalized = normalizePhoneCandidate(contextual[1]);
        if (normalized) return normalized;
    }

    const candidates = text.match(/\+?\d[\d\s\-().]{8,}\d/g) || [];
    for (const candidate of candidates) {
        if (candidate.includes('/')) continue;
        if (/\d{4}-\d{1,2}-\d{1,2}/.test(candidate)) continue;
        const normalized = normalizePhoneCandidate(candidate);
        if (normalized) return normalized;
    }

    return undefined;
};

const extractDate = (text: string) => {
    const fullDate = text.match(/\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
    if (fullDate) return fullDate[1];

    const dayMonthYear = text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
    if (dayMonthYear) return dayMonthYear[1];

    if (/\bhoy\b/i.test(text)) return 'hoy';
    if (/\bmañana\b|\bmanana\b/i.test(text)) return 'mañana';
    if (/\bpasado\s+mañana\b|\bpasado\s+manana\b/i.test(text)) return 'pasado mañana';

    const weekday = text.match(/\b(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b/i);
    if (weekday) return weekday[1];

    const monthDate = text.match(
        /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/i
    );
    if (monthDate) {
        return `${monthDate[1]} de ${monthDate[2]}`;
    }

    return undefined;
};

const extractTime = (text: string) => {
    const h24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (h24) return `${h24[1].padStart(2, '0')}:${h24[2]}`;

    const ampm = text.match(/\b(1[0-2]|0?[1-9])\s*(am|pm)\b/i);
    if (ampm) return `${ampm[1]} ${ampm[2].toUpperCase()}`;

    const natural = text.match(/\b(?:a las|como a las|sobre las)?\s*(1[0-2]|0?[1-9])\s*(?:de la)?\s*(mañana|manana|tarde|noche)\b/i);
    if (natural) return `${natural[1]} ${/mañana|manana/i.test(natural[2]) ? 'AM' : 'PM'}`;

    const atHour = text.match(/\ba las\s*(1[0-2]|0?[1-9]|1\d|2[0-3])\b/i);
    if (atHour) {
        const hour = Number(atHour[1]);
        return `${String(hour).padStart(2, '0')}:00`;
    }

    const hourOnly = text.match(/\b(?:a las\s*)?([01]?\d|2[0-3])\s*(?:hrs?|horas?)\b/i);
    if (hourOnly) return `${hourOnly[1].padStart(2, '0')}:00`;

    if (/\bmediodia\b|\bmedio\s+dia\b/i.test(text)) return '12:00';

    return undefined;
};

const detectService = (text: string, services: string[]) => {
    const normalizedText = normalize(text);

    const aliases: Record<string, string> = {
        acupultura: 'acupuntura',
        acupuntutra: 'acupuntura',
        acupunt: 'acupuntura',
        homeopatia: 'homeopatía',
        biomagnetico: 'par biomagnético',
        sueroterapia: 'sueroterapia intravenosa',
        facial: 'tratamientos faciales',
        corporal: 'tratamientos corporales',
        masaje: 'masajes',
        reiki: 'reiki',
    };

    for (const [inputAlias, canonical] of Object.entries(aliases)) {
        if (normalizedText.includes(normalize(inputAlias))) {
            const mapped = services.find((service) => normalize(service).includes(normalize(canonical)));
            if (mapped) return mapped;
        }
    }

    const service = services.find((item) => {
        const normalizedService = normalize(item);
        return normalizedText.includes(normalizedService);
    });

    if (service) return service;

    const byWord = services.find((item) => {
        const words = normalize(item)
            .split(' ')
            .filter((word) => word.length >= 4);
        return words.some((word) => normalizedText.includes(word));
    });

    if (byWord) return byWord;

    return service;
};

const shouldStartBookingFlow = (text: string) => {
    const normalizedText = normalize(text);
    if (BOOKING_INTENT_REGEX.test(normalizedText)) {
        return true;
    }

    const hasDateHint = DATE_HINT_REGEX.test(normalizedText);
    const hasTimeHint = TIME_HINT_REGEX.test(normalizedText);
    const hasBookingVerb = /(quiero|me gustaria|me gustaría|podrias|podrías|necesito|puedo|se puede)/.test(normalizedText);

    return hasBookingVerb && (hasDateHint || hasTimeHint);
};

export const decideBookingFlow = (message: string, history: ChatHistoryItem[], services: string[]): BookingDecision => {
    const userTexts = [...history.filter((item) => item.role === 'user').map((item) => item.text), message];
    const normalizedMessage = String(message || '');

    const data: BookingData = {
        name: extractName(normalizedMessage, services),
        email: extractEmail(normalizedMessage),
        phone: extractPhone(normalizedMessage),
        preferredDate: extractDate(normalizedMessage),
        preferredTime: extractTime(normalizedMessage),
        service: detectService(normalizedMessage, services),
    };

    const missingFields = [
        !data.name ? 'nombre' : null,
        !data.email ? 'email' : null,
        !data.phone ? 'teléfono' : null,
        !data.service ? 'servicio' : null,
        !data.preferredDate ? 'fecha' : null,
        !data.preferredTime ? 'hora' : null,
    ].filter(Boolean) as string[];

    // Solo buscar intención en el mensaje actual para evitar arrastrar intenciones de citas ya terminadas
    const bookingIntentInContext = shouldStartBookingFlow(normalizedMessage);
    const extractedSignalCount = [data.name, data.email, data.phone, data.service, data.preferredDate, data.preferredTime].filter(Boolean)
        .length;
    const hasStructuredBookingSignals =
        extractedSignalCount >= 3 ||
        ((Boolean(data.preferredDate) || Boolean(data.preferredTime)) && (Boolean(data.service) || Boolean(data.email) || Boolean(data.phone)));
    const shouldHandle = bookingIntentInContext || hasStructuredBookingSignals;

    return {
        shouldHandle,
        isReadyToCreate: shouldHandle && missingFields.length === 0,
        missingFields,
        data,
    };
};

export const buildMissingDataPrompt = (missingFields: string[]) => {
    if (missingFields.length === 0) return '';

    if (missingFields.length === 1) {
        return `Para continuar con tu cita, solo me falta tu ${missingFields[0]} `;
    }

    const last = missingFields[missingFields.length - 1];
    const rest = missingFields.slice(0, -1).join(', ');
    return `Para agendarte me faltan estos datos: ${rest} y ${last} `;
};
