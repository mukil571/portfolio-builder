import { ArrowRight, Bot, Globe, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">Loriyum</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Get Started <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
                <Bot className="mr-2 h-4 w-4" />
                AI that learns from you
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Your website with an AI
                <br />
                <span className="text-primary">that actually knows you</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Create stunning portfolio or product websites with an AI chatbot
                that answers visitor questions using{" "}
                <strong>only your approved information</strong>. No
                hallucinations. No fabricated details.
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  Create Your Website
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="#how-it-works"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" })
                  )}
                >
                  See How It Works
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-t bg-muted/30 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                The Owner-in-the-Loop
              </h2>
              <p className="mt-4 text-muted-foreground">
                Your AI assistant gets smarter with every question — powered by
                your real answers, not guesswork.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Visitor asks a question",
                  description:
                    'A visitor asks your AI chatbot: "Why did you choose PostgreSQL?"',
                },
                {
                  step: "02",
                  title: "You provide the answer",
                  description:
                    "If the AI doesn't know, it sends the question to you. You answer from your dashboard.",
                },
                {
                  step: "03",
                  title: "AI learns & answers",
                  description:
                    "Your answer becomes approved knowledge. Future visitors get accurate, grounded responses.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border bg-card p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything you need
              </h2>
              <p className="mt-4 text-muted-foreground">
                Build, publish, and power your online presence — for portfolios
                or products.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Globe,
                  title: "Portfolio & Product Sites",
                  description:
                    "Create professional websites for yourself, your startup, or your product.",
                },
                {
                  icon: Bot,
                  title: "AI Chatbot",
                  description:
                    "Every website gets an AI assistant that answers visitor questions accurately.",
                },
                {
                  icon: Sparkles,
                  title: "Zero Hallucination",
                  description:
                    'The AI only uses approved knowledge. If it doesn\'t know, it says "I don\'t know."',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border bg-card p-6"
                >
                  <feature.icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Placeholder */}
        <section id="pricing" className="border-t bg-muted/30 py-24">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight">Pricing</h2>
            <p className="mt-4 text-muted-foreground">
              Simple pricing. Coming soon.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Loriyum. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
