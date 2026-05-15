import { NextRequest, NextResponse, after } from 'next/server';
import { WhatsAppWebhookBody, sendWhatsAppMessage } from '@/lib/whatsapp/api';
import { processChatbotMessage } from '@/lib/chatbot/core';
import { prisma } from '@/lib/db';

/**
 * Handle GET requests (Webhook Verification from Meta)
 */
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    console.log('--- INTENTO DE VERIFICACIÓN WEBHOOK ---');
    console.log('Mode:', mode);
    console.log('Token recibido:', token);
    console.log('Verify Token esperado:', verifyToken);

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('¡Webhook de WhatsApp Verificado con éxito!');
        return new NextResponse(challenge, { status: 200 });
    }

    console.error('La Verificación del Webhook de WhatsApp Falló');
    return new NextResponse('Forbidden', { status: 403 });
}

/**
 * Handle POST requests (Incoming messages from WhatsApp)
 */
export async function POST(req: NextRequest) {
    try {
        const body: WhatsAppWebhookBody = await req.json();
        console.log('--- NUEVA PETICIÓN WEBHOOK ---');
        console.log('Body:', JSON.stringify(body, null, 2));

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

        // Responder en background sin bloquear la respuesta a Meta
        after(async () => {
            await processIncomingWhatsAppMessage(senderPhone, textBody);
        });

        // Devolver un 200 ok rápidamente a Meta
        console.log('Webhook procesado con éxito, enviando 200 OK');
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
        console.log(`Procesando mensaje para ${senderPhone} con origen ${origin}`);

        // Guardar el mensaje entrante del paciente en la base de datos
        await prisma.chatMessage.create({
            data: {
                phone: senderPhone,
                body: messageText,
                sender: 'paciente',
            }
        });

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
        console.log(`Enviando respuesta a ${senderPhone}: ${finalReply}`);
        const sent = await sendWhatsAppMessage(senderPhone, finalReply);
        console.log(`Estado del envío: ${sent ? 'ÉXITO' : 'ERROR'}`);

        if (sent) {
            // Guardar la respuesta del bot en la base de datos
            await prisma.chatMessage.create({
                data: {
                    phone: senderPhone,
                    body: finalReply,
                    sender: 'bot',
                }
            });
        }

    } catch (e) {
        console.error('Error al generar respuesta asíncrona de WhatsApp', e);
        await sendWhatsAppMessage(senderPhone, "Disculpa, hubo un problema técnico respondiendo a tu mensaje. Por favor intenta en un momento.");
    }
}
