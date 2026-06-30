CREATE POLICY "Case owner reads common ground"
ON public.common_ground_reports
FOR SELECT
TO authenticated
USING (public.is_case_owner_safe(case_id, auth.uid()));