import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
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
    const category = String(body?.category || '').trim();
    const icon = body?.icon === null || body?.icon === undefined || body?.icon === ''
      ? null
      : String(body.icon);
    const price = body?.price === null || body?.price === undefined || body?.price === ''
      ? null
      : String(body.price);
    const order = Number(body?.order ?? 0);

    if (!title || !description || !category) {
      return NextResponse.json({ error: 'Título, descripción y categoría son obligatorios' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        category,
        icon,
        price,
        order,
        active: true,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
