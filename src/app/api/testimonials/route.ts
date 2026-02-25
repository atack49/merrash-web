import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
    try {
        const testimonials = await prisma.testimonial.findMany({
            where: { active: true },
            select: {
                id: true,
                name: true,
                service: true,
                text: true,
                rating: true,
                order: true,
            },
            orderBy: { order: 'asc' },
        });

        return NextResponse.json(testimonials);
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        return NextResponse.json(
            { error: 'Failed to fetch testimonials' },
            { status: 500 }
        );
    }
}
