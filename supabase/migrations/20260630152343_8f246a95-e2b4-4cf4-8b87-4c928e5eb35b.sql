ALTER TABLE public.knowledge_base_jobs ADD COLUMN IF NOT EXISTS attempt_counts jsonb NOT NULL DEFAULT '{}'::jsonb;
-- Mark the stuck job as failed
UPDATE public.knowledge_base_jobs
SET status='failed', finished_at=now(), updated_at=now()
WHERE status IN ('pending','running');