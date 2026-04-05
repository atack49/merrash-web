import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const sections = await prisma.section.findMany({
      where: { active: true },
      include: {
        courses: {
          where: { active: true },
          include: {
            contents: true,
          },
          orderBy: [{ order: 'asc' }, { title: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching public courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
