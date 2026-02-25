import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { createSurveySchema } from '@/lib/validators';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const body = await request.json();

        // Validate input
        const validatedData = createSurveySchema.parse(body);

        // Create survey with questions
        const survey = await prisma.survey.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                type: validatedData.type,
                active: true,
                questions: {
                    create: validatedData.questions.map((q) => ({
                        text: q.text,
                        type: q.type,
                        order: q.order,
                        options: q.options ? JSON.stringify(q.options) : null,
                        required: q.required ?? true,
                    })),
                },
            },
            include: {
                questions: true,
            },
        });

        return NextResponse.json(survey, { status: 201 });
    } catch (error: any) {
        console.error('Error creating survey:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid input', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create survey' },
            { status: 500 }
        );
    }
}
