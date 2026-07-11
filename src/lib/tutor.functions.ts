import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(30),
});

const SYSTEM_PROMPT = `You are EduVerse AI Tutor, a friendly and encouraging academic assistant for students and teachers.
- Explain concepts clearly, step by step, and adapt to the learner's level.
- For math and science, show the reasoning and final answer.
- For coding, give clean, commented examples.
- Offer to generate quizzes, flashcards, summaries or practice questions when helpful.
- Keep answers focused and use Markdown (headings, lists, code blocks) for readability.`;

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured. Missing LOVABLE_API_KEY.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
      }),
    });

    if (res.status === 429) {
      throw new Error("The AI Tutor is busy right now. Please try again in a moment.");
    }
    if (res.status === 402) {
      throw new Error("AI credits are exhausted. Please add credits to continue using the AI Tutor.");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}). ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim();
    return { reply: reply || "Sorry, I couldn't generate a response. Please try again." };
  });
