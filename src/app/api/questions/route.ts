import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOwnerQuestions } from "@/server/ai/questions";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get("websiteId") || undefined;
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "unanswered" ||
      statusParam === "answered" ||
      statusParam === "dismissed"
        ? statusParam
        : undefined;

    const result = await getOwnerQuestions(session.user.id, {
      websiteId,
      status,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/questions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
