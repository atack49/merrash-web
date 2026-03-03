import { auth } from '@/auth';
import { getGoogleCalendarSettings, saveGoogleCalendarSettings } from '@/lib/calendarSettings';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const settings = await getGoogleCalendarSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching Google Calendar settings:', error);
        return NextResponse.json({ error: 'Error fetching settings' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const embedUrl = String(body?.embedUrl ?? '').trim();
        const webhookUrl = String(body?.webhookUrl ?? '').trim();

        if (embedUrl && !/^https?:\/\//i.test(embedUrl)) {
            return NextResponse.json({ error: 'La URL embebida de Google Calendar no es válida.' }, { status: 400 });
        }

        if (webhookUrl && !/^https?:\/\//i.test(webhookUrl)) {
            return NextResponse.json({ error: 'La URL webhook no es válida.' }, { status: 400 });
        }

        const saved = await saveGoogleCalendarSettings({ embedUrl, webhookUrl });
        return NextResponse.json(saved);
    } catch (error) {
        console.error('Error saving Google Calendar settings:', error);
        return NextResponse.json({ error: 'Error saving settings' }, { status: 500 });
    }
}
