import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const service = await prisma.service.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                icon: true,
                category: true,
                order: true,
                active: true,
                updatedAt: true,
            },
        });

        if (!service) {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(service);
    } catch (error) {
        console.error('Error fetching service:', error);
        return NextResponse.json(
            { error: 'Failed to fetch service' },
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
        const { title, description, icon, category, order, active } = body;

        // Build update data object with only provided fields
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (icon !== undefined) updateData.icon = icon;
        if (category !== undefined) updateData.category = category;
        if (order !== undefined) updateData.order = order;
        if (active !== undefined) updateData.active = active;

        const service = await prisma.service.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                title: true,
                description: true,
                icon: true,
                category: true,
                order: true,
                active: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(service);
    } catch (error: any) {
        console.error('Error updating service:', error);
        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to update service' },
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

        await prisma.service.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting service:', error);
        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to delete service' },
            { status: 500 }
        );
    }
}
