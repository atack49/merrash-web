import { requireAdmin } from '@/lib/auth-utils';
import { createCourseSection, getCourseSections } from '@/lib/courseSections';
import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const sections = await getCourseSections();
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
    const name = String(body?.name || body?.title || '').trim();

    const section = await createCourseSection(name);

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create section' },
      { status: 400 }
    );
  }
}
