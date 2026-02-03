'use server';

import { saveSurvey } from '@/lib/persistence';
import { revalidatePath } from 'next/cache';

export async function submitSurvey(type: 'satisfaccion' | 'enterado', rawData: Record<string, any>) {

    // Basic validation could go here
    if (!type || !rawData) {
        return { success: false, message: 'Datos incompletos' };
    }

    try {
        await saveSurvey({
            type,
            data: rawData
        });

        // Revalidate admin page so new data shows up immediately
        revalidatePath('/admin');

        return { success: true, message: '¡Encuesta guardada con éxito!' };
    } catch (error) {
        console.error('Error saving survey:', error);
        return { success: false, message: 'Error al guardar la encuesta.' };
    }
}
