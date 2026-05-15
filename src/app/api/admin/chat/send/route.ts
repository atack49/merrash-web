import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phone, message, contactName } = body;

        if (!phone || !message) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
        const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

        if (!WHATSAPP_API_TOKEN || !PHONE_NUMBER_ID) {
            console.error("Faltan variables de entorno para WhatsApp API");
            return NextResponse.json({ error: 'Configuración de servidor incompleta' }, { status: 500 });
        }

        // 1. Enviar mensaje a través de WhatsApp Cloud API
        const response = await fetch(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: phone,
                type: "text",
                text: { preview_url: false, body: message }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error WhatsApp API:", errorData);
            throw new Error(errorData.error?.message || 'Error en WhatsApp API');
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
