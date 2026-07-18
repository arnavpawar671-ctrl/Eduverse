
-- Files are stored under {class_id}/{filename}
CREATE POLICY "Materials read: enrolled or teacher"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'materials'
  AND (
    public.is_class_teacher((split_part(name,'/',1))::uuid, auth.uid())
    OR public.is_enrolled((split_part(name,'/',1))::uuid, auth.uid())
  )
);

CREATE POLICY "Materials write: class teacher"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'materials'
  AND public.is_class_teacher((split_part(name,'/',1))::uuid, auth.uid())
);

CREATE POLICY "Materials update: class teacher"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'materials' AND public.is_class_teacher((split_part(name,'/',1))::uuid, auth.uid()));

CREATE POLICY "Materials delete: class teacher"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'materials' AND public.is_class_teacher((split_part(name,'/',1))::uuid, auth.uid()));
