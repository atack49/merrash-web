import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get('courseId');
    const where = courseId ? { courseId } : undefined;

    const contents = await prisma.courseContent.findMany({
      where,
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(contents);
  } catch (error) {
    console.error('Error fetching course contents:', error);
    return NextResponse.json({ error: 'Failed to fetch course contents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAuthorized) {
      return adminCheck.response;
    }

    const body = await request.json();
    const courseId = String(body?.courseId || '').trim();
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const resourceUrl = String(body?.resourceUrl || '').trim();
    const type = String(body?.type || 'TASK').toUpperCase();
    const validTypes = ['TASK', 'MATERIAL', 'PDF', 'TOOL'] as const;
    const normalizedType = validTypes.includes(type as typeof validTypes[number])
      ? (type as typeof validTypes[number])
      : 'TASK';

    if (!courseId || !title) {
      return NextResponse.json({ error: 'courseId y title son obligatorios' }, { status: 400 });
    }

    const content = await prisma.courseContent.create({
      data: {
        courseId,
        title,
        description: description || null,
        resourceUrl: resourceUrl || null,
        type: normalizedType,
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error('Error creating course content:', error);
    return NextResponse.json({ error: 'Failed to create course content' }, { status: 500 });
  }
}
