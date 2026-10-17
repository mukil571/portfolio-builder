import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { contentSections, websites } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { validateSectionTitle, isValidUuid } from "@/server/security/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || typeof id !== "string" || !isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid section ID" }, { status: 400 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Verify ownership and retrieve section websiteId
    const [existing] = await db
      .select({
        id: contentSections.id,
        websiteId: contentSections.websiteId,
      })
      .from(contentSections)
      .innerJoin(websites, eq(contentSections.websiteId, websites.id))
      .where(
        and(eq(contentSections.id, id), eq(websites.ownerId, session.user.id))
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const updateData: {
      updatedAt: Date;
      title?: string;
      content?: Record<string, unknown>;
      isVisible?: boolean;
      orderIndex?: number;
    } = { updatedAt: new Date() };

    if (body.title !== undefined) {
      const titleValidation = validateSectionTitle(body.title);
      if (!titleValidation.valid) {
        return NextResponse.json(
          { error: titleValidation.error },
          { status: 400 }
        );
      }
      updateData.title = titleValidation.value;
    }

    if (body.isVisible !== undefined) {
      if (typeof body.isVisible !== "boolean") {
        return NextResponse.json(
          { error: "isVisible must be a boolean" },
          { status: 400 }
        );
      }
      updateData.isVisible = body.isVisible;
    }

    if (body.orderIndex !== undefined) {
      if (
        typeof body.orderIndex !== "number" ||
        !Number.isInteger(body.orderIndex) ||
        body.orderIndex < 0
      ) {
        return NextResponse.json(
          { error: "orderIndex must be a non-negative integer" },
          { status: 400 }
        );
      }
      updateData.orderIndex = body.orderIndex;
    }

    if (body.content !== undefined) {
      if (
        typeof body.content !== "object" ||
        body.content === null ||
        Array.isArray(body.content)
      ) {
        return NextResponse.json(
          { error: "content must be a JSON object" },
          { status: 400 }
        );
      }
      updateData.content = body.content;
    }

    // Update with dual predicate (id + websiteId)
    await db
      .update(contentSections)
      .set(updateData)
      .where(
        and(
          eq(contentSections.id, id),
          eq(contentSections.websiteId, existing.websiteId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
