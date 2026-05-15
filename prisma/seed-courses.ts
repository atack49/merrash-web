import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding courses...');

    const coursesData = [
        {
            title: 'Tanatología',
            description: 'Atrévete a vivir este transformador curso de tanatología en el cual comprenderás la muerte y la paz que hay detrás de esta. Aprenderás el valor de la vida y la tranquilidad de aquellos que han trascendido. Al tomar este curso, sanarás duelos, soltarás apegos y ganarás una mayor confianza en la vida.',
            category: 'Espíritu',
            order: 1,
            active: true,
        },
        {
            title: 'Tapping (EFT)',
            description: 'Aprende a través de la técnica de Tapping a reprogramar creencias limitantes y alcanzar la autosanación. Un método sencillo y práctico que te ayudará a manejar el estrés, la ansiedad, liberar bloqueos emocionales y fluir en armonía con la vida.',
            category: 'Mente',
            order: 2,
            active: true,
        },
        {
            title: 'Mandalas con Flores de Bach',
            description: 'Aprende a sanar en este hermoso y creativo curso de Mandalas con Flores de Bach. Una experiencia diseñada para toda la familia, sumamente tranquilizante y profundamente sanadora.',
            category: 'Espíritu',
            order: 3,
            active: true,
        },
        {
            title: 'Ho\'oponopono para Niños',
            description: 'Brinda a tus pequeños las herramientas necesarias para resolver los retos de su día a día. A través de este curso, desarrollarán sanación, confianza, autoconocimiento y la fortaleza para vivir con amor y seguridad.',
            category: 'Mente',
            order: 4,
            active: true,
        },
        {
            title: 'Ho\'oponopono para Adultos',
            description: 'Conoce herramientas para eliminar bloqueos de escasez y mejorar tus relaciones. Descubre cómo sanar el dolor, la tristeza y la depresión. El Ho\'oponopono te permite borrar lealtades limitantes, convirtiéndote en el creador de tu propio destino para construir el presente que siempre has soñado.',
            category: 'Mente',
            order: 5,
            active: true,
        },
        {
            title: 'Curso de Osiris (Sanación de Útero)',
            description: 'Un curso exclusivo para mujeres diseñado para borrar memorias de relaciones pasadas y lograr un empoderamiento genuino desde el amor y el autoconocimiento. Aprende a manifestar tus sueños a través de la conexión con el útero. Una experiencia sanadora que abrirá puertas y fortalecerá tu verdadera esencia.',
            category: 'Cuerpo',
            order: 6,
            active: true,
        },
        {
            title: 'Tarot de Flores de Bach',
            description: 'Descubre a través de las cartas del Tarot de Flores de Bach qué esencia floral necesitas y cómo te ayudará en tu vida actual para encontrar la autosanación, la paz interior y la felicidad.',
            category: 'Espíritu',
            order: 7,
            active: true,
        },
        {
            title: 'Elaboración de Pomadas y Jabones',
            description: 'Aprende a elaborar tus propias pomadas y jabones artesanales con ingredientes naturales para mejorar tu circulación y bienestar corporal.',
            category: 'Cuerpo',
            order: 8,
            active: true,
        },
        {
            title: 'Realización de Hikuri (Ojo de Dios)',
            description: 'Participa en este entretenido curso de creación de Hikuri para liberar nudos ancestrales y bloqueos de vida. Conviértete en el tejedor de tu propio destino y construye conscientemente tu felicidad.',
            category: 'Espíritu',
            order: 9,
            active: true,
        },
        {
            title: 'Lenguaje Corporal',
            description: 'Aprende a liberar tus emociones permitiendo que tu cuerpo fluya. Descubrirás ejercicios prácticos que te ayudarán a desarrollar flexibilidad física y emocional, enseñándote a soltar y fluir armónicamente con la vida.',
            category: 'Cuerpo',
            order: 10,
            active: true,
        },
        {
            title: 'Respiración Consciente y Celular',
            description: 'A través de este curso de respiración celular aprenderás a reprogramarte positivamente, eliminando patrones y programaciones erróneas que te limitan en tu presente.',
            category: 'Mente',
            order: 11,
            active: true,
        },
        {
            title: 'Liberación Emocional',
            description: 'Te enseñaremos diversas herramientas para liberar aquellas emociones estancadas que pueden transformarse en enfermedades físicas y que te impiden fluir libremente con la vida.',
            category: 'Mente',
            order: 12,
            active: true,
        },
        {
            title: 'Antiestrés Oxidativo y Antienvejecimiento',
            description: 'Aprenderás movimientos, ejercicios y herramientas eficaces para eliminar el estrés diario y detener el envejecimiento prematuro. Un curso diseñado para ayudarte a encontrar la paz en los pequeños momentos de cada día.',
            category: 'Cuerpo',
            order: 13,
            active: true,
        },
        {
            title: 'Taller de Espejo de Obsidiana',
            description: 'Un curso profundamente retador en el cual observarás tu propia sombra y aquello que has negado de ti. Aprende a abrazar todas tus facetas para empoderarte a través del autoconocimiento y trazar tu propio camino.',
            category: 'Espíritu',
            order: 14,
            active: true,
        }
    ];

    for (const course of coursesData) {
        const existing = await prisma.course.findFirst({
            where: { title: course.title },
        });

        if (!existing) {
            await prisma.course.create({
                data: course,
            });
            console.log(`✅ Course created: ${course.title}`);
        } else {
            console.log(`⚠️ Course already exists: ${course.title}, updating...`);
            await prisma.course.update({
                where: { id: existing.id },
                data: course
            })
        }
    }

    console.log('✨ Courses seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
