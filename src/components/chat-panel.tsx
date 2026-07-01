"use client";

import { useEffect, useRef, useState } from "react";
import { Info, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MessageRole, TranscriptDTO } from "@/lib/transcript-types";

interface ChatMessage {
  role: MessageRole;
  content: string;
}

const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  { label: "Summarize", prompt: "Summarize this transcript." },
  {
    label: "Action items",
    prompt:
      "List the action items from this transcript, with owners if mentioned.",
  },
  {
    label: "Key decisions",
    prompt: "What key decisions were made in this transcript?",
  },
];

export function ChatPanel({ transcript }: { transcript: TranscriptDTO }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ready = transcript.status === "ready";

  // Load prior messages for this transcript on mount (the component is keyed by
  // transcript id, so it remounts when the selection changes).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/transcripts/${transcript.id}/messages`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          messages: { role: MessageRole; content: string }[];
        };
        if (!cancelled) {
          setMessages(
            data.messages.map((m) => ({ role: m.role, content: m.content }))
          );
        }
      } catch {
        // ignore — user can still start a new chat
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [transcript.id]);

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming || !ready) return;

    setError(null);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId: transcript.id, message: trimmed }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Chat request failed.");
        // drop the empty assistant placeholder
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      setTruncated(res.headers.get("X-History-Truncated") === "1");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // Stream tokens into the last (assistant) message.
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = {
            ...last,
            content: last.content + chunk,
          };
          return next;
        });
      }
    } catch {
      setError("Chat request failed. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    send(input);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  return (
    <div className="bg-background flex h-full w-96 shrink-0 flex-col border-l">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Chat</h2>
        <p className="text-muted-foreground text-xs">
          Ask about this transcript
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {ready
              ? "Ask a question, or use a quick action below."
              : "Chat becomes available once the transcript is ready."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground ml-6 self-end"
                    : "bg-muted text-foreground mr-6 self-start"
                )}
              >
                {m.content ||
                  (streaming && i === messages.length - 1 ? (
                    <Spinner className="size-4" />
                  ) : (
                    ""
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {truncated && (
        <div className="text-muted-foreground flex items-start gap-1.5 border-t px-4 py-2 text-xs">
          <Info className="mt-0.5 size-3 shrink-0" />
          Older messages were trimmed to fit the transcript in context.
        </div>
      )}

      {error && (
        <p className="text-destructive border-t px-4 py-2 text-xs">{error}</p>
      )}

      <div className="flex flex-wrap gap-1.5 border-t px-4 pt-3">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            size="sm"
            disabled={!ready || streaming}
            onClick={() => send(action.prompt)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={!ready || streaming}
          placeholder={ready ? "Ask a question…" : "Transcript not ready"}
          className="max-h-32 min-h-9 flex-1 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!ready || streaming || !input.trim()}
          aria-label="Send"
        >
          {streaming ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
