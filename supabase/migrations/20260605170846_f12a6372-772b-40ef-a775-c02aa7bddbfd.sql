
-- Helper: check if a user can access a case
CREATE OR REPLACE FUNCTION public.can_access_case(_case_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = _case_id
      AND (c.user_id = _user_id OR c.assigned_mediator_id = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.case_parties cp
    WHERE cp.case_id = _case_id AND cp.user_id = _user_id
  ) OR public.has_role(_user_id, 'admin'::app_role);
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_case(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_case(uuid, uuid) TO authenticated, service_role;

-- Tighten case-documents storage policies
DROP POLICY IF EXISTS "Users can upload case documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their case documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own case documents" ON storage.objects;

CREATE POLICY "Case participants can upload case documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND public.can_access_case(
    ((storage.foldername(name))[2])::uuid,
    auth.uid()
  )
);

CREATE POLICY "Case participants can read case documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'case-documents'
  AND public.can_access_case(
    ((storage.foldername(name))[2])::uuid,
    auth.uid()
  )
);

CREATE POLICY "Uploaders can delete their case documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'case-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Hide sensitive "reason" by removing broad-access policy on mediator_blocked_dates.
-- It was unused by app code (only the owning mediator reads their own rows).
DROP POLICY IF EXISTS "Users can view mediator blocked dates for scheduling" ON public.mediator_blocked_dates;

-- Lock down SECURITY DEFINER functions: revoke broad EXECUTE.
-- They remain callable internally by RLS, triggers, and the service_role used in edge functions.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
