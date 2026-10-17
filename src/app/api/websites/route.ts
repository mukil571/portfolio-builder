import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { websites, contentSections } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  validateSlug,
  validateWebsiteTitle,
  validateWebsiteType,
} from "@/server/security/validation";

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

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, type, slug, description } = body;

    const titleValidation = validateWebsiteTitle(title);
    if (!titleValidation.valid) {
      return NextResponse.json(
        { error: titleValidation.error },
        { status: 400 }
      );
    }

    const typeValidation = validateWebsiteType(type);
    if (!typeValidation.valid) {
      return NextResponse.json(
        { error: typeValidation.error },
        { status: 400 }
      );
    }

    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      return NextResponse.json(
        { error: slugValidation.error },
        { status: 400 }
      );
    }

    const normalizedSlug = slug.trim().toLowerCase();

    if (
      description !== undefined &&
      description !== null &&
      (typeof description !== "string" || description.length > 500)
    ) {
      return NextResponse.json(
        { error: "Description must be a string up to 500 characters" },
        { status: 400 }
      );
    }

    // Check if slug exists
    const existingWebsite = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.slug, normalizedSlug))
      .limit(1);

    if (existingWebsite.length > 0) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }

    // Insert website with verified owner ID
    const [newWebsite] = await db
      .insert(websites)
      .values({
        ownerId: session.user.id,
        title: titleValidation.value!,
        type: type as "portfolio" | "product",
        slug: normalizedSlug,
      })
      .returning();

    // Determine sections based on type
    const sectionsList =
      type === "portfolio" ? PORTFOLIO_SECTIONS : PRODUCT_SECTIONS;

    // Create sections
    const sectionsToInsert = sectionsList.map((sectionType, index) => {
      const isHero = sectionType === "hero";
      return {
        websiteId: newWebsite.id,
        type: sectionType,
        orderIndex: index,
        content: isHero
          ? { headline: titleValidation.value, subheadline: description || "" }
          : {},
      };
    });

    await db.insert(contentSections).values(sectionsToInsert);

    return NextResponse.json({
      success: true,
      websiteId: newWebsite.id,
      slug: newWebsite.slug,
    });
  } catch (error) {
    console.error("Error creating website:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
