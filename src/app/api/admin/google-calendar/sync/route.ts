import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { getCalendarIdFromEmbedUrl, getGoogleCalendarSettings } from '@/lib/calendarSettings';
import { sendAppointmentToGoogleCalendar } from '@/lib/calendarWebhook';

const LOOKBACK_DAYS = 30;
const LOOKAHEAD_DAYS = 365;

type GoogleListEvent = {
    eventId?: string;
    title?: string;
    description?: string;
    preferredDate?: string;
    preferredTime?: string;
    attendeeEmails?: string[];
    status?: string;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getDescriptionValue = (description: string, label: string) => {
    const regex = new RegExp(`^${escapeRegex(label)}:\\s*(.+)$`, 'im');
    const match = description.match(regex);
    return match?.[1]?.trim() || '';
};

const buildCompositeKey = (email: string, preferredDate: string, preferredTime: string, service: string) =>
    [email.trim().toLowerCase(), preferredDate.trim(), preferredTime.trim(), service.trim().toLowerCase()].join('|');

const getFallbackEmailFromEventId = (eventId: string) => {
    const cleaned = String(eventId || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    return cleaned ? `google.event.${cleaned}@merrash.local` : '';
};

const normalizeGoogleEvent = (event: GoogleListEvent) => {
    const description = String(event.description || '');
    const customerName = getDescriptionValue(description, 'Cliente');
    const emailFromDescription = getDescriptionValue(description, 'Email').toLowerCase();
    const phone = getDescriptionValue(description, 'Telefono') || getDescriptionValue(description, 'Teléfono');
    const serviceFromDescription = getDescriptionValue(description, 'Servicio');
    const notes = getDescriptionValue(description, 'Notas');
    const attendeeEmails = Array.isArray(event.attendeeEmails)
        ? event.attendeeEmails.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
        : [];
    const fallbackEmail = getFallbackEmailFromEventId(String(event.eventId || ''));
    const email = emailFromDescription || attendeeEmails[0] || fallbackEmail;
    const service = serviceFromDescription || String(event.title || '').replace(/^Cita Merrash\s*-\s*/i, '').trim() || 'Servicio';
    const preferredDate = String(event.preferredDate || '').trim();
    const preferredTime = String(event.preferredTime || '').trim();

    return {
        googleEventId: String(event.eventId || '').trim(),
        customerName,
        email,
        phone,
        service,
        notes,
        preferredDate,
        preferredTime,
        status: event.status === 'cancelled' ? 'cancelled' : 'pending',
    };
};

export async function POST() {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const googleSettings = await getGoogleCalendarSettings();
        const calendarId = getCalendarIdFromEmbedUrl(googleSettings.embedUrl);
        if (!googleSettings.webhookUrl) {
            return NextResponse.json(
                { error: 'Primero configura la URL webhook de Google Calendar.' },
                { status: 400 }
            );
        }

        const appointments = await prisma.appointment.findMany({
            select: {
                id: true,
                customerName: true,
                source: true,
                email: true,
                phone: true,
                preferredDate: true,
                preferredTime: true,
                service: true,
                googleEventId: true,
                notes: true,
                status: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const byEventId = new Map<string, (typeof appointments)[number]>();
        const byComposite = new Map<string, (typeof appointments)[number]>();

        appointments.forEach((appointment) => {
            if (appointment.googleEventId) {
                byEventId.set(appointment.googleEventId, appointment);
            }
            if (appointment.email && appointment.preferredDate && appointment.preferredTime) {
                byComposite.set(
                    buildCompositeKey(
                        appointment.email,
                        appointment.preferredDate,
                        appointment.preferredTime,
                        appointment.service || ''
                    ),
                    appointment
                );
            }
        });

        let pushedToGoogle = 0;
        let importedFromGoogle = 0;
        let linkedExisting = 0;
        let updatedExisting = 0;
        const warnings: string[] = [];

        for (const appointment of appointments) {
            if (appointment.status === 'cancelled') continue;
            if (!appointment.preferredDate || !appointment.preferredTime) continue;
            if (appointment.googleEventId) continue;

            const createResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                action: 'create',
                calendarId: calendarId || undefined,
                name: appointment.customerName || 'Cliente',
                email: appointment.email,
                phone: appointment.phone || undefined,
                service: appointment.service || undefined,
                preferredDate: appointment.preferredDate,
                preferredTime: appointment.preferredTime,
                notes: appointment.notes || undefined,
                source: 'google-sync',
            });

            if (!createResult.sent || !createResult.eventId) {
                warnings.push(`No se pudo subir a Google la cita ${appointment.id}.`);
                continue;
            }

            const updated = await prisma.appointment.update({
                where: { id: appointment.id },
                data: {
                    googleEventId: createResult.eventId,
                    source: 'google',
                },
            });

            byEventId.set(createResult.eventId, updated as (typeof appointments)[number]);
            byComposite.set(
                buildCompositeKey(updated.email, updated.preferredDate || '', updated.preferredTime || '', updated.service || ''),
                updated as (typeof appointments)[number]
            );
            pushedToGoogle += 1;
        }

        const rangeStart = new Date();
        rangeStart.setDate(rangeStart.getDate() - LOOKBACK_DAYS);
        const rangeEnd = new Date();
        rangeEnd.setDate(rangeEnd.getDate() + LOOKAHEAD_DAYS);

        const listResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
            action: 'list',
            calendarId: calendarId || undefined,
            timeMin: rangeStart.toISOString(),
            timeMax: rangeEnd.toISOString(),
            includeDeleted: false,
            source: 'google-sync',
        });

        const googleEvents = Array.isArray(listResult.data?.events) ? (listResult.data.events as GoogleListEvent[]) : [];

        if (!listResult.sent) {
            return NextResponse.json(
                {
                    error: 'No se pudo leer Google Calendar.',
                    details: listResult.data || null,
                    stats: { pushedToGoogle, importedFromGoogle, linkedExisting, updatedExisting, warnings },
                },
                { status: 502 }
            );
        }

        for (const event of googleEvents) {
            const normalized = normalizeGoogleEvent(event);
            if (!normalized.googleEventId) continue;
            if (normalized.status === 'cancelled') continue;
            if (!normalized.preferredDate || !normalized.preferredTime) {
                warnings.push(`Evento ${normalized.googleEventId} omitido por falta de fecha u hora.`);
                continue;
            }

            const compositeKey = buildCompositeKey(
                normalized.email,
                normalized.preferredDate,
                normalized.preferredTime,
                normalized.service || ''
            );

            const existingByEvent = byEventId.get(normalized.googleEventId);
            if (existingByEvent) {
                const updated = await prisma.appointment.update({
                    where: { id: existingByEvent.id },
                    data: {
                        customerName: normalized.customerName || existingByEvent.customerName || undefined,
                        source: 'google',
                        email: normalized.email,
                        phone: normalized.phone || existingByEvent.phone || undefined,
                        preferredDate: normalized.preferredDate,
                        preferredTime: normalized.preferredTime,
                        service: normalized.service || existingByEvent.service || undefined,
                        notes: normalized.notes || existingByEvent.notes || undefined,
                        status: existingByEvent.status === 'cancelled' ? existingByEvent.status : 'pending',
                    },
                });
                byComposite.set(compositeKey, updated as (typeof appointments)[number]);
                updatedExisting += 1;
                continue;
            }

            const existingByComposite = byComposite.get(compositeKey);
            if (existingByComposite) {
                const updated = await prisma.appointment.update({
                    where: { id: existingByComposite.id },
                    data: {
                        customerName: normalized.customerName || existingByComposite.customerName || undefined,
                        googleEventId: normalized.googleEventId,
                        source: 'google',
                        email: normalized.email,
                        phone: normalized.phone || existingByComposite.phone || undefined,
                        preferredDate: normalized.preferredDate,
                        preferredTime: normalized.preferredTime,
                        service: normalized.service || existingByComposite.service || undefined,
                        notes: normalized.notes || existingByComposite.notes || undefined,
                    },
                });
                byEventId.set(normalized.googleEventId, updated as (typeof appointments)[number]);
                byComposite.set(compositeKey, updated as (typeof appointments)[number]);
                linkedExisting += 1;
                continue;
            }

            const created = await prisma.appointment.create({
                data: {
                    customerName: normalized.customerName || undefined,
                    source: 'google',
                    email: normalized.email,
                    phone: normalized.phone || undefined,
                    preferredDate: normalized.preferredDate,
                    preferredTime: normalized.preferredTime,
                    service: normalized.service || undefined,
                    googleEventId: normalized.googleEventId,
                    notes: normalized.notes || undefined,
                    status: 'pending',
                },
            });
            byEventId.set(normalized.googleEventId, created as (typeof appointments)[number]);
            byComposite.set(compositeKey, created as (typeof appointments)[number]);
            importedFromGoogle += 1;
        }

        return NextResponse.json({
            ok: true,
            stats: {
                pushedToGoogle,
                importedFromGoogle,
                linkedExisting,
                updatedExisting,
                googleEventsRead: googleEvents.length,
                warnings,
            },
        });
    } catch (error) {
        console.error('Error syncing Google Calendar:', error);
        return NextResponse.json({ error: 'No se pudo sincronizar con Google Calendar.' }, { status: 500 });
    }
}
