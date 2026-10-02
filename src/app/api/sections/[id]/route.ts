import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/server/db';
import { contentSections, websites } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const sectionOwnership = await db
      .select({ id: contentSections.id })
      .from(contentSections)
      .innerJoin(websites, eq(contentSections.websiteId, websites.id))
      .where(and(eq(contentSections.id, id), eq(websites.ownerId, session.user.id)));

    if (sectionOwnership.length === 0) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.isVisible !== undefined) updateData.isVisible = body.isVisible;
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;

    await db
      .update(contentSections)
      .set(updateData)
      .where(eq(contentSections.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
