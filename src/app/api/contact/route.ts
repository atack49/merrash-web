import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const defaultContact = {
    id: 'default',
    address: 'Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx.',
    phones: ['222 238 6181', '722 495 8550', '729 165 4769'],
    email: 'dramalumolina@gmail.com',
    hours: { weekdays: '8:00 AM - 6:00 PM', saturday: '9:00 AM - 4:00 PM' },
};

export async function GET() {
    try {
        const contact = await prisma.contactInfo.findUnique({
            where: { id: 'default' },
        });

        if (!contact) {
            const response = NextResponse.json(defaultContact);
            response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            response.headers.set('Pragma', 'no-cache');
            response.headers.set('Expires', '0');
            return response;
        }

        const parsedContact = {
            id: contact.id,
            address: contact.address,
            phones: typeof contact.phones === 'string' ? JSON.parse(contact.phones) : contact.phones,
            email: contact.email,
            hours: typeof contact.hours === 'string' ? JSON.parse(contact.hours) : contact.hours,
        };

        const response = NextResponse.json(parsedContact);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
    } catch (error) {
        console.error('Error fetching public contact info:', error);
        return NextResponse.json(defaultContact);
    }
}
