"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  MessageCircleQuestion,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  Calendar,
  AlertCircle,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { OwnerKnowledgeEntry, KnowledgeStats } from "@/server/ai/knowledge";

interface KnowledgeManagerProps {
  initialEntries: OwnerKnowledgeEntry[];
  initialStats: KnowledgeStats;
  website: {
    id: string;
    title: string;
    slug: string;
    type: string;
    isPublished: boolean | null;
  };
}

export function KnowledgeManager({
  initialEntries,
  initialStats,
  website,
}: KnowledgeManagerProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<OwnerKnowledgeEntry[]>(initialEntries);
  const [stats, setStats] = useState<KnowledgeStats>(initialStats);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "alphabetical">("updated");

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit Modal state
  const [editingEntry, setEditingEntry] = useState<OwnerKnowledgeEntry | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filter & Sort
  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        // Tab filter (Approval status)
        if (activeTab === "approved" && !e.isApproved) return false;
        if (activeTab === "inactive" && e.isApproved) return false;

        // Source filter
        if (sourceFilter !== "all" && e.sourceType !== sourceFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchTitle = e.title.toLowerCase().includes(query);
          const matchContent = e.content.toLowerCase().includes(query);
          if (!matchTitle && !matchContent) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "alphabetical") {
          return a.title.localeCompare(b.title);
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [entries, activeTab, sourceFilter, searchQuery, sortBy]);

  // Create Knowledge Entry
  const handleCreate = async () => {
    const trimmedTitle = newTitle.trim();
    const trimmedContent = newContent.trim();

    if (!trimmedTitle || trimmedTitle.length < 3) {
      toast.error("Question or topic title must be at least 3 characters.");
      return;
    }
    if (!trimmedContent || trimmedContent.length < 3) {
      toast.error("Answer or content must be at least 3 characters.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId: website.id,
          title: trimmedTitle,
          content: trimmedContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create knowledge entry");
      }

      if (data.isUpdated) {
        // Updated existing entry
        setEntries((prev) =>
          prev.map((e) =>
            e.id === data.entryId
              ? {
                  ...e,
                  title: trimmedTitle,
                  content: trimmedContent,
                  isApproved: true,
                  updatedAt: new Date(),
                }
              : e
          )
        );
        toast.success("Existing knowledge entry updated with new answer!");
      } else {
        // New entry added
        const newEntry: OwnerKnowledgeEntry = {
          id: data.entryId,
          websiteId: website.id,
          questionRefId: null,
          title: trimmedTitle,
          content: trimmedContent,
          sourceType: "custom",
          isApproved: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          websiteTitle: website.title,
          websiteSlug: website.slug,
        };

        setEntries((prev) => [newEntry, ...prev]);
        setStats((prev) => ({
          ...prev,
          total: prev.total + 1,
          approved: prev.approved + 1,
          custom: prev.custom + 1,
        }));
        toast.success("Knowledge entry added and approved for AI chatbot!");
      }

      setIsCreateOpen(false);
      setNewTitle("");
      setNewContent("");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save knowledge entry");
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const openEditDialog = (entry: OwnerKnowledgeEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditContent(entry.content);
  };

  // Update Knowledge Entry
  const handleUpdate = async () => {
    if (!editingEntry) return;

    const trimmedTitle = editTitle.trim();
    const trimmedContent = editContent.trim();

    if (!trimmedTitle || trimmedTitle.length < 3) {
      toast.error("Question or topic title must be at least 3 characters.");
      return;
    }
    if (!trimmedContent || trimmedContent.length < 3) {
      toast.error("Answer or content must be at least 3 characters.");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/knowledge/${editingEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          content: trimmedContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update knowledge entry");
      }

      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingEntry.id
            ? {
                ...e,
                title: trimmedTitle,
                content: trimmedContent,
                updatedAt: new Date(),
              }
            : e
        )
      );

      toast.success("Knowledge entry updated successfully.");
      setEditingEntry(null);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update knowledge entry");
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle Approval / Active Status
  const handleToggleApproval = async (
    entryId: string,
    currentApproved: boolean
  ) => {
    setTogglingId(entryId);
    const nextApproved = !currentApproved;

    try {
      const res = await fetch(`/api/knowledge/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: nextApproved }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update approval status");
      }

      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, isApproved: nextApproved, updatedAt: new Date() }
            : e
        )
      );

      setStats((prev) => ({
        ...prev,
        approved: nextApproved ? prev.approved + 1 : Math.max(0, prev.approved - 1),
        inactive: nextApproved ? Math.max(0, prev.inactive - 1) : prev.inactive + 1,
      }));

      toast.success(
        nextApproved
          ? "Entry activated and approved for AI chatbot grounding."
          : "Entry deactivated and excluded from AI chatbot knowledge."
      );
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Knowledge Entry
  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this knowledge entry?")) return;

    setDeletingId(entryId);
    try {
      const res = await fetch(`/api/knowledge/${entryId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete knowledge entry");
      }

      const toDelete = entries.find((e) => e.id === entryId);

      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        approved: toDelete?.isApproved
          ? Math.max(0, prev.approved - 1)
          : prev.approved,
        inactive: !toDelete?.isApproved
          ? Math.max(0, prev.inactive - 1)
          : prev.inactive,
        ownerAnswers:
          toDelete?.sourceType === "owner_answer"
            ? Math.max(0, prev.ownerAnswers - 1)
            : prev.ownerAnswers,
        custom:
          toDelete?.sourceType === "custom"
            ? Math.max(0, prev.custom - 1)
            : prev.custom,
      }));

      toast.info("Knowledge entry deleted.");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  };

  const siteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/site/${website.slug}`
      : `/site/${website.slug}`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
          <p className="text-muted-foreground mt-1">
            Manage approved knowledge that grounds your website&apos;s AI chatbot. Changes immediately reflect in future visitor conversations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
            {website.title}
          </Badge>
          {website.isPublished && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Live Site
            </a>
          )}
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Knowledge
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All stored knowledge items</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active in Chatbot</CardTitle>
            <Sparkles className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.approved}
            </div>
            <p className="text-xs text-muted-foreground">Approved & grounding responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive / Excluded</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {stats.inactive}
            </div>
            <p className="text-xs text-muted-foreground">Deactivated from chatbot</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owner Answers</CardTitle>
            <MessageCircleQuestion className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.ownerAnswers}
            </div>
            <p className="text-xs text-muted-foreground">Resolved visitor questions</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filter Bar */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as string)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              All Entries
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              Active in AI
              <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-green-500/20 text-green-700 dark:text-green-300">
                {stats.approved}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="gap-2">
              Inactive
              {stats.inactive > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                  {stats.inactive}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search, Source Filter, and Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Source filter buttons */}
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-card">
              <Button
                variant={sourceFilter === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSourceFilter("all")}
                className="h-7 text-xs px-2"
              >
                All
              </Button>
              <Button
                variant={sourceFilter === "owner_answer" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSourceFilter("owner_answer")}
                className="h-7 text-xs px-2"
              >
                Owner Answers
              </Button>
              <Button
                variant={sourceFilter === "custom" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSourceFilter("custom")}
                className="h-7 text-xs px-2"
              >
                Custom
              </Button>
            </div>

            {/* Sort toggle */}
            <Button
              variant={sortBy === "updated" ? "outline" : "ghost"}
              size="sm"
              onClick={() =>
                setSortBy(sortBy === "updated" ? "alphabetical" : "updated")
              }
              className="h-9 text-xs px-2.5 gap-1 shrink-0"
              title="Toggle sort order"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {sortBy === "updated" ? "Recent" : "A-Z"}
            </Button>
          </div>
        </div>

        {/* Content list */}
        {["all", "approved", "inactive"].map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey} className="mt-4">
            {filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-primary/10 p-3 mb-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold">
                    {searchQuery
                      ? "No matching knowledge entries found"
                      : tabKey === "approved"
                      ? "No active knowledge entries"
                      : tabKey === "inactive"
                      ? "No inactive knowledge entries"
                      : "Knowledge base is currently empty"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    {searchQuery
                      ? `Try clearing the search query "${searchQuery}".`
                      : "Add custom entries or answer visitor questions in the Questions tab to populate approved knowledge."}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setIsCreateOpen(true)}
                      size="sm"
                      className="mt-4 gap-1.5"
                    >
                      <Plus className="h-4 w-4" /> Add First Entry
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <Card
                    key={entry.id}
                    className={`transition-all hover:border-primary/50 hover:shadow-xs ${
                      !entry.isApproved ? "opacity-75 bg-muted/20" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Source badge */}
                            {entry.sourceType === "owner_answer" && (
                              <Badge variant="secondary" className="gap-1 text-purple-700 bg-purple-500/10 dark:text-purple-300">
                                <MessageCircleQuestion className="h-3 w-3" /> Owner Answer
                              </Badge>
                            )}
                            {entry.sourceType === "custom" && (
                              <Badge variant="secondary" className="gap-1 text-blue-700 bg-blue-500/10 dark:text-blue-300">
                                <BookOpen className="h-3 w-3" /> Custom Fact
                              </Badge>
                            )}
                            {entry.sourceType === "profile_content" && (
                              <Badge variant="secondary" className="gap-1">
                                Profile Content
                              </Badge>
                            )}

                            {/* Approval status badge */}
                            {entry.isApproved ? (
                              <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10 gap-1">
                                <Sparkles className="h-3 w-3" /> Active in AI
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Inactive
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold tracking-tight text-foreground pt-1">
                            {entry.title}
                          </h3>
                        </div>

                        {/* Date info */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 sm:pt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Updated{" "}
                          {new Date(entry.updatedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      {/* Approved Content block */}
                      <div className="rounded-lg border bg-muted/40 p-3.5 text-sm space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground">
                          Approved Knowledge Content
                        </div>
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      </div>

                      {/* Footer actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t">
                        {/* Toggle active switch */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={entry.isApproved}
                            onCheckedChange={() =>
                              handleToggleApproval(entry.id, entry.isApproved)
                            }
                            disabled={togglingId === entry.id}
                            id={`switch-${entry.id}`}
                          />
                          <label
                            htmlFor={`switch-${entry.id}`}
                            className="text-xs text-muted-foreground cursor-pointer select-none"
                          >
                            {entry.isApproved
                              ? "Active (grounding AI chatbot)"
                              : "Inactive (excluded from AI chatbot)"}
                          </label>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(entry)}
                            className="gap-1.5"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            {deletingId === entry.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Knowledge Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Add Knowledge Entry
            </DialogTitle>
            <DialogDescription>
              Add a verified Q&A pair or fact. The AI chatbot will immediately use this approved information to answer visitor queries.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="create-title"
                className="text-sm font-medium text-foreground"
              >
                Question or Topic Title
              </label>
              <Input
                id="create-title"
                placeholder="e.g., What are your pricing plans?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={isCreating}
              />
              <span className="text-[11px] text-muted-foreground">
                If an entry with the same topic already exists, it will be updated to avoid duplicates.
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="create-content"
                  className="text-sm font-medium text-foreground"
                >
                  Approved Answer or Content
                </label>
                <span className="text-xs text-muted-foreground">
                  {newContent.trim().length} / 5000
                </span>
              </div>
              <Textarea
                id="create-content"
                rows={5}
                placeholder="Provide accurate, factual information for the chatbot..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                Once added, the knowledge is immediately injected into your chatbot system prompt under zero-hallucination rules.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                isCreating ||
                newTitle.trim().length < 3 ||
                newContent.trim().length < 3
              }
              className="gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Save & Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Knowledge Dialog */}
      <Dialog
        open={!!editingEntry}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Edit Knowledge Entry
            </DialogTitle>
            <DialogDescription>
              Update this approved knowledge. Future visitor questions will be answered using the updated content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-title"
                className="text-sm font-medium text-foreground"
              >
                Question or Topic Title
              </label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="edit-content"
                  className="text-sm font-medium text-foreground"
                >
                  Approved Answer or Content
                </label>
                <span className="text-xs text-muted-foreground">
                  {editContent.trim().length} / 5000
                </span>
              </div>
              <Textarea
                id="edit-content"
                rows={5}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={isUpdating}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingEntry(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={
                isUpdating ||
                editTitle.trim().length < 3 ||
                editContent.trim().length < 3
              }
              className="gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
