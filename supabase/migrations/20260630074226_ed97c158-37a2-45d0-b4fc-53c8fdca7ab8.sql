
-- 1) Revoke anon EXECUTE on SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.is_case_mediator(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_case_owner_safe(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_case_party(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_case_mediator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_case_owner_safe(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_case_party(uuid, uuid) TO authenticated, service_role;

-- 2) Pin search_path on generate_application_no
ALTER FUNCTION public.generate_application_no() SET search_path = public;

-- 3) Restrict experts SELECT to admins and mediators actually assigned to a case using that expert
DROP POLICY IF EXISTS "Experts viewable by mediators and admins" ON public.experts;

CREATE POLICY "Admins view all experts"
ON public.experts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Assigned mediators view experts on their cases"
ON public.experts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.case_expert_assignments cea
    JOIN public.cases c ON c.id = cea.case_id
    WHERE cea.expert_id = experts.id
      AND c.assigned_mediator_id = auth.uid()
  )
);
