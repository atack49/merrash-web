import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(' Seeding additional data...');

    // Services from the existing SERVICES array in lib/data.ts
    const servicesData = [
        // CUERPO
        {
            title: 'Acupuntura',
            description: 'Técnica milenaria para restaurar el flujo de energía y aliviar dolor.',
            category: 'Cuerpo',
            order: 1,
        },
        {
            title: 'Homeopatía',
            description: 'Medicina suave y natural para estimular la autocuración.',
            category: 'Cuerpo',
            order: 2,
        },
        {
            title: 'Rehabilitación',
            description: 'Terapias físicas personalizadas para tu recuperación.',
            category: 'Cuerpo',
            order: 3,
        },
        {
            title: 'Auriculoterapia',
            description: 'Estimulación de puntos en la oreja para tratar diversas condiciones.',
            category: 'Cuerpo',
            order: 4,
        },
        {
            title: 'Par Biomagnético',
            description: 'Equilibrio del pH corporal mediante el uso de imanes.',
            category: 'Cuerpo',
            order: 5,
        },
        // MENTE
        {
            title: 'Meditación Guiada',
            description: 'Antídoto perfecto contra el estrés y la ansiedad.',
            category: 'Mente',
            order: 6,
        },
        {
            title: 'Reiki',
            description: 'Energía vital para sanar cuerpo, mente y espíritu.',
            category: 'Mente',
            order: 7,
        },
        {
            title: 'Psicoterapia Holística',
            description: 'Abordaje integral del bienestar mental y emocional.',
            category: 'Mente',
            order: 8,
        },
        {
            title: 'Tarot y Astrología',
            description: 'Herramientas ancestrales para entender tu camino.',
            category: 'Mente',
            order: 9,
        },
        // BELLEZA
        {
            title: 'Masaje Terapéutico',
            description: 'Relax profundo y alivio de tensiones musculares.',
            category: 'Belleza',
            order: 10,
        },
        {
            title: 'Faciales Naturales',
            description: 'Tratamientos con ingredientes 100% naturales.',
            category: 'Belleza',
            order: 11,
        },
        {
            title: 'Aromaterapia',
            description: 'Esencias naturales para equilibrar cuerpo y mente.',
            category: 'Belleza',
            order: 12,
        },
        {
            title: 'Hidroterapia',
            description: 'Terapia de agua para desintoxicar y rejuvenecer.',
            category: 'Belleza',
            order: 13,
        },
    ];

    // Services seed
    for (const service of servicesData) {
        const existing = await prisma.service.findFirst({
            where: { title: service.title },
        });

        if (!existing) {
            await prisma.service.create({
                data: {
                    ...service,
                    active: true,
                },
            });
            console.log(` Service created: ${service.title}`);
        }
    }

    // Testimonials seed
    const testimonialsData = [
        {
            name: 'María González',
            service: 'Acupuntura',
            text: 'Definitivamente fue la mejor inversión que pude haber hecho. He mejorado mi salud notablemente.',
            rating: 5,
            order: 1,
        },
        {
            name: 'Juan Rodríguez',
            service: 'Reiki',
            text: 'Gracias a la sesión de Reiki he logrado una paz mental que no tenía hace años.',
            rating: 5,
            order: 2,
        },
        {
            name: 'Carmen López',
            service: 'Masaje Terapéutico',
            text: 'El masaje fue relajante y efectivo. Definitivamente volveré.',
            rating: 5,
            order: 3,
        },
    ];

    for (const testimonial of testimonialsData) {
        const existing = await prisma.testimonial.findFirst({
            where: { name: testimonial.name },
        });

        if (!existing) {
            await prisma.testimonial.create({
                data: {
                    ...testimonial,
                    active: true,
                },
            });
            console.log(` Testimonial created: ${testimonial.name}`);
        }
    }

    console.log(' Additional seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(' Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
