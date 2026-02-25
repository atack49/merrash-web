import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const appointments = await prisma.appointment.findMany({
            include: {
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

        return NextResponse.json(appointments, { status: 200 });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch appointments' },
            { status: 500 }
        );
    }
}
