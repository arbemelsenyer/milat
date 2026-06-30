ALTER TABLE public.knowledge_base_jobs
  ADD COLUMN IF NOT EXISTS book_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'whole_book';