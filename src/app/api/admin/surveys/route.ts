import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const surveys = await prisma.survey.findMany({
            include: {
                _count: {
                    select: {
                        questions: true,
                        responses: true,
                        appointments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(surveys, { status: 200 });
    } catch (error) {
        console.error('Error fetching admin surveys:', error);
        return NextResponse.json(
            { error: 'Failed to fetch surveys' },
            { status: 500 }
        );
    }
}
