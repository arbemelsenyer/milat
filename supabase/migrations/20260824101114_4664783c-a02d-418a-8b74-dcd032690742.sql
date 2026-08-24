CREATE INDEX IF NOT EXISTS idx_ajan_gorevleri_case_tip_zaman
  ON public.ajan_gorevleri (case_id, gorev_tipi, created_at DESC);