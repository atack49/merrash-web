import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
                active: true,
                order: true,
            },
            orderBy: { order: 'asc' },
        });
        
        const response = NextResponse.json(testimonials);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        return NextResponse.json(
            { error: 'Failed to fetch testimonials' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const body = await request.json();
        const { name, service, text, rating, order } = body;

        if (!name || !service || !text || !rating) {
            return NextResponse.json(
                { error: 'name, service, text, and rating are required' },
                { status: 400 }
            );
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: 'rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        const testimonial = await prisma.testimonial.create({
            data: {
                name,
                service,
                text,
                rating: parseInt(rating),
                order: order || 0,
                active: true,
            },
        });

        return NextResponse.json(testimonial, { status: 201 });
    } catch (error) {
        console.error('Error creating testimonial:', error);
        return NextResponse.json(
            { error: 'Failed to create testimonial' },
            { status: 500 }
        );
    }
}
