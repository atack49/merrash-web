import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const phone = url.searchParams.get('phone');

        // Si pasan un teléfono, devolvemos los mensajes de esa conversación
        if (phone) {
            const messages = await prisma.chatMessage.findMany({
                where: { phone },
                orderBy: { createdAt: 'asc' },
            });
            return NextResponse.json({ data: messages });
        }

        // Si no, devolvemos la lista de contactos única agrupada por último mensaje
        const latestMessages = await prisma.chatMessage.findMany({
            orderBy: { createdAt: 'desc' },
            distinct: ['phone'],
            select: {
                phone: true,
                contactName: true,
                body: true,
                createdAt: true,
            }
        });

        const contacts = latestMessages.map(msg => ({
            phone: msg.phone,
            contactName: msg.contactName || '',
            lastMessage: msg.body,
            updatedAt: msg.createdAt,
        }));

        return NextResponse.json({ data: contacts });
    } catch (error: any) {
        console.error("Error obteniendo mensajes:", error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
