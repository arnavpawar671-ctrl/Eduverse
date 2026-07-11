import { createFileRoute } from "@tanstack/react-router";
import { Search, Mail, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — EduVerse" }] }),
  component: StudentsPage,
});

const STUDENTS = [
  { name: "Arnav Sharma", class: "10-A", attendance: 96, avg: 88, trend: "up" },
  { name: "Priya Nair", class: "10-A", attendance: 92, avg: 91, trend: "up" },
  { name: "Rohan Gupta", class: "9-B", attendance: 78, avg: 64, trend: "down" },
  { name: "Sara Ali", class: "11-C", attendance: 99, avg: 94, trend: "up" },
  { name: "Kabir Singh", class: "9-B", attendance: 84, avg: 71, trend: "down" },
  { name: "Meera Joshi", class: "11-C", attendance: 95, avg: 86, trend: "up" },
];

function StudentsPage() {
  const [q, setQ] = useState("");
  const filtered = STUDENTS.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Students" subtitle="Manage and track your students' progress." />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" className="pl-9" />
      </div>

      <div className="grid gap-3">
        {filtered.map((s) => (
          <Card key={s.name} className="flex flex-wrap items-center gap-4 rounded-2xl border-border p-4 shadow-soft">
            <Avatar className="h-11 w-11">
              <AvatarFallback className="bg-brand-soft text-primary text-sm font-semibold">
                {s.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-[140px] flex-1">
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">Class {s.class}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{s.attendance}%</p>
              <p className="text-[11px] text-muted-foreground">Attendance</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="text-center">
                <p className="text-sm font-semibold">{s.avg}%</p>
                <p className="text-[11px] text-muted-foreground">Avg. marks</p>
              </div>
              {s.trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-primary">
              <Mail className="h-4 w-4" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
