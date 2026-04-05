import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';
import { parsePreferredDate, parsePreferredTime } from '@/lib/chatbot/businessSchedule';
import { getGoogleCalendarSettings } from '@/lib/calendarSettings';
import { sendAppointmentToGoogleCalendar } from '@/lib/calendarWebhook';
import { getSlotCapacity } from '@/lib/appointments/capacity';

export async function GET() {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        let appointments: any[] = [];
        try {
            appointments = await prisma.appointment.findMany({
                select: {
                    id: true,
                    customerName: true,
                    source: true,
                    email: true,
                    phone: true,
                    preferredDate: true,
                    preferredTime: true,
                    service: true,
                    notes: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    surveyId: true,
                    survey: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        } catch {
            appointments = await prisma.appointment.findMany({
                select: {
                    id: true,
                    customerName: true,
                    email: true,
                    phone: true,
                    preferredDate: true,
                    preferredTime: true,
                    service: true,
                    notes: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    surveyId: true,
                    survey: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }

        return NextResponse.json(appointments, { status: 200 });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch appointments' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const body = await request.json();

        const email = String(body?.email || '').trim().toLowerCase();
        const phone = String(body?.phone || '').trim();
        const service = String(body?.service || '').trim();
        const preferredDateRaw = String(body?.preferredDate || '').trim();
        const preferredTimeRaw = String(body?.preferredTime || '').trim();
        const customerName = String(body?.customerName || '').trim();
        const notesRaw = String(body?.notes || '').trim();

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
        }

        if (!service) {
            return NextResponse.json({ error: 'Servicio requerido.' }, { status: 400 });
        }

        if (!preferredDateRaw || !preferredTimeRaw) {
            return NextResponse.json({ error: 'Fecha y hora son requeridas.' }, { status: 400 });
        }

        const parsedDate = parsePreferredDate(preferredDateRaw);
        const parsedTime = parsePreferredTime(preferredTimeRaw);

        if (!parsedDate || parsedTime === null) {
            return NextResponse.json({ error: 'No se pudo interpretar fecha u hora.' }, { status: 400 });
        }

        const normalizedDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
        const normalizedTime = `${String(Math.floor(parsedTime / 60)).padStart(2, '0')}:${String(parsedTime % 60).padStart(2, '0')}`;

        const capacity = await getSlotCapacity({
            preferredDate: normalizedDate,
            preferredTime: normalizedTime,
            service,
        });

        if (capacity.totalFull) {
            return NextResponse.json({ error: 'Ese horario ya alcanzó el límite total de 5 citas por hora.' }, { status: 409 });
        }

        if (capacity.serviceFull) {
            return NextResponse.json({ error: `Ese horario ya alcanzó el límite de 2 citas para ${service} por hora.` }, { status: 409 });
        }

        const notesParts = [
            customerName ? `Cliente: ${customerName}` : '',
            notesRaw,
            'Creada manualmente por admin.',
        ].filter(Boolean);

        let created: any;
        try {
            created = await prisma.appointment.create({
                data: {
                    customerName: customerName || undefined,
                    source: 'global',
                    email,
                    phone: phone || undefined,
                    preferredDate: normalizedDate,
                    preferredTime: normalizedTime,
                    service,
                    notes: notesParts.join(' '),
                    status: 'pending',
                },
                select: {
                    id: true,
                    customerName: true,
                    source: true,
                    email: true,
                    phone: true,
                    preferredDate: true,
                    preferredTime: true,
                    service: true,
                    notes: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        } catch {
            created = await prisma.appointment.create({
                data: {
                    customerName: customerName || undefined,
                    email,
                    phone: phone || undefined,
                    preferredDate: normalizedDate,
                    preferredTime: normalizedTime,
                    service,
                    notes: notesParts.join(' '),
                    status: 'pending',
                },
                select: {
                    id: true,
                    customerName: true,
                    email: true,
                    phone: true,
                    preferredDate: true,
                    preferredTime: true,
                    service: true,
                    notes: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }

        try {
            const googleSettings = await getGoogleCalendarSettings();
            if (googleSettings.webhookUrl && normalizedDate && normalizedTime) {
                const createResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                    action: 'create',
                    name: customerName || 'Cliente',
                    email,
                    phone: phone || undefined,
                    service,
                    preferredDate: normalizedDate,
                    preferredTime: normalizedTime,
                    notes: notesParts.join(' '),
                    source: 'chatbot-web',
                });

                if (createResult.sent && createResult.eventId) {
                    try {
                        await prisma.appointment.update({
                            where: { id: created.id },
                            data: {
                                googleEventId: createResult.eventId,
                                source: 'google',
                            },
                        });

                        try {
                            created = await prisma.appointment.findUnique({
                                where: { id: created.id },
                                select: {
                                    id: true,
                                    customerName: true,
                                    source: true,
                                    email: true,
                                    phone: true,
                                    preferredDate: true,
                                    preferredTime: true,
                                    service: true,
                                    notes: true,
                                    status: true,
                                    createdAt: true,
                                    updatedAt: true,
                                },
                            }) || created;
                        } catch {
                        }
                    } catch {
                    }
                }
            }
        } catch (syncError) {
            console.error('Error syncing manual appointment to Google:', syncError);
        }

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating admin appointment:', error);
        return NextResponse.json({ error: 'No se pudo crear la cita.' }, { status: 500 });
    }
}
