create or replace function match_cases (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_niche_area text
)
returns table (
  id uuid,
  anonymized_text text,
  niche_area text,
  similarity float
)
language sql stable
as $$
  select
    cases_vector_pool.id,
    cases_vector_pool.anonymized_text,
    cases_vector_pool.niche_area,
    1 - (cases_vector_pool.embedding <=> query_embedding) as similarity
  from cases_vector_pool
  where 1 - (cases_vector_pool.embedding <=> query_embedding) > match_threshold
    and cases_vector_pool.niche_area = filter_niche_area
  order by cases_vector_pool.embedding <=> query_embedding asc
  limit match_count;
$$;