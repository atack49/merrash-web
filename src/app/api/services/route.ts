import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
    try {
        const services = await prisma.service.findMany({
            where: { active: true },
            select: {
                id: true,
                title: true,
                description: true,
                icon: true,
                category: true,
                active: true,
                order: true,
            },
            orderBy: [
                { category: 'asc' },
                { order: 'asc' },
            ],
        });

        return NextResponse.json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json([]);
    }
}
