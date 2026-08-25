// KAZANIM SAYACI — dosya bazında kazanılan saat
// mimari §15.2 · §15.1 (camdan kutu) · HAT H-15/4
//
// CAMDAN KUTU İLKESİ BU İŞLEVİN OMURGASIDIR:
//   · Katsayılar KODDA SABİT DEĞİL, `public.kazanim_katsayilari` tablosunda.
//   · Katsayı girilmemişse (dakika NULL) o iş türü sayıma GİRMEZ.
//   · Hiçbir katsayı girilmemişse işlev rakam ÜRETMEZ: "yeterli veri yok" der.
//   · Dönen gövde her kalemin ADEDİNİ, KATSAYISINI ve DAYANAĞINI taşır —
//     arabulucu toplamın nereden geldiğini satır satır görebilir.
//     "7 saat kazandınız" demek, 7'nin nereden geldiği gösterilemiyorsa
//     uydurmadır (§15.1).
//
// BAZ ÇİZGİ: "bu iş elle yapılsaydı kaç dakika sürerdi" tahmini. Tahmin
// olduğu ekranda açıkça yazılır; ölçüm değildir.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Katsayi = { is_turu: string; dakika: number | null; dayanak: string | null };

/** İş türü → o işin kaç kez yapıldığını veren sayım. Tablo adları KODDA
 *  sabittir; parametre tablosundan yalnız DAKİKA okunur. */
const SAYIM: Record<string, { tablo: string; alan?: string }> = {
  resmi_belge_uretimi: { tablo: "agreement_documents" },
  taraf_analizi: { tablo: "party_analyses" },
  ortak_zemin_raporu: { tablo: "common_ground_reports" },
  hazirlik_foyu: { tablo: "oturum_hazirlik_foyleri" },
  belge_metni_cikarma: { tablo: "case_documents" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return json({ error: "Oturum doğrulanamadı" }, 401);

    const govde = await req.json().catch(() => ({}));
    const case_id = String(govde?.case_id ?? "").trim();
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Yetki: yalnız dosyanın arabulucusu kendi kazanımını görür.
    const { data: dosya, error: dErr } = await admin.from("cases")
      .select("id, assigned_mediator_id, user_id").eq("id", case_id).maybeSingle();
    if (dErr) return json({ error: `Dosya okunamadı: ${dErr.message}` }, 500);
    if (!dosya) return json({ error: "Dosya bulunamadı" }, 404);
    const satir = dosya as { assigned_mediator_id?: string | null; user_id?: string | null };
    if (String(satir.assigned_mediator_id ?? satir.user_id) !== uid) {
      return json({ error: "Bu dosyanın kazanım özeti size ait değil" }, 403);
    }

    const { data: katsayilar, error: kErr } = await admin
      .from("kazanim_katsayilari").select("is_turu, dakika, dayanak");
    if (kErr) {
      return json({
        error: `Kazanım katsayıları okunamadı: ${kErr.message}`,
        ipucu: "Katsayı tablosu henüz kurulmamış olabilir (HAT H-15/4).",
      }, 500);
    }

    const kalemler: Record<string, unknown>[] = [];
    let toplamDakika = 0;
    let katsayiliTur = 0;

    for (const k of ((katsayilar ?? []) as Katsayi[])) {
      const hedef = SAYIM[k.is_turu];
      if (!hedef) continue;

      const { count, error: sErr } = await admin.from(hedef.tablo)
        .select("id", { count: "exact", head: true }).eq(hedef.alan ?? "case_id", case_id);
      if (sErr) {
        kalemler.push({ is_turu: k.is_turu, durum: "sayılamadı", sebep: sErr.message });
        continue;
      }
      const adet = count ?? 0;

      /* KATSAYI YOKSA RAKAM ÜRETİLMEZ. Adet yine gösterilir — arabulucu ajanın
         ne ürettiğini görür — ama saate çevrilmez. */
      if (k.dakika == null) {
        kalemler.push({
          is_turu: k.is_turu, adet,
          dakika: null, dayanak: k.dayanak ?? null,
          durum: "katsayı girilmemiş — saate çevrilmedi",
        });
        continue;
      }
      katsayiliTur++;
      const kalemDakika = adet * k.dakika;
      toplamDakika += kalemDakika;
      kalemler.push({
        is_turu: k.is_turu, adet,
        katsayi_dakika: k.dakika, dayanak: k.dayanak ?? null,
        kalem_dakika: kalemDakika,
      });
    }

    /* HİÇ KATSAYI YOKSA TOPLAM VERİLMEZ. §15.1: veri yoksa "yeterli veri yok"
       denir, rakam uydurulmaz. */
    if (katsayiliTur === 0) {
      return json({
        ok: true,
        yeterli_veri: false,
        mesaj: "Kazanım katsayıları henüz girilmedi; saat hesaplanmadı.",
        kalemler,
      });
    }

    return json({
      ok: true,
      yeterli_veri: true,
      toplam_dakika: toplamDakika,
      toplam_saat: Math.round((toplamDakika / 60) * 10) / 10,
      // Rakamın niteliği gizlenmez: bu bir TAHMİNDİR, ölçüm değil.
      nitelik: "tahmin",
      aciklama: "Ajanın ürettiği işlerin elle yapılsaydı süreceği tahmini süre. "
        + "Katsayılar yöneticinin girdiği değerlerdir; her kalemin dayanağı listede.",
      kalemler,
    });
  } catch (e) {
    const mesaj = String((e as Error)?.message ?? e);
    console.error("[kazanim-sayaci] genel hata:", mesaj.slice(0, 200));
    return json({ error: mesaj || "Bilinmeyen sistem hatası" }, 500);
  }
});
