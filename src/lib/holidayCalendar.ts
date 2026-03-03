const GOOGLE_MX_HOLIDAYS_ICS =
    'https://calendar.google.com/calendar/ical/es.mexican%23holiday%40group.v.calendar.google.com/public/basic.ics';

type HolidayCache = {
    expiresAt: number;
    byDate: Map<string, string>;
};

let cache: HolidayCache | null = null;

const TTL_MS = 12 * 60 * 60 * 1000;

const normalizeDate = (value: string) => {
    const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
};

const decodeIcsText = (value: string) =>
    value
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\n/g, ' ')
        .trim();

const parseIcs = (ics: string) => {
    const byDate = new Map<string, string>();
    const blocks = ics.split('BEGIN:VEVENT');

    blocks.forEach((block) => {
        const dateMatch = block.match(/DTSTART;VALUE=DATE:(\d{8})/);
        const summaryMatch = block.match(/SUMMARY:(.+)/);

        if (!dateMatch) return;
        const normalizedDate = normalizeDate(dateMatch[1]);
        if (!normalizedDate) return;

        const summary = decodeIcsText(summaryMatch?.[1] || 'Día festivo');
        byDate.set(normalizedDate, summary);
    });

    return byDate;
};

const ensureCache = async () => {
    if (cache && cache.expiresAt > Date.now()) {
        return cache;
    }

    try {
        const response = await fetch(GOOGLE_MX_HOLIDAYS_ICS, { cache: 'no-store' });
        if (!response.ok) throw new Error('Holiday feed unavailable');

        const text = await response.text();
        cache = {
            byDate: parseIcs(text),
            expiresAt: Date.now() + TTL_MS,
        };
    } catch {
        cache = {
            byDate: new Map<string, string>(),
            expiresAt: Date.now() + 10 * 60 * 1000,
        };
    }

    return cache;
};

export const getHolidayForDate = async (dateIso: string) => {
    const current = await ensureCache();
    const name = current.byDate.get(dateIso);
    if (!name) return null;
    return { date: dateIso, name };
};
