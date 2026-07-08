-- 1) case_expert_assignments: lock writes down to mediator/admin, let parties
--    touch only their own approval status (approvals + status), nothing else.

DROP POLICY IF EXISTS "mediator inserts expert assignment" ON public.case_expert_assignments;
DROP POLICY IF EXISTS "mediator or party updates expert assignment" ON public.case_expert_assignments;
DROP POLICY IF EXISTS "mediator deletes expert assignment" ON public.case_expert_assignments;
DROP POLICY IF EXISTS "mediator or admin inserts expert assignment" ON public.case_expert_assignments;
DROP POLICY IF EXISTS "mediator or admin deletes expert assignment" ON public.case_expert_assignments;
DROP POLICY IF EXISTS "mediator, admin or party updates expert assignment" ON public.case_expert_assignments;

CREATE POLICY "mediator or admin inserts expert assignment"
  ON public.case_expert_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_case_mediator(case_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "mediator or admin deletes expert assignment"
  ON public.case_expert_assignments FOR DELETE TO authenticated
  USING (
    public.is_case_mediator(case_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Row-level RLS can't restrict which columns change, so parties are still
-- allowed to hit UPDATE here; the trigger below enforces the column/key
-- restriction (approvals + status only, and only their own approvals key).
CREATE POLICY "mediator, admin or party updates expert assignment"
  ON public.case_expert_assignments FOR UPDATE TO authenticated
  USING (
    public.is_case_mediator(case_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_case_party(case_id, auth.uid())
  )
  WITH CHECK (
    public.is_case_mediator(case_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_case_party(case_id, auth.uid())
  );

CREATE OR REPLACE FUNCTION public.enforce_case_expert_assignment_party_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_party_id uuid;
  k text;
BEGIN
  -- Mediator/admin: unrestricted.
  IF public.is_case_mediator(OLD.case_id, auth.uid())
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_case_party(OLD.case_id, auth.uid()) THEN
    RAISE EXCEPTION 'not authorized to update this expert assignment';
  END IF;

  -- Party path: only approvals/status may change, everything else is frozen.
  IF NEW.case_id IS DISTINCT FROM OLD.case_id
     OR NEW.expert_id IS DISTINCT FROM OLD.expert_id
     OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
     OR NEW.note IS DISTINCT FROM OLD.note
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'parties may only update their own approval status';
  END IF;

  -- Within approvals jsonb, a party may only write its own case_parties.id key.
  SELECT id INTO my_party_id
  FROM public.case_parties
  WHERE case_id = OLD.case_id AND user_id = auth.uid()
  LIMIT 1;

  FOR k IN
    SELECT jsonb_object_keys(OLD.approvals)
    UNION
    SELECT jsonb_object_keys(NEW.approvals)
  LOOP
    IF k IS DISTINCT FROM my_party_id::text
       AND (OLD.approvals -> k) IS DISTINCT FROM (NEW.approvals -> k) THEN
      RAISE EXCEPTION 'parties may not modify another party''s approval';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_case_expert_assignment_party_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cea_party_update_guard ON public.case_expert_assignments;
CREATE TRIGGER trg_cea_party_update_guard
  BEFORE UPDATE ON public.case_expert_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_case_expert_assignment_party_update();

-- 2) case_process_tracker: Süreç Takip Çizelgesi state, mediator/admin only.

CREATE TABLE IF NOT EXISTS public.case_process_tracker (
  case_id uuid PRIMARY KEY REFERENCES public.cases(id) ON DELETE CASCADE,
  buro_no text,
  arb_no text,
  items jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.case_process_tracker TO authenticated;
GRANT ALL ON public.case_process_tracker TO service_role;

ALTER TABLE public.case_process_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mediator or admin selects process tracker" ON public.case_process_tracker;
DROP POLICY IF EXISTS "mediator or admin inserts process tracker" ON public.case_process_tracker;
DROP POLICY IF EXISTS "mediator or admin updates process tracker" ON public.case_process_tracker;

CREATE POLICY "mediator or admin selects process tracker"
  ON public.case_process_tracker FOR SELECT TO authenticated
  USING (
    public.is_case_mediator(case_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "mediator or admin inserts process tracker"
  ON public.case_process_tracker FOR INSERT TO authenticated
  WITH CHECK (
    public.is_case_mediator(case_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "mediator or admin updates process tracker"
  ON public.case_process_tracker FOR UPDATE TO authenticated
  USING (
    public.is_case_mediator(case_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.is_case_mediator(case_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP TRIGGER IF EXISTS trg_case_process_tracker_updated ON public.case_process_tracker;
CREATE TRIGGER trg_case_process_tracker_updated
  BEFORE UPDATE ON public.case_process_tracker
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
