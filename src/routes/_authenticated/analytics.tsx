import { createFileRoute } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Users, Percent, Star, ClipboardCheck } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — EduVerse" }] }),
  component: AnalyticsPage,
});

const marks = [
  { m: "Aug", avg: 72 },
  { m: "Sep", avg: 76 },
  { m: "Oct", avg: 74 },
  { m: "Nov", avg: 81 },
  { m: "Dec", avg: 85 },
  { m: "Jan", avg: 88 },
];

const classPerf = [
  { c: "10-A", score: 88 },
  { c: "9-B", score: 74 },
  { c: "11-C", score: 91 },
  { c: "12-A", score: 82 },
];

function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Class performance and engagement at a glance." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={142} icon={Users} tone="primary" />
        <StatCard label="Avg. marks" value="83%" icon={Star} tone="success" />
        <StatCard label="Attendance" value="91%" icon={Percent} tone="secondary" />
        <StatCard label="Completion" value="87%" icon={ClipboardCheck} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border p-5 shadow-soft">
          <h3 className="mb-4 font-semibold">Average marks trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marks} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a90e2" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#4a90e2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="m" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                  }}
                />
                <Area type="monotone" dataKey="avg" stroke="#4a90e2" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl border-border p-5 shadow-soft">
          <h3 className="mb-4 font-semibold">Class performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classPerf} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="c" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="score" fill="#7b61ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
