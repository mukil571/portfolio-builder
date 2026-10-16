import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getAIModel } from "@/server/ai/provider";
import { aggregateKnowledge } from "@/server/ai/knowledge";
import { recordUnansweredQuestion } from "@/server/ai/questions";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, websiteId } = body;

    if (!websiteId || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: messages, websiteId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Aggregate all knowledge context for this website
    const context = await aggregateKnowledge(websiteId);

    if (!context) {
      return new Response(
        JSON.stringify({ error: "Website not found or not published" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const model = getAIModel();

    // Convert UIMessage[] (from useChat, with parts[]) to ModelMessage[]
    // (with content) that streamText expects in AI SDK v7
    const modelMessages = await convertToModelMessages(messages);

    const questionSchema = z.object({
      questionText: z
        .string()
        .min(3, "Question must be at least 3 characters")
        .max(2000, "Question must be at most 2000 characters")
        .describe("The visitor's question that could not be answered"),
    });

    const result = streamText({
      model,
      system: context.systemPrompt,
      messages: modelMessages,
      tools: {
        record_unanswered_question: tool({
          description:
            "Record a visitor question that cannot be answered from the available website content and knowledge base. Call this tool BEFORE responding to the visitor when you determine the question cannot be answered.",
          inputSchema: questionSchema,
          execute: async (input: z.infer<typeof questionSchema>) => {
            const result = await recordUnansweredQuestion(
              context.site.id,
              input.questionText
            );
            if (result.recorded) {
              return {
                success: true as const,
                message: "Question recorded successfully. The website owner will be notified.",
              };
            }
            return {
              success: false as const,
              message: `Failed to record question: ${result.error}`,
            };
          },
        }),
      },
      // Allow the model to continue generating text after a tool call
      // (default is stepCountIs(1) which stops after the first tool result)
      stopWhen: stepCountIs(2),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
