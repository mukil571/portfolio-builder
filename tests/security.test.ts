import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimits,
} from "../src/server/security/rate-limit.ts";
import {
  isValidUuid,
  validateSlug,
  validateWebsiteTitle,
  validateWebsiteType,
  validateSectionTitle,
  validateChatPayload,
} from "../src/server/security/validation.ts";
import { evaluateProxyAuth } from "../src/server/security/proxy-auth.ts";
import { categorizeAIError, resolveGeminiModelId } from "../src/server/ai/errors.ts";
import { APICallError, LoadAPIKeyError } from "ai";

describe("Security & Hardening Test Suite (Phase 11)", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  describe("Rate Limiting & Abuse Prevention", () => {
    it("allows requests under the rate limit threshold", () => {
      const ip = "192.168.1.10";
      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(`chat:${ip}`, {
          maxRequests: 5,
          windowMs: 60000,
        });
        assert.equal(res.success, true);
        assert.equal(res.remaining, 4 - i);
      }
    });

    it("blocks requests that exceed the rate limit threshold", () => {
      const ip = "192.168.1.20";
      for (let i = 0; i < 3; i++) {
        checkRateLimit(`chat:${ip}`, { maxRequests: 3, windowMs: 60000 });
      }

      const blockedRes = checkRateLimit(`chat:${ip}`, {
        maxRequests: 3,
        windowMs: 60000,
      });
      assert.equal(blockedRes.success, false);
      assert.equal(blockedRes.remaining, 0);
      assert.ok(blockedRes.resetMs > 0);
    });

    it("maintains separate counters for different client IPs", () => {
      const ipA = "10.0.0.1";
      const ipB = "10.0.0.2";

      // Fill quota for IP A
      for (let i = 0; i < 3; i++) {
        checkRateLimit(`chat:${ipA}`, { maxRequests: 3, windowMs: 60000 });
      }

      // IP A is blocked
      assert.equal(
        checkRateLimit(`chat:${ipA}`, { maxRequests: 3, windowMs: 60000 })
          .success,
        false
      );

      // IP B is still allowed
      assert.equal(
        checkRateLimit(`chat:${ipB}`, { maxRequests: 3, windowMs: 60000 })
          .success,
        true
      );
    });

    it("extracts client IP from various proxy headers correctly", () => {
      const h1 = new Headers({
        "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
      });
      assert.equal(getClientIp(h1), "203.0.113.195");

      const h2 = new Headers({
        "x-real-ip": "198.51.100.42",
      });
      assert.equal(getClientIp(h2), "198.51.100.42");

      const h3 = new Headers({
        "cf-connecting-ip": "192.0.2.1",
      });
      assert.equal(getClientIp(h3), "192.0.2.1");

      const h4 = new Headers({});
      assert.equal(getClientIp(h4), "127.0.0.1");
    });
  });

  describe("Input Validation & Sanitization", () => {
    it("validates UUID format strictly", () => {
      assert.equal(
        isValidUuid("c6c10338-0ce4-43ea-9c09-ebc1cf71eb52"),
        true
      );
      assert.equal(isValidUuid("invalid-uuid-string"), false);
      assert.equal(isValidUuid(""), false);
      assert.equal(isValidUuid(null), false);
      assert.equal(isValidUuid(12345), false);
    });

    it("enforces strict URL slug validation", () => {
      // Valid slugs
      assert.equal(validateSlug("my-portfolio").valid, true);
      assert.equal(validateSlug("alex-designer-2026").valid, true);
      assert.equal(validateSlug("dev").valid, true);

      // Invalid slugs
      assert.equal(validateSlug("ab").valid, false); // < 3 chars
      assert.equal(
        validateSlug("a".repeat(61)).valid,
        false // > 60 chars
      );
      assert.equal(validateSlug("My-Portfolio").valid, true); // normalized to lowercase
      assert.equal(validateSlug("has spaces").valid, false);
      assert.equal(validateSlug("special@characters!").valid, false);
      assert.equal(validateSlug("-leading-hyphen").valid, false);
      assert.equal(validateSlug("trailing-hyphen-").valid, false);
      assert.equal(validateSlug("double--hyphen").valid, false);
      assert.equal(validateSlug(null).valid, false);
    });

    it("enforces website title validation bounds", () => {
      assert.equal(validateWebsiteTitle("Portfolio").valid, true);
      assert.equal(validateWebsiteTitle("A").valid, false); // < 2 chars
      assert.equal(validateWebsiteTitle("   ").valid, false); // whitespace
      assert.equal(validateWebsiteTitle("a".repeat(101)).valid, false); // > 100 chars
      assert.equal(validateWebsiteTitle(123).valid, false);
    });

    it("enforces website type validation", () => {
      assert.equal(validateWebsiteType("portfolio").valid, true);
      assert.equal(validateWebsiteType("product").valid, true);
      assert.equal(validateWebsiteType("blog").valid, false);
      assert.equal(validateWebsiteType("ecommerce").valid, false);
      assert.equal(validateWebsiteType("").valid, false);
      assert.equal(validateWebsiteType(undefined).valid, false);
    });

    it("enforces content section title validation bounds", () => {
      assert.equal(validateSectionTitle("Featured Projects").valid, true);
      assert.equal(validateSectionTitle("").valid, false);
      assert.equal(validateSectionTitle("   ").valid, false);
      assert.equal(validateSectionTitle("a".repeat(201)).valid, false);
      assert.equal(validateSectionTitle(null).valid, false);
    });
  });

  describe("Chat Payload Security & Abuse Defense", () => {
    const validWebsiteId = "c6c10338-0ce4-43ea-9c09-ebc1cf71eb52";

    it("accepts well-formed chat requests", () => {
      const payload = {
        websiteId: validWebsiteId,
        messages: [{ role: "user", content: "What are your skills?" }],
      };
      const res = validateChatPayload(payload);
      assert.equal(res.valid, true);
      assert.equal(res.websiteId, validWebsiteId);
    });

    it("rejects chat requests with invalid website ID format", () => {
      const payload = {
        websiteId: "not-a-uuid-1234",
        messages: [{ role: "user", content: "Hello" }],
      };
      const res = validateChatPayload(payload);
      assert.equal(res.valid, false);
      assert.match(res.error!, /websiteId/i);
    });

    it("rejects empty messages array", () => {
      const payload = {
        websiteId: validWebsiteId,
        messages: [],
      };
      const res = validateChatPayload(payload);
      assert.equal(res.valid, false);
      assert.match(res.error!, /empty/i);
    });

    it("rejects excessively long message history (> 30 messages)", () => {
      const messages = Array.from({ length: 31 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
      }));
      const payload = { websiteId: validWebsiteId, messages };
      const res = validateChatPayload(payload);
      assert.equal(res.valid, false);
      assert.match(res.error!, /30 messages/i);
    });

    it("rejects messages exceeding length threshold (> 4000 characters)", () => {
      const oversizedText = "x".repeat(4001);
      const payload = {
        websiteId: validWebsiteId,
        messages: [{ role: "user", content: oversizedText }],
      };
      const res = validateChatPayload(payload);
      assert.equal(res.valid, false);
      assert.match(res.error!, /4000 characters/i);
    });

    it("rejects UIMessage parts exceeding length threshold", () => {
      const oversizedPart = "x".repeat(4001);
      const payload = {
        websiteId: validWebsiteId,
        messages: [
          {
            role: "user",
            parts: [{ type: "text", text: oversizedPart }],
          },
        ],
      };
      const res = validateChatPayload(payload);
      assert.equal(res.valid, false);
      assert.match(res.error!, /4000 characters/i);
    });
  });

  describe("Next.js 16 Proxy Perimeter Authentication & Routing", () => {
    it("redirects unauthenticated requests targeting /dashboard to /login", () => {
      const decision = evaluateProxyAuth("/dashboard", "", false, "https://example.com");
      assert.equal(decision.action, "redirect");
      assert.equal(
        decision.redirectUrl,
        "https://example.com/login?callbackUrl=%2Fdashboard"
      );
    });

    it("preserves path and query parameters in the callbackUrl", () => {
      const decision = evaluateProxyAuth(
        "/dashboard/content",
        "?tab=skills&edit=true",
        false,
        "https://example.com"
      );
      assert.equal(decision.action, "redirect");
      assert.equal(
        decision.redirectUrl,
        "https://example.com/login?callbackUrl=%2Fdashboard%2Fcontent%3Ftab%3Dskills%26edit%3Dtrue"
      );
    });

    it("allows requests to /dashboard through when a session cookie is present", () => {
      const decision = evaluateProxyAuth(
        "/dashboard",
        "",
        true,
        "https://example.com"
      );
      assert.equal(decision.action, "next");
      assert.equal(decision.redirectUrl, undefined);
    });

    it("allows requests to nested dashboard routes through when a session cookie is present", () => {
      const decision = evaluateProxyAuth(
        "/dashboard/questions",
        "?status=unanswered",
        true,
        "https://example.com"
      );
      assert.equal(decision.action, "next");
      assert.equal(decision.redirectUrl, undefined);
    });

    it("allows public website routes through without redirection regardless of cookie state", () => {
      const unauthSite = evaluateProxyAuth("/site/alex-dev", "", false, "https://example.com");
      assert.equal(unauthSite.action, "next");

      const authSite = evaluateProxyAuth("/site/alex-dev", "", true, "https://example.com");
      assert.equal(authSite.action, "next");

      const root = evaluateProxyAuth("/", "", false, "https://example.com");
      assert.equal(root.action, "next");
    });

    it("does not redirect /login or /signup in proxy, avoiding redirect loops on expired cookies", () => {
      const loginUnauth = evaluateProxyAuth("/login", "", false, "https://example.com");
      assert.equal(loginUnauth.action, "next");

      const loginWithCookie = evaluateProxyAuth("/login", "", true, "https://example.com");
      assert.equal(loginWithCookie.action, "next");

      const signupWithCookie = evaluateProxyAuth("/signup", "", true, "https://example.com");
      assert.equal(signupWithCookie.action, "next");
    });
  });

  describe("AI Error Categorization & Safe Response Formatting", () => {
    it("categorizes quota exceeded (429) errors safely without leaking internal URLs or prompts", () => {
      const err = new APICallError({
        message: "Resource exhausted: Quota exceeded for model gemini-2.0-flash",
        statusCode: 429,
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=SECRET_KEY",
      });
      const cat = categorizeAIError(err);
      assert.equal(cat.code, "AI_QUOTA_EXCEEDED");
      assert.doesNotMatch(cat.safeMessage, /SECRET_KEY|gemini|generativelanguage/);
    });

    it("categorizes authentication/key errors (401/403) with AI_AUTH_ERROR code", () => {
      const err = new APICallError({
        message: "API key not valid. Please pass a valid API key.",
        statusCode: 400,
        url: "https://generativelanguage.googleapis.com",
      });
      const cat = categorizeAIError(err);
      assert.equal(cat.code, "AI_AUTH_ERROR");
      assert.doesNotMatch(cat.safeMessage, /generativelanguage/);
    });

    it("categorizes unregistered caller errors with AI_AUTH_ERROR code", () => {
      const err = new Error(
        "Method doesn't allow unregistered callers (callers without established identity)."
      );
      const cat = categorizeAIError(err);
      assert.equal(cat.code, "AI_AUTH_ERROR");
    });

    it("categorizes missing provider API key with AI_CONFIG_ERROR code", () => {
      const err = new LoadAPIKeyError({
        message: "Google Generative AI API key is missing.",
      });
      const cat = categorizeAIError(err);
      assert.equal(cat.code, "AI_CONFIG_ERROR");
    });

    it("categorizes upstream provider 500 errors with AI_PROVIDER_ERROR code", () => {
      const err = new APICallError({
        message: "Internal Server Error",
        statusCode: 500,
        url: "https://generativelanguage.googleapis.com",
      });
      const cat = categorizeAIError(err);
      assert.equal(cat.code, "AI_PROVIDER_ERROR");
    });

    it("categorizes unexpected errors into safe generic AI_STREAM_ERROR fallback", () => {
      const err = new Error("TypeError: Failed to fetch");
      const cat = categorizeAIError(err);
      assert.equal(cat.code, "AI_STREAM_ERROR");
      assert.doesNotMatch(cat.safeMessage, /TypeError/);
    });
  });

  describe("Gemini Model Selection & Sanitization", () => {
    it("defaults to gemini-2.5-flash when no override is provided", () => {
      assert.equal(resolveGeminiModelId(undefined), "gemini-2.5-flash");
      assert.equal(resolveGeminiModelId(""), "gemini-2.5-flash");
      assert.equal(resolveGeminiModelId("   "), "gemini-2.5-flash");
    });

    it("strips whitespace and accidental surrounding quotes from model override", () => {
      assert.equal(
        resolveGeminiModelId(' "gemini-2.5-flash" '),
        "gemini-2.5-flash"
      );
      assert.equal(
        resolveGeminiModelId(" 'gemini-2.5-flash-lite' "),
        "gemini-2.5-flash-lite"
      );
    });

    it("strips accidental models/ prefix from override", () => {
      assert.equal(
        resolveGeminiModelId("models/gemini-2.5-flash"),
        "gemini-2.5-flash"
      );
      assert.equal(
        resolveGeminiModelId('"models/gemini-2.5-flash-lite"'),
        "gemini-2.5-flash-lite"
      );
    });

    it("preserves valid custom Flash models", () => {
      assert.equal(
        resolveGeminiModelId("gemini-2.5-flash-lite"),
        "gemini-2.5-flash-lite"
      );
      assert.equal(
        resolveGeminiModelId("gemini-2.0-flash-001"),
        "gemini-2.0-flash-001"
      );
    });
  });
});
