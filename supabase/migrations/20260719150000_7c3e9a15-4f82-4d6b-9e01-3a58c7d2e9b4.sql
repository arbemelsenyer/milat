
-- Lock down party UPDATEs on negotiation_rounds to their intended surface only.
--
-- "Parties respond to rounds" (20260625203756) allows any case party to UPDATE
-- any column on a round via RLS (USING/WITH CHECK only check case membership,
-- not which columns changed). That lets a party rewrite the full proposal,
-- round_no, case_id, or fake the other side's accepted_by/rejected_by entries
-- instead of only recording their own response. Same class of bug already
-- fixed for case_parties (enforce_case_parties_self_update) and
-- case_expert_assignments (enforce_case_expert_assignment_party_update); this
-- follows the identical BEFORE UPDATE SECURITY DEFINER guard pattern.
--
-- Locked for parties: proposal, round_no, case_id, created_at, accepted_by,
-- rejected_by. Free for parties: status (+ updated_at, handled by the
-- existing trg_negotiation_rounds_updated_at trigger). accepted_by/rejected_by
-- are fully locked for now since no current party flow writes to them
-- (RoundsTab.setStatus only writes {status}); if a party-acceptance feature
-- lands later, open per-party writes to those arrays via a dedicated
-- SECURITY DEFINER RPC rather than loosening this guard.
-- Mediator/admin are exempt, same as the existing patterns.

CREATE OR REPLACE FUNCTION public.enforce_negotiation_rounds_party_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_case_mediator(OLD.case_id, auth.uid())
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.case_id      IS DISTINCT FROM OLD.case_id
     OR NEW.round_no    IS DISTINCT FROM OLD.round_no
     OR NEW.proposal     IS DISTINCT FROM OLD.proposal
     OR NEW.created_at   IS DISTINCT FROM OLD.created_at
     OR NEW.accepted_by  IS DISTINCT FROM OLD.accepted_by
     OR NEW.rejected_by  IS DISTINCT FROM OLD.rejected_by THEN
    RAISE EXCEPTION 'parties may not modify proposal, sequencing, or acceptance fields on negotiation rounds';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_negotiation_rounds_party_update() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_negotiation_rounds_party_update_guard ON public.negotiation_rounds;
CREATE TRIGGER trg_negotiation_rounds_party_update_guard
BEFORE UPDATE ON public.negotiation_rounds
FOR EACH ROW EXECUTE FUNCTION public.enforce_negotiation_rounds_party_update();
