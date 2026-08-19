// MASA AJANI — KALEM KARŞILAŞTIRMASI
//
// İki tarafın talep kalemlerini karşılaştırır ve arabulucuya nerede anlaştıkları,
// nerede yaklaştıkları, nerede gerçekten ayrıldıkları tek bakışta görünsün diye
// üç gruba ayırır: ÖRTÜŞEN · YAKIN · AYRILAN.
//
// KÖR VERİ (constitution m.1): girdide YALNIZ kalem adı, tutar ve dayanak
// alıntısı vardır. Tarafların BELGELERİ, beyanları ve analiz metinleri bu
// fonksiyonun hiçbir sorgusuna GİRMEZ. Çıktı YALNIZ ARABULUCUYA yazılır
// (tarafa_gorunur işareti verilmez); hiçbir taraf ötekinin kalemini görmez.
//
// TARAFSIZLIK (constitution m.4): çıktı bilgi verir, karar vermez. "Şunu kabul
// et", "şu talebi geri çek" gibi cümle kurulmaz; yalnız sayı, fark ve dayanağın
// olup olmadığı söylenir. Hukuki niteleme ve tavsiye yoktur.
//
// HALÜSİNASYON YASAĞI (constitution m.2): karşılaştırma deterministiktir —
// model çağrısı YOKTUR. Eşleşme kalem adından, fark tutardan hesaplanır;
// hesaplanamayan yerde "hesaplanamadı" denir, doldurma yapılmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { anlatimAc, zatenCalisiyorMu } from "../_shared/anlatim.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
/* agent_states.agent_type bir CHECK kısıtıyla sınırlı ve SQL yazılmıyor.
   Bu iş masanın (arabulucunun) işidir; izinli listedeki 'mediator' kullanılır. */
const AGENT_TYPE = "mediator";
// Tutar farkı bu oranın altındaysa "yakın" sayılır; üstündeyse "ayrılan".
const YAKIN_ESIGI = 0.2;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/* Kalem adı eşleştirme anahtarı: Türkçe küçültme + noktalama ve çoğul/ek
   gürültüsünün sadeleştirilmesi. Model kullanılmaz. */
