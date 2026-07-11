import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, GraduationCap, PartyPopper, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — EduVerse" }] }),
  component: CalendarPage,
});

const EVENTS = [
  { day: "MON", date: "13", title: "Mathematics — Quadratic Equations", type: "Class", tone: "primary", icon: BookOpen },
  { day: "TUE", date: "14", title: "History Essay due", type: "Assignment", tone: "warning", icon: ClipboardList },
  { day: "THU", date: "16", title: "Physics Mid-term Exam", type: "Exam", tone: "destructive", icon: GraduationCap },
  { day: "FRI", date: "17", title: "Science Fair", type: "Event", tone: "secondary", icon: PartyPopper },
  { day: "MON", date: "20", title: "Biology Lab Report due", type: "Assignment", tone: "warning", icon: ClipboardList },
];

const toneCls: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

function CalendarPage() {
  return (
    <div>
      <PageHeader title="Calendar" subtitle="Upcoming classes, assignments, exams and events." />
      <Card className="rounded-2xl border-border p-2 shadow-soft">
        <ul>
          {EVENTS.map((e, i) => (
            <li
              key={i}
              className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-accent"
            >
              <div className="flex w-12 flex-col items-center rounded-xl bg-muted py-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground">{e.day}</span>
                <span className="text-lg font-bold leading-none">{e.date}</span>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneCls[e.tone]}`}>
                <e.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.type}</p>
              </div>
              <CalendarDays className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
