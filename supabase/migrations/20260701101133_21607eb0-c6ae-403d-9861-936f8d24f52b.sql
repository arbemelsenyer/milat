
ALTER TABLE public.knowledge_base_chunks
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS knowledge_base_chunks_metadata_idx
  ON public.knowledge_base_chunks USING GIN (metadata);

DROP FUNCTION IF EXISTS public.match_knowledge_base(vector, text, integer, double precision);

CREATE OR REPLACE FUNCTION public.match_knowledge_base(
  query_embedding vector,
  filter_category text DEFAULT NULL::text,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.7
)
RETURNS TABLE(
  source_title text,
  source_url text,
  category text,
  chunk_text text,
  similarity double precision,
  metadata jsonb
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    k.source_title,
    k.source_url,
    k.category,
    k.chunk_text,
    1 - (k.embedding <=> query_embedding) AS similarity,
    k.metadata
  FROM public.knowledge_base_chunks k
  WHERE k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
    AND (
      filter_category IS NULL
      OR k.category = filter_category
      OR k.category IN ('genel', 'mevzuat', 'ucret_tarifesi')
    )
  ORDER BY k.embedding <=> query_embedding ASC
  LIMIT match_count;
$function$;
