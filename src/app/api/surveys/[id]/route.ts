import { prisma } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const survey = await prisma.survey.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        order: true,
                        options: true,
                        required: true,
                    },
                },
            },
        });

        if (!survey) {
            return NextResponse.json(
                { error: 'Survey not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(survey, { status: 200 });
    } catch (error) {
        console.error('Error fetching survey:', error);
        return NextResponse.json(
            { error: 'Failed to fetch survey' },
            { status: 500 }
        );
    }
}
