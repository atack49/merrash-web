import { prisma } from '@/lib/db';
import { appointmentSchema } from '@/lib/validators';
import { getSlotCapacity } from '@/lib/appointments/capacity';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validatedData = appointmentSchema.parse(body);

        if (validatedData.preferredDate && validatedData.preferredTime) {
            const capacity = await getSlotCapacity({
                preferredDate: validatedData.preferredDate,
                preferredTime: validatedData.preferredTime,
                service: validatedData.service,
            });

            if (capacity.totalFull) {
                return NextResponse.json(
                    { error: 'Ese horario ya alcanzó el límite total de 5 citas por hora.' },
                    { status: 409 }
                );
            }

            if (capacity.serviceFull) {
                return NextResponse.json(
                    { error: 'Ese horario ya alcanzó el límite de 2 citas para ese servicio por hora.' },
                    { status: 409 }
                );
            }
        }

        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                source: 'global',
                email: validatedData.email,
                phone: validatedData.phone,
                preferredDate: validatedData.preferredDate,
                preferredTime: validatedData.preferredTime,
                service: validatedData.service,
                notes: validatedData.notes,
                surveyId: validatedData.surveyId,
                status: 'pending',
            },
        });

        return NextResponse.json(appointment, { status: 201 });
    } catch (error: any) {
        console.error('Error creating appointment:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid input', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create appointment' },
            { status: 500 }
        );
    }
}
