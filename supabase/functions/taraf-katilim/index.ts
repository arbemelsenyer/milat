// İlk temas / katılım teyidi: taraf, dosya açılışında gönderilen bilgilendirme
// e-postasındaki tek dokunuşluk bağlantıdan "Katılıyorum / Katılmıyorum / Bilgi
// istiyorum" cevabını verir. Sayfa GİRİŞSİZDİR ve yalnız token ile çalışır.
// Kör veri ilkesi: "getir" yalnız tarafın kendi adını, dosya künyesini (no + konu
// başlığı) ve arabulucunun adını döner; karşı tarafa ait hiçbir veri dönmez.
// Cevap tek kullanımlıktır: durum 'beklemede' değilse ikinci cevap kabul edilmez.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GECERLI_CEVAPLAR = new Set(["katiliyor", "katilmiyor", "bilgi_istiyor"]);

function tarafAdi(p: any): string {
  return p?.party_type === "individual"
    ? `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim()
    : String(p?.company_name ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String((body as any)?.action ?? "");
    const token = String((body as any)?.token ?? "");
    if (!token || token.length < 16) return json({ error: "gecersiz" }, 404);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: taraf } = await admin.from("case_parties")
      .select("id, case_id, party_type, first_name, last_name, company_name, katilim_durumu")
      .eq("katilim_token", token).maybeSingle();
    if (!taraf) return json({ error: "gecersiz" }, 404);

    const { data: dosya } = await admin.from("cases")
      .select("id, application_no, title, assigned_mediator_id, user_id")
      .eq("id", (taraf as any).case_id).maybeSingle();
    const arabulucuId = (dosya as any)?.assigned_mediator_id ?? (dosya as any)?.user_id ?? "";
    const { data: profil } = arabulucuId
      ? await admin.from("profiles").select("full_name").eq("user_id", arabulucuId).maybeSingle()
      : { data: null };
    const adSoyad = String((profil as any)?.full_name ?? "").trim();
    const arabulucu = adSoyad ? (/^arb\.?\s/i.test(adSoyad) ? adSoyad : `Arb. ${adSoyad}`) : "";

    /* ---------- GETİR — yalnız token; tarafın kendi künyesi ---------- */
    if (action === "getir") {
      return json({
        taraf_adi: tarafAdi(taraf),
        dosya_no: (dosya as any)?.application_no ?? null,
        konu: (dosya as any)?.title ?? null,
        arabulucu,
        durum: String((taraf as any).katilim_durumu ?? "beklemede"),
      });
    }

    /* ---------- CEVAPLA — tek kullanımlık ---------- */
    if (action === "cevapla") {
      const secim = String((body as any)?.secim ?? "").trim();
      if (!GECERLI_CEVAPLAR.has(secim)) return json({ error: "secim gecersiz" }, 400);
      if (String((taraf as any).katilim_durumu ?? "beklemede") !== "beklemede") {
        return json({ error: "cevaplanmis" }, 409);
      }
      // Yarış durumunda ikinci cevabın yazılmaması için koşul update'in içinde.
      const { data: updated, error } = await admin.from("case_parties")
        .update({ katilim_durumu: secim, katilim_zamani: new Date().toISOString() } as any)
        .eq("id", (taraf as any).id)
        .eq("katilim_durumu", "beklemede")
        .select("id");
      if (error) return json({ error: error.message }, 500);
      if (!updated || updated.length === 0) return json({ error: "cevaplanmis" }, 409);
      return json({ ok: true, durum: secim });
    }

    return json({ error: "bilinmeyen eylem" }, 400);
  } catch (e: any) {
    console.error("[taraf-katilim] hata", e?.message ?? e);
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
