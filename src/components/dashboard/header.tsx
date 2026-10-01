"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { Badge } from "@/components/ui/badge";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/website": "Website",
  "/dashboard/content": "Content",
  "/dashboard/ai": "AI Assistant",
  "/dashboard/questions": "Visitor Questions",
  "/dashboard/knowledge": "Knowledge Base",
  "/dashboard/settings": "Settings",
};

interface DashboardHeaderProps {
  onMobileMenuToggle: () => void;
  websiteStatus?: "published" | "draft";
}

export function DashboardHeader({
  onMobileMenuToggle,
  websiteStatus = "draft",
}: DashboardHeaderProps) {
  const pathname = usePathname();

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) =>
      pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
    )?.[1] || "Dashboard";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h1 className="text-lg font-semibold">{pageTitle}</h1>

        <Badge
          variant={websiteStatus === "published" ? "default" : "secondary"}
          className="hidden sm:inline-flex"
        >
          {websiteStatus === "published" ? "Published" : "Draft"}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}
