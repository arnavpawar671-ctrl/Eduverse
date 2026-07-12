import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  PartyPopper,
  BookOpen,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard-bits";
import { useCalendarEvents, useCreateEvent, useDeleteEvent, type CalendarEventRow } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — EduVerse" }] }),
  component: CalendarPage,
});

const TYPES: Record<string, { tone: string; icon: typeof BookOpen }> = {
  class: { tone: "bg-primary/10 text-primary", icon: BookOpen },
  assignment: { tone: "bg-warning/10 text-warning", icon: ClipboardList },
  exam: { tone: "bg-destructive/10 text-destructive", icon: GraduationCap },
  event: { tone: "bg-secondary/10 text-secondary", icon: PartyPopper },
};

function CalendarPage() {
  const { data: events, isLoading } = useCalendarEvents();
  const del = useDeleteEvent();

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Upcoming classes, assignments, exams and events."
        action={<CreateEventDialog />}
      />

      {isLoading ? (
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !events?.length ? (
        <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl border-dashed border-border p-12 text-center shadow-soft">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <CalendarDays className="h-6 w-6" />
          </span>
          <p className="font-semibold">No events yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">Add your first event to keep track of your schedule.</p>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border p-2 shadow-soft">
          <ul>
            {events.map((e) => (
              <EventRow key={e.id} e={e} onDelete={() => del.mutate(e.id)} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function EventRow({ e, onDelete }: { e: CalendarEventRow; onDelete: () => void }) {
  const meta = TYPES[e.type] ?? TYPES.event;
  const d = new Date(e.event_date);
  const day = d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const date = d.getDate();
  return (
    <li className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-accent">
      <div className="flex w-12 flex-col items-center rounded-xl bg-muted py-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground">{day}</span>
        <span className="text-lg font-bold leading-none">{date}</span>
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.tone}`}>
        <meta.icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{e.title}</p>
        <p className="text-xs capitalize text-muted-foreground">
          {e.type}
          {e.description ? ` · ${e.description}` : ""}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="text-muted-foreground transition-colors hover:text-destructive"
        aria-label="Delete event"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function CreateEventDialog() {
  const create = useCreateEvent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("event");
  const [description, setDescription] = useState("");

  async function submit() {
    if (!title.trim()) return toast.error("Title is required");
    if (!date) return toast.error("Pick a date");
    try {
      await create.mutateAsync({
        title: title.trim(),
        event_date: new Date(date).toISOString(),
        type,
        description: description.trim(),
      });
      toast.success("Event added!");
      setTitle("");
      setDate("");
      setType("event");
      setDescription("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add event");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero">
          <Plus className="h-4 w-4" /> Add event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="etitle">Title</Label>
            <Input id="etitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Physics mid-term" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edate">Date &amp; time</Label>
              <Input id="edate" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edesc">Note (optional)</Label>
            <Input id="edesc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="hero" onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
