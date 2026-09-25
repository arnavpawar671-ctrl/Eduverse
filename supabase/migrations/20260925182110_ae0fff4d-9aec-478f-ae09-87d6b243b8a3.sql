CREATE POLICY "Quiz attempts visible to class teacher" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_id AND q.class_id IS NOT NULL
        AND public.is_class_teacher(q.class_id, auth.uid())
    )
  );