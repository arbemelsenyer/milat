// USULE İLİŞKİN ENGEL KONTROL LİSTESİ (İBA 2.4).
//
// Ajan KANUN YORUMU YAPMAZ, EKSİK SAYAR. Hüküm cümlesi kurulmaz; yalnız hangi
// tarafta hangi alanın boş olduğu somut olarak yazılır.
//
// YAPAY ZEKÂ ÇAĞRISI YOKTUR — tamamı koddan hesaplanır (bedava kol). Bu yüzden
// nöbetçinin tur başına 3 ücretli çağrı sınırına dahil değildir.
//
// Referans alanı: emin olunamayan hiçbir madde numarası YAZILMAZ, alan boş kalır
// (constitution m.2 — uydurma künye yasağı).
//
// Çıktı usul_engelleri tablosuna yazılır; tarafa SELECT politikası YOKTUR,
// tarafa gösterilmez, bildirim gönderilmez.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SURE_ESIGI_GUN = 15;
const EPOSTA_DESENI = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* ── AJAN DURUM YAZIMI (Ajan Kontrol Paneli) ─────────────────────────────────
   Durum yazımı asıl işi ASLA bozmaz: try/catch içinde, hata yutulur ve loglanır.
   Aynı case_id + agent_type için TEK satır güncellenir; tarafa_gorunur alanına
   dokunulmaz (varsayılan false). */
const AGENT_TYPE = "usul_engeli";
async function durumYaz(admin: any, caseId: string, patch: Record<string, unknown>) {
  if (!admin || !caseId) return;
  try {
    const { data: mevcut } = await admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE).is("party_id", null).maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcut?.id) await admin.from("agent_states").update(govde).eq("id", mevcut.id);
    else await admin.from("agent_states")
      .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: null, ...govde });
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

function tarafAdi(p: any): string {
  const ad = temiz(p?.company_name)
    || `${temiz(p?.first_name)} ${temiz(p?.last_name)}`.trim()
    || temiz(p?.full_name)
    || "Taraf";
  const rol = temiz(p?.party_role);
  const rolEtiket = rol === "applicant" ? "başvurucu" : rol === "respondent" ? "karşı taraf" : rol || "taraf";
  return `${ad} (${rolEtiket})`;
}

