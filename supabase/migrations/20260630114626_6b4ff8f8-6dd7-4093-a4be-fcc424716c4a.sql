-- Knowledge base for ADB official mediation publications
CREATE TABLE IF NOT EXISTS public.knowledge_base_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_title text NOT NULL,
  source_url text NOT NULL,
  category text NOT NULL DEFAULT 'genel',
  chunk_text text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.knowledge_base_chunks TO authenticated;
GRANT ALL ON public.knowledge_base_chunks TO service_role;

ALTER TABLE public.knowledge_base_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read knowledge base"
  ON public.knowledge_base_chunks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role manages knowledge base"
  ON public.knowledge_base_chunks FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS knowledge_base_chunks_category_idx
  ON public.knowledge_base_chunks (category);

CREATE INDEX IF NOT EXISTS knowledge_base_chunks_embedding_idx
  ON public.knowledge_base_chunks USING hnsw (embedding vector_cosine_ops);

-- Job tracking for admin progress UI
CREATE TABLE IF NOT EXISTS public.knowledge_base_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  total_books integer NOT NULL DEFAULT 0,
  processed_books integer NOT NULL DEFAULT 0,
  total_chunks integer NOT NULL DEFAULT 0,
  current_book text,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT ON public.knowledge_base_jobs TO authenticated;
GRANT ALL ON public.knowledge_base_jobs TO service_role;

ALTER TABLE public.knowledge_base_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read knowledge base jobs"
  ON public.knowledge_base_jobs FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages knowledge base jobs"
  ON public.knowledge_base_jobs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_knowledge_base_jobs_updated_at
  BEFORE UPDATE ON public.knowledge_base_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Similarity search across the official mediation knowledge base
CREATE OR REPLACE FUNCTION public.match_knowledge_base(
  query_embedding vector,
  filter_category text DEFAULT NULL,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.7
)
RETURNS TABLE (
  source_title text,
  source_url text,
  category text,
  chunk_text text,
  similarity double precision
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT
    k.source_title,
    k.source_url,
    k.category,
    k.chunk_text,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base_chunks k
  WHERE k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
    AND (
      filter_category IS NULL
      OR k.category = filter_category
      OR k.category = 'genel'
    )
  ORDER BY k.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;