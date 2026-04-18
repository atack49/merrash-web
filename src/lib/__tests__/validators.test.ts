import { appointmentSchema, createSurveySchema } from "../validators";

describe("Validadores de Esquemas de API", () => {
    describe("appointmentSchema", () => {
        it("debe validar un correo estructurado correctamente", () => {
            const validData = { email: "usuario@ejemplo.com", service: "Acupuntura" };
            const result = appointmentSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it("debe fallar si el email es inválido", () => {
            const invalidData = { email: "usuario-sin-arroba.com" };
            const result = appointmentSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].path[0]).toBe("email");
            }
        });
    });

    describe("createSurveySchema", () => {
        it("debe rechazar encuestas sin preguntas", () => {
            const invalidSurvey = {
                title: "Encuesta vacía",
                type: "satisfaccion",
                questions: []
            };
            const result = createSurveySchema.safeParse(invalidSurvey);
            expect(result.success).toBe(false);
        });

        it("debe aceptar una encuesta bien construida", () => {
            const survey = {
                title: "Calidad de Servicio",
                type: "satisfaccion",
                questions: [
                    {
                        text: "¿Cómo evalúa su servicio?",
                        type: "rating",
                        order: 1
                    }
                ]
            };
            const result = createSurveySchema.safeParse(survey);
            expect(result.success).toBe(true);
        });
    });
});
