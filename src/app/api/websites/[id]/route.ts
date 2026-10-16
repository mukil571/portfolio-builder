import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { websites } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Extract allowed fields to update
    const updateData: { isPublished?: boolean; title?: string; slug?: string } = {};
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.slug !== undefined) updateData.slug = body.slug;

    // Verify ownership
    const existingWebsite = await db.query.websites.findFirst({
      where: and(
        eq(websites.id, id),
        eq(websites.ownerId, session.user.id)
      )
    });

    if (!existingWebsite) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Update the website
    await db.update(websites)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update website:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
