
-- 1) case_parties: restrict what a party can self-update. Only benign fields allowed.
CREATE OR REPLACE FUNCTION public.enforce_case_parties_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mediator / admin: unrestricted
  IF public.is_case_mediator(OLD.case_id, auth.uid())
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Party self-update path: identity/role/invite fields are frozen
  IF NEW.case_id     IS DISTINCT FROM OLD.case_id
     OR NEW.user_id  IS DISTINCT FROM OLD.user_id
     OR NEW.role     IS DISTINCT FROM OLD.role
     OR NEW.party_role IS DISTINCT FROM OLD.party_role
     OR NEW.invite_status IS DISTINCT FROM OLD.invite_status
     OR NEW.tc_kimlik IS DISTINCT FROM OLD.tc_kimlik
     OR NEW.email    IS DISTINCT FROM OLD.email
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'parties may not modify identity, role, or invite fields on their own row';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_case_parties_self_update_guard ON public.case_parties;
CREATE TRIGGER trg_case_parties_self_update_guard
BEFORE UPDATE ON public.case_parties
FOR EACH ROW EXECUTE FUNCTION public.enforce_case_parties_self_update();

-- 2) Tighten can_access_realtime_topic with explicit prefix allow-list at the top.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prefix text;
  v_id_text text;
  v_id uuid;
  v_allowed_prefixes CONSTANT text[] := ARRAY['case','user','notifications'];
BEGIN
  IF v_uid IS NULL OR _topic IS NULL THEN
    RETURN false;
  END IF;

  v_prefix := split_part(_topic, ':', 1);
  v_id_text := split_part(_topic, ':', 2);

  -- Explicit allow-list of topic prefixes.
  IF NOT (v_prefix = ANY (v_allowed_prefixes)) THEN
    RETURN false;
  END IF;

  IF v_id_text IS NULL OR length(v_id_text) = 0 THEN
    RETURN false;
  END IF;

  BEGIN
    v_id := v_id_text::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  IF v_prefix IN ('user','notifications') THEN
    RETURN v_id = v_uid;
  ELSIF v_prefix = 'case' THEN
    RETURN public.can_access_case(v_id, v_uid);
  END IF;

  RETURN false;
END;
$$;
