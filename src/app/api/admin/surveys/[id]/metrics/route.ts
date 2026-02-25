import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const { id } = await params;

        // Get survey with all responses
        const survey = await prisma.survey.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                },
                responses: {
                    select: {
                        id: true,
                        answers: true,
                        createdAt: true,
                        email: true,
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

        // Calculate metrics
        const totalResponses = survey.responses.length;

        // Parse answers and calculate stats per question
        const questionMetrics = survey.questions.map((question) => {
            const answers = survey.responses.map((response) => {
                const parsedAnswers = JSON.parse(response.answers);
                return parsedAnswers[question.id];
            });

            if (question.type === 'rating') {
                const ratings = answers.filter(
                    (a): a is number => typeof a === 'number'
                );
                const average =
                    ratings.length > 0
                        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
                        : 0;

                return {
                    id: question.id,
                    text: question.text,
                    type: question.type,
                    average: Math.round(average * 10) / 10,
                    totalResponses: ratings.length,
                };
            } else if (question.type === 'select') {
                const options = question.options
                    ? JSON.parse(question.options)
                    : [];
                const distribution = options.reduce(
                    (acc: Record<string, number>, opt: string) => {
                        acc[opt] = answers.filter((a) => a === opt).length;
                        return acc;
                    },
                    {}
                );

                return {
                    id: question.id,
                    text: question.text,
                    type: question.type,
                    distribution,
                    totalResponses: answers.filter((a) => a !== undefined)
                        .length,
                };
            } else {
                return {
                    id: question.id,
                    text: question.text,
                    type: question.type,
                    totalResponses: answers.filter((a) => a !== undefined)
                        .length,
                };
            }
        });

        const metrics = {
            survey: {
                id: survey.id,
                title: survey.title,
                type: survey.type,
                createdAt: survey.createdAt,
            },
            totalResponses,
            questionMetrics,
            recentResponses: survey.responses
                .slice(-10)
                .reverse()
                .map((r) => ({
                    id: r.id,
                    email: r.email,
                    createdAt: r.createdAt,
                })),
        };

        return NextResponse.json(metrics, { status: 200 });
    } catch (error) {
        console.error('Error fetching survey metrics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch metrics' },
            { status: 500 }
        );
    }
}
