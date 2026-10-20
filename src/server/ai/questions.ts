import { db } from "@/server/db";
import { visitorQuestions, websites, knowledgeEntries } from "@/server/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export interface OwnerQuestion {
  id: string;
  websiteId: string;
  questionText: string;
  status: "unanswered" | "answered" | "dismissed";
  askCount: number;
  answer: string | null;
  createdAt: Date;
  answeredAt: Date | null;
  websiteTitle: string;
  websiteSlug: string;
}

export interface QuestionStats {
  total: number;
  unanswered: number;
  answered: number;
  dismissed: number;
}

export {
  normalizeQuestionText,
  extractSemanticTokens,
  areQuestionsSemanticallyEquivalent,
  findSemanticDuplicateQuestion,
  evaluateQuestionRecording,
  InMemoryTransactionalQuestionStore,
} from "./prompt";

import { findSemanticDuplicateQuestion } from "./prompt";

/**
 * Records a visitor question that the AI could not answer.
 *
 * - Checks whether an unanswered question with the same meaning already exists
 *   for this website (semantic duplicate detection).
 * - If duplicate found, increments ask_count and updates last-asked timestamp (createdAt).
 * - If new, inserts a row with status 'unanswered' and ask_count 1.
 * - Strictly isolates questions by websiteId.
 *
 * Returns { recorded: true, isDuplicate: boolean, questionId: string } on success,
 * or { recorded: false, error: string } on failure.
 */
export async function recordUnansweredQuestion(
  websiteId: string,
  questionText: string
): Promise<
  | { recorded: true; isDuplicate: boolean; questionId: string }
  | { recorded: false; error: string }
> {
  const trimmed = questionText.trim();

  if (!trimmed || trimmed.length < 3) {
    return { recorded: false, error: "Question text too short" };
  }

  if (trimmed.length > 2000) {
    return { recorded: false, error: "Question text too long" };
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. Lock the parent website row to serialize concurrent writes for this website.
      // This eliminates the race condition where simultaneous semantically equivalent
      // requests might both read before either writes and insert duplicate rows.
      const siteCheck = await tx
        .select({ id: websites.id })
        .from(websites)
        .where(eq(websites.id, websiteId))
        .for("update");

      if (siteCheck.length === 0) {
        return { recorded: false, error: "Website not found" };
      }

      // 2. Fetch existing unanswered questions for this website under the transaction lock
      const existing = await tx
        .select({
          id: visitorQuestions.id,
          questionText: visitorQuestions.questionText,
          status: visitorQuestions.status,
        })
        .from(visitorQuestions)
        .where(
          and(
            eq(visitorQuestions.websiteId, websiteId),
            eq(visitorQuestions.status, "unanswered")
          )
        );

      // 3. Search for exact or semantic duplicate
      const duplicate = findSemanticDuplicateQuestion(trimmed, existing);

      if (duplicate) {
        // Duplicate: increment ask_count and update last-asked timestamp
        await tx
          .update(visitorQuestions)
          .set({
            askCount: sql`${visitorQuestions.askCount} + 1`,
            createdAt: new Date(),
          })
          .where(eq(visitorQuestions.id, duplicate.id));

        return { recorded: true, isDuplicate: true, questionId: duplicate.id };
      }

      // 4. New question: insert row with status 'unanswered' and askCount 1
      const [inserted] = await tx
        .insert(visitorQuestions)
        .values({
          websiteId,
          questionText: trimmed,
          status: "unanswered",
          askCount: 1,
        })
        .returning({ id: visitorQuestions.id });

      return { recorded: true, isDuplicate: false, questionId: inserted.id };
    });
  } catch (error) {
    console.error("Failed to record visitor question:", error);
    return { recorded: false, error: "Database error" };
  }
}

/**
 * Retrieves visitor questions for websites owned by the specified user.
 * Strictly verifies ownership by joining websites.ownerId = ownerId.
 */
