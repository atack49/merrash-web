import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Testimonios y Experiencias',
    description: 'Conoce las opiniones y experiencias reales de nuestros pacientes sobre medicina alternativa y tratamientos de spa en Metepec.',
    openGraph: {
        title: 'Testimonios de Pacientes | Merrash',
        description: 'Opiniones reales de nuestros pacientes sobre Acupuntura, Spa Integral y Salud Holística en Metepec.',
    },
};

export default function TestimoniosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
