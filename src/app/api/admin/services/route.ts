import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const services = await prisma.service.findMany({
            where: { active: true },
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                icon: true,
                order: true,
                active: true,
            },
            orderBy: { order: 'asc' },
        });
        
        const response = NextResponse.json(services);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json(
            { error: 'Failed to fetch services' },
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
        const { title, description, icon, category, order } = body;

                const normalizedIcon =
                        icon === null || icon === undefined || icon === ''
                                ? null
                                : typeof icon === 'string'
                                    ? icon.trim()
                                    : null;

        if (!title || !description || !category) {
            return NextResponse.json(
                { error: 'title, description, and category are required' },
                { status: 400 }
            );
        }

        if (normalizedIcon && normalizedIcon.startsWith('data:image/')) {
            return NextResponse.json(
                { error: 'No se permite guardar imágenes en base64. Sube la imagen a Cloudinary y guarda la URL.' },
                { status: 400 }
            );
        }

        const service = await prisma.service.create({
            data: {
                title,
                description,
                icon: normalizedIcon,
                category,
                order: order || 0,
                active: true,
            },
        });

        return NextResponse.json(service, { status: 201 });
    } catch (error) {
        console.error('Error creating service:', error);
        return NextResponse.json(
            { error: 'Failed to create service' },
            { status: 500 }
        );
    }
}
