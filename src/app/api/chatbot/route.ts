import { NextRequest, NextResponse } from 'next/server';
import { processChatbotMessage } from '@/lib/chatbot/core';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const origin = req.nextUrl.origin;

        const result = await processChatbotMessage({
            message: body?.message,
            conversationId: body?.conversationId,
            history: body?.history,
            origin: origin,
        });

        if (result.error && result.error === 'Mensaje vacío') {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }
        
        if (result.error) {
            // Se puede registrar de manera más profunda si se requiere
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Eliminar el objeto error del resultado enviado al frontend si existe vacio
        const { error, ...validResult } = result;
        return NextResponse.json(validResult);
    } catch (e) {
        console.error('Error in chatbot wrapper:', e);
        return NextResponse.json({ error: 'Error procesando chatbot' }, { status: 500 });
    }
}
