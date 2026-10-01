import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Onboarding UI will be built in Phase 4 (Website Editor).
  // For now, redirect to dashboard.
  redirect("/dashboard");
}
