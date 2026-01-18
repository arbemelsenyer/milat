-- Fix RLS: Block unauthenticated access to all tables
-- The current policies only work for authenticated users, we need to ensure anonymous users are blocked

-- For profiles: ensure only authenticated users can access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mediators can view profiles for assigned cases only" ON public.profiles;
CREATE POLICY "Mediators can view profiles for assigned cases only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'mediator'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.mediator_requests mr 
    WHERE mr.user_id = profiles.user_id 
    AND mr.mediator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- For cases: ensure only authenticated users can access
DROP POLICY IF EXISTS "Users can view their own cases" ON public.cases;
CREATE POLICY "Users can view their own cases"
ON public.cases
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mediators can view assigned cases only" ON public.cases;
CREATE POLICY "Mediators can view assigned cases only"
ON public.cases
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'mediator'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.mediator_requests mr 
    WHERE mr.case_id = cases.id 
    AND mr.mediator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all cases" ON public.cases;
CREATE POLICY "Admins can view all cases"
ON public.cases
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- For mediator_requests: ensure only authenticated users can access
DROP POLICY IF EXISTS "Users can view their own requests" ON public.mediator_requests;
CREATE POLICY "Users can view their own requests"
ON public.mediator_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mediators can view assigned requests only" ON public.mediator_requests;
CREATE POLICY "Mediators can view assigned requests only"
ON public.mediator_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'mediator'::app_role) 
  AND mediator_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can view all requests" ON public.mediator_requests;
CREATE POLICY "Admins can view all requests"
ON public.mediator_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- For notifications: ensure only authenticated users can access
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- For user_roles: ensure only authenticated users can access
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert and delete user roles (for role management)
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));