
-- Ödeme Bilgi Servisi — Parça 1 (veritabanı katmanı)
-- (0) Ön koşul: profiles.iban / profiles.banka_adi henüz yok, RPC bunları
--     döndürecek şekilde tanımlandığı için önce ekleniyor (idempotent).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banka_adi text,
  ADD COLUMN IF NOT EXISTS iban text;

-- (1) Taraf, sadece kendi payer_party_id'sine ait case_payments satırlarını
--     görebilsin. Mevcut "Case mediator or admin can view payments" politikasına
--     EK olarak eklenir (RLS politikaları OR'lanır); karşı tarafın satırı ve
--     payer_party_id IS NULL (Bakanlık) satırları hiçbir tarafa görünmez.
DROP POLICY IF EXISTS "Party can view own payment rows" ON public.case_payments;
CREATE POLICY "Party can view own payment rows"
  ON public.case_payments FOR SELECT TO authenticated
  USING (
    payer_party_id IN (
      SELECT id FROM public.case_parties
      WHERE case_id = case_payments.case_id AND user_id = auth.uid()
    )
  );

-- (2) Taraf, dosyasının atanmış arabulucusunun ödeme bilgisini (sadece
--     full_name/banka_adi/iban — telefon/e-posta ASLA) dar kapsamlı bir
--     SECURITY DEFINER RPC üzerinden okuyabilsin. profiles tablosunun RLS
--     yüzeyi genişletilmiyor.
DROP FUNCTION IF EXISTS public.get_case_mediator_payment_info(uuid);
CREATE FUNCTION public.get_case_mediator_payment_info(p_case_id uuid)
RETURNS TABLE (full_name text, banka_adi text, iban text)
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
  SELECT p.full_name, p.banka_adi, p.iban
  FROM public.profiles p
  JOIN public.cases c ON c.assigned_mediator_id = p.user_id
  WHERE c.id = p_case_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_case_mediator_payment_info(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_case_mediator_payment_info(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_case_mediator_payment_info(uuid) TO authenticated;
