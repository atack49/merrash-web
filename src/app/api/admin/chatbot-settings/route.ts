import { auth } from '@/auth';
import { getChatbotSettings, saveChatbotSettings } from '@/lib/chatbotSettings';
import { NextResponse } from 'next/server';

const ALLOWED_MODES = ['auto', 'local', 'public', 'team'];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const settings = await getChatbotSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching chatbot settings:', error);
        return NextResponse.json({ error: 'Error fetching chatbot settings' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const mode = String(body?.mode ?? 'auto').toLowerCase();

        if (!ALLOWED_MODES.includes(mode)) {
            return NextResponse.json({ error: 'Modo inválido. Usa: auto, team, public o local.' }, { status: 400 });
        }

        const saved = await saveChatbotSettings({ mode: mode as 'auto' | 'local' | 'public' | 'team' });
        return NextResponse.json(saved);
    } catch (error) {
        console.error('Error updating chatbot settings:', error);
        return NextResponse.json({ error: 'Error updating chatbot settings' }, { status: 500 });
    }
}
