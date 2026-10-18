import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getAIModel } from "@/server/ai/provider";
import { aggregateKnowledge } from "@/server/ai/knowledge";
import { recordUnansweredQuestion } from "@/server/ai/questions";
import { checkRateLimit, getClientIp } from "@/server/security/rate-limit";
import { validateChatPayload } from "@/server/security/validation";
import { categorizeAIError } from "@/server/ai/errors";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // 1. IP-based rate limiting (20 requests per minute per IP)
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkRateLimit(`chat:${clientIp}`, {
      maxRequests: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.success) {
      return new Response(
        JSON.stringify({
          error: "Too many chat requests. Please wait a moment before trying again.",
          code: "RATE_LIMITED",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // 2. Validate payload bounds and structure
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
          code: "INVALID_JSON",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validation = validateChatPayload(body);
    if (!validation.valid || !validation.websiteId || !validation.messages) {
      return new Response(
        JSON.stringify({
          error: validation.error || "Invalid request payload",
          code: "INVALID_PAYLOAD",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { websiteId, messages } = validation;

    // 3. Aggregate approved knowledge context for this website
    const context = await aggregateKnowledge(websiteId);

    if (!context) {
      return new Response(
        JSON.stringify({
          error: "Website not found or not published",
          code: "SITE_NOT_FOUND",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Initialize AI model safely
    let model;
    try {
      model = getAIModel();
    } catch (providerError) {
      console.error(
        "[Chat API Provider Error]:",
        providerError instanceof Error ? providerError.message : providerError
      );
      return new Response(
        JSON.stringify({
          error:
            "Chat service is temporarily unavailable. Missing AI provider credentials.",
          code: "AI_CONFIG_ERROR",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Convert messages to model format
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
      onError: ({ error }) => {
        const errorName = error instanceof Error ? error.name : "UnknownError";
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[Chat Stream Error]:", {
          name: errorName,
          message: errorMessage,
          websiteId: context.site.id,
        });
      },
      tools: {
        record_unanswered_question: tool({
          description:
            "Record a visitor question that cannot be answered from the available website content and knowledge base. Call this tool BEFORE responding to the visitor when you determine the question cannot be answered.",
          inputSchema: questionSchema,
          execute: async (input: z.infer<typeof questionSchema>) => {
            try {
              const res = await recordUnansweredQuestion(
                context.site.id,
                input.questionText
              );
              if (res.recorded) {
                return {
                  success: true as const,
                  message:
                    "Question recorded successfully. The website owner will be notified.",
                };
              }
              return {
                success: false as const,
                message: `Failed to record question: ${res.error}`,
              };
            } catch (err) {
              console.error("Tool execution error:", err);
              return {
                success: false as const,
                message: "Internal error occurred while recording question.",
              };
            }
          },
        }),
      },
      // Allow the model to generate text after a tool call
      stopWhen: stepCountIs(2),
    });

    return result.toUIMessageStreamResponse({
      headers: {
        "X-RateLimit-Limit": rateLimit.limit.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
      onError: (error) => {
        const { safeMessage, code } = categorizeAIError(error);
        return `${safeMessage} (Code: ${code})`;
      },
    });
  } catch (error) {
    console.error("[Chat API Route Error]:", error);
    return new Response(
      JSON.stringify({
        error: "Unable to process your request at this time. Please try again.",
        code: "INTERNAL_SERVER_ERROR",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
