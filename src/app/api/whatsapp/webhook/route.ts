import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppWebhookBody, sendWhatsAppMessage } from '@/lib/whatsapp/api';
import { getChatMemory, saveChatMemory } from '@/lib/chatbot/chatMemory';
import { buildChatbotReply, ChatHistoryItem } from '@/lib/chatbot/merrashChatbot';
import {
    generateGroqChatbotReply,
    generatePublicHostedChatbotReply,
    generateTeamReviewedChatbotReply
} from '@/lib/chatbot/openaiChatbot';
import { getChatbotSettings } from '@/lib/chatbotSettings';
import { getGoogleCalendarSettings } from '@/lib/calendarSettings';
import { prisma } from '@/lib/db';
import { SERVICES } from '@/lib/data';

// Usar el mismo límite de historial
const CHATBOT_HISTORY_LIMIT = Number(process.env.CHATBOT_HISTORY_LIMIT || '120');

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

        // Responder en el entorno asíncrono puro (como el route del chatbot)
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
        const memory = await getChatMemory(conversationId);
        
        let history: ChatHistoryItem[] = memory?.history || [];
        
        // Evitar el mismo mensaje repetido en caso de reintentos rápidos de Meta
        if (history.length > 0 && history[history.length - 1].text === messageText && history[history.length - 1].role === 'user') {
            return;
        }

        history.push({ role: 'user', text: messageText });

        // Obtener la configuración actual del bot
        const fileSettings = await getChatbotSettings();
        const configuredMode = (fileSettings?.mode || process.env.CHATBOT_MODE || 'auto').toLowerCase();
        
        // Formatear servicios para la IA
        const staticServices = SERVICES.filter(s => s.active).map(s => ({
            title: s.title,
            category: s.category || null,
            description: s.description || null,
        }));
        const serviceTitles = staticServices.map(s => s.title);

        const aiInput = {
            message: messageText,
            history: history,
            services: serviceTitles,
            serviceCatalog: staticServices,
        };

        let botReply = '';

        // Simplificación del selector de modelo (En producción usa el de /api/chatbot)
        if (configuredMode === 'local') {
            const local = buildChatbotReply(messageText, history, { services: serviceTitles, serviceCatalog: staticServices });
            botReply = local.reply;
        } else {
            botReply = await generateTeamReviewedChatbotReply(aiInput) 
                    || await generatePublicHostedChatbotReply(aiInput)
                    || await generateGroqChatbotReply(aiInput)
                    || buildChatbotReply(messageText, history, { services: serviceTitles, serviceCatalog: staticServices }).reply;
        }

        if (!botReply) {
            botReply = "Lo siento, tuve un problema procesando tu petición. ¿Puedes intentarlo de nuevo?";
        }

        // Guardar la memoria antes de enviar el mensaje
        const nextHistory: ChatHistoryItem[] = [...history, { role: 'bot', text: botReply }];
        await saveChatMemory(conversationId, {
            history: nextHistory.slice(-CHATBOT_HISTORY_LIMIT)
        });

        // Enviar respuesta por WhatsApp
        await sendWhatsAppMessage(senderPhone, botReply);

    } catch (e) {
        console.error('Error al generar respuesta asíncrona de WhatsApp', e);
        await sendWhatsAppMessage(senderPhone, "Disculpa, hubo un problema técnico respondiendo a tu mensaje. Por favor intenta en un momento.");
    }
}
