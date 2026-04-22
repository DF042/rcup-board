"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "Who has the best all-time record?",
  "What were the standings in 2023?",
  "Who scored the most points last week?",
  "What's the head-to-head record between two managers?",
];

// Safety cap to avoid infinite reads if upstream streaming connection never closes.
const MAX_STREAM_CHUNKS = 4000;

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;
    const nextMessages = [...messages, { role: "user" as const, content: message }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done || chunkCount > MAX_STREAM_CHUNKS) break;
        chunkCount += 1;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: assistantText };
          }
          return copy;
        });
      }
    } catch {
      setError("Unable to get a response. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open ? (
        <Button className="fixed bottom-20 right-4 z-50 rounded-full md:bottom-6" onClick={() => setOpen(true)}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Chat
        </Button>
      ) : null}

      {open ? (
        <div className="fixed bottom-0 right-0 z-50 h-[70vh] w-full border bg-background p-3 shadow-xl md:h-full md:max-h-[680px] md:w-[420px] md:rounded-l-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">AI League Assistant</h3>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-3 h-[calc(100%-8rem)] space-y-2 overflow-y-auto rounded border p-2">
            {messages.length === 0 ? (
              <div className="space-y-2 text-sm">
                <div className="rounded border bg-muted/20 p-3">
                  <p className="font-medium">Welcome to your AI League Assistant 👋</p>
                  <p className="text-muted-foreground">
                    Ask anything about standings, matchups, top scorers, and manager history.
                  </p>
                </div>
                <p className="text-muted-foreground">Try one of these:</p>
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="block w-full rounded border p-2 text-left hover:bg-muted"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[90%] rounded px-3 py-2 text-sm ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {message.content || (loading && message.role === "assistant" ? "…" : "")}
                </div>
              ))
            )}
          </div>

          {error ? (
            <div className="mb-2 flex items-center justify-between rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => setError(null)}>
                Retry
              </Button>
            </div>
          ) : null}

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about league data..." />
            <Button type="submit" size="sm" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
