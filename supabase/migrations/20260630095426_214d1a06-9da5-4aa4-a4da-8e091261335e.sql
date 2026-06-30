DROP POLICY IF EXISTS "Users can delete their own documents" ON public.case_documents;
CREATE POLICY "Users can delete their own documents" ON public.case_documents
  FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by AND public.can_access_case(case_id, auth.uid()));