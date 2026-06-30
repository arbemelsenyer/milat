
ALTER TABLE public.knowledge_base_jobs
  ADD COLUMN IF NOT EXISTS book_queue jsonb;
