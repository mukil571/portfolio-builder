"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { MessageCircle, X, Send, RefreshCw, AlertCircle } from "lucide-react";

interface ChatWidgetProps {
  websiteId: string;
  websiteTitle: string;
}

export function ChatWidget({ websiteId, websiteTitle }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { websiteId },
      }),
    [websiteId]
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const hasError = status === "error";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBusy, hasError]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    clearError();
    sendMessage({ text: input });
    setInput("");
  };

  const onRetry = () => {
    clearError();
    // Re-send the last user message if there is one
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      const text = lastUserMsg.parts
        .filter(
          (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
        )
        .map((p) => p.text)
        .join("");
      if (text) {
        sendMessage({ text });
      }
    }
  };

  // Helper to extract text content from a message's parts
  const getMessageText = (message: (typeof messages)[number]): string => {
    return message.parts
      .filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text"
      )
      .map((part) => part.text)
      .join("");
  };

  // Helper to extract a friendly error string (parsing JSON status payloads if applicable)
  const getErrorMessage = (err: Error | undefined): string => {
    if (!err?.message) return "Failed to get a response. Please try again.";
    try {
      const parsed = JSON.parse(err.message);
      if (typeof parsed === "object" && parsed !== null) {
        if (parsed.error && parsed.code) {
          return `${parsed.error} (${parsed.code})`;
        }
        if (parsed.error) return String(parsed.error);
        if (parsed.message) return String(parsed.message);
      }
    } catch {
      // Not JSON, return message as is
    }
    return err.message;
  };

  return (
    <>
      {/* Chat Panel */}
      <div
        className={`fixed z-50 flex flex-col bg-background border border-border shadow-2xl overflow-hidden transition-all duration-300 ease-in-out
          sm:w-[380px] sm:h-[520px] sm:bottom-24 sm:right-6 sm:rounded-xl
          w-full h-[100dvh] bottom-0 right-0 rounded-none
          ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-semibold leading-none">
                {websiteTitle}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Ask me anything
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome message (local only) */}
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-2.5 text-sm leading-relaxed bg-muted mr-8 rounded-2xl rounded-bl-sm">
              Hi! 👋 I&apos;m the AI assistant for {websiteTitle}. Ask me
              anything about this website!
            </div>
          </div>

          {messages.map((message) => {
            const text = getMessageText(message);
            // Skip empty assistant messages (streaming placeholder before first token)
            if (message.role === "assistant" && !text) return null;
            return (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-8 rounded-2xl rounded-br-sm"
                      : "bg-muted mr-8 rounded-2xl rounded-bl-sm"
                  }`}
                >
                  {text}
                </div>
              </div>
            );
          })}

          {/* Typing indicator — show while busy and no assistant text is streaming yet */}
          {isBusy &&
            !getMessageText(messages[messages.length - 1] ?? { parts: [] }) && (
              <div className="flex justify-start">
                <div className="bg-muted mr-8 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

          {/* Error feedback */}
          {hasError && (
            <div className="flex justify-start">
              <div className="max-w-[85%] mr-8 px-4 py-3 rounded-2xl rounded-bl-sm bg-destructive/10 border border-destructive/20 text-sm">
                <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Something went wrong
                </div>
                <p className="text-muted-foreground text-xs mb-2">
                  {getErrorMessage(error)}
                </p>
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={onSubmit}
          className="border-t border-border px-4 py-3 bg-background flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            disabled={isBusy}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isBusy}
            className="p-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Floating Trigger Button — hidden on mobile when panel is open */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center ${
          isOpen ? "sm:flex hidden" : "flex"
        }`}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </>
  );
}
