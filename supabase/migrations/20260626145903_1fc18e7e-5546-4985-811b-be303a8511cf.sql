
DROP POLICY IF EXISTS "Experts viewable by authenticated" ON public.experts;
CREATE POLICY "Experts viewable by mediators and admins"
  ON public.experts FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'mediator'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
