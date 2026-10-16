import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth';
import { db } from '@/server/db';
import { websites } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { WebsiteManager } from '@/components/dashboard/website-manager';

export default async function WebsitePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const userWebsite = await db.query.websites.findFirst({
    where: eq(websites.ownerId, session.user.id),
  });

  if (!userWebsite) {
    redirect('/dashboard/onboarding');
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Website Management</h2>
      </div>
      <WebsiteManager website={userWebsite} />
    </div>
  );
}
