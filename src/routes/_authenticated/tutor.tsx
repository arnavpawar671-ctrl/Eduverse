import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { askTutor } from "@/lib/tutor.functions";
import { PageHeader } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({ meta: [{ title: "AI Tutor — EduVerse" }] }),
  component: TutorPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Explain the Pythagorean theorem with an example",
  "Generate a 5-question quiz on photosynthesis",
  "Summarize World War I in simple points",
  "Help me debug a Python for-loop",
];

function TutorPage() {
  const ask = useServerFn(askTutor);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next.slice(-20) } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The AI Tutor is unavailable.");
      setMessages((m) => m.slice(0, -1));
      setInput(content);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col lg:h-[calc(100vh-6rem)]">
      <PageHeader title="AI Tutor" subtitle="Your 24/7 academic assistant — ask anything." />

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 no-scrollbar">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
                <Sparkles className="h-8 w-8" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">How can I help you learn today?</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Ask questions, generate quizzes, get step-by-step explanations and more.
              </p>
              <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-border p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <Bubble key={i} msg={m} />)
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI Tutor…"
            className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button type="submit" variant="hero" size="icon" className="h-10 w-10 rounded-full" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser ? "bg-secondary text-white" : "bg-brand text-white"
        }`}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </span>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}
