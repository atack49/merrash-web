import { requireAdmin } from '@/lib/auth-utils';
import { deleteCourseSection, getCourseSections, updateCourseSection } from '@/lib/courseSections';
import { prisma } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAuthorized) {
      return adminCheck.response;
    }

    const { id } = await params;
    const body = await request.json();
    const name = String(body?.name || body?.title || '').trim();

    const { previous, updated } = await updateCourseSection(id, name);

    if (previous.name !== updated.name) {
      await prisma.course.updateMany({
        where: { category: previous.name },
        data: { category: updated.name },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update section' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAuthorized) {
      return adminCheck.response;
    }

    const { id } = await params;
    const sections = await getCourseSections();
    const target = sections.find((item) => item.id === id);
    if (!target) {
      return NextResponse.json({ error: 'La sección no existe' }, { status: 404 });
    }

    const linkedCourses = await prisma.course.count({ where: { category: target.name } });
    if (linkedCourses > 0) {
      return NextResponse.json(
        { error: `No puedes eliminar la sección porque tiene ${linkedCourses} curso(s) asignado(s).` },
        { status: 400 }
      );
    }

    const deleted = await deleteCourseSection(id);

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete section' },
      { status: 400 }
    );
  }
}
