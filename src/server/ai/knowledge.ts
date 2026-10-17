import { db } from "@/server/db";
import {
  websites,
  contentSections,
  knowledgeEntries,
  user,
} from "@/server/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import {
  buildSystemPrompt,
  formatSectionsContext,
  formatKnowledgeContext,
  deduplicateKnowledgeEntries,
} from "./prompt";

export {
  buildSystemPrompt,
  formatSectionsContext,
  formatKnowledgeContext,
  deduplicateKnowledgeEntries,
};

/**
 * Aggregated knowledge context for a website, used to ground AI responses.
 */
export interface WebsiteKnowledgeContext {
  /** Website metadata */
  site: {
    id: string;
    title: string;
    type: string;
    slug: string;
  };
  /** Owner profile details */
  owner: {
    name: string;
    email: string;
  } | null;
  /** Formatted content sections context string */
  sectionsContext: string;
  /** Formatted knowledge entries context string */
  knowledgeContext: string;
  /** The fully assembled system prompt */
  systemPrompt: string;
}

export interface OwnerKnowledgeEntry {
  id: string;
  websiteId: string;
  questionRefId: string | null;
  title: string;
  content: string;
  sourceType: "owner_answer" | "profile_content" | "custom";
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  websiteTitle: string;
  websiteSlug: string;
}

export interface KnowledgeStats {
  total: number;
  approved: number;
  inactive: number;
  ownerAnswers: number;
  custom: number;
}

/**
 * Loads all published website metadata & owner profile details,
 * extracts all active content_sections, and retrieves all approved
 * knowledge_entries for the given website.
 *
 * Automatically deduplicates questions by lowercased title and prioritizes
 * the most recently updated approved version.
 *
 * Returns null if the website is not found or not published.
 */
export async function aggregateKnowledge(
  websiteId: string
): Promise<WebsiteKnowledgeContext | null> {
  // 1. Load published website metadata & profile details
  const siteResult = await db
    .select({
      id: websites.id,
      title: websites.title,
      type: websites.type,
      slug: websites.slug,
      ownerId: websites.ownerId,
    })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.isPublished, true)))
    .limit(1);

  if (!siteResult.length) {
    return null;
  }

  const site = siteResult[0];

  // Load owner profile details
  const ownerResult = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, site.ownerId))
    .limit(1);

  const owner = ownerResult.length ? ownerResult[0] : null;

  // 2. Extract all active (visible) content_sections
  const sections = await db
    .select()
    .from(contentSections)
    .where(
      and(
        eq(contentSections.websiteId, websiteId),
        eq(contentSections.isVisible, true)
      )
    )
    .orderBy(asc(contentSections.orderIndex));

  // 3. Retrieve all approved knowledge_entries, newest updates first
  const knowledge = await db
    .select()
    .from(knowledgeEntries)
    .where(
      and(
        eq(knowledgeEntries.websiteId, websiteId),
        eq(knowledgeEntries.isApproved, true)
      )
    )
    .orderBy(desc(knowledgeEntries.updatedAt));

  // Deduplicate entries by lowercased title/question, preserving the most recent answer
  const uniqueKnowledge = deduplicateKnowledgeEntries(knowledge);

  // Format content sections into a readable context block
  const sectionsContext = formatSectionsContext(sections);

  // Format knowledge entries into Q&A pairs
  const knowledgeContext = formatKnowledgeContext(uniqueKnowledge);

  // Build the grounded system prompt
  const systemPrompt = buildSystemPrompt(
    site,
    owner,
    sectionsContext,
    knowledgeContext
  );

  return {
    site,
    owner,
    sectionsContext,
    knowledgeContext,
    systemPrompt,
  };
}

/**
 * Retrieves all knowledge base entries for a specific website owned by ownerId.
 * Enforces server-side ownership check via join with websites table.
 */
