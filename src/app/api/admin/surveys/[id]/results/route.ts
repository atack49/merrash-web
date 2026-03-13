import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const user = session.user as any;
        if (user?.role !== 'admin' && user?.role !== 'developer') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const surveyId = (await params).id;

        const survey = await prisma.survey.findUnique({
            where: { id: surveyId },
            include: {
                questions: {
                    orderBy: { order: 'asc' }
                },
                responses: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!survey) {
            return new NextResponse('Not Found', { status: 404 });
        }

        // Constants to map Question ordering to frontend state IDs
        const satisfactionKeys = ["service_quality", "staff_attitude", "facility_cleanliness", "value_for_money", "recommendation", "comments"];
        const informedKeys = ["how_did_you_hear", "first_visit", "expectations", "comments"];

        // Process results
        const results = survey.questions.map(q => {
            const questionResults: any = {
                id: q.id,
                text: q.text,
                type: q.type,
                options: q.options ? JSON.parse(q.options) : [],
                responsesCount: 0,
            };

            // Calculate the key used to store this question in the JSON string
            let answerKey = q.id;
            if (survey.type === 'satisfaccion') {
                answerKey = satisfactionKeys[q.order - 1] || q.id;
            } else if (survey.type === 'enterado') {
                answerKey = informedKeys[q.order - 1] || q.id;
            }

            const answers = survey.responses
                .map(r => {
                    try {
                        const parsed = JSON.parse(r.answers);
                        return parsed[answerKey] ?? parsed[q.id];
                    } catch (e) {
                        return null;
                    }
                })
                .filter(a => a !== null && a !== undefined && a !== '');

            questionResults.responsesCount = answers.length;

            if (q.type === 'rating') {
                const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                let sum = 0;
                answers.forEach(a => {
                    const val = parseInt(a as string);
                    if (val >= 1 && val <= 5) {
                        distribution[val as keyof typeof distribution]++;
                        sum += val;
                    }
                });
                questionResults.stats = {
                    average: answers.length > 0 ? (sum / answers.length).toFixed(1) : 0,
                    distribution
                };
            } else if (q.type === 'select') {
                const counts: Record<string, number> = {};
                if (questionResults.options) {
                    questionResults.options.forEach((opt: string) => {
                        counts[opt] = 0;
                    });
                }
                answers.forEach(a => {
                    const val = a as string;
                    counts[val] = (counts[val] || 0) + 1;
                });
                questionResults.stats = { counts };
            } else if (q.type === 'text') {
                questionResults.answers = answers; // Just array of text
            }

            return questionResults;
        });

        return NextResponse.json({
            survey: {
                title: survey.title,
                description: survey.description,
                totalResponses: survey.responses.length,
            },
            results
        });

    } catch (error) {
        console.error('Error fetching survey results:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
