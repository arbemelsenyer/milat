CREATE OR REPLACE FUNCTION public.is_case_owner_safe(_case_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Dosya sahibi = dosyayi acan ARABULUCU. 34 RLS politikasi bunu arabulucu
  -- duzeyi yetki olarak kullanir. Sahip ayni zamanda o dosyanin TARAFI ise
  -- arabulucu yetkisi VERILMEZ: aksi halde karsi tarafin foyunu, kalemlerini
  -- ve analizlerini gorurdu (kor veri ilkesi kirilirdi).
  SELECT EXISTS (
    SELECT 1 FROM public.cases
    WHERE id = _case_id AND user_id = _user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.case_parties
    WHERE case_id = _case_id AND user_id = _user_id
  );
$function$;