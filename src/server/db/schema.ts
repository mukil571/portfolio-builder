import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";

// =============================================
// BETTER AUTH TABLES
// These tables are managed by Better Auth.
// Schema generated to match Better Auth's expectations.
// =============================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Custom fields
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================
// APPLICATION TABLES
// =============================================

/**
 * Websites - each user can create one or more websites.
 * Type determines the template: portfolio or product.
 */
export const websites = pgTable("websites", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  type: text("type", { enum: ["portfolio", "product"] })
    .notNull()
    .default("portfolio"),
  isPublished: boolean("is_published").notNull().default(false),
  themeConfig: jsonb("theme_config")
    .$type<{
      colorScheme: "light" | "dark" | "system";
      accentColor: string;
      fontFamily: string;
    }>()
    .default({
      colorScheme: "system",
      accentColor: "#000000",
      fontFamily: "geist",
    }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Content Sections - individual sections of a website (Hero, About, Projects, etc.)
 * Content is stored as flexible JSON to support different section types.
 */
export const contentSections = pgTable("content_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  websiteId: uuid("website_id")
    .notNull()
    .references(() => websites.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "hero",
      "about",
      "skills",
      "projects",
      "experience",
      "education",
      "achievements",
      "contact",
      "socials",
      "features",
      "benefits",
      "pricing",
      "faq",
      "testimonials",
    ],
  }).notNull(),
  title: text("title").notNull().default(""),
  content: jsonb("content").$type<Record<string, unknown>>().default({}),
  orderIndex: integer("order_index").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Visitor Questions - questions asked by visitors that the AI couldn't answer.
 * Tracks ask count to surface the most popular unanswered questions.
 */
export const visitorQuestions = pgTable("visitor_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  websiteId: uuid("website_id")
    .notNull()
    .references(() => websites.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  status: text("status", {
    enum: ["unanswered", "answered", "dismissed"],
  })
    .notNull()
    .default("unanswered"),
  askCount: integer("ask_count").notNull().default(1),
  answer: text("answer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  answeredAt: timestamp("answered_at"),
});

/**
 * Knowledge Entries - the approved knowledge base for the AI chatbot.
 * Sources can be owner answers, profile content, or manually added entries.
 */
export const knowledgeEntries = pgTable("knowledge_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  websiteId: uuid("website_id")
    .notNull()
    .references(() => websites.id, { onDelete: "cascade" }),
  questionRefId: uuid("question_ref_id").references(() => visitorQuestions.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sourceType: text("source_type", {
    enum: ["owner_answer", "profile_content", "custom"],
  })
    .notNull()
    .default("custom"),
  isApproved: boolean("is_approved").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
