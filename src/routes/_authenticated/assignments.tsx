import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Plus, Upload, CheckCircle2, Clock, AlertTriangle, Star } from "lucide-react";
import { toast } from "sonner";
import { useSession, useRole } from "@/hooks/useAuth";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({ meta: [{ title: "Assignments — EduVerse" }] }),
  component: AssignmentsPage,
});

type Status = "pending" | "submitted" | "graded" | "late";

const DATA: { title: string; subject: string; due: string; status: Status; marks?: string }[] = [
  { title: "Quadratic Equations Worksheet", subject: "Mathematics", due: "Due in 2 days", status: "pending" },
  { title: "The Industrial Revolution Essay", subject: "History", due: "Due in 4 days", status: "pending" },
  { title: "Photosynthesis Lab Report", subject: "Biology", due: "Submitted", status: "submitted" },
  { title: "Newton's Laws Quiz", subject: "Physics", due: "Graded", status: "graded", marks: "18/20" },
  { title: "Grammar Exercise 4", subject: "English", due: "Submitted 1 day late", status: "late", marks: "12/15" },
];

const META: Record<Status, { label: string; icon: typeof Clock; cls: string }> = {
  pending: { label: "Pending", icon: Clock, cls: "bg-warning/10 text-warning" },
  submitted: { label: "Submitted", icon: CheckCircle2, cls: "bg-primary/10 text-primary" },
  graded: { label: "Graded", icon: Star, cls: "bg-success/10 text-success" },
  late: { label: "Late", icon: AlertTriangle, cls: "bg-destructive/10 text-destructive" },
};

function AssignmentsPage() {
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const isTeacher = role === "teacher" || role === "admin";

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle={isTeacher ? "Create assignments and grade submissions." : "Track and submit your assignments."}
        action={
          isTeacher ? (
            <Button variant="hero" onClick={() => toast.success("Assignment builder opened")}>
              <Plus className="h-4 w-4" /> New assignment
            </Button>
          ) : undefined
        }
      />

      {isTeacher ? (
        <div className="grid gap-3">
          {DATA.map((a) => (
            <Row key={a.title} a={a} teacher />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="graded">Graded</TabsTrigger>
          </TabsList>
          {(["all", "pending", "submitted", "graded"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4 grid gap-3">
              {DATA.filter((a) => tab === "all" || a.status === tab || (tab === "submitted" && a.status === "late")).map(
                (a) => (
                  <Row key={a.title} a={a} />
                ),
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function Row({
  a,
  teacher,
}: {
  a: { title: string; subject: string; due: string; status: Status; marks?: string };
  teacher?: boolean;
}) {
  const m = META[a.status];
  return (
    <Card className="flex flex-wrap items-center gap-3 rounded-2xl border-border p-4 shadow-soft">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
        <ClipboardList className="h-5 w-5" />
      </span>
      <div className="min-w-[160px] flex-1">
        <p className="font-medium">{a.title}</p>
        <p className="text-xs text-muted-foreground">
          {a.subject} · {a.due}
        </p>
      </div>
      {a.marks && (
        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{a.marks}</span>
      )}
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${m.cls}`}>
        <m.icon className="h-3.5 w-3.5" /> {m.label}
      </span>
      {teacher ? (
        <Button variant="soft" size="sm" onClick={() => toast.info("Opening submissions…")}>
          Grade
        </Button>
      ) : a.status === "pending" ? (
        <Button size="sm" onClick={() => toast.success("Submission uploaded!")}>
          <Upload className="h-3.5 w-3.5" /> Submit
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => toast.info("Opening details…")}>
          View
        </Button>
      )}
    </Card>
  );
}
