-- Add admin RLS policies for full access to manage assignments

-- Admins can view all mediator_requests
CREATE POLICY "Admins can view all requests"
ON public.mediator_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all mediator_requests (to assign mediators)
CREATE POLICY "Admins can update all requests"
ON public.mediator_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all cases
CREATE POLICY "Admins can view all cases"
ON public.cases
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all user_roles (to see mediator list)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));