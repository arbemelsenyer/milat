
-- Fix 1: cases_private_keys — mediators can INSERT but couldn't SELECT their own writes. Add mediator to SELECT.
DROP POLICY IF EXISTS "cpk select owner or admin" ON public.cases_private_keys;
CREATE POLICY "cpk select owner mediator admin"
  ON public.cases_private_keys
  FOR SELECT
  TO authenticated
  USING (
    public.is_case_owner_safe(case_id, auth.uid())
    OR public.is_case_mediator(case_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix 2: mediator_availability — tighten role scope from {public} to {authenticated}.
DROP POLICY IF EXISTS "Admins can view all availability" ON public.mediator_availability;
CREATE POLICY "Admins can view all availability"
  ON public.mediator_availability FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Mediators can view their own availability" ON public.mediator_availability;
CREATE POLICY "Mediators can view their own availability"
  ON public.mediator_availability FOR SELECT TO authenticated
  USING (auth.uid() = mediator_id);

DROP POLICY IF EXISTS "Mediators can insert their own availability" ON public.mediator_availability;
CREATE POLICY "Mediators can insert their own availability"
  ON public.mediator_availability FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = mediator_id) AND public.has_role(auth.uid(), 'mediator'::app_role));

DROP POLICY IF EXISTS "Mediators can update their own availability" ON public.mediator_availability;
CREATE POLICY "Mediators can update their own availability"
  ON public.mediator_availability FOR UPDATE TO authenticated
  USING ((auth.uid() = mediator_id) AND public.has_role(auth.uid(), 'mediator'::app_role));

DROP POLICY IF EXISTS "Mediators can delete their own availability" ON public.mediator_availability;
CREATE POLICY "Mediators can delete their own availability"
  ON public.mediator_availability FOR DELETE TO authenticated
  USING ((auth.uid() = mediator_id) AND public.has_role(auth.uid(), 'mediator'::app_role));
