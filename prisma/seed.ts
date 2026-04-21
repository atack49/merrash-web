import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log(' Starting seed...');

    // Clean existing data
    await prisma.appointment.deleteMany();
    await prisma.response.deleteMany();
    await prisma.question.deleteMany();
    await prisma.survey.deleteMany();
    await prisma.service.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.user.deleteMany();

    // Create admin user
    const adminPassword = await bcrypt.hash('merrash2024', 10);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@merrash.com',
            password: adminPassword,
            name: 'Admin Merrash',
            role: 'admin',
        },
    });
    console.log(' Admin user created:', admin.email);

    // Create Satisfaction Survey
    const satisfactionSurvey = await prisma.survey.create({
        data: {
            title: 'Encuesta de Satisfacción',
            description: 'Nos gustaría conocer tu opinión sobre nuestros servicios',
            type: 'satisfaccion',
            active: true,
        },
    });
    console.log(' Satisfaction survey created:', satisfactionSurvey.id);

    // Create questions for satisfaction survey
    const satisfactionQuestions = [
        {
            surveyId: satisfactionSurvey.id,
            text: '¿Cómo calificarías la calidad del servicio?',
            type: 'rating',
            order: 1,
            required: true,
        },
        {
            surveyId: satisfactionSurvey.id,
            text: '¿Cómo fue la actitud del personal?',
            type: 'rating',
            order: 2,
            required: true,
        },
        {
            surveyId: satisfactionSurvey.id,
            text: '¿Cómo fue la limpieza de las instalaciones?',
            type: 'rating',
            order: 3,
            required: true,
        },
        {
            surveyId: satisfactionSurvey.id,
            text: '¿Consideras que el precio es justo?',
            type: 'rating',
            order: 4,
            required: true,
        },
        {
            surveyId: satisfactionSurvey.id,
            text: '¿Nos recomendarías con amigos o familiares?',
            type: 'rating',
            order: 5,
            required: true,
        },
        {
            surveyId: satisfactionSurvey.id,
            text: '¿Tienes algún comentario adicional?',
            type: 'text',
            order: 6,
            required: false,
        },
    ];

    for (const question of satisfactionQuestions) {
        await prisma.question.create({ data: question });
    }
    console.log(' Satisfaction survey questions created');

    // Create "How did you hear about us?" Survey
    const enteradoSurvey = await prisma.survey.create({
        data: {
            title: '¿Cómo nos encontraste?',
            description: 'Nos gustaría saber cómo llegaste a Merrash',
            type: 'enterado',
            active: true,
        },
    });
    console.log(' "How did you hear about us?" survey created:', enteradoSurvey.id);

    // Create questions for "enterado" survey
    const enteradoQuestions = [
        {
            surveyId: enteradoSurvey.id,
            text: '¿Cómo nos encontraste?',
            type: 'select',
            order: 1,
            options: JSON.stringify([
                'Recomendación de amigo/familiar',
                'Google/Búsqueda en internet',
                'Instagram',
                'Facebook',
                'Anuncio/Volante',
                'Otro',
            ]),
            required: true,
        },
        {
            surveyId: enteradoSurvey.id,
            text: '¿Es tu primera visita?',
            type: 'select',
            order: 2,
            options: JSON.stringify(['Sí', 'No']),
            required: true,
        },
        {
            surveyId: enteradoSurvey.id,
            text: '¿Se cumplieron tus expectativas?',
            type: 'rating',
            order: 3,
            required: true,
        },
        {
            surveyId: enteradoSurvey.id,
            text: '¿Tienes algún comentario adicional?',
            type: 'text',
            order: 4,
            required: false,
        },
    ];

    for (const question of enteradoQuestions) {
        await prisma.question.create({ data: question });
    }
    console.log(' "How did you hear about us?" questions created');

    // Create Services
    const services = [
        // CUERPO
        {
            title: "Acupuntura",
            description: "Técnica milenaria para restaurar el flujo de energía y aliviar dolor.",
            category: "Cuerpo",
            order: 1,
        },
        {
            title: "Homeopatía",
            description: "Medicina suave y natural para estimular la autocuración.",
            category: "Cuerpo",
            order: 2,
        },
        {
            title: "Rehabilitación",
            description: "Terapias físicas personalizadas para tu recuperación.",
            category: "Cuerpo",
            order: 3,
        },
        {
            title: "Auriculoterapia",
            description: "Estimulación de puntos en la oreja para tratar diversas condiciones.",
            category: "Cuerpo",
            order: 4,
        },
        {
            title: "Par Biomagnético",
            description: "Equilibrio del pH corporal mediante el uso de imanes.",
            category: "Cuerpo",
            order: 5,
        },
        {
            title: "Terapia Neural",
            description: "Estimulación de puntos clave para equilibrar el sistema nervioso.",
            category: "Cuerpo",
            order: 6,
        },
        {
            title: "Sueroterapia Intravenosa",
            description: "Terapia de sueros y complementos vía intravenosa para revitalización.",
            category: "Cuerpo",
            order: 7,
        },
        {
            title: "Tratamientos Faciales",
            description: "Limpieza y rejuvenecimiento para una piel radiante.",
            category: "Cuerpo",
            order: 8,
        },
        {
            title: "Tratamientos Corporales",
            description: "Reductivos, reafirmantes y cuidado integral de la piel.",
            category: "Cuerpo",
            order: 9,
        },
        {
            title: "Masajes",
            description: "Técnicas manuales para liberar estrés y tensión muscular.",
            category: "Cuerpo",
            order: 10,
        },
        // ESPÍRITU
        {
            title: "Tarot Terapéutico",
            description: "Guía emocional y espiritual para el autoconocimiento.",
            category: "Espíritu",
            order: 11,
        },
        {
            title: "Reiki",
            description: "Canalización de energía vital para armonizar los chakras.",
            category: "Espíritu",
            order: 12,
        },
        {
            title: "Healy",
            description: "Tecnología de frecuencias para el bienestar bioenergético.",
            category: "Espíritu",
            order: 13,
        },
        {
            title: "Toque Cuántico",
            description: "Técnica de sanación basada en principios cuánticos para equilibrar la energía.",
            category: "Espíritu",
            order: 14,
        },
        {
            title: "Arborología",
            description: "Sanación mediante la conexión con la energía de los árboles.",
            category: "Espíritu",
            order: 15,
        },
        // MENTE
        {
            title: "Método Integral",
            description: "Abordaje integral para el equilibrio mental y emocional.",
            category: "Mente",
            order: 16,
        },
    ];

    for (const service of services) {
        await prisma.service.create({
            data: {
                ...service,
                active: true,
                icon: null,
            },
        });
    }
    console.log(' Services created (16 total)');

    // Create Testimonials
    const testimonials = [
        {
            name: "Ana García",
            text: "La acupuntura me ayudó a eliminar el dolor crónico que tenía desde hace años. ¡Increíble transformación!",
            rating: 5,
            service: "Acupuntura",
        },
        {
            name: "Carlos Rodríguez",
            text: "Los tratamientos de spa son relajantes y rejuvenecedores. Me siento renovado después de cada sesión.",
            rating: 5,
            service: "Spa Integral",
        },
        {
            name: "María López",
            text: "La homeopatía cambió mi vida. Finalmente encontré alivio para mis alergias sin efectos secundarios.",
            rating: 5,
            service: "Homeopatía",
        },
        {
            name: "José Martínez",
            text: "El Reiki me ayudó a equilibrar mi energía y reducir el estrés diario. Recomiendo ampliamente.",
            rating: 5,
            service: "Reiki",
        },
        {
            name: "Laura Sánchez",
            text: "Los masajes relajantes son perfectos para desconectar. El ambiente es muy profesional y acogedor.",
            rating: 5,
            service: "Masajes Relajantes",
        },
        {
            name: "Pedro Hernández",
            text: "La nutrición personalizada me ayudó a perder peso de manera saludable y sostenible.",
            rating: 5,
            service: "Nutrición",
        },
    ];

    for (const testimonial of testimonials) {
        await prisma.testimonial.create({ data: testimonial });
    }
    console.log(' Testimonials created (6 total)');

    // Create or update ContactInfo
    await prisma.contactInfo.upsert({
        where: { id: 'default' },
        update: {
            address: 'Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx.',
            phones: JSON.stringify(['222 238 6181', '722 495 8550', '729 165 4769']),
            email: 'dramalumolina@gmail.com',
            hours: JSON.stringify({
                weekdays: '10:00 AM - 7:00 PM',
                saturday: '10:00 AM - 3:00 PM',
            }),
        },
        create: {
            id: 'default',
            address: 'Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx.',
            phones: JSON.stringify(['222 238 6181', '722 495 8550', '729 165 4769']),
            email: 'dramalumolina@gmail.com',
            hours: JSON.stringify({
                weekdays: '10:00 AM - 7:00 PM',
                saturday: '10:00 AM - 3:00 PM',
            }),
        },
    });
    console.log(' Contact info created/updated');

    console.log(' Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(' Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