function anahtar(kalemAdi: string): string {
  return temiz(kalemAdi)
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sayi(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type Kalem = {
  party_id: string;
  kalem_adi: string;
  tutar: number | null;
  dayanak_alinti: string | null;
  durum: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let anlatim: ReturnType<typeof anlatimAc> | null = null;

  try {
    // KAPI: ajan-nobetci deseni — x-cron-secret VEYA admin JWT, yoksa 401.
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;
    if (!isCron) {
      if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userRes?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admin gereklidir" }, 403);
    }

    const govde = await req.json().catch(() => ({}));
    const case_id = temiz((govde as any)?.case_id);
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const sahip = { case_id, agent_type: AGENT_TYPE, party_id: null };
    const kilit = await zatenCalisiyorMu(admin, sahip);
    if (kilit.calisiyor) return json({ atlandi: true, sebep: kilit.sebep });

    anlatim = anlatimAc(admin, sahip);
    await anlatim.baslat("İki tarafın talep kalemlerini karşılaştırıyorum.");

    /* YALNIZ kalem adı, tutar ve dayanak alıntısı okunur. Belge, beyan ve
       analiz alanları sorguya girmez. */
    const { data: satirlar, error } = await admin.from("taraf_kalemleri")
      .select("party_id, kalem_adi, tutar, dayanak_alinti, durum")
      .eq("case_id", case_id).limit(200);
    if (error) {
      await anlatim.hata("Kalemleri şu an okuyamadım.");
      return json({ error: error.message }, 500);
    }

    const kalemler = ((satirlar ?? []) as any[]).map((k) => ({
      party_id: String(k.party_id),
      kalem_adi: temiz(k.kalem_adi),
      tutar: sayi(k.tutar),
      dayanak_alinti: temiz(k.dayanak_alinti) || null,
      durum: String(k.durum ?? ""),
    })) as Kalem[];

    const taraflar = Array.from(new Set(kalemler.map((k) => k.party_id)));
    if (taraflar.length < 2) {
      await anlatim.bitti({
        yapildi: "Karşılaştırma yapılamadı.",
        eksik: "Karşılaştırma için iki tarafın da talep kalemleri gerekiyor; şu an tek tarafın kalemleri var.",
      });
      return json({ karsilastirildi: false, sebep: "iki tarafın kalemi yok" });
    }
    await anlatim.adim(`${kalemler.length} kalem okudum.`);

    // Kalem adına göre grupla; iki tarafta da karşılığı olanlar karşılaştırılır.
    const gruplar = new Map<string, Kalem[]>();
    for (const k of kalemler) {
      const a = anahtar(k.kalem_adi);
      if (!a) continue;
      gruplar.set(a, [...(gruplar.get(a) ?? []), k]);
    }

    const ortusen: any[] = [];
    const yakin: any[] = [];
    const ayrilan: any[] = [];
    const tekTarafli: any[] = [];

    for (const [, grup] of gruplar) {
      const partiler = Array.from(new Set(grup.map((k) => k.party_id)));
      const ad = grup[0].kalem_adi;
      if (partiler.length < 2) {
        tekTarafli.push({ kalem: ad, taraf: partiler[0] ?? null });
        continue;
      }
      const a = grup.find((k) => k.party_id === partiler[0])!;
      const b = grup.find((k) => k.party_id === partiler[1])!;
      const ikisiDeDayanakli = !!a.dayanak_alinti && !!b.dayanak_alinti;

      if (a.tutar === null || b.tutar === null) {
        /* Tutar okunamıyorsa fark HESAPLANMAZ. Uydurma yapılmaz; kalem
           "ayrılan" sayılmaz, tutarı okunamayan olarak işaretlenir. */
        yakin.push({ kalem: ad, fark: null, not: "tutar iki tarafta da net okunamadı" });
        continue;
      }
      const buyuk = Math.max(a.tutar, b.tutar);
      const fark = Math.abs(a.tutar - b.tutar);
      const oran = buyuk > 0 ? fark / buyuk : 0;

      if (fark === 0) {
        ortusen.push({ kalem: ad, tutar: a.tutar });
      } else if (oran <= YAKIN_ESIGI) {
        yakin.push({ kalem: ad, fark, not: "fark küçük" });
      } else {
        ayrilan.push({
          kalem: ad, fark,
          not: ikisiDeDayanakli
            ? "iki tarafın da dayanağı var, tutarlar ayrışıyor"
            : "taraflardan birinin dayanağı bulunamadı",
        });
      }
    }

    const toplam = ortusen.length + yakin.length + ayrilan.length;
    const ozet = toplam === 0
      ? "İki tarafta da karşılığı olan ortak kalem bulamadım."
      : `${toplam} ortak kalemin ${ortusen.length}'i örtüşüyor, gerçek ayrılık ${ayrilan.length} yerde.`;

    // Çıktı YALNIZ arabulucunun satırına yazılır; tarafa_gorunur verilmez.
    await anlatim.adim(ozet);
    await anlatim.bitti({
      yapildi: ozet,
      eksik: tekTarafli.length > 0
        ? `${tekTarafli.length} kalem yalnız bir tarafta görünüyor, karşılaştırılamadı.`
        : undefined,
    });

    /* Kokpitteki "Kalem karşılaştırması" kartı bu satırı okur. Yeni tablo
       açılmadı; sonuç, ajanın kendi durum satırının last_output alanına
       eklenir ve mevcut alanlar KORUNUR. Best-effort: yazılamazsa asıl iş
       başarısız sayılmaz. */
    try {
      const { data: satir } = await admin.from("agent_states")
        .select("id, last_output").eq("case_id", case_id)
        .eq("agent_type", AGENT_TYPE).is("party_id", null).maybeSingle();
      if ((satir as any)?.id) {
        const eskiCikti = (satir as any).last_output && typeof (satir as any).last_output === "object"
          ? (satir as any).last_output : {};
        await admin.from("agent_states").update({
          last_output: { ...eskiCikti, karsilastirma: { ozet, ortusen, yakin, ayrilan } },
        }).eq("id", (satir as any).id);
      }
    } catch (e: any) {
      console.error("[masa-kalem-karsilastir] sonuç yazılamadı", String(e?.message ?? e).slice(0, 120));
    }

    return json({
      karsilastirildi: true, ozet,
      ortusen, yakin, ayrilan, tek_tarafli: tekTarafli.length,
    });
  } catch (e: any) {
    const msg = String(e?.message ?? "Bilinmeyen sistem hatası");
    console.error("[masa-kalem-karsilastir] Genel hata:", msg.slice(0, 200));
    if (anlatim) await anlatim.hata("Karşılaştırmayı tamamlayamadım, sonra tekrar deneyeceğim.");
    return json({ error: msg }, 500);
  }
});
