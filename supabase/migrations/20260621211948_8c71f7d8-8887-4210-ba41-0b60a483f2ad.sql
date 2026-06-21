
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================
-- case_parties: extend with individual/corporate fields
-- =========================================
ALTER TABLE public.case_parties
  ADD COLUMN IF NOT EXISTS party_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS is_individual boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tc_kimlik text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS tax_office text,
  ADD COLUMN IF NOT EXISTS tax_number text,
  ADD COLUMN IF NOT EXISTS trade_registry_no text,
  ADD COLUMN IF NOT EXISTS authorized_person text;

-- =========================================
-- case_documents: add analysis_result
-- =========================================
ALTER TABLE public.case_documents
  ADD COLUMN IF NOT EXISTS analysis_result jsonb;

-- =========================================
-- cases_private_keys: encrypted PII mapping
-- =========================================
CREATE TABLE IF NOT EXISTS public.cases_private_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  mask_label text NOT NULL,
  encrypted_value bytea NOT NULL,
  field_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpk_case ON public.cases_private_keys(case_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cpk_case_label ON public.cases_private_keys(case_id, mask_label);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases_private_keys TO authenticated;
GRANT ALL ON public.cases_private_keys TO service_role;
ALTER TABLE public.cases_private_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpk select case access" ON public.cases_private_keys
  FOR SELECT TO authenticated
  USING (public.can_access_case(case_id, auth.uid()));
CREATE POLICY "cpk insert case access" ON public.cases_private_keys
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_case(case_id, auth.uid()));
CREATE POLICY "cpk delete admin" ON public.cases_private_keys
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================
-- cases_vector_pool
-- =========================================
CREATE TABLE IF NOT EXISTS public.cases_vector_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  anonymized_text text NOT NULL,
  niche_area text,
  embedding vector(3072),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cvp_case ON public.cases_vector_pool(case_id);
CREATE INDEX IF NOT EXISTS idx_cvp_niche ON public.cases_vector_pool(niche_area);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases_vector_pool TO authenticated;
GRANT ALL ON public.cases_vector_pool TO service_role;
ALTER TABLE public.cases_vector_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cvp select case access" ON public.cases_vector_pool
  FOR SELECT TO authenticated
  USING (public.can_access_case(case_id, auth.uid()));
CREATE POLICY "cvp insert case access" ON public.cases_vector_pool
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_case(case_id, auth.uid()));

-- =========================================
-- pending_pool: external legal sources awaiting validation (admin-only)
-- =========================================
CREATE TABLE IF NOT EXISTS public.pending_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text,
  raw_content text NOT NULL,
  niche_area text,
  status text NOT NULL DEFAULT 'pending',
  relevance_score numeric,
  rejection_reason text,
  approved boolean,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pp_status ON public.pending_pool(status);
CREATE INDEX IF NOT EXISTS idx_pp_niche ON public.pending_pool(niche_area);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_pool TO authenticated;
GRANT ALL ON public.pending_pool TO service_role;
ALTER TABLE public.pending_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp admin all" ON public.pending_pool
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pp_updated_at BEFORE UPDATE ON public.pending_pool
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- case_discovery_questions
-- =========================================
CREATE TABLE IF NOT EXISTS public.case_discovery_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  answer_text text,
  detected_need text,
  win_win_scenario text,
  question_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cdq_case ON public.case_discovery_questions(case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_discovery_questions TO authenticated;
GRANT ALL ON public.case_discovery_questions TO service_role;
ALTER TABLE public.case_discovery_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cdq select case access" ON public.case_discovery_questions
  FOR SELECT TO authenticated USING (public.can_access_case(case_id, auth.uid()));
CREATE POLICY "cdq insert case access" ON public.case_discovery_questions
  FOR INSERT TO authenticated WITH CHECK (public.can_access_case(case_id, auth.uid()));
CREATE POLICY "cdq update case access" ON public.case_discovery_questions
  FOR UPDATE TO authenticated USING (public.can_access_case(case_id, auth.uid()));

CREATE TRIGGER trg_cdq_updated_at BEFORE UPDATE ON public.case_discovery_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- case_sessions
-- =========================================
CREATE TABLE IF NOT EXISTS public.case_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  session_type text NOT NULL,
  scheduled_at timestamptz,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_link text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cs_case ON public.case_sessions(case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_sessions TO authenticated;
GRANT ALL ON public.case_sessions TO service_role;
ALTER TABLE public.case_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs select case access" ON public.case_sessions
  FOR SELECT TO authenticated USING (public.can_access_case(case_id, auth.uid()));
CREATE POLICY "cs insert case access" ON public.case_sessions
  FOR INSERT TO authenticated WITH CHECK (public.can_access_case(case_id, auth.uid()));
CREATE POLICY "cs update case access" ON public.case_sessions
  FOR UPDATE TO authenticated USING (public.can_access_case(case_id, auth.uid()));
CREATE POLICY "cs delete case access" ON public.case_sessions
  FOR DELETE TO authenticated USING (public.can_access_case(case_id, auth.uid()));

CREATE TRIGGER trg_cs_updated_at BEFORE UPDATE ON public.case_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- mediators marketplace profile
-- =========================================
CREATE TABLE IF NOT EXISTS public.mediators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  photo_url text,
  specializations text[] NOT NULL DEFAULT '{}',
  total_cases int NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 0,
  avg_resolution_days int NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  languages text[] NOT NULL DEFAULT '{TR}',
  bio text,
  rating numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_med_user ON public.mediators(user_id);

GRANT SELECT ON public.mediators TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mediators TO authenticated;
GRANT ALL ON public.mediators TO service_role;
ALTER TABLE public.mediators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "med public read" ON public.mediators
  FOR SELECT USING (true);
CREATE POLICY "med self insert" ON public.mediators
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "med self update" ON public.mediators
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "med admin delete" ON public.mediators
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_med_updated_at BEFORE UPDATE ON public.mediators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
