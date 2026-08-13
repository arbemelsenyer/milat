// Randevu teklifi: saatleri sunucu seçer, taraf token'lı girişsiz sayfadan cevaplar.
// Kör veri ilkesi: "getir" yalnız seçenekleri, taraf adını ve dosya başlığını döner;
// token'ı bilmeyen hiçbir istek hiçbir veri alamaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Secenek = { gun: string; saat: string };

const GUN_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAAT_RE = /^\d{2}:\d{2}$/;
const TZ = "Europe/Istanbul";

// Sunucu UTC koşar; gün/saat karşılaştırmaları Türkiye saatine göre yapılır.
function bugunTR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}
function suanSaatTR(): string {
  return new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

function normalizeSecenekler(raw: unknown): Secenek[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 3) return null;
  const out: Secenek[] = [];
  for (const s of raw) {
    const gun = String((s as any)?.gun ?? "").slice(0, 10);
    const saat = String((s as any)?.saat ?? "").slice(0, 5);
    if (!GUN_RE.test(gun) || !SAAT_RE.test(saat)) return null;
    out.push({ gun, saat });
  }
  return out;
}

// Saatleri ajan seçer: arabulucunun gelecek müsaitlik aralıkları okunur, bekleyen
// tekliflerde kullanılan saatler dışlanır, taraf tipine göre 1 veya 3 seçenek verilir.
async function saatleriSec(admin: any, caseRow: any, party: any): Promise<{ secenekler: Secenek[]; hata?: string }> {
  const mediatorId = caseRow?.assigned_mediator_id ?? caseRow?.user_id;
  if (!mediatorId) return { secenekler: [], hata: "musaitlik_yok" };

  const bugun = bugunTR();
  const simdi = suanSaatTR();

  const { data: slots } = await admin.from("mediator_availability")
    .select("gun, baslangic")
    .eq("user_id", mediatorId)
    .gte("gun", bugun)
    .order("gun", { ascending: true })
    .order("baslangic", { ascending: true })
    .limit(200);

  // Aynı arabulucunun bekleyen tekliflerinde kullanılan saatler tekrar önerilmez.
  const { data: pending } = await admin.from("randevu_teklifleri")
    .select("secenekler, cases:case_id(assigned_mediator_id, user_id)")
    .eq("durum", "beklemede")
    .limit(500);
  const dolu = new Set<string>();
  for (const row of (pending ?? []) as any[]) {
    const owner = row?.cases?.assigned_mediator_id ?? row?.cases?.user_id;
    if (owner !== mediatorId) continue;
    for (const s of Array.isArray(row?.secenekler) ? row.secenekler : []) {
      dolu.add(`${String(s?.gun ?? "").slice(0, 10)}|${String(s?.saat ?? "").slice(0, 5)}`);
    }
  }

  const bos: Secenek[] = [];
  for (const r of (slots ?? []) as any[]) {
    const gun = String(r.gun).slice(0, 10);
    const saat = String(r.baslangic).slice(0, 5);
    if (gun === bugun && saat <= simdi) continue;       // bugünün geçmiş saatleri
    if (dolu.has(`${gun}|${saat}`)) continue;
    bos.push({ gun, saat });
  }
  if (bos.length === 0) return { secenekler: [], hata: "musaitlik_yok" };

  const bireysel = party?.is_individual === true || party?.party_type === "individual";
  if (bireysel) return { secenekler: [bos[0]] };

  // Kurumsal: en yakın 3 FARKLI günden birer seçenek.
  const secilen: Secenek[] = [];
  const gunler = new Set<string>();
  for (const s of bos) {
    if (gunler.has(s.gun)) continue;
    gunler.add(s.gun);
    secilen.push(s);
    if (secilen.length === 3) break;
  }
  return { secenekler: secilen };
}

