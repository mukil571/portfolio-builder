// Application-wide constants

export const APP_NAME = "Loriyum";
export const APP_DESCRIPTION =
  "Create AI-powered portfolio and product websites with an intelligent chatbot that learns from you.";

// Dashboard sidebar navigation items
export const DASHBOARD_NAV = [
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Website", href: "/dashboard/website", icon: "Globe" },
  { label: "Content", href: "/dashboard/content", icon: "FileText" },
  { label: "AI Assistant", href: "/dashboard/ai", icon: "Bot" },
  {
    label: "Visitor Questions",
    href: "/dashboard/questions",
    icon: "MessageCircleQuestion",
  },
  { label: "Knowledge", href: "/dashboard/knowledge", icon: "BookOpen" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;

// Content section defaults for portfolio websites
export const PORTFOLIO_SECTIONS = [
  "hero",
  "about",
  "skills",
  "projects",
  "experience",
  "education",
  "achievements",
  "contact",
  "socials",
] as const;

// Content section defaults for product websites
export const PRODUCT_SECTIONS = [
  "hero",
  "about",
  "features",
  "benefits",
  "pricing",
  "faq",
  "testimonials",
  "contact",
] as const;
