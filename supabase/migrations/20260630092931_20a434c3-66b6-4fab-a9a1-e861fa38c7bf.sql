CREATE OR REPLACE FUNCTION public.generate_application_no()
RETURNS text
LANGUAGE sql
SET search_path TO 'public'
AS $$
  SELECT 'MP-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.case_application_seq')::TEXT, 4, '0');
$$;