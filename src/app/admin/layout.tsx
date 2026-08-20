import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Panel de Administración',
    description: 'Panel de control privado de Merrash.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
