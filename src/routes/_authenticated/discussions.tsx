import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessagesSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useSession } from "@/hooks/useAuth";
import { useClasses } from "@/lib/data";
import { useDiscussion } from "@/lib/features";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/discussions")({
  head: () => ({ meta: [{ title: "Discussions — EduVerse" }] }),
  component: DiscussionsPage,
});

function DiscussionsPage() {
  const { data: classes, isLoading: clsLoading } = useClasses();
  const [classId, setClassId] = useState<string>("");
  const activeId = classId || classes?.[0]?.id;

  return (
    <div>
      <PageHeader title="Class Discussions" subtitle="Chat with your class in real time." />
      {clsLoading ? (
        <Skeleton className="mb-4 h-10 w-64" />
      ) : !classes?.length ? (
        <Card className="rounded-2xl border-dashed p-8 text-center">
          <p className="font-semibold">Join or create a class to start chatting.</p>
        </Card>
      ) : (
        <>
          <Tabs value={activeId ?? ""} onValueChange={setClassId} className="mb-4">
            <TabsList className="flex-wrap">
              {classes.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          {activeId && <DiscussionRoom classId={activeId} />}
        </>
      )}
    </div>
  );
}

function initials(n?: string | null) {
  return (n ?? "?").split(" ").map((p) => p[0]).slice(0,2).join("").toUpperCase();
}

function DiscussionRoom({ classId }: { classId: string }) {
  const { user } = useSession();
  const { data, isLoading, send } = useDiscussion(classId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await send.mutateAsync(text.trim());
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  }

  return (
    <Card className="flex h-[65vh] flex-col overflow-hidden rounded-2xl border-border shadow-soft">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : !data?.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessagesSquare className="h-8 w-8" />
            <p className="text-sm">Be the first to say hello 👋</p>
          </div>
        ) : (
          data.map((m) => {
            const mine = m.author_id === user?.id;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={m.author_avatar ?? undefined} />
                  <AvatarFallback className="text-[10px]">{initials(m.author_name)}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {!mine && <p className="mb-0.5 text-[10px] font-semibold opacity-80">{m.author_name ?? "User"}</p>}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
        <Input placeholder="Type a message…" value={text} onChange={(e)=>setText(e.target.value)} />
        <Button type="submit" variant="hero" disabled={send.isPending || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
