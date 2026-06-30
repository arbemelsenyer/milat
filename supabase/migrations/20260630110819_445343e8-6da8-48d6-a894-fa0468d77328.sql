DROP POLICY IF EXISTS "Mediators can view profiles for assigned cases only" ON public.profiles;

CREATE POLICY "Mediators can view profiles for assigned cases only"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'mediator'::app_role)
  AND (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.assigned_mediator_id = auth.uid()
        AND (c.user_id = profiles.user_id
             OR EXISTS (SELECT 1 FROM public.case_parties cp WHERE cp.case_id = c.id AND cp.user_id = profiles.user_id))
    )
    OR EXISTS (
      SELECT 1 FROM public.mediator_requests mr
      WHERE mr.mediator_id = auth.uid()
        AND mr.user_id = profiles.user_id
        AND mr.status IN ('accepted','active')
    )
  )
);