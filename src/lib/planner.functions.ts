import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  title: z.string().min(1).max(200),
  goals: z.string().min(3).max(2000),
  days: z.number().int().min(1).max(30).default(7),
});

const SYSTEM_PROMPT = `You are EduVerse AI Study Planner. Given a student's goals, produce a concise, realistic day-by-day study plan.
Reply ONLY with valid JSON matching:
{ "summary": string, "days": [ { "day": string, "focus": string, "tasks": [string, ...] } ] }
Keep 3-6 tasks per day. Use short imperative tasks.`;

export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured.");

    const userPrompt = `Create a ${data.days}-day study plan.
Title: ${data.title}
Goals: ${data.goals}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("AI is busy. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let plan: unknown;
    try {
      plan = JSON.parse(raw);
    } catch {
      throw new Error("AI returned invalid plan.");
    }

    const { data: row, error } = await context.supabase
      .from("study_plans")
      .insert({
        user_id: context.userId,
        title: data.title,
        goals: data.goals,
        plan: plan as never,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });
