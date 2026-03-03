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
