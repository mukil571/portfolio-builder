import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { config } from "@/lib/config";
import { resolveGeminiModelId } from "./errors";

export { resolveGeminiModelId };
export type AIProviderType = "gemini" | "openai" | "anthropic";

/**
 * Returns the appropriate AI SDK language model based on environment config.
 * Supports Gemini, OpenAI, and Anthropic providers.
 */
export function getAIModel(): LanguageModel {
  const provider = config.ai.provider;

  switch (provider) {
    case "gemini": {
      if (!config.ai.geminiKey) {
        throw new Error(
          "Google Gemini API key is missing. Please configure GOOGLE_GENERATIVE_AI_API_KEY in environment variables."
        );
      }
      const google = createGoogleGenerativeAI({
        apiKey: config.ai.geminiKey,
      });
      return google(config.ai.geminiModel);
    }
    case "openai": {
      if (!config.ai.openaiKey) {
        throw new Error(
          "OpenAI API key is missing. Please configure OPENAI_API_KEY in environment variables."
        );
      }
      const openai = createOpenAI({
        apiKey: config.ai.openaiKey,
      });
      return openai(process.env.OPENAI_MODEL || "gpt-4o-mini");
    }
    case "anthropic": {
      if (!config.ai.anthropicKey) {
        throw new Error(
          "Anthropic API key is missing. Please configure ANTHROPIC_API_KEY in environment variables."
        );
      }
      const anthropic = createAnthropic({
        apiKey: config.ai.anthropicKey,
      });
      return anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6");
    }
    default:
      throw new Error(
        `Unsupported AI provider: ${provider}. Supported: gemini, openai, anthropic`
      );
  }
}
