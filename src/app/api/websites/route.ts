import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { websites, contentSections } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const PORTFOLIO_SECTIONS = [
  "hero",
  "about",
  "skills",
  "projects",
  "experience",
  "education",
  "contact",
  "socials",
] as const;

const PRODUCT_SECTIONS = [
  "hero",
  "about",
  "features",
  "benefits",
  "pricing",
  "faq",
  "testimonials",
  "contact",
] as const;

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, type, slug, description } = body;

    if (!title || !type || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
    }
    
    // Check if slug exists
    const existingWebsite = await db.select().from(websites).where(eq(websites.slug, slug)).limit(1);
    if (existingWebsite.length > 0) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }

    // Insert website
    const [newWebsite] = await db.insert(websites).values({
      ownerId: session.user.id,
      title,
      type,
      slug,
    }).returning();

    // Determine sections based on type
    const sectionsList = type === "portfolio" ? PORTFOLIO_SECTIONS : PRODUCT_SECTIONS;
    
    // Create sections
    const sectionsToInsert = sectionsList.map((sectionType, index) => {
      const isHero = sectionType === "hero";
      return {
        websiteId: newWebsite.id,
        type: sectionType,
        orderIndex: index,
        content: isHero ? { headline: title, subheadline: description || "" } : {},
      };
    });

    await db.insert(contentSections).values(sectionsToInsert);

    return NextResponse.json({ 
      success: true, 
      websiteId: newWebsite.id, 
      slug: newWebsite.slug 
    });
  } catch (error: any) {
    console.error("Error creating website:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
