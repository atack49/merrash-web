import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const testimonial = await prisma.testimonial.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                service: true,
                text: true,
                rating: true,
                active: true,
                order: true,
                updatedAt: true,
            },
        });

        if (!testimonial) {
            return NextResponse.json(
                { error: 'Testimonial not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(testimonial);
    } catch (error) {
        console.error('Error fetching testimonial:', error);
        return NextResponse.json(
            { error: 'Failed to fetch testimonial' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const { id } = await params;
        const body = await request.json();
        const { name, service, text, rating, order, active } = body;

        if (rating && (rating < 1 || rating > 5)) {
            return NextResponse.json(
                { error: 'rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        const testimonial = await prisma.testimonial.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(service && { service }),
                ...(text && { text }),
                ...(rating && { rating: parseInt(rating) }),
                ...(order !== undefined && { order }),
                ...(active !== undefined && { active }),
            },
        });

        return NextResponse.json(testimonial);
    } catch (error: any) {
        console.error('Error updating testimonial:', error);
        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Testimonial not found' },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to update testimonial' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const { id } = await params;

        await prisma.testimonial.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting testimonial:', error);
        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Testimonial not found' },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to delete testimonial' },
            { status: 500 }
        );
    }
}
