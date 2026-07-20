
-- Ödeme Bilgi Servisi — düzeltme: doğru kaynak (föy) + gizlilik sızıntısı giderimi.
--
-- (1) Önceki migration'da eklenen parti SELECT politikası case_process_tracker'ın
--     TÜM satırını (arb_no/buro_no dışındaki alanlar dahil, ör. items) tarafa
--     açıyordu. Geri alınıyor — dar kapsamlı RPC ile değiştiriliyor.
DROP POLICY IF EXISTS "Party can view own case process tracker" ON public.case_process_tracker;

-- (2) Taraf, ödeme açıklaması metni için sadece arb_no + buro_no + mediation_type
--     okuyabilsin — case_process_tracker'ın diğer alanlarına (items vb.) erişim yok.
DROP FUNCTION IF EXISTS public.get_case_payment_reference(uuid);
CREATE FUNCTION public.get_case_payment_reference(p_case_id uuid)
RETURNS TABLE (arb_no text, buro_no text, mediation_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_case_party(p_case_id, auth.uid()) THEN
    RAISE EXCEPTION 'Bu dosyaya erişim yetkiniz yok';
  END IF;

  RETURN QUERY
  SELECT cpt.arb_no, cpt.buro_no, c.mediation_type
  FROM public.cases c
  LEFT JOIN public.case_process_tracker cpt ON cpt.case_id = c.id
  WHERE c.id = p_case_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_case_payment_reference(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_case_payment_reference(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_case_payment_reference(uuid) TO authenticated;
