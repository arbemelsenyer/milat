
-- Add party_id to case_documents to support per-party document uploads in Phase 3 (Taraf Analizi)
ALTER TABLE public.case_documents
  ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES public.case_parties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_case_documents_party_id ON public.case_documents(party_id);
