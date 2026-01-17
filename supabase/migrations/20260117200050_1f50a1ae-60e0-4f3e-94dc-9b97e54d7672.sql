-- Add restrictive INSERT, UPDATE, and DELETE policies for user_roles table
-- Only SECURITY DEFINER functions (like handle_new_user) can modify roles

-- Prevent direct role inserts from clients
CREATE POLICY "Prevent direct role inserts"
  ON public.user_roles FOR INSERT
  WITH CHECK (false);

-- Prevent role updates from clients
CREATE POLICY "Prevent role updates"
  ON public.user_roles FOR UPDATE
  USING (false);

-- Prevent role deletions from clients
CREATE POLICY "Prevent role deletions"
  ON public.user_roles FOR DELETE
  USING (false);