// Arabulucu JWT'sini doğrular ve dosya yetkisini kontrol eder.
async function yetkiKontrol(req: Request, admin: any, supabaseUrl: string, anonKey: string, case_id: string, party_id: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { hata: json({ error: "Unauthorized" }, 401) };
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return { hata: json({ error: "Invalid session" }, 401) };

  if (!case_id || !party_id) return { hata: json({ error: "case_id ve party_id zorunlu" }, 400) };

  const { data: c } = await admin.from("cases")
    .select("id, assigned_mediator_id, user_id, application_no")
    .eq("id", case_id).maybeSingle();
  if (!c) return { hata: json({ error: "Dosya bulunamadı" }, 404) };

  const { data: roleRow } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  const allowed = !!roleRow || (c as any).assigned_mediator_id === u.user.id || (c as any).user_id === u.user.id;
  if (!allowed) return { hata: json({ error: "Forbidden" }, 403) };

  const { data: p } = await admin.from("case_parties")
    .select("id, case_id, party_type, is_individual").eq("id", party_id).maybeSingle();
  if (!p || (p as any).case_id !== case_id) return { hata: json({ error: "Taraf bu dosyaya ait değil" }, 400) };

  return { caseRow: c, party: p };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String((body as any)?.action ?? "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    /* ---------- ÖNER — ajanın seçtiği saatler, yazma yok (kart önizlemesi) ---------- */
    if (action === "oner") {
      const case_id = String((body as any)?.case_id ?? "");
      const party_id = String((body as any)?.party_id ?? "");
      const k = await yetkiKontrol(req, admin, supabaseUrl, anonKey, case_id, party_id);
      if ((k as any).hata) return (k as any).hata;
      const { secenekler, hata } = await saatleriSec(admin, (k as any).caseRow, (k as any).party);
      if (hata) return json({ error: hata });
      return json({ secenekler });
    }

    /* ---------- OLUŞTUR — arabulucu JWT'si zorunlu ---------- */
    if (action === "olustur") {
      const case_id = String((body as any)?.case_id ?? "");
      const party_id = String((body as any)?.party_id ?? "");
      const k = await yetkiKontrol(req, admin, supabaseUrl, anonKey, case_id, party_id);
      if ((k as any).hata) return (k as any).hata;

      // Saatleri sunucu seçer; yalnız "Düzenle" akışından gelen liste üste yazar.
      let secenekler: Secenek[];
      if ((body as any)?.secenekler !== undefined) {
        const override = normalizeSecenekler((body as any).secenekler);
        if (!override) return json({ error: "En az 1, en fazla 3 geçerli seçenek gerekir" }, 400);
        secenekler = override;
      } else {
        const r = await saatleriSec(admin, (k as any).caseRow, (k as any).party);
        if (r.hata) return json({ error: r.hata });
        secenekler = r.secenekler;
      }

      const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
      const { error: insErr } = await admin.from("randevu_teklifleri").insert({
        case_id, party_id, token, secenekler, durum: "beklemede",
      } as any);
      if (insErr) return json({ error: insErr.message }, 500);

      // app_url yalnız izinli origin listesinden kabul edilir (açık yönlendirme kapalı).
      const allowedOrigins = (Deno.env.get("APP_ALLOWED_ORIGINS") ??
        "https://medipact-ai.lovable.app,https://id-preview--5ffedb1b-4087-4fe1-a1ef-873c9754f71d.lovable.app")
        .split(",").map((s) => s.trim()).filter(Boolean);
      let baseUrl = allowedOrigins[0];
      const appUrl = (body as any)?.app_url;
      if (appUrl && typeof appUrl === "string") {
        try {
          const parsed = new URL(appUrl);
          const origin = `${parsed.protocol}//${parsed.host}`;
          if (allowedOrigins.includes(origin)) baseUrl = origin;
        } catch { /* geçersiz URL -> varsayılan */ }
      }
      return json({ token, link: `${baseUrl}/randevu/${token}`, secenekler });
    }

    /* ---------- GETİR — yalnız token ---------- */
    if (action === "getir") {
      const token = String((body as any)?.token ?? "");
      if (!token || token.length < 16) return json({ error: "gecersiz" }, 404);

      const { data: row } = await admin.from("randevu_teklifleri")
        .select("id, durum, secenekler, party_id, case_id")
        .eq("token", token).maybeSingle();
      if (!row) return json({ error: "gecersiz" }, 404);
      if ((row as any).durum !== "beklemede") return json({ durum: (row as any).durum });

      const { data: party } = await admin.from("case_parties")
        .select("party_type, first_name, last_name, company_name")
        .eq("id", (row as any).party_id).maybeSingle();
      const { data: c } = await admin.from("cases").select("title").eq("id", (row as any).case_id).maybeSingle();

      const taraf_adi = (party as any)?.party_type === "individual"
        ? `${(party as any)?.first_name ?? ""} ${(party as any)?.last_name ?? ""}`.trim()
        : ((party as any)?.company_name ?? "");

      // Taraf adı ve dosya başlığı dışında hiçbir dosya verisi dönmez.
      return json({
        durum: "beklemede",
        secenekler: (row as any).secenekler ?? [],
        taraf_adi: taraf_adi || null,
        dosya_basligi: (c as any)?.title ?? null,
      });
    }

    /* ---------- CEVAPLA — yalnız token, tek sefer ---------- */
    if (action === "cevapla") {
      const token = String((body as any)?.token ?? "");
      const secimRaw = String((body as any)?.secim ?? "").trim();
      if (!token || token.length < 16) return json({ error: "gecersiz" }, 404);
      if (!secimRaw) return json({ error: "secim zorunlu" }, 400);

      const { data: row } = await admin.from("randevu_teklifleri")
        .select("id, durum, secenekler").eq("token", token).maybeSingle();
      if (!row) return json({ error: "gecersiz" }, 404);
      if ((row as any).durum !== "beklemede") return json({ error: "cevaplanmis" }, 409);

      const secenekler = Array.isArray((row as any).secenekler) ? (row as any).secenekler : [];
      const gecerli = new Set<string>(["uygun", "uymuyor"]);
      for (const s of secenekler) {
        gecerli.add(`${String((s as any)?.gun ?? "").slice(0, 10)} ${String((s as any)?.saat ?? "").slice(0, 5)}`);
      }
      if (!gecerli.has(secimRaw)) return json({ error: "secim gecersiz" }, 400);

      // Yarış durumunda ikinci cevabın yazılmaması için koşul update'in içinde.
      const { data: updated, error: updErr } = await admin.from("randevu_teklifleri")
        .update({ durum: "cevaplandi", secilen: secimRaw, cevap_zamani: new Date().toISOString() } as any)
        .eq("token", token).eq("durum", "beklemede").select("id");
      if (updErr) return json({ error: updErr.message }, 500);
      if (!updated || updated.length === 0) return json({ error: "cevaplanmis" }, 409);

      return json({ ok: true });
    }

    return json({ error: "Bilinmeyen eylem" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
