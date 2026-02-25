import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get contact info from database
        let contact = await prisma.contactInfo.findUnique({
            where: { id: 'default' },
        });

        if (!contact) {
            // Return default if not found
            contact = {
                id: 'default',
                address: 'Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx.',
                phones: JSON.stringify(['222 238 6181', '722 495 8550', '729 165 4769']),
                email: 'dramalumolina@gmail.com',
                hours: JSON.stringify({ weekdays: '10:00 AM - 7:00 PM', saturday: '10:00 AM - 3:00 PM' }),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }

        // Parse JSON fields
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
        console.error('Error fetching contact info:', error);
        return NextResponse.json(
            { error: 'Error fetching contact info' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { address, phones, email, hours } = body;

        if (!address || !phones || !email || !hours) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Update contact info in database
        const contact = await prisma.contactInfo.upsert({
            where: { id: 'default' },
            update: {
                address,
                phones: JSON.stringify(phones),
                email,
                hours: JSON.stringify(hours),
            },
            create: {
                id: 'default',
                address,
                phones: JSON.stringify(phones),
                email,
                hours: JSON.stringify(hours),
            },
        });

        // Parse JSON fields for response
        const parsedContact = {
            id: contact.id,
            address: contact.address,
            phones: JSON.parse(contact.phones),
            email: contact.email,
            hours: JSON.parse(contact.hours),
        };

        return NextResponse.json(parsedContact);
    } catch (error) {
        console.error('Error updating contact info:', error);
        return NextResponse.json(
            { error: 'Error updating contact info' },
            { status: 500 }
        );
    }
}
