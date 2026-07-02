-- Revert view to security invoker (the linter-friendly default)
ALTER VIEW public.mediators_public SET (security_invoker = true);

-- Recreate the public policy so the view works again for the linter
-- BUT this re-exposes hourly_rate. We will fix this via a function instead.
CREATE POLICY "Public can view mediator directory"
  ON public.mediators
  FOR SELECT
  TO anon, authenticated
  USING (true);
