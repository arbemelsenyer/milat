-- Agent Kontrol Paneli: agent_states'i case-geneli AI aktivite kaydına genişlet.
-- Idempotent: SQL Editor'de tekrar tekrar çalıştırılabilir (DROP IF EXISTS / IF NOT EXISTS).

-- 1) agent_type CHECK kısıtını genişlet (mevcut 4 değer korunur, yenileri eklenir)
ALTER TABLE public.agent_states DROP CONSTRAINT IF EXISTS agent_states_agent_type_check;
ALTER TABLE public.agent_states ADD CONSTRAINT agent_states_agent_type_check
  CHECK (agent_type IN (
    'party_a', 'party_b', 'mediator', 'validator',
    'party_analysis', 'common_ground', 'classify_dispute',
    'deadline_detect', 'meeting_notes', 'document_analysis', 'agreement_generation'
  ));

-- 2) Taraf-özel aktiviteleri (party_analysis, document_analysis) case_parties'e bağlamak için nullable kolon
ALTER TABLE public.agent_states ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES public.case_parties(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_states_party ON public.agent_states(party_id) WHERE party_id IS NOT NULL;

-- 3) agent_type'a göre dallanan görünürlük helper'ı (can_access_case / is_case_mediator ile aynı stil)
CREATE OR REPLACE FUNCTION public.can_view_agent_state(_case_id UUID, _agent_type TEXT, _party_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Sadece o partinin sahibi + arabulucu görebilir (party_analyses / case_documents ile aynı model)
    WHEN _agent_type IN ('party_analysis', 'document_analysis') THEN
      public.is_case_mediator(_case_id, _user_id)
      OR EXISTS (
        SELECT 1 FROM public.case_parties cp
        WHERE cp.id = _party_id AND cp.user_id = _user_id
      )
    -- Sadece arabulucu görebilir, taraflara tamamen kapalı (common_ground_reports / case_notes ile aynı model)
    WHEN _agent_type IN ('common_ground', 'meeting_notes') THEN
      public.is_case_mediator(_case_id, _user_id)
    -- Case-geneli tipler: mevcut davranış (her iki taraf + arabulucu)
    ELSE
      public.can_access_case(_case_id, _user_id)
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_agent_state(UUID, TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_agent_state(UUID, TEXT, UUID, UUID) TO authenticated, service_role;

-- 4) Geniş SELECT policy'sini helper'ı kullanacak şekilde değiştir (admin policy'sine dokunulmadı)
DROP POLICY IF EXISTS "Case participants can view agent states" ON public.agent_states;
CREATE POLICY "Case participants can view agent states"
ON public.agent_states FOR SELECT
TO authenticated
USING (public.can_view_agent_state(case_id, agent_type, party_id, auth.uid()));

-- 5) INSERT/UPDATE policy'lerini aynı helper ile WITH CHECK'e sıkıştır (party_id/agent_type spoof'unu engeller)
DROP POLICY IF EXISTS "Case participants can insert agent states" ON public.agent_states;
CREATE POLICY "Case participants can insert agent states"
ON public.agent_states FOR INSERT
TO authenticated
WITH CHECK (public.can_view_agent_state(case_id, agent_type, party_id, auth.uid()));

DROP POLICY IF EXISTS "Case participants can update agent states" ON public.agent_states;
CREATE POLICY "Case participants can update agent states"
ON public.agent_states FOR UPDATE
TO authenticated
USING (public.can_view_agent_state(case_id, agent_type, party_id, auth.uid()))
WITH CHECK (public.can_view_agent_state(case_id, agent_type, party_id, auth.uid()));
