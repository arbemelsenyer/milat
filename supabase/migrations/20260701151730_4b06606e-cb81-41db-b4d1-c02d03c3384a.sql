
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS is_mandatory boolean,
  ADD COLUMN IF NOT EXISTS legal_duration_days integer,
  ADD COLUMN IF NOT EXISTS extension_days integer,
  ADD COLUMN IF NOT EXISTS legal_basis text,
  ADD COLUMN IF NOT EXISTS deadline_total timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_extended timestamptz,
  ADD COLUMN IF NOT EXISTS extension_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deadline_sources jsonb,
  ADD COLUMN IF NOT EXISTS deadline_conflict boolean,
  ADD COLUMN IF NOT EXISTS deadline_conflict_note text,
  ADD COLUMN IF NOT EXISTS deadline_detected_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_warning_sent boolean NOT NULL DEFAULT false;
