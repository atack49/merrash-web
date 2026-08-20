import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { CursosPageClient } from '@/components/CursosPageClient';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
    title: 'Cursos y Talleres',
    description: 'Aprende sobre medicina alternativa, salud holística, sueroterapia y bienestar integral en Metepec.',
    openGraph: {
        title: 'Cursos y Talleres de Medicina Alternativa | Merrash',
        description: 'Capacítate en medicina alternativa, tratamientos holísticos y bienestar integral en Metepec.',
    },
};

export default async function CursosPage() {

  const courses = await prisma.course.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="grow mt-16 md:mt-20">
        <CursosPageClient courses={courses} />
      </main>
      <Footer />
    </div>
  );
}
