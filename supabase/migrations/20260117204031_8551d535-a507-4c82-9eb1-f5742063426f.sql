-- Restrict mediator access to ONLY assigned cases (admin assigns model)
-- Remove the 'mediator_id IS NULL' condition from all policies

-- Drop and recreate mediator_requests policies
DROP POLICY IF EXISTS "Mediators can view assigned or unassigned requests" ON public.mediator_requests;
DROP POLICY IF EXISTS "Mediators can update assigned or unassigned requests" ON public.mediator_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.mediator_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.mediator_requests;

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.mediator_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own requests  
CREATE POLICY "Users can update their own requests"
ON public.mediator_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Mediators can ONLY view requests assigned to them
CREATE POLICY "Mediators can view assigned requests only"
ON public.mediator_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'mediator'::app_role) 
  AND mediator_id = auth.uid()
);

-- Mediators can ONLY update requests assigned to them
CREATE POLICY "Mediators can update assigned requests only"
ON public.mediator_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'mediator'::app_role) 
  AND mediator_id = auth.uid()
);

-- Drop and recreate cases policy
DROP POLICY IF EXISTS "Mediators can view cases with assigned requests" ON public.cases;
DROP POLICY IF EXISTS "Users can view their own cases" ON public.cases;

-- Users can view their own cases
CREATE POLICY "Users can view their own cases"
ON public.cases
FOR SELECT
USING (auth.uid() = user_id);

-- Mediators can ONLY view cases with requests assigned to them
CREATE POLICY "Mediators can view assigned cases only"
ON public.cases
FOR SELECT
USING (
  has_role(auth.uid(), 'mediator'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.mediator_requests mr 
    WHERE mr.case_id = cases.id 
    AND mr.mediator_id = auth.uid()
  )
);

-- Drop and recreate profiles policy for mediators
DROP POLICY IF EXISTS "Mediators can view profiles for assigned cases" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Mediators can ONLY view profiles for cases assigned to them
CREATE POLICY "Mediators can view profiles for assigned cases only"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'mediator'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.mediator_requests mr 
    WHERE mr.user_id = profiles.user_id 
    AND mr.mediator_id = auth.uid()
  )
);

-- Create a secure function for creating notifications (for edge functions)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  IF p_title IS NULL OR LENGTH(TRIM(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  
  IF p_message IS NULL OR LENGTH(TRIM(p_message)) = 0 THEN
    RAISE EXCEPTION 'Message is required';
  END IF;
  
  -- Limit lengths
  IF LENGTH(p_title) > 200 THEN
    p_title := LEFT(p_title, 200);
  END IF;
  
  IF LENGTH(p_message) > 2000 THEN
    p_message := LEFT(p_message, 2000);
  END IF;
  
  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id, TRIM(p_title), TRIM(p_message), COALESCE(p_type, 'info'), p_link)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;