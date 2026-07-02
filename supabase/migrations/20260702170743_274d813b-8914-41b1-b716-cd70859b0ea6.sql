
CREATE OR REPLACE FUNCTION public.notify_admins_new_mevzuat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_title text;
  v_provider text;
BEGIN
  -- Yalnızca 'mevzuat' niche'i için ve pending durumdaki yeni kayıtlarda çalış
  IF COALESCE(NEW.niche_area, '') <> 'mevzuat' THEN
    RETURN NEW;
  END IF;

  v_title := COALESCE(
    NULLIF(TRIM(NEW.metadata->>'source_title'), ''),
    'Yeni mevzuat kaydı'
  );
  v_provider := COALESCE(NEW.metadata->>'provider', 'kaynak');

  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    PERFORM public.create_notification(
      v_admin.user_id,
      '⚠️ Yeni mevzuat tespit edildi',
      v_title || ' (' || v_provider || '). Lütfen inceleyin ve onaylayın.',
      'warning',
      '/admin?tab=mevzuat'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_mevzuat ON public.pending_pool;
CREATE TRIGGER trg_notify_admins_new_mevzuat
AFTER INSERT ON public.pending_pool
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_mevzuat();
