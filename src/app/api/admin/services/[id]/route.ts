import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';
import { deleteCloudinaryAssetByUrl } from '@/lib/images/cloudinaryAdmin';

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
                priceSession: true,
                pricePackage: true,
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
        const { title, description, priceSession, pricePackage, icon, category, order, active } = body;

        const previousService = await prisma.service.findUnique({
            where: { id },
            select: { icon: true },
        });

        if (!previousService) {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }

        const normalizedIcon =
            icon === undefined
                ? undefined
                : icon === null || icon === ''
                  ? null
                  : typeof icon === 'string'
                    ? icon.trim()
                    : undefined;

        if (typeof normalizedIcon === 'string' && normalizedIcon.startsWith('data:image/')) {
            return NextResponse.json(
                { error: 'No se permite guardar imágenes en base64. Sube la imagen a Cloudinary y guarda la URL.' },
                { status: 400 }
            );
        }

        // Build update data object with only provided fields
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (priceSession !== undefined) updateData.priceSession = priceSession;
        if (pricePackage !== undefined) updateData.pricePackage = pricePackage;
        if (normalizedIcon !== undefined) updateData.icon = normalizedIcon;
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
                priceSession: true,
                pricePackage: true,
                icon: true,
                category: true,
                order: true,
                active: true,
                updatedAt: true,
            },
        });

        const previousIcon = previousService.icon;
        const nextIcon = service.icon;
        const shouldDeletePreviousIcon =
            Boolean(previousIcon) &&
            normalizedIcon !== undefined &&
            previousIcon !== nextIcon;

        if (shouldDeletePreviousIcon) {
            try {
                await deleteCloudinaryAssetByUrl(previousIcon);
            } catch (cleanupError) {
                console.error('Error deleting old Cloudinary image:', cleanupError);
            }
        }

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

        const service = await prisma.service.findUnique({
            where: { id },
            select: { icon: true },
        });

        if (!service) {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }

        await prisma.service.delete({
            where: { id },
        });

        if (service.icon) {
            try {
                await deleteCloudinaryAssetByUrl(service.icon);
            } catch (cleanupError) {
                console.error('Error deleting Cloudinary image after service delete:', cleanupError);
            }
        }

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
