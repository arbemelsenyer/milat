
-- Restrict base-table SELECT so hourly_rate is not exposed to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view mediators" ON public.mediators;
REVOKE SELECT ON public.mediators FROM anon;

CREATE POLICY "Admins and self can view mediators (with rates)"
  ON public.mediators FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

-- Public directory view without sensitive hourly_rate
CREATE OR REPLACE VIEW public.mediators_public
WITH (security_invoker = off) AS
SELECT id, user_id, full_name, photo_url, specializations, total_cases,
       success_rate, avg_resolution_days, languages, bio, rating,
       is_available, city, created_at, updated_at
FROM public.mediators;

GRANT SELECT ON public.mediators_public TO authenticated, anon;
