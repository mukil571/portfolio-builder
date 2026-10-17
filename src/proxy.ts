import { NextRequest, NextResponse } from "next/server";
import { evaluateProxyAuth } from "@/server/security/proxy-auth";

/**
 * Next.js 16 Network Proxy convention (migrated from legacy middleware.ts).
 *
 * Implements perimeter routing and fast-path gating:
 * - Unauthenticated requests (no session cookie) targeting `/dashboard` are
 *   immediately intercepted and redirected to `/login` with `callbackUrl`.
 * - Requests with session cookies proceed to Server Components where authoritative
 *   cryptographic & database session verification occurs in `DashboardLayout`.
 * - Avoids internal HTTP subrequests on every request, eliminating latency,
 *   subrequest cold starts, and Vercel preview origin resolution issues.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const hasSessionCookie = Boolean(sessionCookie?.value);
  const decision = evaluateProxyAuth(pathname, search, hasSessionCookie, request.url);

  if (decision.action === "redirect" && decision.redirectUrl) {
    return NextResponse.redirect(new URL(decision.redirectUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
