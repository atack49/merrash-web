type DaySchedule = {
    open: number;
    close: number;
};

const WEEKDAY_LABELS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const BASE_SCHEDULE: Record<number, DaySchedule | null> = {
    0: null,
    1: { open: 8 * 60, close: 18 * 60 },
    2: { open: 8 * 60, close: 18 * 60 },
    3: { open: 8 * 60, close: 18 * 60 },
    4: { open: 8 * 60, close: 18 * 60 },
    5: { open: 8 * 60, close: 18 * 60 },
    6: { open: 9 * 60, close: 16 * 60 },
};

const WEEKDAY_MAP: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6,
};

const normalize = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
};

const nextOpenDate = (fromDate: Date) => {
    const probe = new Date(fromDate);
    for (let i = 0; i < 7; i += 1) {
        probe.setDate(probe.getDate() + 1);
        if (BASE_SCHEDULE[probe.getDay()]) {
            return probe;
        }
    }
    return fromDate;
};

export const parsePreferredDate = (dateText: string, now = new Date()): Date | null => {
    const text = normalize(String(dateText || '').trim());
    if (!text) return null;

    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (text === 'hoy') {
        return base;
    }

    if (text === 'manana') {
        const tomorrow = new Date(base);
        tomorrow.setDate(base.getDate() + 1);
        return tomorrow;
    }

    if (WEEKDAY_MAP[text] !== undefined) {
        const target = WEEKDAY_MAP[text];
        const delta = (target - base.getDay() + 7) % 7 || 7;
        const nextDay = new Date(base);
        nextDay.setDate(base.getDate() + delta);
        return nextDay;
    }

    const yyyyMmDd = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (yyyyMmDd) {
        return new Date(Number(yyyyMmDd[1]), Number(yyyyMmDd[2]) - 1, Number(yyyyMmDd[3]));
    }

    const ddMmYyyy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (ddMmYyyy) {
        const rawYear = Number(ddMmYyyy[3]);
        const year = rawYear < 100 ? 2000 + rawYear : rawYear;
        return new Date(year, Number(ddMmYyyy[2]) - 1, Number(ddMmYyyy[1]));
    }

    const ddMm = text.match(/^(\d{1,2})[/-](\d{1,2})$/);
    if (ddMm) {
        return new Date(base.getFullYear(), Number(ddMm[2]) - 1, Number(ddMm[1]));
    }

    return null;
};

export const parsePreferredTime = (timeText: string): number | null => {
    const text = normalize(String(timeText || '').trim());
    if (!text) return null;

    const hhmm = text.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) {
        const hours = Number(hhmm[1]);
        const minutes = Number(hhmm[2]);
        if (hours > 23 || minutes > 59) return null;
        return hours * 60 + minutes;
    }

    const ampm = text.match(/^(\d{1,2})\s*(am|pm)$/);
    if (ampm) {
        let hours = Number(ampm[1]);
        if (hours < 1 || hours > 12) return null;
        if (ampm[2] === 'pm' && hours < 12) hours += 12;
        if (ampm[2] === 'am' && hours === 12) hours = 0;
        return hours * 60;
    }

    return null;
};

export const validateBusinessSlot = (preferredDate: string, preferredTime: string) => {
    const parsedDate = parsePreferredDate(preferredDate);
    const parsedTime = parsePreferredTime(preferredTime);

    if (!parsedDate || parsedTime === null) {
        return {
            ok: false,
            message: 'No pude interpretar bien la fecha u hora. Usa formato como 25/04 y 16:00.',
        };
    }

    const daySchedule = BASE_SCHEDULE[parsedDate.getDay()];

    if (!daySchedule) {
        const nextOpen = nextOpenDate(parsedDate);
        const nextLabel = WEEKDAY_LABELS[nextOpen.getDay()];
        const nextOpenSchedule = BASE_SCHEDULE[nextOpen.getDay()];
        const nextOpenTime = nextOpenSchedule ? formatTime(nextOpenSchedule.open) : '08:00';
        return {
            ok: false,
            message: `No puedo agendar en domingo porque está cerrado. Te puedo agendar para ${nextLabel} desde las ${nextOpenTime}.`,
        };
    }

    const lastBookableStart = daySchedule.close - 60;

    if (parsedTime < daySchedule.open || parsedTime > lastBookableStart) {
        return {
            ok: false,
            message: `No puedo agendar a las ${formatTime(parsedTime)} porque a esa hora ya no se agenda. Para ese día solo puedo agendar de ${formatTime(daySchedule.open)} a ${formatTime(lastBookableStart)} (cerramos a las ${formatTime(daySchedule.close)}).`,
        };
    }

    return {
        ok: true,
        parsedDate,
        parsedTime,
    };
};

export const validateBusinessDay = (preferredDate: string) => {
    const parsedDate = parsePreferredDate(preferredDate);
    if (!parsedDate) {
        return {
            ok: false,
            message: 'No pude interpretar la fecha. Intenta con formato como 25/04 o “mañana”.',
        };
    }

    const daySchedule = BASE_SCHEDULE[parsedDate.getDay()];
    if (!daySchedule) {
        return {
            ok: false,
            message: 'Domingo está cerrado. Atendemos de lunes a sábado.',
        };
    }

    return { ok: true, parsedDate, daySchedule };
};
