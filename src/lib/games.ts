import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

/* ============ Quizzes ============ */
export type QuizQuestion = { q: string; options: string[]; answer: number; explain?: string };
export type QuizRow = {
  id: string; class_id: string | null; owner_id: string; title: string;
  topic: string | null; questions: QuizQuestion[]; created_at: string;
};

export function useQuizzes() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["quizzes", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<QuizRow[]> => {
      const { data, error } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as QuizRow[];
    },
  });
}

export function useCreateQuiz() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; topic: string; class_id: string | null; questions: QuizQuestion[] }) => {
      const { data, error } = await supabase.from("quizzes").insert({
        owner_id: user!.id, title: input.title, topic: input.topic, class_id: input.class_id, questions: input.questions,
      }).select().single();
      if (error) throw error;
      return data as QuizRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useDeleteQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });
}

export function useSubmitQuizAttempt() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { quiz_id: string; answers: number[]; score: number; total: number }) => {
      const { error } = await supabase.from("quiz_attempts").insert({
        quiz_id: input.quiz_id, user_id: user!.id, answers: input.answers, score: input.score, total: input.total,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["quiz_attempts"] });
    },
  });
}

export function useQuizAttempts(quiz_id?: string) {
  const { user } = useSession();
  return useQuery({
    queryKey: ["quiz_attempts", quiz_id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase.from("quiz_attempts").select("*").order("created_at", { ascending: false });
      if (quiz_id) q = q.eq("quiz_id", quiz_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id: string; quiz_id: string; score: number; total: number; created_at: string }[];
    },
  });
}

/* ============ Flashcards ============ */
export type Flashcard = { front: string; back: string };
export type DeckRow = {
  id: string; owner_id: string; class_id: string | null; title: string;
  topic: string | null; cards: Flashcard[]; created_at: string;
};

export function useDecks() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["decks", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<DeckRow[]> => {
      const { data, error } = await supabase.from("flashcard_decks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeckRow[];
    },
  });
}
export function useCreateDeck() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; topic: string; class_id: string | null; cards: Flashcard[] }) => {
      const { error } = await supabase.from("flashcard_decks").insert({
        owner_id: user!.id, title: input.title, topic: input.topic, class_id: input.class_id, cards: input.cards,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decks"] }),
  });
}
export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flashcard_decks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decks"] }),
  });
}

/* ============ Live meetings ============ */
export type MeetingRow = {
  id: string; class_id: string; teacher_id: string; title: string;
  room_name: string; started_at: string; ended_at: string | null;
};

export function useMeetings() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["meetings", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MeetingRow[]> => {
      const { data, error } = await supabase.from("live_meetings").select("*").order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MeetingRow[];
    },
  });
}

export function useStartMeeting() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { class_id: string; title: string }) => {
      const room = `eduverse-${input.class_id.slice(0, 8)}-${Date.now().toString(36)}`;
      const { data, error } = await supabase.from("live_meetings").insert({
        class_id: input.class_id, teacher_id: user!.id, title: input.title, room_name: room,
      }).select().single();
      if (error) throw error;
      return data as MeetingRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useEndMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("live_meetings").update({ ended_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

/* ============ Leaderboard ============ */
export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, xp, coins, streak")
        .order("xp", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as { id: string; full_name: string | null; avatar_url: string | null; xp: number; coins: number; streak: number }[];
    },
  });
}
