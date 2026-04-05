import { z } from 'zod';

// Survey Responses
export const surveyResponseSchema = z.object({
    surveyId: z.string().cuid(),
    answers: z.record(z.string(), z.unknown()),
    email: z.string().email().optional(),
});

export type SurveyResponseInput = z.infer<typeof surveyResponseSchema>;

// Appointments
export const appointmentSchema = z.object({
    email: z.string().email(),
    phone: z.string().optional(),
    preferredDate: z.string().optional(),
    preferredTime: z.string().optional(),
    service: z.string().optional(),
    notes: z.string().optional(),
    surveyId: z.string().cuid().optional(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

// Admin Survey Creation
export const createSurveySchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    type: z.enum(['satisfaccion', 'enterado']),
    questions: z.array(
        z.object({
            text: z.string().min(1),
            type: z.enum(['rating', 'select', 'text']),
            order: z.number().int().positive(),
            options: z.array(z.string()).optional(),
            required: z.boolean().optional().default(true),
        })
    ).min(1, 'At least one question is required'),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;

// Admin Appointment Update
export const updateAppointmentSchema = z.object({
    status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
    customerName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    service: z.string().optional(),
    preferredDate: z.string().optional(),
    preferredTime: z.string().optional(),
    notes: z.string().optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
