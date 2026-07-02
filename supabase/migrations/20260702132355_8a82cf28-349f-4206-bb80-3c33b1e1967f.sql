
-- 1) Table
CREATE TABLE IF NOT EXISTS public.fee_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yil integer NOT NULL,
  tariff_data jsonb NOT NULL,
  effective_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(yil)
);

GRANT SELECT ON public.fee_tariffs TO authenticated;
GRANT ALL ON public.fee_tariffs TO service_role;

ALTER TABLE public.fee_tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active tariff" ON public.fee_tariffs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert tariffs" ON public.fee_tariffs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tariffs" ON public.fee_tariffs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tariffs" ON public.fee_tariffs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER fee_tariffs_updated_at BEFORE UPDATE ON public.fee_tariffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Seed 2026
INSERT INTO public.fee_tariffs (yil, effective_date, is_active, tariff_data)
VALUES (2026, '2026-01-01', true, $json${
  "yil": 2026,
  "effective_date": "2026-01-01",
  "ikinci_kisim": {
    "aciklama": "Para olan uyuşmazlık + Anlaşma",
    "dilimler": [
      {"ust_sinir": 600000, "tek_arabulucu": 6, "birden_fazla": 9},
      {"ust_sinir": 1560000, "tek_arabulucu": 5, "birden_fazla": 7.5},
      {"ust_sinir": 3120000, "tek_arabulucu": 4, "birden_fazla": 6},
      {"ust_sinir": 6240000, "tek_arabulucu": 3, "birden_fazla": 4.5},
      {"ust_sinir": 15600000, "tek_arabulucu": 2, "birden_fazla": 3},
      {"ust_sinir": 28080000, "tek_arabulucu": 1.5, "birden_fazla": 2.5},
      {"ust_sinir": 53040000, "tek_arabulucu": 1, "birden_fazla": 1.5},
      {"ust_sinir": null, "tek_arabulucu": 0.5, "birden_fazla": 1}
    ],
    "minimum_ucret": 9000,
    "minimum_ticari_ortaklik": 13000
  },
  "birinci_kisim": {
    "aciklama": "Para olmayan / Anlaşamama saatlik",
    "turler": {
      "aile": {"iki_taraf": 1000, "uc_bes_taraf": 2200, "alti_on_taraf": 2300, "onbir_ust": 2400},
      "ticari": {"iki_taraf": 1500, "uc_bes_taraf": 3200, "alti_on_taraf": 3300, "onbir_ust": 3400},
      "isci_isveren": {"iki_taraf": 1130, "uc_bes_taraf": 2460, "alti_on_taraf": 2560, "onbir_ust": 2660},
      "tuketici": {"iki_taraf": 1000, "uc_bes_taraf": 2200, "alti_on_taraf": 2300, "onbir_ust": 2400},
      "kira_komsuluk_kat": {"iki_taraf": 1170, "uc_bes_taraf": 2540, "alti_on_taraf": 2640, "onbir_ust": 2740},
      "ortaklik_giderimi": {"iki_taraf": 1170, "uc_bes_taraf": 2540, "alti_on_taraf": 2640, "onbir_ust": 2740},
      "diger": {"iki_taraf": 1000, "uc_bes_taraf": 2200, "alti_on_taraf": 2300, "onbir_ust": 2400}
    }
  },
  "seri_uyusmazlik": {
    "aciklama": "Aynı taraflardan biri ortak, aynı ayda 10+ başvuru",
    "minimum_dosya_sayisi": 10,
    "ticari": 7500,
    "diger": 6000
  },
  "ozel_durumlar": {
    "kira_tespiti": "Tespit olunan kira farkının 1 yıllık tutarı üzerinden İkinci Kısım",
    "tahliye": "1 yıllık kira bedelinin yarısı üzerinden İkinci Kısım"
  },
  "kdv_orani": 20,
  "stopaj_orani": 20
}$json$::jsonb)
ON CONFLICT (yil) DO UPDATE SET tariff_data = EXCLUDED.tariff_data, is_active = true, effective_date = EXCLUDED.effective_date;

-- 3) pg_cron reminder to admins on Dec 1 each year
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.notify_admins_new_tariff()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_year int := EXTRACT(YEAR FROM now())::int + 1;
  v_admin RECORD;
BEGIN
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
    PERFORM public.create_notification(
      v_admin.user_id,
      'Yeni yıl tarifesi güncellenmeli',
      'Yeni yıl yaklaşıyor. Lütfen ' || v_next_year || ' Arabuluculuk Asgari Ücret Tarifesini güncelleyin.',
      'warning',
      '/admin'
    );
  END LOOP;
END;
$$;

SELECT cron.unschedule('notify-admins-new-tariff') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='notify-admins-new-tariff');

SELECT cron.schedule('notify-admins-new-tariff', '0 9 1 12 *', $$SELECT public.notify_admins_new_tariff();$$);
