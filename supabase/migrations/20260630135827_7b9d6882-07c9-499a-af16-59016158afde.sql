
-- 1) Storage: restrict case-documents SELECT to uploader, assigned mediator, or admin
DROP POLICY IF EXISTS "Case participants can read case documents" ON storage.objects;

CREATE POLICY "Case documents read - uploader, mediator, or admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'case-documents'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_case_mediator(((storage.foldername(name))[2])::uuid, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2) Experts: remove mediator SELECT on full row (which includes email/phone)
DROP POLICY IF EXISTS "Assigned mediators view experts on their cases" ON public.experts;

-- Provide a SECURITY DEFINER RPC returning only non-PII fields for mediators with an active case
CREATE OR REPLACE FUNCTION public.list_experts_for_mediator(filter_niche text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  full_name text,
  title text,
  specialization text,
  niche_area text,
  bio text,
  hourly_rate numeric,
  city text,
  years_experience integer,
  rating numeric,
  active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.full_name, e.title, e.specialization, e.niche_area, e.bio,
         e.hourly_rate, e.city, e.years_experience, e.rating, e.active
  FROM public.experts e
  WHERE e.active = true
    AND (filter_niche IS NULL OR e.niche_area = filter_niche)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.assigned_mediator_id = auth.uid()
      )
    )
  ORDER BY e.rating DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.list_experts_for_mediator(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_experts_for_mediator(text) TO authenticated;
