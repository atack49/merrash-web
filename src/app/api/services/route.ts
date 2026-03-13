import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

        const response = NextResponse.json(services);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json([]);
    }
}
