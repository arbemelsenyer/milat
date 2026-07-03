-- Drop the previous permissive "false" policy which did not actually block anything.
DROP POLICY IF EXISTS "Prevent direct role inserts" ON public.user_roles;

-- Add a RESTRICTIVE policy: authenticated users can never directly insert into user_roles.
-- Admins keep their existing PERMISSIVE insert policy; the handle_new_user trigger runs as
-- SECURITY DEFINER (bypasses RLS), and edge functions using service_role also bypass RLS.
CREATE POLICY "Block direct role inserts by non-admins"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));