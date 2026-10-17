import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { websites } from "@/server/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  validateSlug,
  validateWebsiteTitle,
  isValidUuid,
} from "@/server/security/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || typeof id !== "string" || !isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid website ID" }, { status: 400 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Extract and validate allowed fields to update
    const updateData: { isPublished?: boolean; title?: string; slug?: string } =
      {};

    if (body.title !== undefined) {
      const titleValidation = validateWebsiteTitle(body.title);
      if (!titleValidation.valid) {
        return NextResponse.json(
          { error: titleValidation.error },
          { status: 400 }
        );
      }
      updateData.title = titleValidation.value;
    }

    if (body.slug !== undefined) {
      const slugValidation = validateSlug(body.slug);
      if (!slugValidation.valid) {
        return NextResponse.json(
          { error: slugValidation.error },
          { status: 400 }
        );
      }
      updateData.slug = body.slug.trim().toLowerCase();
    }

    if (body.isPublished !== undefined) {
      if (typeof body.isPublished !== "boolean") {
        return NextResponse.json(
          { error: "isPublished must be a boolean" },
          { status: 400 }
        );
      }
      updateData.isPublished = body.isPublished;
    }

    // Verify ownership
    const existingWebsite = await db.query.websites.findFirst({
      where: and(eq(websites.id, id), eq(websites.ownerId, session.user.id)),
    });

    if (!existingWebsite) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    // If slug is being updated to a new value, verify uniqueness across other websites
    if (updateData.slug && updateData.slug !== existingWebsite.slug) {
      const slugCollision = await db.query.websites.findFirst({
        where: and(eq(websites.slug, updateData.slug), ne(websites.id, id)),
      });

      if (slugCollision) {
        return NextResponse.json(
          { error: "Slug already taken by another website" },
          { status: 409 }
        );
      }
    }

    // Update the website with strict dual ownership predicate
    await db
      .update(websites)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(eq(websites.id, id), eq(websites.ownerId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update website:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
