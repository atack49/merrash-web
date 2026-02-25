import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const surveys = await prisma.survey.findMany({
            where: { active: true },
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(surveys, { status: 200 });
    } catch (error) {
        console.error('Error fetching surveys:', error);
        return NextResponse.json(
            { error: 'Failed to fetch surveys' },
            { status: 500 }
        );
    }
}
