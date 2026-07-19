-- Quizzes
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz owner all" ON public.quizzes FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "quiz class members read" ON public.quizzes FOR SELECT TO authenticated
  USING (class_id IS NULL OR public.is_enrolled(class_id, auth.uid()) OR public.is_class_teacher(class_id, auth.uid()));

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempt self all" ON public.quiz_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Flashcard decks
CREATE TABLE public.flashcard_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_decks TO authenticated;
GRANT ALL ON public.flashcard_decks TO service_role;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deck owner all" ON public.flashcard_decks FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "deck class members read" ON public.flashcard_decks FOR SELECT TO authenticated
  USING (class_id IS NOT NULL AND (public.is_enrolled(class_id, auth.uid()) OR public.is_class_teacher(class_id, auth.uid())));

-- Live meetings
CREATE TABLE public.live_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  room_name text NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_meetings TO authenticated;
GRANT ALL ON public.live_meetings TO service_role;
ALTER TABLE public.live_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting teacher all" ON public.live_meetings FOR ALL TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "meeting class members read" ON public.live_meetings FOR SELECT TO authenticated
  USING (public.is_enrolled(class_id, auth.uid()) OR public.is_class_teacher(class_id, auth.uid()));

-- Leaderboard view (public read of xp/coins/streak from profiles)
-- Already: profiles has a SELECT policy. Nothing needed.

-- Award XP function used by triggers
CREATE OR REPLACE FUNCTION public.award_xp(_user_id uuid, _amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET xp = COALESCE(xp,0) + _amount,
      coins = COALESCE(coins,0) + GREATEST(1, _amount / 10)
  WHERE id = _user_id;
END; $$;

-- Award XP on quiz attempt
CREATE OR REPLACE FUNCTION public.on_quiz_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, GREATEST(5, NEW.score * 5));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_quiz_xp AFTER INSERT ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.on_quiz_attempt();

-- Award XP on graded submission
CREATE OR REPLACE FUNCTION public.on_graded_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.grade IS NOT NULL AND (OLD.grade IS DISTINCT FROM NEW.grade) THEN
    PERFORM public.award_xp(NEW.student_id, GREATEST(10, NEW.grade));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_graded_xp AFTER UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.on_graded_xp();