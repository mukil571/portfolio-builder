import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import { websites, contentSections } from '@/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { PublicSiteRenderer } from '@/components/public/site-renderer';
import { ChatWidget } from '@/components/public/chat-widget';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await db.select().from(websites).where(eq(websites.slug, slug)).limit(1);
  if (!site.length) return { title: 'Not Found' };
  return {
    title: site[0].title + ' | Loriyum',
    description: `${site[0].title} — built with Loriyum`,
    openGraph: { title: site[0].title, description: `${site[0].title} — built with Loriyum` },
  };
}

export default async function PublicSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const site = await db.select().from(websites).where(and(eq(websites.slug, slug), eq(websites.isPublished, true))).limit(1);
  
  if (!site.length) {
    notFound();
  }
  
  const sections = await db.select().from(contentSections)
    .where(and(eq(contentSections.websiteId, site[0].id), eq(contentSections.isVisible, true)))
    .orderBy(asc(contentSections.orderIndex));
  
  return (
    <>
      <PublicSiteRenderer site={site[0]} sections={sections} />
      <ChatWidget websiteId={site[0].id} websiteTitle={site[0].title} />
    </>
  );
}
