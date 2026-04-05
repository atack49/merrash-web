import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextResponse, NextRequest } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAuthorized) {
      return adminCheck.response;
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, resourceUrl, type } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;
    if (resourceUrl !== undefined) updateData.resourceUrl = resourceUrl || null;
    if (type !== undefined && ['TASK', 'MATERIAL', 'PDF', 'TOOL'].includes(String(type).toUpperCase())) {
      updateData.type = String(type).toUpperCase();
    }

    const content = await prisma.courseContent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error('Error updating course content:', error);
    return NextResponse.json({ error: 'Failed to update course content' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAuthorized) {
      return adminCheck.response;
    }

    const { id } = await params;
    await prisma.courseContent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course content:', error);
    return NextResponse.json({ error: 'Failed to delete course content' }, { status: 500 });
  }
}
