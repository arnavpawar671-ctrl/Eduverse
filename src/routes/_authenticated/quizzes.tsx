import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Trash2, Play, Check, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClasses } from "@/lib/data";
import { useQuizzes, useCreateQuiz, useDeleteQuiz, useSubmitQuizAttempt, type QuizRow, type QuizQuestion } from "@/lib/games";
import { generateQuiz } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/quizzes")({
  head: () => ({ meta: [{ title: "Quizzes — EduVerse" }] }),
  component: QuizzesPage,
});

function QuizzesPage() {
  const { data: quizzes } = useQuizzes();
  const [taking, setTaking] = useState<QuizRow | null>(null);

  return (
    <div>
      <PageHeader
        title="Quizzes"
        subtitle="AI-generated quizzes. Take them to earn XP."
        actions={<CreateQuiz />}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quizzes?.map((q) => (
          <QuizCard key={q.id} q={q} onTake={() => setTaking(q)} />
        ))}
        {quizzes?.length === 0 && (
          <Card className="col-span-full p-8 text-center text-muted-foreground">
            No quizzes yet. Create one with AI!
          </Card>
        )}
      </div>
      {taking && <TakeQuizDialog quiz={taking} onClose={() => setTaking(null)} />}
    </div>
  );
}

function QuizCard({ q, onTake }: { q: QuizRow; onTake: () => void }) {
  const del = useDeleteQuiz();
  return (
    <Card className="rounded-2xl border-border p-5 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{q.title}</h3>
          {q.topic && <p className="text-xs text-muted-foreground">{q.topic}</p>}
        </div>
        <Button size="icon" variant="ghost" onClick={() => del.mutate(q.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{q.questions.length} questions</p>
      <Button className="mt-4 w-full" onClick={onTake}><Play className="mr-2 h-4 w-4" /> Take quiz</Button>
    </Card>
  );
}

function CreateQuiz() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(6);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [classId, setClassId] = useState<string>("none");
  const [loading, setLoading] = useState(false);
  const { data: classes } = useClasses();
  const create = useCreateQuiz();
  const gen = useServerFn(generateQuiz);

  async function submit() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const { questions } = await gen({ data: { topic, count, difficulty } });
      if (!questions.length) throw new Error("AI returned no questions");
      await create.mutateAsync({
        title: topic, topic,
        class_id: classId === "none" ? null : classId,
        questions,
      });
      toast.success("Quiz created!");
      setOpen(false); setTopic("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full"><Sparkles className="mr-2 h-4 w-4" /> Generate quiz</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate a quiz with AI</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Topic</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis basics" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Questions</Label><Input type="number" min={3} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
            <div><Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Class (optional)</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Personal</SelectItem>
                {classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={loading}>{loading ? "Generating…" : "Generate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TakeQuizDialog({ quiz, onClose }: { quiz: QuizRow; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const submit = useSubmitQuizAttempt();

  const q: QuizQuestion | undefined = quiz.questions[idx];
  const score = answers.reduce((s, a, i) => s + (a === quiz.questions[i]?.answer ? 1 : 0), 0);

  function pick(i: number) {
    const next = [...answers, i];
    setAnswers(next);
    if (idx + 1 >= quiz.questions.length) {
      setDone(true);
      const finalScore = next.reduce((s, a, k) => s + (a === quiz.questions[k]?.answer ? 1 : 0), 0);
      submit.mutate({ quiz_id: quiz.id, answers: next, score: finalScore, total: quiz.questions.length });
    } else setIdx(idx + 1);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{quiz.title}</DialogTitle></DialogHeader>
        {!done && q ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Question {idx + 1} of {quiz.questions.length}</p>
            <p className="font-medium">{q.q}</p>
            <div className="space-y-2">
              {q.options.map((o, i) => (
                <Button key={i} variant="outline" className="w-full justify-start" onClick={() => pick(i)}>{o}</Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="text-4xl font-bold text-gradient">{score} / {quiz.questions.length}</div>
            <p className="text-sm text-muted-foreground">+{Math.max(5, score * 5)} XP earned!</p>
            <div className="max-h-64 space-y-2 overflow-auto text-left text-sm">
              {quiz.questions.map((qq, i) => {
                const ok = answers[i] === qq.answer;
                return (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex items-start gap-2">
                      {ok ? <Check className="mt-0.5 h-4 w-4 text-success" /> : <X className="mt-0.5 h-4 w-4 text-destructive" />}
                      <div className="flex-1">
                        <p className="font-medium">{qq.q}</p>
                        <p className="text-xs text-muted-foreground">Correct: {qq.options[qq.answer]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
