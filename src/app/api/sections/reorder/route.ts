import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/server/db';
import { contentSections, websites } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { websiteId, sectionIds } = body;

    if (!websiteId || !Array.isArray(sectionIds)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const website = await db
      .select()
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.ownerId, session.user.id)))
      .limit(1);

    if (website.length === 0) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    for (let i = 0; i < sectionIds.length; i++) {
      await db
        .update(contentSections)
        .set({ orderIndex: i, updatedAt: new Date() })
        .where(eq(contentSections.id, sectionIds[i]));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
