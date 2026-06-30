UPDATE public.knowledge_base_jobs
SET status = 'completed_with_errors', finished_at = NOW(), updated_at = NOW(), current_book = NULL
WHERE status IN ('running','pending') AND updated_at < NOW() - INTERVAL '5 minutes';