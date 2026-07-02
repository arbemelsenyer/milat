
DROP POLICY IF EXISTS "Case documents read - uploader, mediator, or admin" ON storage.objects;
CREATE POLICY "Case documents read - current case access only" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND (
      public.can_access_case(((storage.foldername(name))[2])::uuid, auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

DROP POLICY IF EXISTS "Mediator can view assigned case_parties" ON public.case_parties;
CREATE POLICY "Mediator can view assigned case_parties" ON public.case_parties
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'mediator'::app_role)
    AND public.is_case_mediator(case_id, auth.uid())
  );
