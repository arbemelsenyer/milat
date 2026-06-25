
REVOKE SELECT ON public.experts FROM authenticated;
GRANT SELECT (id, full_name, title, specialization, niche_area, bio, hourly_rate, city, years_experience, rating, active, created_at, updated_at) ON public.experts TO authenticated;
GRANT ALL ON public.experts TO service_role;

DROP POLICY IF EXISTS "Case participants can update case documents" ON storage.objects;
CREATE POLICY "Case participants can update case documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'case-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND can_access_case(((storage.foldername(name))[2])::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'case-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND can_access_case(((storage.foldername(name))[2])::uuid, auth.uid())
);
