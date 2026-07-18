
-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View announcements: enrolled or teacher or global"
ON public.announcements FOR SELECT TO authenticated
USING (
  class_id IS NULL
  OR public.is_class_teacher(class_id, auth.uid())
  OR public.is_enrolled(class_id, auth.uid())
);
CREATE POLICY "Teachers post to their classes"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (class_id IS NULL AND public.has_role(auth.uid(), 'admin')
       OR class_id IS NOT NULL AND public.is_class_teacher(class_id, auth.uid()))
);
CREATE POLICY "Authors delete own announcements"
ON public.announcements FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications read" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own notifications delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());
-- Inserts happen via SECURITY DEFINER triggers/functions only

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Materials
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind text NOT NULL CHECK (kind IN ('file','link')),
  file_path text,
  url text,
  mime text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View materials in own classes" ON public.materials
  FOR SELECT TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()) OR public.is_enrolled(class_id, auth.uid()));
CREATE POLICY "Teachers add materials" ON public.materials
  FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid() AND public.is_class_teacher(class_id, auth.uid()));
CREATE POLICY "Teachers delete materials" ON public.materials
  FOR DELETE TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()));

-- Discussions
CREATE TABLE public.discussion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.discussion_messages (class_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_messages TO authenticated;
GRANT ALL ON public.discussion_messages TO service_role;
ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View class messages" ON public.discussion_messages
  FOR SELECT TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()) OR public.is_enrolled(class_id, auth.uid()));
CREATE POLICY "Post class messages" ON public.discussion_messages
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid()
    AND (public.is_class_teacher(class_id, auth.uid()) OR public.is_enrolled(class_id, auth.uid())));
CREATE POLICY "Delete own messages" ON public.discussion_messages
  FOR DELETE TO authenticated USING (author_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_messages;

-- Study plans
CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  goals text,
  plan jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own study plans" ON public.study_plans
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Notification trigger: new announcement -> notify all enrolled students (or all users if global)
CREATE OR REPLACE FUNCTION public.notify_new_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.class_id IS NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT p.id, 'announcement', NEW.title, NEW.body, '/announcements'
    FROM public.profiles p WHERE p.id <> NEW.author_id;
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT e.student_id, 'announcement', NEW.title, NEW.body, '/announcements'
    FROM public.class_enrollments e WHERE e.class_id = NEW.class_id AND e.student_id <> NEW.author_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_announcement AFTER INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.notify_new_announcement();

-- Notification trigger: new assignment -> notify enrolled students
CREATE OR REPLACE FUNCTION public.notify_new_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT e.student_id, 'assignment', 'New assignment: ' || NEW.title,
         COALESCE(NEW.description, ''), '/assignments'
  FROM public.class_enrollments e WHERE e.class_id = NEW.class_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_assignment AFTER INSERT ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_new_assignment();

-- Notification trigger: submission graded -> notify student
CREATE OR REPLACE FUNCTION public.notify_graded_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.grade IS NOT NULL AND (OLD.grade IS DISTINCT FROM NEW.grade) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.student_id, 'grade', 'Your work was graded',
            'You received ' || NEW.grade::text || ' points', '/assignments');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_graded AFTER UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_graded_submission();
