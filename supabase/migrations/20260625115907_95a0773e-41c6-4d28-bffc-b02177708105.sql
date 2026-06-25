DROP POLICY IF EXISTS "Experts are viewable by anyone authenticated" ON public.experts;
CREATE POLICY "Experts viewable by authenticated" ON public.experts FOR SELECT TO authenticated USING (active = true);
REVOKE SELECT ON public.experts FROM anon;