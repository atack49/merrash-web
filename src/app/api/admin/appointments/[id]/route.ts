import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { updateAppointmentSchema } from '@/lib/validators';
import { getGoogleCalendarSettings } from '@/lib/calendarSettings';
import { sendAppointmentToGoogleCalendar } from '@/lib/calendarWebhook';
import { getSlotCapacity } from '@/lib/appointments/capacity';
import { NextResponse, NextRequest } from 'next/server';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const { id } = await params;
        const body = await request.json();

        // Validate input
        const validatedData = updateAppointmentSchema.parse(body);
        const updateData: Record<string, string> = {};

        if (validatedData.status !== undefined) {
            updateData.status = validatedData.status;
        }
        if (validatedData.customerName !== undefined) {
            updateData.customerName = validatedData.customerName;
        }
        if (validatedData.email !== undefined) {
            updateData.email = validatedData.email.trim().toLowerCase();
        }
        if (validatedData.phone !== undefined) {
            updateData.phone = validatedData.phone;
        }
        if (validatedData.service !== undefined) {
            updateData.service = validatedData.service;
        }
        if (validatedData.preferredDate !== undefined) {
            updateData.preferredDate = validatedData.preferredDate;
        }
        if (validatedData.preferredTime !== undefined) {
            updateData.preferredTime = validatedData.preferredTime;
        }
        if (validatedData.notes !== undefined) {
            updateData.notes = validatedData.notes;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Check if appointment exists
        let appointment: any;
        try {
            appointment = await prisma.appointment.findUnique({
                where: { id },
                select: {
                    id: true,
                    customerName: true,
                    email: true,
                    phone: true,
                    service: true,
                    preferredDate: true,
                    preferredTime: true,
                    notes: true,
                    googleEventId: true,
                },
            });
        } catch {
            appointment = await prisma.appointment.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    service: true,
                    preferredDate: true,
                    preferredTime: true,
                    notes: true,
                },
            });
        }

        if (!appointment) {
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404 }
            );
        }

        const nextDate = updateData.preferredDate ?? appointment.preferredDate;
        const nextTime = updateData.preferredTime ?? appointment.preferredTime;
        const nextService = updateData.service ?? appointment.service;
        const nextStatus = updateData.status ?? 'pending';

        if (nextStatus !== 'cancelled' && nextDate && nextTime) {
            const capacity = await getSlotCapacity({
                preferredDate: nextDate,
                preferredTime: nextTime,
                service: nextService,
                excludeId: id,
            });

            if (capacity.totalFull) {
                return NextResponse.json(
                    { error: 'Ese horario ya alcanzó el límite total de 5 citas por hora.' },
                    { status: 409 }
                );
            }

            if (capacity.serviceFull) {
                return NextResponse.json(
                    { error: `Ese horario ya alcanzó el límite de 2 citas para ${nextService || 'ese servicio'} por hora.` },
                    { status: 409 }
                );
            }
        }

        // Update appointment in Global DB (always first)
        const updatedBase = await prisma.appointment.update({
            where: { id },
            data: updateData,
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
                survey: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        let updatedAppointment: any = updatedBase;
        try {
            const enriched = await prisma.appointment.findUnique({
                where: { id },
                select: {
                    id: true,
                    source: true,
                    customerName: true,
                    email: true,
                    phone: true,
                    preferredDate: true,
                    preferredTime: true,
                    service: true,
                    googleEventId: true,
                    notes: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    survey: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });

            if (enriched) {
                updatedAppointment = enriched;
            }
        } catch {
        }

        let googleSync: any = {
            attempted: false,
            ok: true,
            mode: 'none',
        };

        try {
            const googleSettings = await getGoogleCalendarSettings();
            const hasWebhook = Boolean(googleSettings.webhookUrl);
            const hasSlot = Boolean(updatedAppointment.preferredDate && updatedAppointment.preferredTime);
            const shouldDeleteOnly = updatedAppointment.status === 'cancelled';
            const finalName = updatedAppointment.customerName || appointment.customerName || 'Cliente';

            if (!hasWebhook) {
                googleSync = {
                    attempted: false,
                    ok: false,
                    mode: 'missing-webhook',
                };
            } else if (appointment.googleEventId) {
                googleSync = {
                    attempted: true,
                    ok: false,
                    mode: shouldDeleteOnly ? 'delete-only' : 'update-first',
                };

                if (shouldDeleteOnly) {
                    const deleteResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                        action: 'delete',
                        eventId: appointment.googleEventId,
                        name: finalName,
                        email: updatedAppointment.email || appointment.email,
                        phone: updatedAppointment.phone || appointment.phone || undefined,
                        service: updatedAppointment.service || appointment.service || undefined,
                        preferredDate: updatedAppointment.preferredDate || appointment.preferredDate || undefined,
                        preferredTime: updatedAppointment.preferredTime || appointment.preferredTime || undefined,
                        notes: updatedAppointment.notes || appointment.notes || undefined,
                        source: 'chatbot-web',
                    });

                    googleSync.delete = {
                        sent: Boolean(deleteResult?.sent),
                        status: deleteResult?.status,
                        reason: deleteResult?.reason,
                    };
                    googleSync.ok = Boolean(deleteResult?.sent);
                } else if (hasSlot) {
                    const updateResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                        action: 'update',
                        eventId: appointment.googleEventId,
                        name: finalName,
                        email: updatedAppointment.email || appointment.email,
                        phone: updatedAppointment.phone || appointment.phone || undefined,
                        service: updatedAppointment.service || appointment.service || undefined,
                        preferredDate: updatedAppointment.preferredDate || appointment.preferredDate || undefined,
                        preferredTime: updatedAppointment.preferredTime || appointment.preferredTime || undefined,
                        notes: updatedAppointment.notes || appointment.notes || undefined,
                        source: 'chatbot-web',
                    });

                    googleSync.update = {
                        sent: Boolean(updateResult?.sent),
                        status: updateResult?.status,
                        reason: updateResult?.reason,
                        eventId: updateResult?.eventId,
                    };

                    if (updateResult?.sent) {
                        googleSync.ok = true;
                        googleSync.mode = 'updated';
                    } else {
                        googleSync.mode = 'replace-fallback';

                        const deleteResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                            action: 'delete',
                            eventId: appointment.googleEventId,
                            name: finalName,
                            email: updatedAppointment.email || appointment.email,
                            phone: updatedAppointment.phone || appointment.phone || undefined,
                            service: updatedAppointment.service || appointment.service || undefined,
                            preferredDate: updatedAppointment.preferredDate || appointment.preferredDate || undefined,
                            preferredTime: updatedAppointment.preferredTime || appointment.preferredTime || undefined,
                            notes: updatedAppointment.notes || appointment.notes || undefined,
                            source: 'chatbot-web',
                        });

                        googleSync.delete = {
                            sent: Boolean(deleteResult?.sent),
                            status: deleteResult?.status,
                            reason: deleteResult?.reason,
                        };

                        if (!deleteResult?.sent) {
                            googleSync.ok = false;
                        } else {
                            const createResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                                action: 'create',
                                name: finalName,
                                email: updatedAppointment.email || appointment.email,
                                phone: updatedAppointment.phone || appointment.phone || undefined,
                                service: updatedAppointment.service || appointment.service || undefined,
                                preferredDate: updatedAppointment.preferredDate || appointment.preferredDate || undefined,
                                preferredTime: updatedAppointment.preferredTime || appointment.preferredTime || undefined,
                                notes: updatedAppointment.notes || appointment.notes || undefined,
                                source: 'chatbot-web',
                            });

                            googleSync.create = {
                                sent: Boolean(createResult?.sent),
                                status: createResult?.status,
                                reason: createResult?.reason,
                                eventId: createResult?.eventId,
                            };

                            if (createResult.sent && createResult.eventId) {
                                try {
                                    await prisma.appointment.update({
                                        where: { id },
                                        data: { googleEventId: createResult.eventId },
                                    });
                                } catch {
                                }

                                try {
                                    const refreshed = await prisma.appointment.findUnique({
                                        where: { id },
                                        select: {
                                            id: true,
                                            source: true,
                                            customerName: true,
                                            email: true,
                                            phone: true,
                                            preferredDate: true,
                                            preferredTime: true,
                                            service: true,
                                            googleEventId: true,
                                            notes: true,
                                            status: true,
                                            createdAt: true,
                                            updatedAt: true,
                                            survey: {
                                                select: {
                                                    id: true,
                                                    title: true,
                                                },
                                            },
                                        },
                                    });
                                    if (refreshed) {
                                        updatedAppointment = refreshed;
                                    }
                                } catch {
                                }
                            }

                            googleSync.ok = Boolean(createResult?.sent && createResult?.eventId);
                        }
                    }
                } else {
                    googleSync.ok = true;
                    googleSync.mode = 'skipped-no-slot';
                }
            } else if (!shouldDeleteOnly && hasSlot) {
                googleSync = {
                    attempted: true,
                    ok: false,
                    mode: 'create-missing-event-id',
                };

                const createResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                    action: 'create',
                    name: finalName,
                    email: updatedAppointment.email || appointment.email,
                    phone: updatedAppointment.phone || appointment.phone || undefined,
                    service: updatedAppointment.service || appointment.service || undefined,
                    preferredDate: updatedAppointment.preferredDate || appointment.preferredDate || undefined,
                    preferredTime: updatedAppointment.preferredTime || appointment.preferredTime || undefined,
                    notes: updatedAppointment.notes || appointment.notes || undefined,
                    source: 'chatbot-web',
                });

                googleSync.create = {
                    sent: Boolean(createResult?.sent),
                    status: createResult?.status,
                    reason: createResult?.reason,
                    eventId: createResult?.eventId,
                };

                if (createResult.sent && createResult.eventId) {
                    try {
                        await prisma.appointment.update({
                            where: { id },
                            data: { googleEventId: createResult.eventId },
                        });
                    } catch {
                    }

                    try {
                        const refreshed = await prisma.appointment.findUnique({
                            where: { id },
                            select: {
                                id: true,
                                source: true,
                                customerName: true,
                                email: true,
                                phone: true,
                                preferredDate: true,
                                preferredTime: true,
                                service: true,
                                googleEventId: true,
                                notes: true,
                                status: true,
                                createdAt: true,
                                updatedAt: true,
                                survey: {
                                    select: {
                                        id: true,
                                        title: true,
                                    },
                                },
                            },
                        });
                        if (refreshed) {
                            updatedAppointment = refreshed;
                        }
                    } catch {
                    }

                    googleSync.ok = true;
                }
            } else {
                googleSync = {
                    attempted: false,
                    ok: true,
                    mode: 'skipped-no-event-id',
                };
            }
        } catch (syncError) {
            console.error('Google Calendar sync failed for appointment update:', syncError);
            googleSync = {
                attempted: true,
                ok: false,
                mode: 'error',
                error: syncError instanceof Error ? syncError.message : 'unknown_error',
            };
        }

        return NextResponse.json({ ...updatedAppointment, googleSync }, { status: 200 });
    } catch (error: any) {
        console.error('Error updating appointment:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid input', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update appointment' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const { id } = await params;

        const appointment = await prisma.appointment.findUnique({
            where: { id },
            select: {
                id: true,
                customerName: true,
                email: true,
                phone: true,
                service: true,
                preferredDate: true,
                preferredTime: true,
                notes: true,
                googleEventId: true,
            },
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        let googleSync: any = {
            attempted: false,
            ok: true,
            mode: 'skipped-no-event-id',
        };

        try {
            if (appointment.googleEventId) {
                const googleSettings = await getGoogleCalendarSettings();
                if (googleSettings.webhookUrl) {
                    const deleteResult = await sendAppointmentToGoogleCalendar(googleSettings.webhookUrl, {
                        action: 'delete',
                        eventId: appointment.googleEventId,
                        name: appointment.customerName || 'Cliente',
                        email: appointment.email,
                        phone: appointment.phone || undefined,
                        service: appointment.service || undefined,
                        preferredDate: appointment.preferredDate || undefined,
                        preferredTime: appointment.preferredTime || undefined,
                        notes: appointment.notes || undefined,
                        source: 'chatbot-web',
                    });

                    googleSync = {
                        attempted: true,
                        ok: Boolean(deleteResult?.sent),
                        mode: 'delete',
                        status: deleteResult?.status,
                        reason: deleteResult?.reason,
                    };
                } else {
                    googleSync = {
                        attempted: true,
                        ok: false,
                        mode: 'missing-webhook',
                    };
                }
            }
        } catch (syncError) {
            googleSync = {
                attempted: true,
                ok: false,
                mode: 'error',
                error: syncError instanceof Error ? syncError.message : 'unknown_error',
            };
        }

        await prisma.appointment.delete({ where: { id } });

        return NextResponse.json({ ok: true, deletedId: id, googleSync }, { status: 200 });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
    }
}
