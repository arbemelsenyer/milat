-- Tighten mediator access: only view/update assigned or unassigned requests

-- Drop existing mediator policies on mediator_requests
DROP POLICY IF EXISTS "Mediators can view all requests" ON public.mediator_requests;
DROP POLICY IF EXISTS "Mediators can update requests" ON public.mediator_requests;

-- New policy: Mediators can only view requests assigned to them or unassigned
CREATE POLICY "Mediators can view assigned or unassigned requests"
ON public.mediator_requests
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    has_role(auth.uid(), 'mediator'::app_role) 
    AND (mediator_id = auth.uid() OR mediator_id IS NULL)
  )
);

-- New policy: Mediators can only update requests assigned to them or unassigned
CREATE POLICY "Mediators can update assigned or unassigned requests"
ON public.mediator_requests
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (
    has_role(auth.uid(), 'mediator'::app_role) 
    AND (mediator_id = auth.uid() OR mediator_id IS NULL)
  )
);

-- Drop existing mediator policy on cases
DROP POLICY IF EXISTS "Mediators can view all cases" ON public.cases;

-- New policy: Mediators can only view cases with requests assigned to them
CREATE POLICY "Mediators can view cases with assigned requests"
ON public.cases
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    has_role(auth.uid(), 'mediator'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.mediator_requests mr 
      WHERE mr.case_id = cases.id 
      AND (mr.mediator_id = auth.uid() OR mr.mediator_id IS NULL)
    )
  )
);

-- Add policy for mediators to view profiles of users with assigned cases
CREATE POLICY "Mediators can view profiles for assigned cases"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    has_role(auth.uid(), 'mediator'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.mediator_requests mr 
      WHERE mr.user_id = profiles.user_id 
      AND (mr.mediator_id = auth.uid() OR mr.mediator_id IS NULL)
    )
  )
);