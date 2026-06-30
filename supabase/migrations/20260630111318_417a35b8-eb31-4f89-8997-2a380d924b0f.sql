-- Keep only newest row per (case_id, round_number)
DELETE FROM public.common_ground_reports a
USING public.common_ground_reports b
WHERE a.case_id = b.case_id
  AND a.round_number = b.round_number
  AND a.created_at < b.created_at;

ALTER TABLE public.common_ground_reports
  ADD CONSTRAINT common_ground_reports_case_round_unique
  UNIQUE (case_id, round_number);