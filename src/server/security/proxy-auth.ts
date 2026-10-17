/**
 * Pure Routing & Perimeter Authentication Logic for Next.js 16 Proxy
 */

export interface ProxyAuthDecision {
  action: "redirect" | "next";
  redirectUrl?: string;
}

/**
 * Pure evaluation function for proxy authentication routing.
 * Evaluates access rules without direct dependency on serverless runtime objects,
 * enabling fast, isolated, deterministic unit testing.
 *
 * @param pathname URL pathname (e.g., "/dashboard/content")
 * @param search URL query string (e.g., "?tab=hero")
 * @param hasSessionCookie Whether an active session token cookie is present
 * @param baseUrl Base URL for constructing absolute redirect targets
 */
export function evaluateProxyAuth(
  pathname: string,
  search: string,
  hasSessionCookie: boolean,
  baseUrl: string = "http://localhost:3000"
): ProxyAuthDecision {
  // Protect dashboard routes: unauthenticated requests (no session cookie)
  // are immediately redirected to /login with callbackUrl preserved.
  if (pathname.startsWith("/dashboard")) {
    if (!hasSessionCookie) {
      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
      return {
        action: "redirect",
        redirectUrl: loginUrl.toString(),
      };
    }
  }

  // All other routes (or dashboard requests with session cookie) proceed
  return { action: "next" };
}
