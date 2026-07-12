import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  Star,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { useSession, useRole } from "@/hooks/useAuth";
import {
  useAssignments,
  useClasses,
  useCreateAssignment,
  useSubmitAssignment,
  useGradeSubmission,
  type AssignmentWithMeta,
  type SubmissionRow,
} from "@/lib/data";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({ meta: [{ title: "Assignments — EduVerse" }] }),
  component: AssignmentsPage,
});

function fmtDue(due: string | null): string {
  if (!due) return "No due date";
  const d = new Date(due);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (days < 0) return `Overdue · ${date}`;
  if (days === 0) return `Due today · ${date}`;
  if (days === 1) return `Due tomorrow · ${date}`;
  return `Due in ${days} days · ${date}`;
}

function AssignmentsPage() {
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const isTeacher = role === "teacher" || role === "admin";
  const { data: assignments, isLoading } = useAssignments();

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle={isTeacher ? "Create assignments and grade submissions." : "Track and submit your assignments."}
        action={isTeacher ? <CreateAssignmentDialog /> : undefined}
      />

      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !assignments?.length ? (
        <Empty isTeacher={isTeacher} />
      ) : isTeacher ? (
        <div className="grid gap-3">
          {assignments.map((a) => (
            <TeacherRow key={a.id} a={a} />
          ))}
        </div>
      ) : (
        <StudentView assignments={assignments} userId={user?.id} />
      )}
    </div>
  );
}

function Empty({ isTeacher }: { isTeacher: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl border-dashed border-border p-12 text-center shadow-soft">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-primary">
        <ClipboardList className="h-6 w-6" />
      </span>
      <p className="font-semibold">No assignments yet</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        {isTeacher
          ? "Create an assignment for one of your classes to get started."
          : "Assignments from your classes will appear here."}
      </p>
    </Card>
  );
}

/* ---------------- Student ---------------- */
type StudentStatus = "pending" | "submitted" | "graded";

function studentStatus(a: AssignmentWithMeta, userId?: string): { status: StudentStatus; sub?: SubmissionRow } {
  const sub = a.submissions.find((s) => s.student_id === userId);
  if (!sub) return { status: "pending" };
  if (sub.grade != null) return { status: "graded", sub };
  return { status: "submitted", sub };
}

