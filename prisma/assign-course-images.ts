import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const courseImageMapping = [
        { title: 'Tanatología', icon: '/images/courses/tanatologia.png' },
        { title: 'Tapping (EFT)', icon: '/images/courses/meditacion.png' },
        { title: 'Liberación Emocional', icon: '/images/courses/mente.png' },
        { title: 'Tarot de Flores de Bach', icon: '/images/courses/tarot.png' },
        { title: 'Realización de Hikuri (Ojo de Dios)', icon: '/images/courses/ojo-dios.png' }
    ];

    for (const mapping of courseImageMapping) {
        const course = await prisma.course.findFirst({ where: { title: mapping.title } });
        if (course) {
            await prisma.course.update({ where: { id: course.id }, data: { icon: mapping.icon } });
        }
    }
}

main().finally(async () => { await prisma.$disconnect(); });