export async function getOwnerQuestions(
  ownerId: string,
  options?: {
    websiteId?: string;
    status?: "unanswered" | "answered" | "dismissed";
  }
): Promise<{
  questions: OwnerQuestion[];
  stats: QuestionStats;
}> {
  try {
    // Verify website ownership if a specific website is requested
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
          questions: [],
          stats: { total: 0, unanswered: 0, answered: 0, dismissed: 0 },
        };
      }
    }

    const whereConditions = [
      eq(websites.ownerId, ownerId),
      options?.websiteId ? eq(visitorQuestions.websiteId, options.websiteId) : undefined,
      options?.status ? eq(visitorQuestions.status, options.status) : undefined,
    ].filter(Boolean);

    const questionsQuery = db
      .select({
        id: visitorQuestions.id,
        websiteId: visitorQuestions.websiteId,
        questionText: visitorQuestions.questionText,
        status: visitorQuestions.status,
        askCount: visitorQuestions.askCount,
        answer: visitorQuestions.answer,
        createdAt: visitorQuestions.createdAt,
        answeredAt: visitorQuestions.answeredAt,
        websiteTitle: websites.title,
        websiteSlug: websites.slug,
      })
      .from(visitorQuestions)
      .innerJoin(websites, eq(visitorQuestions.websiteId, websites.id))
      .where(and(...(whereConditions as any)))
      .orderBy(desc(visitorQuestions.askCount), desc(visitorQuestions.createdAt));

    const rows = await questionsQuery;

    // Get stats across all questions for the owner's website(s)
    const statsConditions = [
      eq(websites.ownerId, ownerId),
      options?.websiteId ? eq(visitorQuestions.websiteId, options.websiteId) : undefined,
    ].filter(Boolean);

    const allQuestions = await db
      .select({ status: visitorQuestions.status })
      .from(visitorQuestions)
      .innerJoin(websites, eq(visitorQuestions.websiteId, websites.id))
      .where(and(...(statsConditions as any)));

    const stats: QuestionStats = {
      total: allQuestions.length,
      unanswered: allQuestions.filter((q) => q.status === "unanswered").length,
      answered: allQuestions.filter((q) => q.status === "answered").length,
      dismissed: allQuestions.filter((q) => q.status === "dismissed").length,
    };

    return {
      questions: rows as OwnerQuestion[],
      stats,
    };
  } catch (error) {
    console.error("Failed to get owner questions:", error);
    return {
      questions: [],
      stats: { total: 0, unanswered: 0, answered: 0, dismissed: 0 },
    };
  }
}

/**
 * Submits an owner answer to a visitor question.
 *
 * Security: Verifies the question belongs to a website owned by ownerId.
 * Side effects:
 * - Updates visitor_questions row with status 'answered', answer text, and answered_at timestamp.
 * - Upserts an approved row into knowledge_entries (source_type = 'owner_answer')
 *   linked to question_ref_id, avoiding duplicate entries.
 */
export async function answerQuestionAsOwner(
  ownerId: string,
  questionId: string,
  answerText: string
): Promise<
  | { success: true; questionId: string; knowledgeEntryId: string }
  | { success: false; error: string; statusCode: number }
