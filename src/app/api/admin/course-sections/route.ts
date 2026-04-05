import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const sections = await prisma.section.findMany({
      include: {
        courses: {
          include: {
            contents: true,
            assignments: true,
          },
          orderBy: [{ order: 'asc' }, { title: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });
    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAuthorized) {
      return adminCheck.response;
    }

    const body = await request.json();
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const order = Number(body?.order ?? 0);

    if (!title) {
      return NextResponse.json({ error: 'Título de sección es obligatorio' }, { status: 400 });
    }

    const section = await prisma.section.create({
      data: {
        title,
        description: description || null,
        order,
        active: true,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}
