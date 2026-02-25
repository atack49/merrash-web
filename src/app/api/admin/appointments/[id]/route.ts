import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { updateAppointmentSchema } from '@/lib/validators';
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

        // Check if appointment exists
        const appointment = await prisma.appointment.findUnique({
            where: { id },
        });

        if (!appointment) {
            return NextResponse.json(
                { error: 'Appointment not found' },
                { status: 404 }
            );
        }

        // Update appointment
        const updatedAppointment = await prisma.appointment.update({
            where: { id },
            data: {
                ...(validatedData.status && { status: validatedData.status }),
                ...(validatedData.preferredDate && {
                    preferredDate: validatedData.preferredDate,
                }),
                ...(validatedData.preferredTime && {
                    preferredTime: validatedData.preferredTime,
                }),
                ...(validatedData.notes && { notes: validatedData.notes }),
            },
            include: {
                survey: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        return NextResponse.json(updatedAppointment, { status: 200 });
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
