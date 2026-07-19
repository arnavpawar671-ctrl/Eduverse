import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Video, Radio, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClasses } from "@/lib/data";
import { useMeetings, useStartMeeting, useEndMeeting, type MeetingRow } from "@/lib/games";
import { useRole, useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({ meta: [{ title: "Live Classes — EduVerse" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { data: meetings } = useMeetings();
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const [join, setJoin] = useState<MeetingRow | null>(null);
  const isTeacher = role === "teacher" || role === "admin";
  const live = meetings?.filter((m) => !m.ended_at) ?? [];
  const past = meetings?.filter((m) => m.ended_at) ?? [];

  return (
    <div>
      <PageHeader
        title="Live Classes"
        subtitle="Free HD video rooms powered by Jitsi. No sign-in needed."
        actions={isTeacher ? <StartMeeting /> : undefined}
      />
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Radio className="h-4 w-4 text-destructive animate-pulse" /> Live now</h3>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {live.length === 0 && <Card className="col-span-full p-6 text-center text-sm text-muted-foreground">No live classes.</Card>}
        {live.map((m) => <MeetingCard key={m.id} m={m} onJoin={() => setJoin(m)} isTeacher={isTeacher} />)}
      </div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Past meetings</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {past.slice(0, 10).map((m) => (
          <Card key={m.id} className="rounded-xl border-border p-4">
            <p className="font-medium">{m.title}</p>
            <p className="text-xs text-muted-foreground">{new Date(m.started_at).toLocaleString()}</p>
          </Card>
        ))}
      </div>
      {join && <JitsiDialog room={join.room_name} title={join.title} onClose={() => setJoin(null)} />}
    </div>
  );
}

function MeetingCard({ m, onJoin, isTeacher }: { m: MeetingRow; onJoin: () => void; isTeacher: boolean }) {
  const end = useEndMeeting();
  return (
    <Card className="rounded-2xl border-border p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{m.title}</p>
          <p className="text-xs text-muted-foreground">Started {new Date(m.started_at).toLocaleTimeString()}</p>
        </div>
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">LIVE</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={onJoin}><Video className="mr-2 h-4 w-4" /> Join</Button>
        {isTeacher && <Button variant="outline" size="icon" onClick={() => end.mutate(m.id)}><X className="h-4 w-4" /></Button>}
      </div>
    </Card>
  );
}

function StartMeeting() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState<string>("");
  const { data: classes } = useClasses();
  const start = useStartMeeting();

  async function go() {
    if (!classId || !title.trim()) return;
    try {
      await start.mutateAsync({ class_id: classId, title });
      toast.success("Meeting started!");
      setOpen(false); setTitle("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full"><Video className="mr-2 h-4 w-4" /> Start live class</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Start a live class</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Algebra review" /></div>
          <div><Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={go}>Go live</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JitsiDialog({ room, title, onClose }: { room: string; title: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader className="p-4"><DialogTitle>{title}</DialogTitle></DialogHeader>
        <iframe
          title="Jitsi"
          src={`https://meet.jit.si/${encodeURIComponent(room)}#config.prejoinPageEnabled=false`}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="h-[70vh] w-full rounded-b-lg border-0"
        />
      </DialogContent>
    </Dialog>
  );
}
