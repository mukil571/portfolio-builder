import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { websites } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getOwnerQuestions } from "@/server/ai/questions";
import { QuestionsManager } from "@/components/dashboard/questions-manager";

export default async function QuestionsPage() {
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

  // Fetch initial questions and stats for this website
  const { questions, stats } = await getOwnerQuestions(session.user.id, {
    websiteId: currentWebsite.id,
  });

  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <QuestionsManager
        initialQuestions={questions}
        initialStats={stats}
        website={currentWebsite}
      />
    </div>
  );
}
