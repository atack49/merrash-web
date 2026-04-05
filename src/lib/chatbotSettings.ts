import fs from 'fs/promises';
import path from 'path';

export type ChatbotMode = 'auto' | 'local' | 'public' | 'team' | 'groq';

export interface ChatbotSettings {
    mode: ChatbotMode;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'chatbot-settings.json');

const DEFAULT_SETTINGS: ChatbotSettings = {
    mode: 'auto',
};

const ALLOWED_MODES: ChatbotMode[] = ['auto', 'local', 'public', 'team', 'groq'];

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export async function getChatbotSettings(): Promise<ChatbotSettings> {
    try {
        await ensureDataDir();
        const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<ChatbotSettings>;
        if (parsed?.mode && ALLOWED_MODES.includes(parsed.mode)) {
            return { mode: parsed.mode };
        }
        return DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export async function saveChatbotSettings(settings: ChatbotSettings): Promise<ChatbotSettings> {
    const mode = ALLOWED_MODES.includes(settings.mode) ? settings.mode : 'auto';
    const payload: ChatbotSettings = { mode };

    await ensureDataDir();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(payload, null, 2), 'utf-8');

    return payload;
}