export async function getOwnerKnowledgeEntries(
  ownerId: string,
  options?: {
    websiteId?: string;
    isApproved?: boolean;
    sourceType?: "owner_answer" | "profile_content" | "custom";
  }
): Promise<{
  entries: OwnerKnowledgeEntry[];
  stats: KnowledgeStats;
}> {
  try {
    if (options?.websiteId) {
      const siteCheck = await db
        .select({ id: websites.id })
        .from(websites)
        .where(
          and(
            eq(websites.id, options.websiteId),
            eq(websites.ownerId, ownerId)
          )
        )
        .limit(1);

      if (siteCheck.length === 0) {
        return {
          entries: [],
          stats: { total: 0, approved: 0, inactive: 0, ownerAnswers: 0, custom: 0 },
        };
      }
    }

    const whereConditions = [
      eq(websites.ownerId, ownerId),
      options?.websiteId ? eq(knowledgeEntries.websiteId, options.websiteId) : undefined,
      options?.isApproved !== undefined
        ? eq(knowledgeEntries.isApproved, options.isApproved)
        : undefined,
      options?.sourceType ? eq(knowledgeEntries.sourceType, options.sourceType) : undefined,
    ].filter(Boolean);

    const rows = await db
      .select({
        id: knowledgeEntries.id,
        websiteId: knowledgeEntries.websiteId,
        questionRefId: knowledgeEntries.questionRefId,
        title: knowledgeEntries.title,
        content: knowledgeEntries.content,
        sourceType: knowledgeEntries.sourceType,
        isApproved: knowledgeEntries.isApproved,
        createdAt: knowledgeEntries.createdAt,
        updatedAt: knowledgeEntries.updatedAt,
        websiteTitle: websites.title,
        websiteSlug: websites.slug,
      })
      .from(knowledgeEntries)
      .innerJoin(websites, eq(knowledgeEntries.websiteId, websites.id))
      .where(and(...(whereConditions as any)))
      .orderBy(desc(knowledgeEntries.updatedAt));

    // Calculate stats across all entries for owner's website(s)
    const statsConditions = [
      eq(websites.ownerId, ownerId),
      options?.websiteId ? eq(knowledgeEntries.websiteId, options.websiteId) : undefined,
    ].filter(Boolean);

    const allEntries = await db
      .select({
        isApproved: knowledgeEntries.isApproved,
        sourceType: knowledgeEntries.sourceType,
      })
      .from(knowledgeEntries)
      .innerJoin(websites, eq(knowledgeEntries.websiteId, websites.id))
      .where(and(...(statsConditions as any)));

    const stats: KnowledgeStats = {
      total: allEntries.length,
      approved: allEntries.filter((e) => e.isApproved).length,
      inactive: allEntries.filter((e) => !e.isApproved).length,
      ownerAnswers: allEntries.filter((e) => e.sourceType === "owner_answer").length,
      custom: allEntries.filter((e) => e.sourceType === "custom").length,
    };

    return {
      entries: rows as OwnerKnowledgeEntry[],
      stats,
    };
  } catch (error) {
    console.error("Failed to get owner knowledge entries:", error);
    return {
      entries: [],
      stats: { total: 0, approved: 0, inactive: 0, ownerAnswers: 0, custom: 0 },
    };
  }
}

/**
 * Creates a custom knowledge base entry.
 *
 * Security: Validates that websiteId belongs to ownerId.
 * Deduplication: If an entry with the exact same title exists for this website
 * (case-insensitive), updates that entry in place instead of creating a duplicate.
 */
export async function createCustomKnowledgeEntry(
  ownerId: string,
  data: {
    websiteId: string;
    title: string;
    content: string;
  }
): Promise<
  | { success: true; entryId: string; isUpdated: boolean }
  | { success: false; error: string; statusCode: number }
