import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdminPageClientWrapper } from '../../components/admin/AdminPageClientWrapper';

async function signOutAction() {
    'use server';
    const { signOut } = await import('@/auth');
    await signOut();
}

export default async function AdminPage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    // Fetch surveys, services, testimonials, and contact info
    let surveys: { id: string; title: string; type: string; active: boolean; createdAt: Date; _count: { questions: number; responses: number; appointments: number; }; }[] = [];
    let services: { id: string; title: string; description: string; category: string; active: boolean; order: number; }[] = [];
    let testimonials: { id: string; name: string; service: string; text: string; rating: number; active: boolean; order: number; }[] = [];
    let contactInfo: { id: string; address: string; phones: string[]; email: string; hours: { weekdays: string; saturday: string; }; } | null = null;

    try {
        surveys = await prisma.survey.findMany({
            select: {
                id: true,
                title: true,
                type: true,
                active: true,
                createdAt: true,
                _count: {
                    select: {
                        questions: true,
                        responses: true,
                        appointments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        services = await prisma.service.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                active: true,
                order: true,
            },
            orderBy: { order: 'asc' },
        });

        testimonials = await prisma.testimonial.findMany({
            select: {
                id: true,
                name: true,
                service: true,
                text: true,
                rating: true,
                active: true,
                order: true,
            },
            orderBy: { order: 'asc' },
        });

        const dbContact = await prisma.contactInfo.findUnique({
            where: { id: 'default' },
        });

        if (dbContact) {
            contactInfo = {
                id: dbContact.id,
                address: dbContact.address,
                phones: typeof dbContact.phones === 'string' ? JSON.parse(dbContact.phones) : dbContact.phones,
                email: dbContact.email,
                hours: typeof dbContact.hours === 'string' ? JSON.parse(dbContact.hours) : dbContact.hours,
            };
        } else {
            contactInfo = {
                id: 'default',
                address: 'Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx.',
                phones: ['222 238 6181', '722 495 8550', '729 165 4769'],
                email: 'dramalumolina@gmail.com',
                hours: { weekdays: '10:00 AM - 4:00 PM', saturday: '10:00 AM - 4:00 PM' },
            };
        }
    } catch (error) {
        console.error('Error fetching data from database:', error);
    }

    return (
        <AdminPageClientWrapper 
            session={session}
            surveys={surveys}
            services={services}
            testimonials={testimonials}
            contactInfo={contactInfo}
            signOutAction={signOutAction}
        />
    );
}
