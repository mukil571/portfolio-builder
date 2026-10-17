import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { contentSections, websites } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidUuid } from "@/server/security/validation";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { websiteId, sectionIds } = body;

    if (!websiteId || typeof websiteId !== "string" || !isValidUuid(websiteId)) {
      return NextResponse.json({ error: "Invalid websiteId" }, { status: 400 });
    }

    if (
      !Array.isArray(sectionIds) ||
      sectionIds.length === 0 ||
      sectionIds.length > 100 ||
      !sectionIds.every((id) => typeof id === "string" && id.trim().length > 0)
    ) {
      return NextResponse.json(
        { error: "Invalid sectionIds payload" },
        { status: 400 }
      );
    }

    const website = await db
      .select({ id: websites.id })
      .from(websites)
      .where(
        and(eq(websites.id, websiteId), eq(websites.ownerId, session.user.id))
      )
      .limit(1);

    if (website.length === 0) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Reorder only sections that strictly belong to this website
    for (let i = 0; i < sectionIds.length; i++) {
      await db
        .update(contentSections)
        .set({ orderIndex: i, updatedAt: new Date() })
        .where(
          and(
            eq(contentSections.id, sectionIds[i]),
            eq(contentSections.websiteId, websiteId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering sections:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
