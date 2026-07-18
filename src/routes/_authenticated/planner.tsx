import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Target, Sparkles, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { generateStudyPlan } from "@/lib/planner.functions";
import { useStudyPlans, useDeleteStudyPlan } from "@/lib/features";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "AI Study Planner — EduVerse" }] }),
  component: PlannerPage,
});

function PlannerPage() {
  const { data: plans, isLoading } = useStudyPlans();
  const del = useDeleteStudyPlan();
  const gen = useServerFn(generateStudyPlan);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [goals, setGoals] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !goals.trim()) return toast.error("Title and goals required");
    setBusy(true);
    try {
      await gen({ data: { title: title.trim(), goals: goals.trim(), days } });
      toast.success("Study plan created!");
      setTitle(""); setGoals("");
      qc.invalidateQueries({ queryKey: ["study_plans"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="AI Study Planner" subtitle="Turn your goals into a day-by-day plan." />
      <Card className="mb-6 rounded-2xl border-border p-5 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Plan title</Label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Prepare for calculus final" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Your goals</Label>
            <Textarea rows={3} value={goals} onChange={(e)=>setGoals(e.target.value)}
              placeholder="I want to master derivatives, integrals, and practice past exam questions." />
          </div>
          <div className="space-y-2">
            <Label>Days</Label>
            <Input type="number" min={1} max={30} value={days} onChange={(e)=>setDays(Number(e.target.value)||7)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="hero" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate plan
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : !plans?.length ? (
        <Card className="flex flex-col items-center gap-2 rounded-2xl border-dashed p-12 text-center">
          <Target className="h-8 w-8 text-primary" />
          <p className="font-semibold">No plans yet</p>
          <p className="text-sm text-muted-foreground">Describe your goals above and let AI plan your week.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((p) => (
            <Card key={p.id} className="rounded-2xl border-border p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {p.plan?.summary && <p className="mt-2 text-sm text-muted-foreground">{p.plan.summary}</p>}
              {p.plan?.days && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {p.plan.days.map((d, i) => (
                    <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">{d.day}</p>
                      <p className="text-sm font-semibold">{d.focus}</p>
                      <ul className="mt-2 space-y-1">
                        {d.tasks?.map((t, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
