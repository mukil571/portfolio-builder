import { APICallError, LoadAPIKeyError } from "ai";

export interface SafeChatError {
  safeMessage: string;
  code: string;
}

/**
 * Categorizes any AI provider or stream error into a safe, useful error response
 * for visitors without leaking sensitive API keys, database credentials, internal prompts,
 * or server stack traces.
 */
export function categorizeAIError(error: unknown): SafeChatError {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) {
      return {
        safeMessage:
          "The AI service is temporarily over capacity. Please wait a moment and try again.",
        code: "AI_QUOTA_EXCEEDED",
      };
    }
    if (error.statusCode === 401 || error.statusCode === 403) {
      return {
        safeMessage:
          "Authentication with the AI provider failed. Please check the website configuration.",
        code: "AI_AUTH_ERROR",
      };
    }
    if (error.statusCode === 404) {
      return {
        safeMessage: "The requested AI model is unavailable or not found.",
        code: "AI_MODEL_NOT_FOUND",
      };
    }
    if (error.statusCode && error.statusCode >= 500) {
      return {
        safeMessage:
          "The AI provider encountered an internal service error. Please try again shortly.",
        code: "AI_PROVIDER_ERROR",
      };
    }
  }

  if (LoadAPIKeyError.isInstance(error)) {
    return {
      safeMessage:
        "The chatbot is not properly configured. Missing AI provider credentials.",
      code: "AI_CONFIG_ERROR",
    };
  }

  // Fallback pattern matching for SDK-wrapped or string errors
  const msg = error instanceof Error ? error.message : String(error);
  if (/API key|unregistered callers|caller.*identity|unauthorized/i.test(msg)) {
    return {
      safeMessage:
        "Authentication with the AI provider failed. Please check the website configuration.",
      code: "AI_AUTH_ERROR",
    };
  }
  if (/quota|resource_exhausted|rate limit/i.test(msg)) {
    return {
      safeMessage:
        "The AI service is temporarily over capacity. Please wait a moment and try again.",
      code: "AI_QUOTA_EXCEEDED",
    };
  }
  if (/model.*not found|unsupported model/i.test(msg)) {
    return {
      safeMessage: "The requested AI model is unavailable or not found.",
      code: "AI_MODEL_NOT_FOUND",
    };
  }

  return {
    safeMessage:
      "An unexpected error occurred while generating the response. Please try again.",
    code: "AI_STREAM_ERROR",
  };
}

/**
 * Resolves and sanitizes the Gemini model identifier from an optional raw environment value.
 * Defaults to 'gemini-2.5-flash', which is the standard, broadly available production Flash model.
 */
export function resolveGeminiModelId(rawEnv?: string): string {
  if (!rawEnv) return "gemini-2.5-flash";
  const cleaned = rawEnv
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim()
    .replace(/^models\//, "")
    .trim();
  return cleaned || "gemini-2.5-flash";
}
