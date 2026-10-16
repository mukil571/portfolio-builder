import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  updateKnowledgeEntryAsOwner,
  deleteKnowledgeEntryAsOwner,
} from "@/server/ai/knowledge";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Knowledge entry ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { title, content, isApproved } = body;

    const result = await updateKnowledgeEntryAsOwner(session.user.id, id, {
      title,
      content,
      isApproved,
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
      message: "Knowledge entry updated successfully.",
    });
  } catch (error) {
    console.error("PATCH /api/knowledge/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Knowledge entry ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteKnowledgeEntryAsOwner(session.user.id, id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      entryId: result.entryId,
      message: "Knowledge entry deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/knowledge/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
