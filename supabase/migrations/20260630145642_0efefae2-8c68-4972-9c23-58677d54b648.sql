
ALTER TABLE public.knowledge_base_jobs
  ADD COLUMN IF NOT EXISTS processed_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.knowledge_base_jobs
SET status = 'failed',
    finished_at = now(),
    updated_at = now(),
    errors = COALESCE(errors, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'book', current_book,
      'error', 'Edge function worker killed (>1h stale). Otomatik durduruldu; book-per-invocation moduna geçildi.'
    ))
WHERE status IN ('running','pending')
  AND updated_at < now() - interval '5 minutes';
