import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Megaphone, Plus, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRole, useSession } from "@/hooks/useAuth";
import { useClasses } from "@/lib/data";
import { useAnnouncements, useCreateAnnouncement } from "@/lib/features";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements — EduVerse" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const isTeacher = role === "teacher" || role === "admin";
  const { data: list, isLoading } = useAnnouncements();

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Class updates, news, and important messages."
        action={isTeacher ? <NewAnnouncementDialog /> : undefined}
      />
      {isLoading ? (
        <div className="space-y-3">{[0,1,2].map((i)=><Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : !list?.length ? (
        <Card className="flex flex-col items-center gap-2 rounded-2xl border-dashed p-12 text-center">
          <Megaphone className="h-8 w-8 text-primary" />
          <p className="font-semibold">No announcements yet</p>
          <p className="text-sm text-muted-foreground">
            {isTeacher ? "Create your first announcement." : "Your teachers haven't posted anything yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <Card key={a.id} className="rounded-2xl border-border p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {a.class_name ? (
                      <>{a.class_name} · </>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> Global · </span>
                    )}
                    {a.author_name ?? "Teacher"} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{a.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewAnnouncementDialog() {
  const { data: classes } = useClasses();
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const isAdmin = role === "admin";
  const create = useCreateAnnouncement();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [classId, setClassId] = useState<string>("");

  const myClasses = (classes ?? []).filter((c) => c.teacher_id === user?.id);

  async function submit() {
    if (!title.trim() || !body.trim()) return toast.error("Title and message required");
    if (!classId) return toast.error("Pick a class");
    try {
      await create.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        class_id: classId === "__global__" ? null : classId,
      });
      toast.success("Announcement posted");
      setTitle(""); setBody(""); setClassId(""); setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero"><Plus className="h-4 w-4" /> New announcement</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Post to</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="__global__">🌍 Global (all users)</SelectItem>}
                {myClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Midterm exam next week" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea rows={5} value={body} onChange={(e)=>setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button variant="hero" onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
