import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { answerQuestionAsOwner } from "@/server/ai/questions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: questionId } = await params;
    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { answer } = body;

    if (!answer || typeof answer !== "string") {
      return NextResponse.json(
        { error: "Answer text is required" },
        { status: 400 }
      );
    }

    const result = await answerQuestionAsOwner(
      session.user.id,
      questionId,
      answer
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      questionId: result.questionId,
      knowledgeEntryId: result.knowledgeEntryId,
      message: "Answer saved and approved for AI chatbot knowledge grounding.",
    });
  } catch (error) {
    console.error("POST /api/questions/[id]/answer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
