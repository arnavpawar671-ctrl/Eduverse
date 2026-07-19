import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const QuizInput = z.object({
  topic: z.string().min(2).max(200),
  count: z.number().int().min(3).max(15).default(6),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

const FlashInput = z.object({
  topic: z.string().min(2).max(200),
  count: z.number().int().min(4).max(30).default(10),
});

async function callAI(system: string, user: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("AI is busy. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) throw new Error(`AI failed (${res.status})`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = j.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(text); } catch { return {}; }
}

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => QuizInput.parse(i))
  .handler(async ({ data }) => {
    const out = await callAI(
      "You generate multiple-choice quizzes. Reply with valid JSON only.",
      `Topic: ${data.topic}. Difficulty: ${data.difficulty}. Create ${data.count} MCQs.
Return JSON: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"explain":"..."}]}. answer is a 0-3 index.`,
    );
    const questions = Array.isArray((out as { questions?: unknown[] }).questions)
      ? ((out as { questions: unknown[] }).questions as Array<{
          q: string; options: string[]; answer: number; explain?: string;
        }>)
      : [];
    return { questions };
  });

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => FlashInput.parse(i))
  .handler(async ({ data }) => {
    const out = await callAI(
      "You generate study flashcards. Reply with valid JSON only.",
      `Topic: ${data.topic}. Create ${data.count} concise flashcards.
Return JSON: {"cards":[{"front":"question or term","back":"answer or definition"}]}`,
    );
    const cards = Array.isArray((out as { cards?: unknown[] }).cards)
      ? ((out as { cards: unknown[] }).cards as Array<{ front: string; back: string }>)
      : [];
    return { cards };
  });
