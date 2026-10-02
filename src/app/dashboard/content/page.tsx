import { getSession } from '@/server/auth';
import { db } from '@/server/db';
import { websites, contentSections } from '@/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ContentEditor } from '@/components/dashboard/content-editor';

export default async function ContentPage() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }

  const website = await db
    .select()
    .from(websites)
    .where(eq(websites.ownerId, session.user.id))
    .limit(1);

  if (website.length === 0) {
    redirect('/dashboard/onboarding');
  }

  const sections = await db
    .select()
    .from(contentSections)
    .where(eq(contentSections.websiteId, website[0].id))
    .orderBy(asc(contentSections.orderIndex));

  return (
    <div className="container mx-auto p-6">
      <ContentEditor
        website={website[0]}
        sections={sections.map(s => ({ ...s, content: s.content ?? {} }))}
      />
    </div>
  );
}
