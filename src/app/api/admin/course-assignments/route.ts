import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get('courseId');

    const assignments = await (prisma as any).courseAssignment.findMany({
      where: courseId ? { courseId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch course assignments' }, { status: 500 });
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
    const studentName = String(body?.studentName || '').trim();
    const studentEmail = String(body?.studentEmail || '').trim();

    if (!courseId || !studentName || !studentEmail) {
      return NextResponse.json({ error: 'courseId, studentName y studentEmail son obligatorios' }, { status: 400 });
    }

    const assignment = await (prisma as any).courseAssignment.create({
      data: {
        courseId,
        studentName,
        studentEmail,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create course assignment' }, { status: 500 });
  }
}
