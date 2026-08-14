-- TUR B — TARAF AJANI
-- Bu göç idempotenttir; Lovable Cloud > SQL bölümünden çalıştırılır.
--
-- 1) case_parties.hatirlatma_izni — tarafın "bana hatırlatma gönderebilir" anahtarı.
--    Varsayılan TRUE: bugünkü davranış (hatırlatma gider) değişmez; taraf kapatabilir.
--    NOT: case_parties üzerinde tarafın hangi kolonu değiştirebileceğini sınırlayan bir
--    kolon-koruma tetikleyicisi varsa (mimari §5.7), bu kolonun da izin listesine
--    eklenmesi gerekir — aksi hâlde taraf ekranındaki anahtar hata döndürür.
ALTER TABLE public.case_parties
  ADD COLUMN IF NOT EXISTS hatirlatma_izni BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.case_parties.hatirlatma_izni IS
  'Taraf ajanı bu tarafa hatırlatma e-postası gönderebilir mi (taraf kendi ekranından açıp kapatır).';

-- 2) ajan_gorevleri erişimi.
--    Tablo depo dışında (Lovable SQL) açıldığı için politikaları burada tek yerde
--    tanımlanıyor. Kör veri: TARAF yalnız KENDİ satırlarını (hedef_party_id kendi
--    taraf kaydı) OKUR; yazamaz, karşı tarafın satırını hiçbir yoldan göremez.
--    Arabulucu ve yönetici dosya kapsamında tam yetkilidir.
ALTER TABLE public.ajan_gorevleri ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ajan_gorevleri TO authenticated;
GRANT ALL ON public.ajan_gorevleri TO service_role;

DROP POLICY IF EXISTS "Mediator full agent tasks" ON public.ajan_gorevleri;
CREATE POLICY "Mediator full agent tasks" ON public.ajan_gorevleri
  FOR ALL USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Admin full agent tasks" ON public.ajan_gorevleri;
CREATE POLICY "Admin full agent tasks" ON public.ajan_gorevleri
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Taraf: SALT OKUMA ve yalnız kendi party kaydına yazılmış görevler.
-- hedef_party_id boş olan (dosya geneli) satırlar tarafa AÇILMAZ — dosya geneli
-- kayıtlar süreç ajanının işidir ve karşı tarafa dair iz taşıyabilir.
DROP POLICY IF EXISTS "Party reads own agent tasks" ON public.ajan_gorevleri;
CREATE POLICY "Party reads own agent tasks" ON public.ajan_gorevleri
  FOR SELECT USING (
    hedef_party_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.case_parties cp
      WHERE cp.id = ajan_gorevleri.hedef_party_id
        AND cp.case_id = ajan_gorevleri.case_id
        AND cp.user_id = auth.uid()
    )
  );
