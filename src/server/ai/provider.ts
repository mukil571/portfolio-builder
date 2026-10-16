import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { config } from "@/lib/config";

export type AIProviderType = "gemini" | "openai" | "anthropic";

/**
 * Returns the appropriate AI SDK language model based on environment config.
 * Supports Gemini, OpenAI, and Anthropic providers.
 */
export function getAIModel(): LanguageModel {
  const provider = config.ai.provider;

  switch (provider) {
    case "gemini": {
      const google = createGoogleGenerativeAI({
        apiKey: config.ai.geminiKey,
      });
      return google("gemini-2.0-flash");
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: config.ai.openaiKey,
      });
      return openai("gpt-4o-mini");
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: config.ai.anthropicKey,
      });
      return anthropic("claude-sonnet-4-6");
    }
    default:
      throw new Error(
        `Unsupported AI provider: ${provider}. Supported: gemini, openai, anthropic`
      );
  }
}
