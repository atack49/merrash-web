import { prisma } from '@/lib/db';
import { surveyResponseSchema } from '@/lib/validators';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Validate input
        const validatedData = surveyResponseSchema.parse({
            surveyId: id,
            ...body,
        });

        // Check if survey exists
        const survey = await prisma.survey.findUnique({
            where: { id },
        });

        if (!survey) {
            return NextResponse.json(
                { error: 'Survey not found' },
                { status: 404 }
            );
        }

        // Create response
        const response = await prisma.response.create({
            data: {
                surveyId: id,
                answers: JSON.stringify(validatedData.answers),
                email: validatedData.email,
            },
        });

        return NextResponse.json(response, { status: 201 });
    } catch (error: any) {
        console.error('Error creating survey response:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid input', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create response' },
            { status: 500 }
        );
    }
}
