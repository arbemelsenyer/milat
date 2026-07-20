
-- Orchestrator v1 (Parça 1) ön koşulu: agent_states.agent_type CHECK kısıtı
-- 'orchestrator' değerini kabul etmiyordu — genişletiliyor (mevcut değerler korunur).
ALTER TABLE public.agent_states DROP CONSTRAINT IF EXISTS agent_states_agent_type_check;
ALTER TABLE public.agent_states ADD CONSTRAINT agent_states_agent_type_check
  CHECK (agent_type IN (
    'party_a', 'party_b', 'mediator', 'validator',
    'party_analysis', 'common_ground', 'classify_dispute',
    'deadline_detect', 'meeting_notes', 'document_analysis', 'agreement_generation',
    'orchestrator'
  ));
