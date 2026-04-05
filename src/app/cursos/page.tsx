import { prisma } from '@/lib/db';
import { CursosPageClient } from '@/components/CursosPageClient';

export default async function CursosPage() {
  const sections = await prisma.section.findMany({
    where: { active: true },
    include: {
      courses: {
        where: { active: true },
        include: {
          contents: true,
        },
        orderBy: [{ order: 'asc' }, { title: 'asc' }],
      },
    },
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
  });

  return <CursosPageClient sections={sections} />;
}
