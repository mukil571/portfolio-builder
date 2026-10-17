/**
 * Input Validation & Security Verification Utilities
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERIC_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidUuid(id: unknown): boolean {
  if (typeof id !== "string") return false;
  return GENERIC_UUID_REGEX.test(id.trim());
}

export function validateSlug(slug: unknown): { valid: boolean; error?: string } {
  if (typeof slug !== "string") {
    return { valid: false, error: "Slug must be a string" };
  }
  const trimmed = slug.trim().toLowerCase();
  if (trimmed.length < 3) {
    return { valid: false, error: "Slug must be at least 3 characters long" };
  }
  if (trimmed.length > 60) {
    return { valid: false, error: "Slug cannot exceed 60 characters" };
  }
  if (!SLUG_REGEX.test(trimmed)) {
    return {
      valid: false,
      error:
        "Slug may only contain lowercase letters, numbers, and hyphens (no consecutive or leading/trailing hyphens)",
    };
  }
  return { valid: true };
}

export function validateWebsiteTitle(title: unknown): {
  valid: boolean;
  value?: string;
  error?: string;
} {
  if (typeof title !== "string") {
    return { valid: false, error: "Title must be a string" };
  }
  const trimmed = title.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: "Title must be at least 2 characters long" };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: "Title cannot exceed 100 characters" };
  }
  return { valid: true, value: trimmed };
}

export function validateWebsiteType(type: unknown): {
  valid: boolean;
  error?: string;
} {
  if (type === "portfolio" || type === "product") {
    return { valid: true };
  }
  return {
    valid: false,
    error: "Type must be either 'portfolio' or 'product'",
  };
}

export function validateSectionTitle(title: unknown): {
  valid: boolean;
  value?: string;
  error?: string;
} {
  if (typeof title !== "string") {
    return { valid: false, error: "Title must be a string" };
  }
  const trimmed = title.trim();
  if (trimmed.length < 1) {
    return { valid: false, error: "Section title cannot be empty" };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: "Section title cannot exceed 200 characters" };
  }
  return { valid: true, value: trimmed };
}

export interface ChatPayloadValidationResult {
  valid: boolean;
  error?: string;
  websiteId?: string;
  messages?: any[];
}

export function validateChatPayload(body: any): ChatPayloadValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const { websiteId, messages } = body;

  if (!websiteId || typeof websiteId !== "string") {
    return { valid: false, error: "Missing or invalid websiteId" };
  }

  if (!isValidUuid(websiteId)) {
    return { valid: false, error: "Invalid websiteId format" };
  }

  if (!Array.isArray(messages)) {
    return { valid: false, error: "Messages must be an array" };
  }

  if (messages.length === 0) {
    return { valid: false, error: "Messages array cannot be empty" };
  }

  if (messages.length > 30) {
    return {
      valid: false,
      error: "Conversation history exceeds maximum allowed length (30 messages)",
    };
  }

  // Validate individual messages: length check
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object") {
      return { valid: false, error: `Invalid message structure at index ${i}` };
    }

    // AI SDK messages can have content (string) or parts (array)
    if (typeof msg.content === "string" && msg.content.length > 4000) {
      return {
        valid: false,
        error: `Message at index ${i} exceeds maximum length (4000 characters)`,
      };
    }

    if (Array.isArray(msg.parts)) {
      let totalLength = 0;
      for (const part of msg.parts) {
        if (part && typeof part.text === "string") {
          totalLength += part.text.length;
        }
      }
      if (totalLength > 4000) {
        return {
          valid: false,
          error: `Message at index ${i} exceeds maximum length (4000 characters)`,
        };
      }
    }
  }

  return { valid: true, websiteId, messages };
}
