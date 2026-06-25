
-- ============================================================
-- MediPact AI: Confidential Two-Party Mediation System
-- ============================================================

-- 1) cases: add columns
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS uyap_no TEXT,
  ADD COLUMN IF NOT EXISTS application_no TEXT,
  ADD COLUMN IF NOT EXISTS dispute_subtype TEXT,
  ADD COLUMN IF NOT EXISTS current_phase INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS round_number INT NOT NULL DEFAULT 1;

-- Sequence for application_no auto-gen 2026/xxxx
CREATE SEQUENCE IF NOT EXISTS public.case_application_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_application_no()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT '2026/' || LPAD(nextval('public.case_application_seq')::TEXT, 4, '0');
$$;

-- 2) case_parties: add invite + role fields
ALTER TABLE public.case_parties
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS party_role TEXT;

-- 3) Helper functions (SECURITY DEFINER, avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_case_mediator(_case_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases
    WHERE id = _case_id AND assigned_mediator_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_case_party(_case_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.case_parties
    WHERE case_id = _case_id AND user_id = _user_id
  );
$$;

-- 4) party_analyses (NEW): per-party confidential analysis
CREATE TABLE IF NOT EXISTS public.party_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.case_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  discovery_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  prep_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  round_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_analyses TO authenticated;
GRANT ALL ON public.party_analyses TO service_role;
ALTER TABLE public.party_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Party sees own analysis" ON public.party_analyses
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Mediator sees all party analyses" ON public.party_analyses
  FOR SELECT USING (public.is_case_mediator(case_id, auth.uid()));
CREATE POLICY "Mediator manages party analyses" ON public.party_analyses
  FOR ALL USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));
CREATE POLICY "Party updates own analysis answers" ON public.party_analyses
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin full party_analyses" ON public.party_analyses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_party_analyses_updated_at
  BEFORE UPDATE ON public.party_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) common_ground_reports (NEW): mediator-only
CREATE TABLE IF NOT EXISTS public.common_ground_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  round_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.common_ground_reports TO authenticated;
GRANT ALL ON public.common_ground_reports TO service_role;
ALTER TABLE public.common_ground_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mediator only common ground" ON public.common_ground_reports
  FOR ALL USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));
CREATE POLICY "Admin full common ground" ON public.common_ground_reports
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_common_ground_updated_at
  BEFORE UPDATE ON public.common_ground_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) negotiation_rounds (NEW)
CREATE TABLE IF NOT EXISTS public.negotiation_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  round_no INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  proposal JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted_by UUID[] NOT NULL DEFAULT '{}',
  rejected_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.negotiation_rounds TO authenticated;
GRANT ALL ON public.negotiation_rounds TO service_role;
ALTER TABLE public.negotiation_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mediator manages rounds" ON public.negotiation_rounds
  FOR ALL USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));
CREATE POLICY "Parties see rounds of own case" ON public.negotiation_rounds
  FOR SELECT USING (public.is_case_party(case_id, auth.uid()));
CREATE POLICY "Parties respond to rounds" ON public.negotiation_rounds
  FOR UPDATE USING (public.is_case_party(case_id, auth.uid()))
  WITH CHECK (public.is_case_party(case_id, auth.uid()));
CREATE POLICY "Admin full rounds" ON public.negotiation_rounds
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_negotiation_rounds_updated_at
  BEFORE UPDATE ON public.negotiation_rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) agreement_documents (NEW): generated PDFs
CREATE TABLE IF NOT EXISTS public.agreement_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  signed_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_documents TO authenticated;
GRANT ALL ON public.agreement_documents TO service_role;
ALTER TABLE public.agreement_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mediator manages agreement docs" ON public.agreement_documents
  FOR ALL USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));
CREATE POLICY "Parties view agreement docs" ON public.agreement_documents
  FOR SELECT USING (public.is_case_party(case_id, auth.uid()));
CREATE POLICY "Admin full agreement docs" ON public.agreement_documents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_agreement_documents_updated_at
  BEFORE UPDATE ON public.agreement_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Tighten case_documents: parties see ONLY their own uploads
DROP POLICY IF EXISTS "Users can view documents for their cases" ON public.case_documents;
DROP POLICY IF EXISTS "Mediators can view documents for assigned cases" ON public.case_documents;
DROP POLICY IF EXISTS "Mediators can upload documents to assigned cases" ON public.case_documents;
DROP POLICY IF EXISTS "Users can upload documents to their cases" ON public.case_documents;

CREATE POLICY "Party sees own uploads only" ON public.case_documents
  FOR SELECT USING (
    uploaded_by = auth.uid() AND public.is_case_party(case_id, auth.uid())
  );
CREATE POLICY "Mediator sees all case documents" ON public.case_documents
  FOR SELECT USING (public.is_case_mediator(case_id, auth.uid()));
CREATE POLICY "Party uploads own docs" ON public.case_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND public.is_case_party(case_id, auth.uid())
  );
CREATE POLICY "Mediator uploads case docs" ON public.case_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND public.is_case_mediator(case_id, auth.uid())
  );

-- 9) Tighten case_discovery_questions: party-scoped via party_id
ALTER TABLE public.case_discovery_questions
  ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES public.case_parties(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID;

DROP POLICY IF EXISTS "cdq select case access" ON public.case_discovery_questions;
DROP POLICY IF EXISTS "cdq update case access" ON public.case_discovery_questions;
DROP POLICY IF EXISTS "cdq insert case access" ON public.case_discovery_questions;

CREATE POLICY "Party sees own discovery" ON public.case_discovery_questions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Mediator sees all discovery" ON public.case_discovery_questions
  FOR SELECT USING (public.is_case_mediator(case_id, auth.uid()));
CREATE POLICY "Party answers own discovery" ON public.case_discovery_questions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Mediator manages discovery" ON public.case_discovery_questions
  FOR ALL USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));

-- 10) case_sessions: extend with meeting type + participants per-party visibility
ALTER TABLE public.case_sessions
  ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS prep_notes_generated BOOLEAN NOT NULL DEFAULT false;

-- Index for invite token lookup
CREATE INDEX IF NOT EXISTS idx_case_parties_invite_token ON public.case_parties(invite_token);
CREATE INDEX IF NOT EXISTS idx_party_analyses_case ON public.party_analyses(case_id);
CREATE INDEX IF NOT EXISTS idx_common_ground_case ON public.common_ground_reports(case_id);
