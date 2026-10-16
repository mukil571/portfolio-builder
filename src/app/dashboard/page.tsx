import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import {
  Globe,
  MessageCircleQuestion,
  BookOpen,
  Bot,
  Eye,
  Edit,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { db } from "@/server/db";
import { websites, visitorQuestions, knowledgeEntries } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const QUICK_ACTIONS = [
  {
    title: "Edit Website",
    description: "Update your content and sections",
    href: "/dashboard/content",
    icon: Edit,
  },
  {
    title: "Answer Questions",
    description: "Respond to visitor questions",
    href: "/dashboard/questions",
    icon: MessageCircleQuestion,
  },
  {
    title: "Preview Site",
    description: "See how your site looks to visitors",
    href: "/dashboard/website",
    icon: Eye,
  },
];

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const userWebsites = await db
    .select()
    .from(websites)
    .where(eq(websites.ownerId, session.user.id))
    .limit(1);

  if (userWebsites.length === 0) {
    redirect("/dashboard/onboarding");
  }

  const site = userWebsites[0];
  const firstName = session.user.name?.split(" ")[0] || "there";

  // Query live counts safely
  let totalQuestions = 0;
  let unansweredQuestions = 0;
  let approvedKnowledge = 0;

  try {
    const questions = await db
      .select({ status: visitorQuestions.status })
      .from(visitorQuestions)
      .where(eq(visitorQuestions.websiteId, site.id));

    totalQuestions = questions.length;
    unansweredQuestions = questions.filter((q) => q.status === "unanswered").length;

    const knowledge = await db
      .select({ id: knowledgeEntries.id })
      .from(knowledgeEntries)
      .where(
        and(
          eq(knowledgeEntries.websiteId, site.id),
          eq(knowledgeEntries.isApproved, true)
        )
      );

    approvedKnowledge = knowledge.length;
  } catch (error) {
    console.error("Dashboard metrics query error:", error);
  }

  const metricCards = [
    {
      title: "Website Status",
      value: site.isPublished ? "Published" : "Draft",
      description: site.isPublished ? "Live to the public" : "Not yet published",
      icon: Globe,
      color: site.isPublished ? "text-green-500" : "text-blue-500",
    },
    {
      title: "AI Conversations",
      value: "0",
      description: "Total chats with visitors",
      icon: Bot,
      color: "text-purple-500",
    },
    {
      title: "Visitor Questions",
      value: totalQuestions.toString(),
      description: "Questions recorded",
      icon: MessageCircleQuestion,
      color: "text-amber-500",
    },
    {
      title: "Unanswered",
      value: unansweredQuestions.toString(),
      description: "Waiting for your answer",
      icon: HelpCircle,
      color: unansweredQuestions > 0 ? "text-red-500" : "text-muted-foreground",
    },
    {
      title: "Knowledge Entries",
      value: approvedKnowledge.toString(),
      description: "Approved answers in your base",
      icon: BookOpen,
      color: "text-green-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}! 👋
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your website and AI chatbot activity.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metricCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.title}
              className="group transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link
                  href={action.href}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full"
                  )}
                >
                  Go
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Questions Prompt Callout if there are unanswered questions */}
      {unansweredQuestions > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <HelpCircle className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                You have {unansweredQuestions} unanswered visitor{" "}
                {unansweredQuestions === 1 ? "question" : "questions"}!
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0">
            <p className="text-sm text-muted-foreground">
              Provide approved answers so your AI chatbot can immediately start answering future visitors.
            </p>
            <Link
              href="/dashboard/questions"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              )}
            >
              Answer Questions
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Placeholder */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {totalQuestions > 0
                ? `${totalQuestions} visitor questions recorded so far across your site.`
                : "No visitor activity yet. Publish your website and share the link to start collecting questions!"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
