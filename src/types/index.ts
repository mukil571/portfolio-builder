// Loriyum - Type definitions

// ---- Website Types ----
export type WebsiteType = "portfolio" | "product";

export type WebsiteStatus = "draft" | "published";

export interface Website {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  type: WebsiteType;
  status: WebsiteStatus;
  themeConfig: ThemeConfig;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Content Section Types ----
export type SectionType =
  | "hero"
  | "about"
  | "skills"
  | "projects"
  | "experience"
  | "education"
  | "achievements"
  | "contact"
  | "socials"
  | "features"
  | "benefits"
  | "pricing"
  | "faq"
  | "testimonials";

export interface ContentSection {
  id: string;
  websiteId: string;
  type: SectionType;
  title: string;
  content: Record<string, unknown>;
  orderIndex: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Question & Knowledge Types ----
export type QuestionStatus = "unanswered" | "answered" | "dismissed";

export interface VisitorQuestion {
  id: string;
  websiteId: string;
  questionText: string;
  status: QuestionStatus;
  askCount: number;
  answer?: string;
  createdAt: Date;
  answeredAt?: Date;
}

export type KnowledgeSourceType =
  | "owner_answer"
  | "profile_content"
  | "custom";

export interface KnowledgeEntry {
  id: string;
  websiteId: string;
  questionRefId?: string;
  title: string;
  content: string;
  sourceType: KnowledgeSourceType;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Theme Types ----
export interface ThemeConfig {
  colorScheme: "light" | "dark" | "system";
  accentColor: string;
  fontFamily: string;
}

// ---- AI Types ----
export type AIProvider = "openai" | "gemini" | "anthropic";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
