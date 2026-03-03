import fs from 'fs/promises';
import path from 'path';
import { ChatHistoryItem } from '@/lib/chatbot/merrashChatbot';
import { BookingData } from '@/lib/chatbot/bookingAssistant';

export interface ChatMemoryState {
    conversationId: string;
    dateKey: string;
    history: ChatHistoryItem[];
    bookingDraft?: BookingData;
    pendingConfirmation?: boolean;
    updatedAt: string;
}

type ChatMemoryStore = Record<string, ChatMemoryState>;

const DATA_DIR = path.join(process.cwd(), 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'chatbot-memory.json');
const MAX_HISTORY_ITEMS = 400;
const MAX_DAYS_TO_KEEP = 7;

const getTodayKey = () =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());

const buildKey = (conversationId: string, dateKey: string) => `${dateKey}::${conversationId}`;

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

async function readStore(): Promise<ChatMemoryStore> {
    await ensureDataDir();
    try {
        const raw = await fs.readFile(MEMORY_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as ChatMemoryStore;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

async function writeStore(store: ChatMemoryStore) {
    await ensureDataDir();
    await fs.writeFile(MEMORY_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function cleanupOldDays(store: ChatMemoryStore, todayKey: string) {
    const keys = Object.keys(store);
    keys.forEach((key) => {
        const [dateKey] = key.split('::');
        const ageMs = new Date(`${todayKey}T00:00:00`).getTime() - new Date(`${dateKey}T00:00:00`).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (Number.isFinite(ageDays) && ageDays > MAX_DAYS_TO_KEEP) {
            delete store[key];
        }
    });
}

export async function getChatMemory(conversationId: string): Promise<ChatMemoryState | null> {
    const safeConversationId = String(conversationId || '').trim();
    if (!safeConversationId) return null;

    const store = await readStore();
    const todayKey = getTodayKey();
    const key = buildKey(safeConversationId, todayKey);
    return store[key] || null;
}

export async function saveChatMemory(
    conversationId: string,
    patch: Partial<Omit<ChatMemoryState, 'conversationId' | 'dateKey' | 'updatedAt'>>
): Promise<ChatMemoryState | null> {
    const safeConversationId = String(conversationId || '').trim();
    if (!safeConversationId) return null;

    const store = await readStore();
    const todayKey = getTodayKey();
    const key = buildKey(safeConversationId, todayKey);

    const previous = store[key];
    const merged: ChatMemoryState = {
        conversationId: safeConversationId,
        dateKey: todayKey,
        history: (patch.history || previous?.history || []).slice(-MAX_HISTORY_ITEMS),
        bookingDraft: patch.bookingDraft ?? previous?.bookingDraft,
        pendingConfirmation: patch.pendingConfirmation ?? previous?.pendingConfirmation ?? false,
        updatedAt: new Date().toISOString(),
    };

    store[key] = merged;
    cleanupOldDays(store, todayKey);
    await writeStore(store);
    return merged;
}
