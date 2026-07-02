ALTER VIEW public.mediators_public SET (security_invoker = false);

DROP POLICY IF EXISTS "Public can view mediator directory" ON public.mediators;

GRANT SELECT ON public.mediators_public TO anon, authenticated;
