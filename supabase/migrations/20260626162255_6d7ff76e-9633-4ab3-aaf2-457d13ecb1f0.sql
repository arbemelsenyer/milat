-- Allow case owners (cases.user_id) to insert and view their case documents
CREATE POLICY "Case owner uploads docs"
ON public.case_documents
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.is_case_owner_safe(case_id, auth.uid())
);

CREATE POLICY "Case owner sees own uploads"
ON public.case_documents
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  AND public.is_case_owner_safe(case_id, auth.uid())
);