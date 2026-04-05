import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createPendingTestimonialRecord } from '@/lib/testimonials/pendingStore';

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
    try {
        const testimonialModel = (prisma as any).testimonial;
        let testimonials: any[] = [];

        try {
            testimonials = await testimonialModel.findMany({
                where: { active: true, approved: true },
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
        } catch {
            const legacy = await testimonialModel.findMany({
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

            testimonials = legacy;
        }

        const normalized = testimonials.map((item: any) => {
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

export async function POST(request: Request) {
    try {
        let name = '';
        let service = '';
        let text = '';
        let rating = 5;

        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            name = String(formData.get('name') || '').trim();
            service = String(formData.get('service') || '').trim();
            text = String(formData.get('text') || '').trim();
            rating = Number(formData.get('rating') || 5);
        } else {
            const body = await request.json();
            name = String(body.name || '').trim();
            service = String(body.service || '').trim();
            text = String(body.text || '').trim();
            rating = Number(body.rating || 5);
        }

        if (!name || !service) {
            return NextResponse.json(
                { error: 'name y service son obligatorios' },
                { status: 400 }
            );
        }

        if (!text) {
            return NextResponse.json(
                { error: 'Debes enviar texto en tu testimonio' },
                { status: 400 }
            );
        }

        const safeRating = Math.max(1, Math.min(5, Math.round(Number.isFinite(rating) ? rating : 5)));

        await createPendingTestimonialRecord({
            name,
            service,
            text: text || undefined,
            rating: safeRating,
        });

        return NextResponse.json(
            { success: true, message: 'Gracias. Tu testimonio fue recibido localmente y esta pendiente de aprobacion.' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating client testimonial:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'No se pudo enviar el testimonio' },
            { status: 500 }
        );
    }
}
