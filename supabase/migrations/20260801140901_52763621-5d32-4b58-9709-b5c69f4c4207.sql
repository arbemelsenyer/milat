DROP POLICY IF EXISTS "Case documents read - current case access only" ON storage.objects;

CREATE POLICY "Case documents read - current case access only"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'case-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] = 'admin'
      AND public.has_role(auth.uid(), 'mediator'::app_role)
    )
    OR (
      (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND public.can_access_case(((storage.foldername(name))[2])::uuid, auth.uid())
    )
  )
);