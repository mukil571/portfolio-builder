// Server-side configuration
// This file should only be imported in server components or API routes.

export const config = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  auth: {
    secret: process.env.BETTER_AUTH_SECRET!,
    url: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  },
  ai: {
    provider: (process.env.AI_PROVIDER || "gemini") as
      | "openai"
      | "gemini"
      | "anthropic",
    openaiKey: process.env.OPENAI_API_KEY?.trim(),
    geminiKey: (
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY
    )?.trim(),
    geminiModel: (
      process.env.GEMINI_MODEL
        ?.trim()
        .replace(/^["']|["']$/g, "")
        .trim()
        .replace(/^models\//, "")
        .trim()
    ) || "gemini-2.5-flash",
    anthropicKey: process.env.ANTHROPIC_API_KEY?.trim(),
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    name: process.env.NEXT_PUBLIC_APP_NAME || "Loriyum",
  },
} as const;
