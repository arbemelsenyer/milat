-- Agent states table for multi-agent negotiation engine
CREATE TABLE IF NOT EXISTS public.agent_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('party_a','party_b','mediator','validator')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','flagged')),
  last_output JSONB,
  confidence_score NUMERIC(3,2),
  hallucination_risk BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_states_case ON public.agent_states(case_id);
CREATE INDEX IF NOT EXISTS idx_agent_states_case_type ON public.agent_states(case_id, agent_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_states TO authenticated;
GRANT ALL ON public.agent_states TO service_role;

ALTER TABLE public.agent_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Case participants can view agent states"
ON public.agent_states FOR SELECT
TO authenticated
USING (public.can_access_case(case_id, auth.uid()));

CREATE POLICY "Case participants can insert agent states"
ON public.agent_states FOR INSERT
TO authenticated
WITH CHECK (public.can_access_case(case_id, auth.uid()));

CREATE POLICY "Case participants can update agent states"
ON public.agent_states FOR UPDATE
TO authenticated
USING (public.can_access_case(case_id, auth.uid()))
WITH CHECK (public.can_access_case(case_id, auth.uid()));

CREATE POLICY "Admins can manage all agent states"
ON public.agent_states FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_agent_states_updated_at
BEFORE UPDATE ON public.agent_states
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime so panels can subscribe to agent updates
ALTER TABLE public.agent_states REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_states;