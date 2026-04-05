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
    let services: { id: string; title: string; description: string; icon: string | null; category: string; active: boolean; order: number; }[] = [];
    let testimonials: any[] = [];
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
                icon: true,
                category: true,
                active: true,
                order: true,
            },
            orderBy: { order: 'asc' },
        });

        const testimonialModel = (prisma as any).testimonial;
        try {
            testimonials = await testimonialModel.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    service: true,
                    text: true,
                    rating: true,
                    source: true,
                    approved: true,
                    approvedAt: true,
                    active: true,
                    order: true,
                },
                orderBy: [{ approved: 'asc' }, { active: 'asc' }, { createdAt: 'desc' }],
            });
        } catch {
            const legacy = await testimonialModel.findMany({
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

            testimonials = legacy.map((item: any) => ({
                ...item,
                email: null,
                phone: null,
                source: 'admin',
                approved: true,
                approvedAt: null,
            }));
        }

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
                hours: { weekdays: '8:00 AM - 6:00 PM', saturday: '9:00 AM - 4:00 PM' },
            };
        }
    } catch (error) {
        console.error('Error fetching data from database:', error);
    }

    return (
        <AdminPageClientWrapper 
            surveys={surveys}
            services={services}
            testimonials={testimonials}
            contactInfo={contactInfo}
            signOutAction={signOutAction}
        />
    );
}
