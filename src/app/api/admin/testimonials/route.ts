import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) {
            return adminCheck.response;
        }

        const testimonialModel = (prisma as any).testimonial;
        let testimonials: any[] = [];

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
                    createdAt: true,
                    updatedAt: true,
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

        const contentType = request.headers.get('content-type') || '';
        let name = '';
        let service = '';
        let text = '';
        let rating = 5;
        let order = 0;
        let active: boolean | undefined = true;
        let approved: boolean | undefined = true;

        if (contentType.includes('multipart/form-data')) {
            const form = await request.formData();
            name = String(form.get('name') || '').trim();
            service = String(form.get('service') || '').trim();
            text = String(form.get('text') || '').trim();
            rating = Number(form.get('rating') || 5);
            order = Number(form.get('order') || 0);
            active = String(form.get('active') || 'true') === 'true';
            approved = String(form.get('approved') || 'true') === 'true';
        } else {
            const body = await request.json();
            name = String(body.name || '').trim();
            service = String(body.service || '').trim();
            text = String(body.text || '').trim();
            rating = Number(body.rating || 5);
            order = Number(body.order || 0);
            active = body.active ?? true;
            approved = body.approved ?? true;
        }

        if (!name || !service) {
            return NextResponse.json(
                { error: 'name and service are required' },
                { status: 400 }
            );
        }

        if (!text) {
            return NextResponse.json(
                { error: 'Provide testimonial text' },
                { status: 400 }
            );
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: 'rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        const safeRating = Number.isFinite(rating) ? Math.round(rating) : 5;

        const testimonialModel = (prisma as any).testimonial;
        const testimonial = await testimonialModel.create({
            data: {
                name,
                service,
                text,
                rating: safeRating,
                order: order || 0,
                source: 'admin',
                approved: approved ?? true,
                approvedAt: approved === false ? null : new Date(),
                active: active ?? true,
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
