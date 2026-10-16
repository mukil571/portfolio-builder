"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircleQuestion,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Flame,
  Search,
  MessageSquareReply,
  RotateCcw,
  ExternalLink,
  Loader2,
  Calendar,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { OwnerQuestion, QuestionStats } from "@/server/ai/questions";

interface QuestionsManagerProps {
  initialQuestions: OwnerQuestion[];
  initialStats: QuestionStats;
  website: {
    id: string;
    title: string;
    slug: string;
    type: string;
    isPublished: boolean | null;
  };
}

export function QuestionsManager({
  initialQuestions,
  initialStats,
  website,
}: QuestionsManagerProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<OwnerQuestion[]>(initialQuestions);
  const [stats, setStats] = useState<QuestionStats>(initialStats);
  const [activeTab, setActiveTab] = useState<string>("unanswered");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"frequency" | "newest" | "oldest">("frequency");

  // Modal state
  const [selectedQuestion, setSelectedQuestion] = useState<OwnerQuestion | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDismissing, setIsDismissing] = useState<string | null>(null);
  const [isReopening, setIsReopening] = useState<string | null>(null);

  const openAnswerDialog = (q: OwnerQuestion) => {
    setSelectedQuestion(q);
    setAnswerText(q.answer || "");
  };

  const closeAnswerDialog = () => {
    if (isSubmitting) return;
    setSelectedQuestion(null);
    setAnswerText("");
  };

  // Submit Answer
  const handleSaveAnswer = async () => {
    if (!selectedQuestion) return;
    const trimmed = answerText.trim();

    if (!trimmed || trimmed.length < 3) {
      toast.error("Answer must be at least 3 characters long.");
      return;
    }
    if (trimmed.length > 5000) {
      toast.error("Answer must be at most 5000 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/questions/${selectedQuestion.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save answer");
      }

      // Update question state locally
      const prevStatus = selectedQuestion.status;
      const updatedQuestion: OwnerQuestion = {
        ...selectedQuestion,
        status: "answered",
        answer: trimmed,
        answeredAt: new Date(),
      };

      setQuestions((prev) =>
        prev.map((q) => (q.id === selectedQuestion.id ? updatedQuestion : q))
      );

      // Update stats
      setStats((prev) => ({
        ...prev,
        unanswered: prevStatus === "unanswered" ? Math.max(0, prev.unanswered - 1) : prev.unanswered,
        dismissed: prevStatus === "dismissed" ? Math.max(0, prev.dismissed - 1) : prev.dismissed,
        answered: prevStatus === "answered" ? prev.answered : prev.answered + 1,
      }));

      toast.success("Answer saved and approved for AI chatbot responses!");
      closeAnswerDialog();
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dismiss Question
  const handleDismiss = async (questionId: string) => {
    setIsDismissing(questionId);
    try {
      const res = await fetch(`/api/questions/${questionId}/dismiss`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to dismiss question");
      }

      const qToDismiss = questions.find((q) => q.id === questionId);
      const prevStatus = qToDismiss?.status;

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, status: "dismissed" } : q
        )
      );

      setStats((prev) => ({
        ...prev,
        unanswered: prevStatus === "unanswered" ? Math.max(0, prev.unanswered - 1) : prev.unanswered,
        answered: prevStatus === "answered" ? Math.max(0, prev.answered - 1) : prev.answered,
        dismissed: prevStatus === "dismissed" ? prev.dismissed : prev.dismissed + 1,
      }));

      if (selectedQuestion?.id === questionId) {
        closeAnswerDialog();
      }

      toast.info("Question dismissed.");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to dismiss question.");
    } finally {
      setIsDismissing(null);
    }
  };

  // Reopen Question
  const handleReopen = async (questionId: string) => {
    setIsReopening(questionId);
    try {
      const res = await fetch(`/api/questions/${questionId}/reopen`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reopen question");
      }

      const qToReopen = questions.find((q) => q.id === questionId);
      const prevStatus = qToReopen?.status;

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, status: "unanswered" } : q
        )
      );

      setStats((prev) => ({
        ...prev,
        dismissed: prevStatus === "dismissed" ? Math.max(0, prev.dismissed - 1) : prev.dismissed,
        answered: prevStatus === "answered" ? Math.max(0, prev.answered - 1) : prev.answered,
        unanswered: prevStatus === "unanswered" ? prev.unanswered : prev.unanswered + 1,
      }));

      toast.success("Question moved back to Unanswered.");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to reopen question.");
    } finally {
      setIsReopening(null);
    }
  };

  // Filter & Sort
  const filteredQuestions = useMemo(() => {
    return questions
      .filter((q) => {
        // Tab filter
        if (activeTab === "unanswered" && q.status !== "unanswered") return false;
        if (activeTab === "answered" && q.status !== "answered") return false;
        if (activeTab === "dismissed" && q.status !== "dismissed") return false;

        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchQuestion = q.questionText.toLowerCase().includes(query);
          const matchAnswer = q.answer?.toLowerCase().includes(query);
          if (!matchQuestion && !matchAnswer) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "frequency") {
          if (b.askCount !== a.askCount) return b.askCount - a.askCount;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [questions, activeTab, searchQuery, sortBy]);

  const siteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/site/${website.slug}`
      : `/site/${website.slug}`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visitor Questions</h2>
          <p className="text-muted-foreground mt-1">
            Review questions your AI assistant couldn't answer. Answer them here to automatically expand your website's approved knowledge base.
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
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <MessageCircleQuestion className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Unique unknown questions recorded</p>
          </CardContent>
        </Card>

        <Card className={stats.unanswered > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unanswered</CardTitle>
            <HelpCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.unanswered}
            </div>
            <p className="text-xs text-muted-foreground">Waiting for your approved answer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Answered & Grounded</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.answered}
            </div>
            <p className="text-xs text-muted-foreground">Active in AI chatbot knowledge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.dismissed}</div>
            <p className="text-xs text-muted-foreground">Ignored / out-of-scope questions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as string)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="unanswered" className="gap-2">
              Unanswered
              {stats.unanswered > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {stats.unanswered}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="answered" className="gap-2">
              Answered
              {stats.answered > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                  {stats.answered}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="dismissed" className="gap-2">
              Dismissed
              {stats.dismissed > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                  {stats.dismissed}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {stats.total}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-card shrink-0">
              <Button
                variant={sortBy === "frequency" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSortBy("frequency")}
                className="h-7 text-xs px-2.5 gap-1"
                title="Sort by question frequency"
              >
                <Flame className="h-3 w-3 text-amber-500" />
                Popular
              </Button>
              <Button
                variant={sortBy === "newest" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSortBy("newest")}
                className="h-7 text-xs px-2.5"
                title="Sort by newest"
              >
                Newest
              </Button>
            </div>
          </div>
        </div>

        {/* Question List Content */}
        {["unanswered", "answered", "dismissed", "all"].map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey} className="mt-4">
            {filteredQuestions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-primary/10 p-3 mb-3">
                    {tabKey === "unanswered" ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : tabKey === "answered" ? (
                      <BookOpen className="h-6 w-6 text-primary" />
                    ) : (
                      <MessageCircleQuestion className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-base font-semibold">
                    {searchQuery
                      ? "No matching questions found"
                      : tabKey === "unanswered"
                      ? "All caught up!"
                      : tabKey === "answered"
                      ? "No answered questions yet"
                      : tabKey === "dismissed"
                      ? "No dismissed questions"
                      : "No questions recorded yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    {searchQuery
                      ? `Try clearing the search query "${searchQuery}".`
                      : tabKey === "unanswered"
                      ? "There are currently no unanswered questions waiting for your response."
                      : tabKey === "answered"
                      ? "When you answer visitor questions, they will appear here and ground your AI chatbot with approved answers."
                      : tabKey === "dismissed"
                      ? "Questions you dismiss will appear here."
                      : "When visitors ask questions on your published site that cannot be answered from existing content, they will automatically appear here."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map((q) => (
                  <Card
                    key={q.id}
                    className="transition-all hover:border-primary/50 hover:shadow-xs"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Ask count badge */}
                            <Badge
                              variant={q.askCount > 1 ? "default" : "secondary"}
                              className={
                                q.askCount > 1
                                  ? "bg-amber-600 hover:bg-amber-700 text-white gap-1"
                                  : "gap-1"
                              }
                            >
                              {q.askCount > 1 && <Flame className="h-3 w-3 fill-current" />}
                              Asked {q.askCount} {q.askCount === 1 ? "time" : "times"}
                            </Badge>

                            {/* Status badge */}
                            {q.status === "unanswered" && (
                              <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                                Unanswered
                              </Badge>
                            )}
                            {q.status === "answered" && (
                              <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10 gap-1">
                                <Sparkles className="h-3 w-3" /> Grounded in AI
                              </Badge>
                            )}
                            {q.status === "dismissed" && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Dismissed
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold tracking-tight text-foreground pt-1">
                            &ldquo;{q.questionText}&rdquo;
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 sm:pt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(q.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      {/* Approved Answer Display if already answered */}
                      {q.status === "answered" && q.answer && (
                        <div className="rounded-lg border bg-muted/40 p-3.5 text-sm space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <Sparkles className="h-3.5 w-3.5" /> Approved Knowledge Answer
                          </div>
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                            {q.answer}
                          </p>
                          {q.answeredAt && (
                            <p className="text-[11px] text-muted-foreground pt-1">
                              Approved on {new Date(q.answeredAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t">
                        {q.status === "unanswered" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDismiss(q.id)}
                              disabled={isDismissing === q.id}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              {isDismissing === q.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Dismiss"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openAnswerDialog(q)}
                              className="gap-1.5"
                            >
                              <MessageSquareReply className="h-4 w-4" />
                              Answer Question
                            </Button>
                          </>
                        )}

                        {q.status === "answered" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAnswerDialog(q)}
                            className="gap-1.5"
                          >
                            <Sparkles className="h-4 w-4 text-primary" />
                            Update Answer
                          </Button>
                        )}

                        {q.status === "dismissed" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReopen(q.id)}
                              disabled={isReopening === q.id}
                              className="gap-1 text-muted-foreground"
                            >
                              {isReopening === q.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Reopen
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openAnswerDialog(q)}
                              className="gap-1.5"
                            >
                              <MessageSquareReply className="h-4 w-4" />
                              Answer Anyway
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Answer Modal Dialog */}
      <Dialog
        open={!!selectedQuestion}
        onOpenChange={(open) => {
          if (!open) closeAnswerDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {selectedQuestion?.status === "answered"
                ? "Update Approved Answer"
                : "Answer Visitor Question"}
            </DialogTitle>
            <DialogDescription>
              Your answer will be saved to your website and immediately approved for AI chatbot grounding.
            </DialogDescription>
          </DialogHeader>

          {selectedQuestion && (
            <div className="space-y-4 py-2">
              {/* Question highlight */}
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Visitor Question</span>
                  <span>Asked {selectedQuestion.askCount} {selectedQuestion.askCount === 1 ? "time" : "times"}</span>
                </div>
                <p className="font-semibold text-sm text-foreground">
                  &ldquo;{selectedQuestion.questionText}&rdquo;
                </p>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="answer-input"
                    className="text-sm font-medium text-foreground"
                  >
                    Approved Answer
                  </label>
                  <span
                    className={`text-xs ${
                      answerText.trim().length < 3
                        ? "text-muted-foreground"
                        : answerText.trim().length > 5000
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {answerText.trim().length} / 5000
                  </span>
                </div>
                <Textarea
                  id="answer-input"
                  rows={5}
                  placeholder="Provide an accurate, factual answer. E.g., 'Yes, we provide full integration support including 24/7 incident response...'"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  className="resize-y"
                  disabled={isSubmitting}
                />
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1">
                  <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Future visitors asking this question will receive this exact verified information from your AI assistant.
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeAnswerDialog}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAnswer}
              disabled={isSubmitting || answerText.trim().length < 3 || answerText.trim().length > 5000}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Knowledge...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Save & Approve Knowledge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