> {
  const trimmed = answerText?.trim();

  if (!trimmed || trimmed.length < 3) {
    return {
      success: false,
      error: "Answer must be at least 3 characters",
      statusCode: 400,
    };
  }

  if (trimmed.length > 5000) {
    return {
      success: false,
      error: "Answer must be at most 5000 characters",
      statusCode: 400,
    };
  }

  try {
    // 1. Verify question exists and owner owns the website
    const rows = await db
      .select({
        id: visitorQuestions.id,
        websiteId: visitorQuestions.websiteId,
        questionText: visitorQuestions.questionText,
        status: visitorQuestions.status,
      })
      .from(visitorQuestions)
      .innerJoin(websites, eq(visitorQuestions.websiteId, websites.id))
      .where(
        and(
          eq(visitorQuestions.id, questionId),
          eq(websites.ownerId, ownerId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return {
        success: false,
        error: "Question not found or access denied",
        statusCode: 404,
      };
    }

    const question = rows[0];

    // 2. Update visitor question status, answer, and answeredAt timestamp
    await db
      .update(visitorQuestions)
      .set({
        status: "answered",
        answer: trimmed,
        answeredAt: new Date(),
      })
      .where(eq(visitorQuestions.id, questionId));

    // 3. Ensure no duplicate knowledge entry for this question:
    // Check if an entry with questionRefId already exists for this website
    const existingKnowledge = await db
      .select({ id: knowledgeEntries.id })
      .from(knowledgeEntries)
      .where(
        and(
          eq(knowledgeEntries.websiteId, question.websiteId),
          eq(knowledgeEntries.questionRefId, questionId)
        )
      )
      .limit(1);

    let knowledgeEntryId: string;

    if (existingKnowledge.length > 0) {
      // Update existing knowledge entry with new approved answer
      knowledgeEntryId = existingKnowledge[0].id;
      await db
        .update(knowledgeEntries)
        .set({
          title: question.questionText,
          content: trimmed,
          sourceType: "owner_answer",
          isApproved: true,
          updatedAt: new Date(),
        })
        .where(eq(knowledgeEntries.id, knowledgeEntryId));
    } else {
      // Insert new approved knowledge entry
      const [inserted] = await db
        .insert(knowledgeEntries)
        .values({
          websiteId: question.websiteId,
          questionRefId: question.id,
          title: question.questionText,
          content: trimmed,
          sourceType: "owner_answer",
          isApproved: true,
        })
        .returning({ id: knowledgeEntries.id });
      knowledgeEntryId = inserted.id;
    }

    return {
      success: true,
      questionId,
      knowledgeEntryId,
    };
  } catch (error) {
    console.error("Failed to answer visitor question:", error);
    return {
      success: false,
      error: "Database error",
      statusCode: 500,
    };
  }
}

/**
 * Dismisses a visitor question.
 *
 * Security: Verifies the question belongs to a website owned by ownerId.
 */
export async function dismissQuestionAsOwner(
  ownerId: string,
  questionId: string
): Promise<
  | { success: true; questionId: string }
  | { success: false; error: string; statusCode: number }
> {
  try {
    const rows = await db
      .select({ id: visitorQuestions.id })
      .from(visitorQuestions)
      .innerJoin(websites, eq(visitorQuestions.websiteId, websites.id))
      .where(
        and(
          eq(visitorQuestions.id, questionId),
          eq(websites.ownerId, ownerId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return {
        success: false,
        error: "Question not found or access denied",
        statusCode: 404,
      };
    }

    await db
      .update(visitorQuestions)
      .set({
        status: "dismissed",
      })
      .where(eq(visitorQuestions.id, questionId));

    // Deactivate associated knowledge entry if one exists so it is never treated as approved knowledge
    await db
      .update(knowledgeEntries)
      .set({
        isApproved: false,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeEntries.questionRefId, questionId));

    return { success: true, questionId };
  } catch (error) {
    console.error("Failed to dismiss question:", error);
    return {
      success: false,
      error: "Database error",
      statusCode: 500,
    };
  }
}

/**
 * Reopens a dismissed or answered question back to unanswered.
 *
 * Security: Verifies the question belongs to a website owned by ownerId.
 */
export async function reopenQuestionAsOwner(
  ownerId: string,
  questionId: string
): Promise<
  | { success: true; questionId: string }
  | { success: false; error: string; statusCode: number }
> {
  try {
    const rows = await db
      .select({ id: visitorQuestions.id })
      .from(visitorQuestions)
      .innerJoin(websites, eq(visitorQuestions.websiteId, websites.id))
      .where(
        and(
          eq(visitorQuestions.id, questionId),
          eq(websites.ownerId, ownerId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return {
        success: false,
        error: "Question not found or access denied",
        statusCode: 404,
      };
    }

    await db
      .update(visitorQuestions)
      .set({
        status: "unanswered",
      })
      .where(eq(visitorQuestions.id, questionId));

    // Deactivate associated knowledge entry until re-answered by owner
    await db
      .update(knowledgeEntries)
      .set({
        isApproved: false,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeEntries.questionRefId, questionId));

    return { success: true, questionId };
  } catch (error) {
    console.error("Failed to reopen question:", error);
    return {
      success: false,
      error: "Database error",
      statusCode: 500,
    };
  }
}
