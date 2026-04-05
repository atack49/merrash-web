import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const { id } = await params;
        const testimonialModel = (prisma as any).testimonial;
        const testimonial = await testimonialModel.findUnique({
            where: { id },
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
        const contentType = request.headers.get('content-type') || '';
        let name: string | undefined;
        let email: string | undefined;
        let phone: string | undefined;
        let service: string | undefined;
        let text: string | undefined;
        let rating: number | undefined;
        let order: number | undefined;
        let active: boolean | undefined;
        let approved: boolean | undefined;

        if (contentType.includes('multipart/form-data')) {
            const form = await request.formData();
            name = String(form.get('name') || '').trim() || undefined;
            email = String(form.get('email') || '').trim() || undefined;
            phone = String(form.get('phone') || '').trim() || undefined;
            service = String(form.get('service') || '').trim() || undefined;
            text = String(form.get('text') || '');
            rating = Number(form.get('rating'));
            order = Number(form.get('order'));
            active = String(form.get('active')) === 'true';
            approved = String(form.get('approved')) === 'true';
        } else {
            const body = await request.json();
            name = body.name;
            email = body.email;
            phone = body.phone;
            service = body.service;
            text = body.text;
            rating = body.rating;
            order = body.order;
            active = body.active;
            approved = body.approved;
        }

        if (rating && (rating < 1 || rating > 5)) {
            return NextResponse.json(
                { error: 'rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        const testimonialModel = (prisma as any).testimonial;
        const testimonial = await testimonialModel.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email !== undefined && { email: email || null }),
                ...(phone !== undefined && { phone: phone || null }),
                ...(service && { service }),
                ...(text !== undefined && { text }),
                ...(rating !== undefined && Number.isFinite(rating) && { rating: Math.round(rating) }),
                ...(order !== undefined && Number.isFinite(order) && { order }),
                ...(active !== undefined && { active }),
                ...(approved !== undefined && {
                    approved,
                    approvedAt: approved ? new Date() : null,
                    active: approved ? (active ?? true) : false,
                }),
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

        const testimonialModel = (prisma as any).testimonial;
        await testimonialModel.delete({
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
