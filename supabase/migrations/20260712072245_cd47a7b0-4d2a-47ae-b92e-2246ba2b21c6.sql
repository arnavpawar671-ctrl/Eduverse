-- Helper: generate a unique-ish join code
CREATE OR REPLACE FUNCTION public.gen_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============ CLASSES ============
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text,
  description text,
  color text NOT NULL DEFAULT 'from-[#4a90e2] to-[#7b61ff]',
  join_code text NOT NULL UNIQUE DEFAULT public.gen_join_code(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;

-- ============ ENROLLMENTS ============
CREATE TABLE public.class_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_enrollments TO authenticated;
GRANT ALL ON public.class_enrollments TO service_role;

-- ============ ASSIGNMENTS ============
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  points integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;

-- ============ SUBMISSIONS ============
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  grade integer,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;

-- ============ CALENDAR EVENTS ============
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  type text NOT NULL DEFAULT 'event',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

-- ============ SECURITY DEFINER HELPERS (avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.is_class_teacher(_class_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = _class_id AND teacher_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled(_class_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_enrollments WHERE class_id = _class_id AND student_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_assignment_teacher(_assignment_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.classes c ON c.id = a.class_id
    WHERE a.id = _assignment_id AND c.teacher_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.assignment_class_id(_assignment_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT class_id FROM public.assignments WHERE id = _assignment_id
$$;

-- Join a class by code (security definer so students don't need to browse classes)
CREATE OR REPLACE FUNCTION public.join_class_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _class_id uuid;
BEGIN
  SELECT id INTO _class_id FROM public.classes WHERE upper(join_code) = upper(_code);
  IF _class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid class code';
  END IF;
  INSERT INTO public.class_enrollments (class_id, student_id)
  VALUES (_class_id, auth.uid())
  ON CONFLICT (class_id, student_id) DO NOTHING;
  RETURN _class_id;
END;
$$;

-- ============ RLS: CLASSES ============
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or enrolled classes" ON public.classes
FOR SELECT TO authenticated
USING (teacher_id = auth.uid() OR public.is_enrolled(id, auth.uid()));

CREATE POLICY "Teachers insert own classes" ON public.classes
FOR INSERT TO authenticated
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers update own classes" ON public.classes
FOR UPDATE TO authenticated
USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers delete own classes" ON public.classes
FOR DELETE TO authenticated
USING (teacher_id = auth.uid());

-- ============ RLS: ENROLLMENTS ============
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own enrollments or as teacher" ON public.class_enrollments
FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_class_teacher(class_id, auth.uid()));

CREATE POLICY "Students enroll themselves" ON public.class_enrollments
FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Leave class or teacher removes" ON public.class_enrollments
FOR DELETE TO authenticated
USING (student_id = auth.uid() OR public.is_class_teacher(class_id, auth.uid()));

-- ============ RLS: ASSIGNMENTS ============
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View class assignments" ON public.assignments
FOR SELECT TO authenticated
USING (public.is_class_teacher(class_id, auth.uid()) OR public.is_enrolled(class_id, auth.uid()));

CREATE POLICY "Teachers create assignments" ON public.assignments
FOR INSERT TO authenticated
WITH CHECK (teacher_id = auth.uid() AND public.is_class_teacher(class_id, auth.uid()));

CREATE POLICY "Teachers update own assignments" ON public.assignments
FOR UPDATE TO authenticated
USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers delete own assignments" ON public.assignments
FOR DELETE TO authenticated
USING (teacher_id = auth.uid());

-- ============ RLS: SUBMISSIONS ============
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own submissions or as teacher" ON public.submissions
FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_assignment_teacher(assignment_id, auth.uid()));

CREATE POLICY "Students submit their own" ON public.submissions
FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() AND public.is_enrolled(public.assignment_class_id(assignment_id), auth.uid()));

CREATE POLICY "Students edit own, teachers grade" ON public.submissions
FOR UPDATE TO authenticated
USING (student_id = auth.uid() OR public.is_assignment_teacher(assignment_id, auth.uid()))
WITH CHECK (student_id = auth.uid() OR public.is_assignment_teacher(assignment_id, auth.uid()));

CREATE POLICY "Students delete own submissions" ON public.submissions
FOR DELETE TO authenticated
USING (student_id = auth.uid());

-- ============ RLS: CALENDAR EVENTS ============
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or class events" ON public.calendar_events
FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR (class_id IS NOT NULL AND (public.is_class_teacher(class_id, auth.uid()) OR public.is_enrolled(class_id, auth.uid())))
);

CREATE POLICY "Create own events" ON public.calendar_events
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Update own events" ON public.calendar_events
FOR UPDATE TO authenticated
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Delete own events" ON public.calendar_events
FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- ============ updated_at triggers ============
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();