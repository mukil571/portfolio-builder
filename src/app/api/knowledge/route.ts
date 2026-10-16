import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getOwnerKnowledgeEntries,
  createCustomKnowledgeEntry,
} from "@/server/ai/knowledge";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get("websiteId") || undefined;
    const isApprovedParam = searchParams.get("isApproved");
    const isApproved =
      isApprovedParam === "true"
        ? true
        : isApprovedParam === "false"
        ? false
        : undefined;

    const sourceTypeParam = searchParams.get("sourceType");
    const sourceType =
      sourceTypeParam === "owner_answer" ||
      sourceTypeParam === "profile_content" ||
      sourceTypeParam === "custom"
        ? sourceTypeParam
        : undefined;

    const result = await getOwnerKnowledgeEntries(session.user.id, {
      websiteId,
      isApproved,
      sourceType,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/knowledge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { websiteId, title, content } = body;

    if (!websiteId || !title || !content) {
      return NextResponse.json(
        { error: "websiteId, title, and content are required" },
        { status: 400 }
      );
    }

    const result = await createCustomKnowledgeEntry(session.user.id, {
      websiteId,
      title,
      content,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      entryId: result.entryId,
      isUpdated: result.isUpdated,
      message: result.isUpdated
        ? "Existing knowledge entry updated with approved content."
        : "Knowledge entry created and approved for AI chatbot grounding.",
    });
  } catch (error) {
    console.error("POST /api/knowledge error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
