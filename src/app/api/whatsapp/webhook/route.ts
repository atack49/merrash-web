import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppWebhookBody, sendWhatsAppMessage } from '@/lib/whatsapp/api';
import { processChatbotMessage } from '@/lib/chatbot/core';

/**
 * Handle GET requests (Webhook Verification from Meta)
 */
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('WhatsApp Webhook Verified!');
        return new NextResponse(challenge, { status: 200 });
    }

    console.error('WhatsApp Webhook Verification Failed');
    return new NextResponse('Forbidden', { status: 403 });
}

/**
 * Handle POST requests (Incoming messages from WhatsApp)
 */
export async function POST(req: NextRequest) {
    try {
        const body: WhatsAppWebhookBody = await req.json();

        // Verificar que sea un evento de estado de WhatsApp
        if (body.object !== 'whatsapp_business_account') {
            return new NextResponse('Not Found', { status: 404 });
        }

        // Extraer el mensaje
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const messageValue = change?.value;
        const message = messageValue?.messages?.[0];

        // Si no hay texto, ignoramos y devolvemos 200 para que Meta no reintente
        if (!message || message.type !== 'text' || !message.text) {
            return new NextResponse('OK', { status: 200 });
        }

        let senderPhone = message.from;
        const textBody = message.text.body;

        // WhatsApp / Meta tiene un "bug" con los números de México en modo de prueba.
        // Los webhooks nos mandan el número como 521 (ej: 521722...), 
        // pero la lista de aprobados de Meta lo guarda como 52 (ej: 52722...).
        // Así que le quitamos ese '1' extra si viene de México.
        if (senderPhone.startsWith('521') && senderPhone.length === 13) {
            senderPhone = '52' + senderPhone.substring(3);
        }

        console.log(`Mensaje recibido de ${senderPhone}: ${textBody}`);

        // Responder en el entorno asíncrono puro
        await processIncomingWhatsAppMessage(senderPhone, textBody);

        // Devolver un 200 ok rápidamente a Meta
        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error('Error procesando webhook de WhatsApp:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

async function processIncomingWhatsAppMessage(senderPhone: string, messageText: string) {
    try {
        const conversationId = `wa-${senderPhone}`;
        const origin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Delegamos todo el flujo (manejo de contexto, validación de fechas, IA, base de datos de citas y webhook de google)
        // a la función core unificada.
        const result = await processChatbotMessage({
            message: messageText,
            conversationId,
            origin
        });

        let finalReply = result.reply || "Lo siento, tuve un problema procesando tu petición. ¿Puedes intentarlo de nuevo?";

        if (result.actions && result.actions.length > 0) {
            // Formatear acciones sugeridas para que el usuario pueda leerlas y elegirlas enviando otro texto.
            // Para "confirmar cita" el chatbot usualmente filtra los iconos ✅
            const actionsText = result.actions.map(action => `- ${action.userText || action.label}`).join('\n');
            if (actionsText) {
                finalReply += '\n\nOpciones sugeridas:\n' + actionsText;
            }
        }

        // Enviar respuesta compilada por WhatsApp
        await sendWhatsAppMessage(senderPhone, finalReply);

    } catch (e) {
        console.error('Error al generar respuesta asíncrona de WhatsApp', e);
        await sendWhatsAppMessage(senderPhone, "Disculpa, hubo un problema técnico respondiendo a tu mensaje. Por favor intenta en un momento.");
    }
}
