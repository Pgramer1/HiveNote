"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, User, Loader2, Sparkles, Send, AlertCircle } from "lucide-react";

type Props = {
  resourceId: string;
  resourceTitle: string;
  resourceType: "PDF" | "PPT" | "LINK";
  hasExtractedText: boolean;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ResourceChatBot({
  resourceId,
  resourceTitle,
  resourceType,
  hasExtractedText,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: hasExtractedText
        ? `Hi! I've read "${resourceTitle}" and I'm ready to help. Ask me anything about this document!`
        : resourceType === "PPT"
        ? `Hi! I can help you with "${resourceTitle}". Note: I can't read the slides directly, but ask me anything and I'll do my best!`
        : `Hi! I can help you with "${resourceTitle}". Ask me anything!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId,
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server error ${res.status}: ${errText}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
          );
        }
      }

      if (!accumulated) {
        throw new Error("Empty response from server");
      }
    } catch (e) {
      console.error("[Chat]:", e);
      setError(e instanceof Error ? e.message : "Failed to get a response. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card rounded-xl border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">AI Study Assistant</h3>
          <p className="text-xs text-muted-foreground">
            {hasExtractedText ? "Powered by Groq · Has document context" : "Powered by Groq"}
          </p>
        </div>
        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
      </div>

      {/* Context notice for PDF without extracted text */}
      {!hasExtractedText && resourceType === "PDF" && (
        <div className="flex items-start gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          This PDF was uploaded before AI support was added. Re-upload it to enable document-aware answers.
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              {message.content || (message.role === "assistant" && isLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ))}
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

      </div>

      {/* Input */}
      <div className="p-4 border-t bg-muted/20">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about this resource..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 min-h-11 max-h-32"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-11 shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
