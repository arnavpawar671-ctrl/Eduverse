import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Trash2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useDecks, useCreateDeck, useDeleteDeck, type DeckRow } from "@/lib/games";
import { generateFlashcards } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({ meta: [{ title: "Flashcards — EduVerse" }] }),
  component: DecksPage,
});

function DecksPage() {
  const { data: decks } = useDecks();
  const [study, setStudy] = useState<DeckRow | null>(null);
  return (
    <div>
      <PageHeader title="Flashcards" subtitle="AI-crafted decks for quick memorization." actions={<CreateDeck />} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {decks?.map((d) => (
          <DeckCard key={d.id} d={d} onStudy={() => setStudy(d)} />
        ))}
        {decks?.length === 0 && <Card className="col-span-full p-8 text-center text-muted-foreground">No decks yet.</Card>}
      </div>
      {study && <StudyDialog deck={study} onClose={() => setStudy(null)} />}
    </div>
  );
}

function DeckCard({ d, onStudy }: { d: DeckRow; onStudy: () => void }) {
  const del = useDeleteDeck();
  return (
    <Card className="rounded-2xl border-border p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{d.title}</h3>
          {d.topic && <p className="text-xs text-muted-foreground">{d.topic}</p>}
        </div>
        <Button size="icon" variant="ghost" onClick={() => del.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{d.cards.length} cards</p>
      <Button className="mt-4 w-full" onClick={onStudy}>Study</Button>
    </Card>
  );
}

function CreateDeck() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const gen = useServerFn(generateFlashcards);
  const create = useCreateDeck();

  async function submit() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const { cards } = await gen({ data: { topic, count } });
      if (!cards.length) throw new Error("AI returned no cards");
      await create.mutateAsync({ title: topic, topic, class_id: null, cards });
      toast.success("Deck created!");
      setOpen(false); setTopic("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full"><Sparkles className="mr-2 h-4 w-4" /> Generate deck</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate flashcards with AI</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Topic</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Spanish greetings" /></div>
          <div><Label>Card count</Label><Input type="number" min={4} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={loading}>{loading ? "Generating…" : "Generate"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudyDialog({ deck, onClose }: { deck: DeckRow; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = deck.cards[i];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{deck.title}</DialogTitle></DialogHeader>
        <div
          className="flex min-h-56 cursor-pointer items-center justify-center rounded-2xl bg-brand-soft p-8 text-center text-lg font-medium shadow-soft"
          onClick={() => setFlipped((f) => !f)}
        >
          {flipped ? card?.back : card?.front}
        </div>
        <p className="text-center text-xs text-muted-foreground">Tap card to flip · {i + 1} / {deck.cards.length}</p>
        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={() => { setI((i - 1 + deck.cards.length) % deck.cards.length); setFlipped(false); }}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setFlipped(false)}><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { setI((i + 1) % deck.cards.length); setFlipped(false); }}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
