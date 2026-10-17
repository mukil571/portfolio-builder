/**
 * In-Memory Sliding-Window Rate Limiter
 *
 * Provides IP-based and key-based rate limiting for public endpoints.
 * Keeps memory bounded by periodically cleaning up expired timestamps.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

function pruneExpired(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  maxRequests?: number;
  /** Window duration in milliseconds (default: 60,000ms = 1 minute) */
  windowMs?: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Maximum requests allowed in this window */
  limit: number;
  /** Remaining requests allowed in this window */
  remaining: number;
  /** Milliseconds until the rate limit window completely resets */
  resetMs: number;
}

/**
 * Checks and records a request against the rate limiter.
 *
 * @param key Identifier for the client (e.g., client IP or composite key)
 * @param options Rate limit configuration
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { maxRequests = 20, windowMs = 60 * 1000 } = options;
  const now = Date.now();

  pruneExpired(windowMs);

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter out timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetMs,
    };
  }

  // Record this request
  record.timestamps.push(now);

  const remaining = Math.max(0, maxRequests - record.timestamps.length);
  const oldest = record.timestamps[0];
  const resetMs = Math.max(0, windowMs - (now - oldest));

  return {
    success: true,
    limit: maxRequests,
    remaining,
    resetMs,
  };
}

/**
 * Extracts the best candidate client IP address from request headers.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  return "127.0.0.1";
}

/**
 * Clears all rate limit records. Used primarily in automated tests.
 */
export function resetRateLimits(): void {
  rateLimitStore.clear();
  lastCleanup = Date.now();
}
