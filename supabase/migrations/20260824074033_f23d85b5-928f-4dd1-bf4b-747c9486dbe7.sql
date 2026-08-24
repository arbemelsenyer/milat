CREATE OR REPLACE FUNCTION public.is_case_owner_safe(_case_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.cases WHERE id = _case_id AND user_id = _user_id);
$function$;