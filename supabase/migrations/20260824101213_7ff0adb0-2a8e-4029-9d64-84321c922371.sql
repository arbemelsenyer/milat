CREATE INDEX IF NOT EXISTS idx_case_parties_case
  ON public.case_parties (case_id);

CREATE INDEX IF NOT EXISTS idx_case_documents_case_zaman
  ON public.case_documents (case_id, created_at DESC);