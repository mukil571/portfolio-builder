import { Sparkles } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Redirect genuinely authenticated users away from login/signup
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-7 w-7" />
          <span className="text-2xl font-bold tracking-tight">Loriyum</span>
        </Link>
        <div>
          <blockquote className="space-y-4">
            <p className="text-lg leading-relaxed opacity-90">
              &ldquo;Your website with an AI that actually knows you. Build
              smarter portfolios and product pages with owner-approved
              knowledge.&rdquo;
            </p>
          </blockquote>
        </div>
        <p className="text-sm opacity-60">
          © {new Date().getFullYear()} Loriyum
        </p>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full flex-1 flex-col items-center justify-center px-4 sm:px-8 lg:w-1/2">
        <div className="mb-8 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">Loriyum</span>
          </Link>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