// Belge adında aranan kalıp — belge İÇERİĞİNE bakılmaz, yalnız ad eşleşmesi.
function belgeVarMi(docs: any[], partyId: string, desen: RegExp): boolean {
  return docs.some((d) => {
    const ayniTaraf = !d.party_id || String(d.party_id) === String(partyId);
    return ayniTaraf && desen.test(temiz(d.file_name));
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Hata dalında da durum yazılabilmesi için asıl iş içinde doldurulur.
  let durumAdmin: any = null;
  let durumCaseId = "";

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

    // İç çağrı kapısı: nöbetçi ajan bu fonksiyonu x-cron-secret ile çağırabilir;
    // dışarıdan gelen isteklerde kullanıcı yetkisi aranır. Anahtar tanımsız ya da
    // boşsa kapı KAPALIDIR (güvenli taraf). Kalıp guc-dengesi/elverislilik ile aynı.
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    const authHeader = req.headers.get("Authorization");
    if (!isCron && !authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    let userId = "";
    if (!isCron) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      userId = userData.user.id;
    }

    const body = await req.json().catch(() => ({}));
    const case_id = temiz((body as any)?.case_id);
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, mediation_type, deadline_total, deadline_extended")
      .eq("id", case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf çağıramaz.
    // İç çağrıda (nöbetçi) kullanıcı yoktur; bu blok atlanır.
    if (!isCron) {
      const { data: roleRow } = await admin.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      const yetkili = (caseRow as any).assigned_mediator_id === userId
        || (caseRow as any).user_id === userId
        || !!roleRow;
      if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);
    }

    durumAdmin = admin;
    durumCaseId = case_id;
    await durumYaz(durumAdmin, durumCaseId, { status: "running", error_message: null });

    const { data: partiesRaw, error: pErr } = await admin.from("case_parties")
      .select("id, party_role, party_type, first_name, last_name, company_name, full_name, email, address, phone, gsm, authorized_person, vekil_ad_soyad")
      .eq("case_id", case_id).order("created_at").limit(30);
    if (pErr) return json({ error: pErr.message }, 500);
    const taraflar = (partiesRaw ?? []) as any[];

    const { data: docsRaw } = await admin.from("case_documents")
      .select("file_name, party_id").eq("case_id", case_id).limit(200);
    const belgeler = (docsRaw ?? []) as any[];

    type Engel = { baslik: string; tespit: string; referans: string };
    const engeller: Engel[] = [];

    for (const p of taraflar) {
      const ad = tarafAdi(p);
      const tuzel = temiz(p.party_type) === "corporate";

      // a) VEKALETNAME — vekil kaydı varsa aranır; vekil yoksa eksik DEĞİLDİR.
      const vekil = temiz(p.vekil_ad_soyad);
      if (vekil && !belgeVarMi(belgeler, p.id, /vekalet|vekâlet/i)) {
        engeller.push({
          baslik: "Vekaletname dosyada görünmüyor",
          tespit: `${ad} için vekil kaydı var (${vekil}); dosyada adında "vekaletname" geçen belge bulunmuyor.`,
          referans: "",
        });
      }

      // b) TÜZEL KİŞİDE İMZA/TEMSİL YETKİLİSİ — belge içeriğine BAKILMAZ.
      if (tuzel && !temiz(p.authorized_person)) {
        engeller.push({
          baslik: "Temsil/imza yetkilisi kayıtlı değil",
          tespit: `${ad} tüzel kişi olarak kayıtlı; yetkili kişi alanı boş — yetki belgeden kontrol edilmeli.`,
          referans: "",
        });
      }

      // c) TEBLİGATA ESAS İLETİŞİM BİLGİSİ — hangi alanın boş olduğu yazılır.
      const eposta = temiz(p.email);
      const adres = temiz(p.address);
      const telefon = temiz(p.gsm) || temiz(p.phone);
      const eksikler: string[] = [];
      if (!adres) eksikler.push("tebligat adresi boş");
      if (!eposta) eksikler.push("e-posta boş");
      else if (!EPOSTA_DESENI.test(eposta)) eksikler.push(`e-posta biçimi geçersiz görünüyor (${eposta})`);
      if (!telefon) eksikler.push("telefon boş");
      if (eksikler.length > 0) {
        engeller.push({
          baslik: "Tebligata esas iletişim bilgisi eksik",
          tespit: `${ad}: ${eksikler.join(" · ")}.`,
          referans: "",
        });
      }
    }

    // d) SÜRE — dosyada son tarih varsa kalan gün hesaplanır; süre yoksa yazılmaz.
    const sonTarih = temiz((caseRow as any).deadline_extended) || temiz((caseRow as any).deadline_total);
    if (sonTarih) {
      const t = new Date(sonTarih).getTime();
      if (Number.isFinite(t)) {
        const kalan = Math.ceil((t - Date.now()) / 86400000);
        if (kalan < SURE_ESIGI_GUN) {
          const tarihMetni = new Date(sonTarih).toLocaleDateString("tr-TR");
          engeller.push({
            baslik: kalan >= 0 ? "Yasal süre daralıyor" : "Yasal süre dolmuş görünüyor",
            tespit: kalan >= 0
              ? `Dosya süre kaydındaki son tarih ${tarihMetni}; bugüne ${kalan} gün kaldı (eşik: ${SURE_ESIGI_GUN} gün).`
              : `Dosya süre kaydındaki son tarih ${tarihMetni}; süre ${Math.abs(kalan)} gün önce dolmuş görünüyor.`,
            referans: "",
          });
        }
      }
    }

    const durum = engeller.length > 0 ? "engel_var" : "engel_yok";
    const satir = { case_id, durum, engeller, updated_at: new Date().toISOString() };
    const { error: yErr } = await admin.from("usul_engelleri").upsert(satir, { onConflict: "case_id" });
    if (yErr) {
      await durumYaz(durumAdmin, durumCaseId, { status: "failed", error_message: yErr.message });
      return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);
    }

    await durumYaz(durumAdmin, durumCaseId, {
      status: "completed", error_message: null,
      last_output: { sonuc: durum, engel: engeller.length, taraf: taraflar.length },
    });
    return json({ durum, engel: engeller.length });
  } catch (e: any) {
    console.error("[usul-engeli] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, {
      status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500),
    });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
