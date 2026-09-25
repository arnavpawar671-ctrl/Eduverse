-- Chat with your notes: store extracted text for materials
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS extracted_text text;

CREATE POLICY "Teachers update materials" ON public.materials
  FOR UPDATE TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()))
  WITH CHECK (public.is_class_teacher(class_id, auth.uid()));

-- Certificates
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('class_completion','streak','leaderboard','custom')),
  title text NOT NULL,
  description text,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, title)
);
GRANT SELECT, INSERT, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or class-teacher certificates" ON public.certificates
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (class_id IS NOT NULL AND public.is_class_teacher(class_id, auth.uid()))
  );
CREATE POLICY "Teachers award certificates" ON public.certificates
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id <> auth.uid()
    AND issued_by = auth.uid()
    AND (
      (class_id IS NULL AND public.has_role(auth.uid(), 'admin'))
      OR (class_id IS NOT NULL AND public.is_class_teacher(class_id, auth.uid()))
    )
  );
CREATE POLICY "Remove certificates" ON public.certificates
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Notify the student when a certificate is issued
CREATE OR REPLACE FUNCTION public.on_certificate_issued()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.user_id,
    'certificate',
    'Certificate awarded: ' || NEW.title,
    COALESCE(NEW.description, 'Open your profile to view and print it.'),
    '/profile'
  );
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_certificate_notify AFTER INSERT ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.on_certificate_issued();

-- Auto certificates for streak milestones
CREATE OR REPLACE FUNCTION public.on_streak_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.streak IN (7, 30, 100) AND (OLD.streak IS DISTINCT FROM NEW.streak) THEN
    INSERT INTO public.certificates (user_id, kind, title, description)
    VALUES (
      NEW.id,
      'streak',
      NEW.streak::text || '-Day Study Streak',
      'Awarded for studying ' || NEW.streak::text || ' days in a row. Keep it going!'
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_streak_cert AFTER UPDATE OF streak ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_streak_milestone();