> {
  const trimmedTitle = data.title?.trim();
  const trimmedContent = data.content?.trim();

  if (!trimmedTitle || trimmedTitle.length < 3) {
    return {
      success: false,
      error: "Title must be at least 3 characters",
      statusCode: 400,
    };
  }

  if (trimmedTitle.length > 500) {
    return {
      success: false,
      error: "Title must be at most 500 characters",
      statusCode: 400,
    };
  }

  if (!trimmedContent || trimmedContent.length < 3) {
    return {
      success: false,
      error: "Content must be at least 3 characters",
      statusCode: 400,
    };
  }

  if (trimmedContent.length > 5000) {
    return {
      success: false,
      error: "Content must be at most 5000 characters",
      statusCode: 400,
    };
  }

  try {
    // 1. Verify website ownership
    const siteRows = await db
      .select({ id: websites.id })
      .from(websites)
      .where(
        and(
          eq(websites.id, data.websiteId),
          eq(websites.ownerId, ownerId)
        )
      )
      .limit(1);

    if (siteRows.length === 0) {
      return {
        success: false,
        error: "Website not found or access denied",
        statusCode: 404,
      };
    }

    // 2. Check for duplicate title (case-insensitive) for this website
    const existing = await db
      .select({ id: knowledgeEntries.id })
      .from(knowledgeEntries)
      .where(
        and(
          eq(knowledgeEntries.websiteId, data.websiteId),
          sql`lower(${knowledgeEntries.title}) = lower(${trimmedTitle})`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing entry to avoid duplicates
      await db
        .update(knowledgeEntries)
        .set({
          title: trimmedTitle,
          content: trimmedContent,
          isApproved: true,
          updatedAt: new Date(),
        })
        .where(eq(knowledgeEntries.id, existing[0].id));

      return {
        success: true,
        entryId: existing[0].id,
        isUpdated: true,
      };
    }

    // 3. Insert new custom knowledge entry
    const [inserted] = await db
      .insert(knowledgeEntries)
      .values({
        websiteId: data.websiteId,
        title: trimmedTitle,
        content: trimmedContent,
        sourceType: "custom",
        isApproved: true,
      })
      .returning({ id: knowledgeEntries.id });

    return {
      success: true,
      entryId: inserted.id,
      isUpdated: false,
    };
  } catch (error) {
    console.error("Failed to create knowledge entry:", error);
    return {
      success: false,
      error: "Database error",
      statusCode: 500,
    };
  }
}

/**
 * Updates an existing knowledge entry (title, content, or approval status).
 * Security: Strictly verifies entry belongs to a website owned by ownerId.
 */
export async function updateKnowledgeEntryAsOwner(
  ownerId: string,
  entryId: string,
  data: {
    title?: string;
    content?: string;
    isApproved?: boolean;
  }
): Promise<
  | { success: true; entryId: string }
  | { success: false; error: string; statusCode: number }
> {
  const updatePayload: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) {
    const trimmedTitle = data.title.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      return {
        success: false,
        error: "Title must be at least 3 characters",
        statusCode: 400,
      };
    }
    if (trimmedTitle.length > 500) {
      return {
        success: false,
        error: "Title must be at most 500 characters",
        statusCode: 400,
      };
    }
    updatePayload.title = trimmedTitle;
  }

  if (data.content !== undefined) {
    const trimmedContent = data.content.trim();
    if (!trimmedContent || trimmedContent.length < 3) {
      return {
        success: false,
        error: "Content must be at least 3 characters",
        statusCode: 400,
      };
    }
    if (trimmedContent.length > 5000) {
      return {
        success: false,
        error: "Content must be at most 5000 characters",
        statusCode: 400,
      };
    }
    updatePayload.content = trimmedContent;
  }

  if (data.isApproved !== undefined) {
    updatePayload.isApproved = Boolean(data.isApproved);
  }

  try {
    // Verify ownership
    const rows = await db
      .select({ id: knowledgeEntries.id })
      .from(knowledgeEntries)
      .innerJoin(websites, eq(knowledgeEntries.websiteId, websites.id))
      .where(
        and(
          eq(knowledgeEntries.id, entryId),
          eq(websites.ownerId, ownerId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return {
        success: false,
        error: "Knowledge entry not found or access denied",
        statusCode: 404,
      };
    }

    await db
      .update(knowledgeEntries)
      .set(updatePayload)
      .where(eq(knowledgeEntries.id, entryId));

    return {
      success: true,
      entryId,
    };
  } catch (error) {
    console.error("Failed to update knowledge entry:", error);
    return {
      success: false,
      error: "Database error",
      statusCode: 500,
    };
  }
}

/**
 * Deletes a knowledge entry.
 * Security: Strictly verifies entry belongs to a website owned by ownerId.
 */
export async function deleteKnowledgeEntryAsOwner(
  ownerId: string,
  entryId: string
): Promise<
  | { success: true; entryId: string }
  | { success: false; error: string; statusCode: number }
> {
  try {
    const rows = await db
      .select({ id: knowledgeEntries.id })
      .from(knowledgeEntries)
      .innerJoin(websites, eq(knowledgeEntries.websiteId, websites.id))
      .where(
        and(
          eq(knowledgeEntries.id, entryId),
          eq(websites.ownerId, ownerId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return {
        success: false,
        error: "Knowledge entry not found or access denied",
        statusCode: 404,
      };
    }

    await db
      .delete(knowledgeEntries)
      .where(eq(knowledgeEntries.id, entryId));

    return {
      success: true,
      entryId,
    };
  } catch (error) {
    console.error("Failed to delete knowledge entry:", error);
    return {
      success: false,
      error: "Database error",
      statusCode: 500,
    };
  }
}