function StudentView({ assignments, userId }: { assignments: AssignmentWithMeta[]; userId?: string }) {
  const tabs = ["all", "pending", "submitted", "graded"] as const;
  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <TabsTrigger value="submitted">Submitted</TabsTrigger>
        <TabsTrigger value="graded">Graded</TabsTrigger>
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab} value={tab} className="mt-4 grid gap-3">
          {assignments
            .filter((a) => tab === "all" || studentStatus(a, userId).status === tab)
            .map((a) => (
              <StudentRow key={a.id} a={a} userId={userId} />
            ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function StudentRow({ a, userId }: { a: AssignmentWithMeta; userId?: string }) {
  const { status, sub } = studentStatus(a, userId);
  const meta = {
    pending: { label: "Pending", icon: Clock, cls: "bg-warning/10 text-warning" },
    submitted: { label: "Submitted", icon: CheckCircle2, cls: "bg-primary/10 text-primary" },
    graded: { label: "Graded", icon: Star, cls: "bg-success/10 text-success" },
  }[status];

  return (
    <Card className="flex flex-wrap items-center gap-3 rounded-2xl border-border p-4 shadow-soft">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
        <ClipboardList className="h-5 w-5" />
      </span>
      <div className="min-w-[160px] flex-1">
        <p className="font-medium">{a.title}</p>
        <p className="text-xs text-muted-foreground">
          {a.class_name ?? "Class"} · {fmtDue(a.due_date)}
        </p>
      </div>
      {status === "graded" && (
        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
          {sub?.grade}/{a.points}
        </span>
      )}
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
        <meta.icon className="h-3.5 w-3.5" /> {meta.label}
      </span>
      <SubmitDialog a={a} existing={sub} />
    </Card>
  );
}

function SubmitDialog({ a, existing }: { a: AssignmentWithMeta; existing?: SubmissionRow }) {
  const submit = useSubmitAssignment();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(existing?.content ?? "");
  const graded = existing?.grade != null;

  async function go() {
    if (!content.trim()) return toast.error("Write your submission first");
    try {
      await submit.mutateAsync({ assignment_id: a.id, content: content.trim() });
      toast.success("Submission saved!");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing ? (
          <Button variant="outline" size="sm">
            {graded ? "View" : "Edit"}
          </Button>
        ) : (
          <Button size="sm">
            <Upload className="h-3.5 w-3.5" /> Submit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{a.title}</DialogTitle>
        </DialogHeader>
        {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
        <div className="space-y-2">
          <Label htmlFor="sub">Your submission</Label>
          <Textarea
            id="sub"
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={graded}
            placeholder="Type or paste your answer here…"
          />
        </div>
        {graded && (
          <div className="rounded-xl bg-success/10 p-3 text-sm">
            <p className="font-semibold text-success">
              Grade: {existing?.grade}/{a.points}
            </p>
            {existing?.feedback && <p className="mt-1 text-muted-foreground">{existing.feedback}</p>}
          </div>
        )}
        {!graded && (
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={go} disabled={submit.isPending}>
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Submit
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Teacher ---------------- */
function TeacherRow({ a }: { a: AssignmentWithMeta }) {
  const graded = a.submissions.filter((s) => s.grade != null).length;
  return (
    <Card className="flex flex-wrap items-center gap-3 rounded-2xl border-border p-4 shadow-soft">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
        <ClipboardList className="h-5 w-5" />
      </span>
      <div className="min-w-[160px] flex-1">
        <p className="font-medium">{a.title}</p>
        <p className="text-xs text-muted-foreground">
          {a.class_name ?? "Class"} · {fmtDue(a.due_date)}
        </p>
      </div>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
        {a.submissions.length} submitted · {graded} graded
      </span>
      <GradeDialog a={a} />
    </Card>
  );
}

function GradeDialog({ a }: { a: AssignmentWithMeta }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="soft" size="sm">
          <GraduationCap className="h-3.5 w-3.5" /> Submissions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{a.title} — submissions</DialogTitle>
        </DialogHeader>
        {!a.submissions.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {a.submissions.map((s) => (
              <GradeCard key={s.id} sub={s} points={a.points} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GradeCard({ sub, points }: { sub: SubmissionRow; points: number }) {
  const grade = useGradeSubmission();
  const [score, setScore] = useState(sub.grade != null ? String(sub.grade) : "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");

  async function save() {
    const n = Number(score);
    if (Number.isNaN(n) || n < 0 || n > points) return toast.error(`Enter a grade between 0 and ${points}`);
    try {
      await grade.mutateAsync({ submission_id: sub.id, grade: n, feedback });
      toast.success("Grade saved!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save grade");
    }
  }

  return (
    <Card className="rounded-xl border-border p-3">
      <p className="mb-2 whitespace-pre-wrap text-sm">{sub.content || <em className="text-muted-foreground">No content</em>}</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-24 space-y-1">
          <Label className="text-xs">Grade / {points}</Label>
          <Input value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric" />
        </div>
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label className="text-xs">Feedback</Label>
          <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Nice work!" />
        </div>
        <Button size="sm" onClick={save} disabled={grade.isPending}>
          {grade.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </Card>
  );
}

function CreateAssignmentDialog() {
  const { data: classes } = useClasses();
  const create = useCreateAssignment();
  const myClasses = useMemo(() => classes ?? [], [classes]);
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [points, setPoints] = useState("100");

  async function submit() {
    if (!classId) return toast.error("Pick a class");
    if (!title.trim()) return toast.error("Title is required");
    try {
      await create.mutateAsync({
        class_id: classId,
        title: title.trim(),
        description: description.trim(),
        due_date: due ? new Date(due).toISOString() : null,
        points: Number(points) || 100,
      });
      toast.success("Assignment created!");
      setTitle("");
      setDescription("");
      setDue("");
      setPoints("100");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create assignment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero">
          <Plus className="h-4 w-4" /> New assignment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New assignment</DialogTitle>
        </DialogHeader>
        {!myClasses.length ? (
          <p className="py-4 text-sm text-muted-foreground">Create a class first, then add assignments to it.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {myClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="atitle">Title</Label>
              <Input id="atitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 5 worksheet" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adesc">Instructions</Label>
              <Textarea id="adesc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="adue">Due date</Label>
                <Input id="adue" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apts">Points</Label>
                <Input id="apts" value={points} onChange={(e) => setPoints(e.target.value)} inputMode="numeric" />
              </div>
            </div>
          </div>
        )}
        {!!myClasses.length && (
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="hero" onClick={submit} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
