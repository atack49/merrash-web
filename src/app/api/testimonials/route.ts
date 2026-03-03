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

        const normalized = testimonials.map((item) => {
            const numericRating = Number(item.rating);
            const rating = Number.isFinite(numericRating) ? Math.max(1, Math.min(5, Math.round(numericRating))) : 5;
            return {
                ...item,
                rating,
            };
        });

        return NextResponse.json(normalized);
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        return NextResponse.json([]);
    }
}
