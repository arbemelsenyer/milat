
DROP POLICY IF EXISTS "Uploaders can delete their case documents" ON storage.objects;
CREATE POLICY "Uploaders can delete their case documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND public.can_access_case(((storage.foldername(name))[2])::uuid, auth.uid())
  );

CREATE POLICY "Mediator can view invite logs" ON public.party_invite_logs
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));
