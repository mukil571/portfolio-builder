// AI provider abstraction - will be implemented in Phase 6
// Placeholder to establish the server/ai directory structure.

import type { AIProvider, ChatMessage } from "@/types";

/**
 * AI Provider interface.
 * Each provider (OpenAI, Gemini, Anthropic) must implement this.
 */
export interface AIProviderClient {
  provider: AIProvider;
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>;
}
