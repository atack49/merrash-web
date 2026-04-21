import fs from 'fs/promises';
import path from 'path';

export interface GoogleCalendarSettings {
    embedUrl: string;
    webhookUrl: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'google-calendar-settings.json');

const DEFAULT_SETTINGS: GoogleCalendarSettings = {
    embedUrl: '',
    webhookUrl: '',
};

const extractIframeSrc = (value: string) => {
    const match = value.match(/src\s*=\s*["']([^"']+)["']/i);
    return match?.[1] || '';
};

export const getCalendarIdFromEmbedUrl = (embedUrl: string) => {
    const raw = String(embedUrl || '').trim();
    if (!raw) return '';

    const urlCandidate = raw.includes('<iframe') ? extractIframeSrc(raw) : raw;
    if (!urlCandidate) return '';

    try {
        const parsed = new URL(urlCandidate);
        const calendarId = parsed.searchParams.get('src');
        return calendarId ? calendarId.trim() : '';
    } catch {
        const match = urlCandidate.match(/[?&]src=([^&]+)/i);
        if (!match?.[1]) return '';

        try {
            return decodeURIComponent(match[1]).trim();
        } catch {
            return match[1].trim();
        }
    }
};

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export async function getGoogleCalendarSettings(): Promise<GoogleCalendarSettings> {
    try {
        await ensureDataDir();
        const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<GoogleCalendarSettings>;

        return {
            embedUrl: typeof parsed.embedUrl === 'string' ? parsed.embedUrl : DEFAULT_SETTINGS.embedUrl,
            webhookUrl: typeof parsed.webhookUrl === 'string' ? parsed.webhookUrl : DEFAULT_SETTINGS.webhookUrl,
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export async function saveGoogleCalendarSettings(settings: GoogleCalendarSettings): Promise<GoogleCalendarSettings> {
    await ensureDataDir();

    const payload: GoogleCalendarSettings = {
        embedUrl: settings.embedUrl.trim(),
        webhookUrl: settings.webhookUrl.trim(),
    };

    await fs.writeFile(SETTINGS_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    return payload;
}
