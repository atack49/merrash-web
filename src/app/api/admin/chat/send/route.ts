import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendWhatsAppMessage } from '@/lib/whatsapp/api';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phone, message, contactName } = body;

        if (!phone || !message) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        // 1. Enviar mensaje a través del helper centralizado de WhatsApp
        const isSent = await sendWhatsAppMessage(phone, message);

        if (!isSent) {
            console.error("Error enviando el mensaje a través de WhatsApp Cloud API");
            throw new Error('No se pudo enviar el mensaje a través de WhatsApp. Verifica los tokens del servidor.');
        }

        // 2. Guardar en la base de datos
        const savedMessage = await prisma.chatMessage.create({
            data: {
                phone,
                contactName: contactName || 'Desconocido',
                body: message,
                sender: 'admin'
            }
        });

        return NextResponse.json({ success: true, data: savedMessage });
    } catch (error: any) {
        console.error("Error al enviar mensaje:", error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
