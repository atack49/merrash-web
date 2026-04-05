import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        section: true,
        contents: true,
        assignments: true,
      },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });
    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
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
    const sectionId = String(body?.sectionId || '').trim();
    const order = Number(body?.order ?? 0);

    if (!title) {
      return NextResponse.json({ error: 'Título es obligatorio' }, { status: 400 });
    }

    if (!sectionId) {
      return NextResponse.json({ error: 'La sección es obligatoria' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        title,
        description: description || null,
        sectionId,
        order,
        active: true,
      },
      include: {
        section: true,
        contents: true,
        assignments: true,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
