-- 1) experts: column-level grants exclude email/phone for authenticated; admins keep full access.
REVOKE SELECT ON public.experts FROM authenticated;
GRANT SELECT (
  id, full_name, title, specialization, niche_area, bio,
  hourly_rate, city, years_experience, rating,
  active, created_at, updated_at
) ON public.experts TO authenticated;

-- 2) mediator_availability: replace broad SELECT with scheduling-scoped policy.
DROP POLICY IF EXISTS "Users can view all mediator availability for scheduling" ON public.mediator_availability;

CREATE POLICY "Users can view availability of mediators they are scheduling with"
ON public.mediator_availability
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mediator_requests mr
    WHERE mr.mediator_id = mediator_availability.mediator_id
      AND (
        mr.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.cases c
          WHERE c.id = mr.case_id AND c.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.case_parties cp
          WHERE cp.case_id = mr.case_id AND cp.user_id = auth.uid()
        )
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.assigned_mediator_id = mediator_availability.mediator_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_parties cp
          WHERE cp.case_id = c.id AND cp.user_id = auth.uid()
        )
      )
  )
);