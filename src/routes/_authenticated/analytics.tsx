import { createFileRoute } from "@tanstack/react-router";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Users, Star, ClipboardCheck, Trophy } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { useAssignments, useClasses } from "@/lib/data";
import { useLeaderboard } from "@/lib/games";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — EduVerse" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: assignments = [] } = useAssignments();
  const { data: classes = [] } = useClasses();
  const { data: board = [] } = useLeaderboard();

  const totalStudents = classes.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const allSubs = assignments.flatMap((a) => a.submissions);
  const graded = allSubs.filter((s) => s.grade !== null);
  const avg = graded.length ? Math.round(graded.reduce((s, g) => s + (g.grade ?? 0), 0) / graded.length) : 0;
  const completion = assignments.length && totalStudents
    ? Math.round((allSubs.length / (assignments.length * Math.max(1, totalStudents))) * 100)
    : 0;

  const classPerf = classes.map((c) => {
    const cs = assignments.filter((a) => a.class_id === c.id).flatMap((a) => a.submissions);
    const g = cs.filter((s) => s.grade !== null);
    return { c: c.name.slice(0, 12), score: g.length ? Math.round(g.reduce((s, x) => s + (x.grade ?? 0), 0) / g.length) : 0 };
  });

  // Real trend: bucket graded submissions by month
  const buckets = new Map<string, { sum: number; n: number }>();
  graded.forEach((g) => {
    const d = new Date(g.graded_at ?? g.submitted_at);
    const key = d.toLocaleString("en", { month: "short" });
    const b = buckets.get(key) ?? { sum: 0, n: 0 };
    b.sum += g.grade ?? 0; b.n += 1;
    buckets.set(key, b);
  });
  const trend = Array.from(buckets.entries()).slice(-6).map(([m, b]) => ({ m, avg: Math.round(b.sum / b.n) }));

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Real-time class performance." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={totalStudents} icon={Users} tone="primary" />
        <StatCard label="Avg. marks" value={`${avg}${graded.length ? "%" : ""}`} icon={Star} tone="success" />
        <StatCard label="Submissions" value={allSubs.length} icon={ClipboardCheck} tone="secondary" />
        <StatCard label="Top XP" value={board[0]?.xp ?? 0} icon={Trophy} tone="warning" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border p-5 shadow-soft">
          <h3 className="mb-4 font-semibold">Average marks trend</h3>
          <div className="h-64">
            {trend.length === 0 ? (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">Grade some submissions to see trends.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4a90e2" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#4a90e2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="m" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }} />
                  <Area type="monotone" dataKey="avg" stroke="#4a90e2" strokeWidth={2.5} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card className="rounded-2xl border-border p-5 shadow-soft">
          <h3 className="mb-4 font-semibold">Class performance</h3>
          <div className="h-64">
            {classPerf.length === 0 ? (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">No classes yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classPerf} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="c" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }} />
                  <Bar dataKey="score" fill="#7b61ff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Completion estimate: {completion}%</p>
    </div>
  );
}
