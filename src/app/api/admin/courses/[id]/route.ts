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
    const { title, description, category, icon, price, active, order } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (icon !== undefined) updateData.icon = icon === '' ? null : icon;
    if (price !== undefined) updateData.price = price === '' ? null : price;
    if (active !== undefined) updateData.active = Boolean(active);
    if (order !== undefined) updateData.order = Number(order);

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAuthorized) {
      return adminCheck.response;
    }

    const { id } = await params;
    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
