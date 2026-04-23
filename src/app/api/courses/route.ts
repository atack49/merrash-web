import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching public courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
