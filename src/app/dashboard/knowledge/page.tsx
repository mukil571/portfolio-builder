import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { websites } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getOwnerKnowledgeEntries } from "@/server/ai/knowledge";
import { KnowledgeManager } from "@/components/dashboard/knowledge-manager";

export default async function KnowledgePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Get user's active website
  const userWebsites = await db
    .select({
      id: websites.id,
      title: websites.title,
      slug: websites.slug,
      type: websites.type,
      isPublished: websites.isPublished,
    })
    .from(websites)
    .where(eq(websites.ownerId, session.user.id))
    .limit(1);

  if (userWebsites.length === 0) {
    redirect("/dashboard/onboarding");
  }

  const currentWebsite = userWebsites[0];

  // Fetch initial knowledge entries and stats
  const { entries, stats } = await getOwnerKnowledgeEntries(session.user.id, {
    websiteId: currentWebsite.id,
  });

  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <KnowledgeManager
        initialEntries={entries}
        initialStats={stats}
        website={currentWebsite}
      />
    </div>
  );
}
