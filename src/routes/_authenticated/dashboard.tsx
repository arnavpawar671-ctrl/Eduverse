import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardList,
  Sparkles,
  Megaphone,
  CalendarDays,
  CheckCircle2,
  Percent,
  GraduationCap,
  Users,
  FilePlus2,
  BarChart3,
  Clock,
} from "lucide-react";
import { useSession, useProfile, useRole } from "@/hooks/useAuth";
import { PageHeader, StatCard, QuickCard } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: role, isLoading } = useRole(user?.id);
  const navigate = useNavigate();
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName} 👋`}
        subtitle={
          role === "teacher"
            ? "Here's what's happening across your classes today."
            : role === "admin"
              ? "Platform overview and quick management tools."
              : "Let's keep your learning streak going today."
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : role === "teacher" || role === "admin" ? (
        <TeacherDashboard onNav={(to) => navigate({ to })} />
      ) : (
        <StudentDashboard onNav={(to) => navigate({ to })} />
      )}
    </div>
  );
}

function StudentDashboard({ onNav }: { onNav: (to: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assignments due" value={3} icon={ClipboardList} tone="warning" hint="This week" />
        <StatCard label="Completed" value={18} icon={CheckCircle2} tone="success" />
        <StatCard label="Attendance" value="94%" icon={Percent} tone="primary" />
        <StatCard label="Upcoming exams" value={2} icon={CalendarDays} tone="secondary" />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick access</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <QuickCard label="My Classes" desc="View materials" icon={BookOpen} onClick={() => onNav("/classes")} />
          <QuickCard label="Assignments" desc="Submit & track" icon={ClipboardList} onClick={() => onNav("/assignments")} />
          <QuickCard label="AI Tutor" desc="Ask anything" icon={Sparkles} onClick={() => onNav("/tutor")} />
          <QuickCard label="Calendar" desc="What's next" icon={CalendarDays} onClick={() => onNav("/calendar")} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-border p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Upcoming assignments</h3>
            <button onClick={() => onNav("/assignments")} className="text-xs font-semibold text-primary">
              View all
            </button>
          </div>
          <ul className="space-y-3">
            {[
              { t: "Algebra — Quadratic Equations", s: "Mathematics", d: "Due in 2 days", tone: "warning" },
              { t: "Essay: The Industrial Revolution", s: "History", d: "Due in 4 days", tone: "primary" },
              { t: "Lab Report — Photosynthesis", s: "Biology", d: "Due next week", tone: "secondary" },
            ].map((a) => (
              <li
                key={a.t}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-primary">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.t}</p>
                  <p className="text-xs text-muted-foreground">{a.s}</p>
                </div>
                <span className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {a.d}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="rounded-2xl border-border p-5 shadow-soft">
          <h3 className="mb-4 font-semibold">Weekly goal</h3>
          <div className="space-y-4">
            <Goal label="Study hours" value={8} target={12} tone="bg-primary" />
            <Goal label="Assignments" value={5} target={6} tone="bg-secondary" />
            <Goal label="Quizzes" value={3} target={3} tone="bg-success" />
          </div>
          <div className="mt-5 rounded-xl bg-brand-soft p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Megaphone className="h-4 w-4" /> Announcement
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mid-term exams begin next Monday. Check the calendar for your schedule.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Goal({ label, value, target, tone }: { label: string; value: number; target: number; tone: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value}/{target}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TeacherDashboard({ onNav }: { onNav: (to: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active classes" value={5} icon={BookOpen} tone="primary" />
        <StatCard label="Total students" value={142} icon={Users} tone="secondary" />
        <StatCard label="To grade" value={27} icon={ClipboardList} tone="warning" />
        <StatCard label="Avg. attendance" value="91%" icon={Percent} tone="success" />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <QuickCard label="Create Class" desc="Generate a code" icon={GraduationCap} onClick={() => onNav("/classes")} />
          <QuickCard label="New Assignment" desc="Upload & assign" icon={FilePlus2} onClick={() => onNav("/assignments")} />
          <QuickCard label="AI Exam Gen" desc="Draft a paper" icon={Sparkles} onClick={() => onNav("/tutor")} />
          <QuickCard label="Analytics" desc="Track progress" icon={BarChart3} onClick={() => onNav("/analytics")} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-border p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Needs grading</h3>
            <button onClick={() => onNav("/assignments")} className="text-xs font-semibold text-primary">
              View all
            </button>
          </div>
          <ul className="space-y-3">
            {[
              { t: "Class 10-A · Algebra Quiz", n: 24 },
              { t: "Class 9-B · History Essay", n: 18 },
              { t: "Class 11-C · Biology Lab Report", n: 21 },
            ].map((a) => (
              <li key={a.t} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{a.t}</p>
                <span className="whitespace-nowrap rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                  {a.n} submissions
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="rounded-2xl border-border p-5 shadow-soft">
          <h3 className="mb-4 font-semibold">Class performance</h3>
          <div className="space-y-4">
            <Goal label="Class 10-A" value={82} target={100} tone="bg-primary" />
            <Goal label="Class 9-B" value={74} target={100} tone="bg-secondary" />
            <Goal label="Class 11-C" value={88} target={100} tone="bg-success" />
          </div>
          <div className="mt-5 rounded-xl bg-brand-soft p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" /> AI insight
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Class 9-B is trending 8% below average on recent quizzes. Consider a revision session.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export { Progress };
