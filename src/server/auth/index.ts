import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Get the current session in a server component or server action.
 * Returns null if the user is not authenticated.
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Get the current user in a server component or server action.
 * Returns null if the user is not authenticated.
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}
