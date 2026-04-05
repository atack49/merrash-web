import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-utils';
import { prisma } from '@/lib/db';
import {
    deletePendingTestimonialRecord,
    getPendingTestimonialRecord,
    listPendingTestimonialRecords,
    updatePendingTestimonialStatus,
} from '@/lib/testimonials/pendingStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) return adminCheck.response;

        const pending = await listPendingTestimonialRecords('pending');
        return NextResponse.json(pending);
    } catch (error) {
        console.error('Error listing pending testimonials:', error);
        return NextResponse.json({ error: 'No se pudieron cargar pendientes' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.isAuthorized) return adminCheck.response;

        const body = await request.json();
        const id = String(body?.id || '');
        const action = String(body?.action || '');

        if (!id || !action) {
            return NextResponse.json({ error: 'id y action son obligatorios' }, { status: 400 });
        }

        const pending = await getPendingTestimonialRecord(id);
        if (!pending) {
            return NextResponse.json({ error: 'Pendiente no encontrado' }, { status: 404 });
        }

        if (action === 'archive') {
            const archived = await updatePendingTestimonialStatus(id, 'archived');
            return NextResponse.json({ success: true, item: archived });
        }

        if (action === 'delete') {
            const deleted = await deletePendingTestimonialRecord(id);
            return NextResponse.json({ success: deleted });
        }

        if (action !== 'approve') {
            return NextResponse.json({ error: 'action invalida' }, { status: 400 });
        }

        const testimonialModel = (prisma as any).testimonial;
        let created: any;

        try {
            created = await testimonialModel.create({
                data: {
                    name: pending.name,
                    service: pending.service,
                    text: pending.text || '',
                    rating: pending.rating,
                    source: 'client',
                    approved: true,
                    approvedAt: new Date(),
                    active: true,
                    order: 0,
                },
            });
        } catch {
            created = await testimonialModel.create({
                data: {
                    name: pending.name,
                    service: pending.service,
                    text: pending.text || '',
                    rating: pending.rating,
                    active: true,
                    order: 0,
                },
            });
        }

        await deletePendingTestimonialRecord(id);

        return NextResponse.json({ success: true, testimonial: created });
    } catch (error) {
        console.error('Error processing pending testimonial:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'No se pudo procesar el pendiente' },
            { status: 500 }
        );
    }
}
