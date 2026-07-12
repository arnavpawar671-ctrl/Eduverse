import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Plus, KeyRound, Users, KeySquare, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession, useRole } from "@/hooks/useAuth";
import { useClasses, useCreateClass, useJoinClass } from "@/lib/data";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [{ title: "Classes — EduVerse" }] }),
  component: ClassesPage,
});

const COLORS = [
  "from-[#4a90e2] to-[#7b61ff]",
  "from-[#7b61ff] to-[#4a90e2]",
  "from-[#4caf50] to-[#4a90e2]",
  "from-[#ff9800] to-[#f44336]",
  "from-[#00bcd4] to-[#4caf50]",
];

function ClassesPage() {
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const isTeacher = role === "teacher" || role === "admin";
  const { data: classes, isLoading } = useClasses();
  const join = useJoinClass();
  const [code, setCode] = useState("");

  async function handleJoin() {
    if (!code.trim()) return toast.error("Enter a class code");
    try {
      await join.mutateAsync(code);
      toast.success(`Joined class ${code.toUpperCase()}!`);
      setCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not join class");
    }
  }

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle={isTeacher ? "Create and manage your classes." : "Your enrolled classes and materials."}
        action={isTeacher ? <CreateClassDialog /> : undefined}
      />

      {!isTeacher && (
        <Card className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border-border p-4 shadow-soft">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <div className="min-w-[180px] flex-1">
            <p className="text-sm font-semibold">Join a class</p>
            <p className="text-xs text-muted-foreground">Enter the class code from your teacher.</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="e.g. AB12CD"
              className="w-36"
            />
            <Button onClick={handleJoin} disabled={join.isPending}>
              {join.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : !classes?.length ? (
        <EmptyState isTeacher={isTeacher} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Card
              key={c.id}
              className="overflow-hidden rounded-2xl border-border shadow-soft transition-transform hover:-translate-y-1"
            >
              <div className={`h-24 bg-gradient-to-br ${c.color} p-4`}>
                <BookOpen className="h-6 w-6 text-white/90" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {c.subject || "General"}
                  {!isTeacher && c.teacher_name ? ` · ${c.teacher_name}` : ""}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {c.student_count} student{c.student_count === 1 ? "" : "s"}
                  </span>
                </div>
                {isTeacher && (
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(c.join_code);
                      toast.success(`Code ${c.join_code} copied`);
                    }}
                    className="mt-3 flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs font-medium"
                  >
                    <span className="flex items-center gap-1.5">
                      <KeySquare className="h-3.5 w-3.5" /> Code: {c.join_code}
                    </span>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ isTeacher }: { isTeacher: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl border-dashed border-border p-12 text-center shadow-soft">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-primary">
        <BookOpen className="h-6 w-6" />
      </span>
      <p className="font-semibold">No classes yet</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        {isTeacher
          ? "Create your first class and share the join code with your students."
          : "Join a class using the code your teacher shared with you."}
      </p>
    </Card>
  );
}

function CreateClassDialog() {
  const create = useCreateClass();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  async function submit() {
    if (!name.trim()) return toast.error("Class name is required");
    try {
      const cls = await create.mutateAsync({
        name: name.trim(),
        subject: subject.trim(),
        description: description.trim(),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
      toast.success(`Class created! Share code ${cls.join_code} with students.`);
      setName("");
      setSubject("");
      setDescription("");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create class");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero">
          <Plus className="h-4 w-4" /> Create class
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a class</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cname">Class name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics 10-A" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="csub">Subject</Label>
            <Input id="csub" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mathematics" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cdesc">Description</Label>
            <Textarea
              id="cdesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this class about?"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="hero" onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
