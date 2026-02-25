'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function submitSurvey(type: 'satisfaccion' | 'enterado', rawData: Record<string, any>) {
    // Basic validation
    if (!type || !rawData) {
        throw new Error('Datos incompletos');
    }

    try {
        // Find survey by type
        const survey = await prisma.survey.findFirst({
            where: { type },
        });

        if (!survey) {
            throw new Error(`No survey found for type: ${type}`);
        }

        // Create response in database
        const response = await prisma.response.create({
            data: {
                surveyId: survey.id,
                answers: JSON.stringify(rawData),
                email: rawData.email || null,
            },
        });

        // Revalidate admin page so new data shows up immediately
        revalidatePath('/admin');

        return { success: true, message: '¡Encuesta guardada con éxito!' };
    } catch (error) {
        console.error('Error saving survey:', error);
        throw new Error('Error al guardar la encuesta.');
    }
}
