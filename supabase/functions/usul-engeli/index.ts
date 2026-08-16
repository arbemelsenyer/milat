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

/* ── MADDE REFERANSI (16.08) ──────────────────────────────────────────────────
   Madde referansı bilgi tabanındaki kanun metninden çekilir; koda sabit madde
   numarası yazılmaz (kanun değişirse yanlış kalır). Arama madde numarasıyla değil
   KAVRAMLA yapılır: her başlık için ayırt edici ifadeler sırayla denenir, ilk
   eşleşen parçadan referans üretilir.
   Doğrulama: alıntı, çekildiği parçada birebir geçmiyorsa referans BOŞ bırakılır.
   Madde numarası yakalanamazsa yalnız kaynak adı ve alıntı yazılır — numara ASLA
   tahmin edilmez. Kaynakta karşılık yoksa referans boş kalır, eksik satırı yine
   gösterilir. Bu bölüm model çağırmaz; kol ücretsiz kalır. */
/* 16.08 DÜZELTME (canlı bulgu): atıf kaynağı olarak eğitim modülü kullanılmıştı
   ("Uzman Arabuluculuk - Sağlık"). Artık referans YALNIZ MEVZUAT metninden alınır:
   iki temel kaynak + adında "sayılı" geçen ve "Kanun"/"Yönetmelik" ile künyelenen
   diğer mevzuat kayıtları. Uzmanlık/eğitim modülleri (Uzman Arabuluculuk - … ·
   Aile Arabuluculuğu · ADB Yayını · Modül) atıf kaynağı DEĞİLDİR. */
const TEMEL_KAYNAKLAR = [
  "6325 Sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu",
  "Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu Yönetmeliği",
];

const EGITIM_KAYNAK_ISARETLERI = [
  "uzman arabuluculuk", "aile arabuluculuğu", "adb yayını", "adb yayini",
  "modül", "modul", "eğitim", "egitim", "rehber", "el kitabı", "el kitabi",
];

function mevzuatKaynagiMi(baslik: string): boolean {
  const ad = temiz(baslik);
  if (!ad) return false;
  if (TEMEL_KAYNAKLAR.includes(ad)) return true;
  const k = ad.toLocaleLowerCase("tr-TR");
  if (EGITIM_KAYNAK_ISARETLERI.some((x) => k.includes(x))) return false;
  const kanunMu = k.includes("kanun") || k.includes("yönetmel") || k.includes("yonetmel");
  return k.includes("sayılı") || k.includes("sayili") ? kanunMu : false;
}

// Kavram aramaları — madde numarası DEĞİL, ifade aranır. Sıra önemlidir: ilk
// eşleşen kullanılır, hiçbiri tutmazsa referans boş kalır.
const IFADELER_TEMSIL = [
  "kanuni temsilcileri veya avukatları", "kanunî temsilcileri veya avukatları",
  "avukatları", "kanuni temsilci", "kanunî temsilci", "vekâletname", "vekaletname", "temsilci",
];
const IFADELER_TEBLIGAT = [
  "iletişim vasıtası", "davet", "bildirim", "tebligat", "elektronik posta",
];
const IFADELER_SURE = [
  "dava şartı", "dava şartıdır", "süresi içinde sonuçland", "başvuru tarihinden itibaren",
];

/* 16.08 DÜZELTME (canlı bulgu): ekrana "taraflar biz - zat" gibi kelimesi bölünmüş
   alıntı çıkmıştı (PDF metin çıkarma kırığı). Parça ÖNCE onarılır: satır sonu
   tiresi ve harf-boşluk-tire-boşluk-harf birleştirilir, fazla boşluk toplanır.
   Onarımdan sonra hâlâ kırık görünüyorsa (yalnız başına duran tek harfler) o parça
   KULLANILMAZ, aynı kavram için başka parça denenir. */
function metniOnar(metin: string): string {
  return temiz(metin)
    .replace(/([\p{L}])\s*[-‐‑]\s*\r?\n\s*([\p{L}])/gu, "$1$2")
    .replace(/([\p{L}])\s+[-‐‑]\s+([\p{L}])/gu, "$1$2")
    .replace(/\r?\n/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Onarımdan sonra hâlâ kırık mı? Yalnız başına duran tek harf sayısına bakılır.
function metinKirikMi(metin: string): boolean {
  const tekHarfler = metin.match(/(?<=\s)[\p{L}](?=\s)/gu) ?? [];
  return tekHarfler.length > 2;
}

// Alıntının kaynak parçada gerçekten geçtiğini doğrular (sadeleştirilmiş karşılaştırma).
function sadeKarsilastir(metin: string): string {
  return temiz(metin)
    .replace(/[-‐‑]\s*\r?\n\s*/g, "")
    .replace(/\r?\n/g, " ")
    .toLocaleLowerCase("tr-TR")
    .replace(/[şŞ]/g, "s").replace(/[ıİiI]/g, "i").replace(/[ğĞ]/g, "g")
    .replace(/[çÇ]/g, "c").replace(/[öÖ]/g, "o").replace(/[üÜ]/g, "u")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Eşleşmenin geçtiği CÜMLE — en çok bir cümle, 200 karakter.
function cumleAl(metin: string, indeks: number): string {
  let bas = 0;
  for (let i = indeks; i >= 1; i--) {
    const c = metin[i - 1];
    if ((c === "." || c === "\n") && /\s/.test(metin[i] ?? " ")) { bas = i; break; }
  }
  let son = metin.length;
  for (let i = indeks; i < metin.length; i++) {
    const c = metin[i];
    if ((c === "." || c === "\n") && /\s|$/.test(metin[i + 1] ?? " ")) { son = i + 1; break; }
  }
  const parca = metin.slice(bas, son).trim().replace(/\s+/g, " ");
  return parca.length > 200 ? `${parca.slice(0, 197)}…` : parca;
}

/* 16.08 DÜZELTME (canlı bulgu): süre satırında "MADDE 3" yazılmıştı ama alıntı
   GEÇİCİ MADDE 3'ten geliyordu. Artık başlık türü de yakalanır: GEÇİCİ MADDE ve
   EK MADDE ayrı yazılır, asla düz "MADDE" sayılmaz. Alıntının İÇİNDE başka bir
   madde başlığı varsa numara GÜVENSİZ sayılır ve hiç yazılmaz. */
const MADDE_DESENI = /(GEÇİCİ\s+MADDE|GECICI\s+MADDE|EK\s+MADDE|MADDE)\s*(\d+(?:\s*\/\s*[A-ZÇĞİÖŞÜ])?)/gi;

function basligiBicimle(tur: string, no: string): string {
  const t = tur.toLocaleUpperCase("tr-TR").replace(/\s+/g, " ").trim();
  const duzeltilmis = t.startsWith("GEC") || t.startsWith("GEÇ")
    ? "GEÇİCİ MADDE"
    : t.startsWith("EK") ? "EK MADDE" : "MADDE";
  return `${duzeltilmis} ${String(no).replace(/\s+/g, "")}`;
}

// Eşleşmeden ÖNCE gelen en yakın madde başlığı; güvensizse boş döner.
function maddeBasligi(metin: string, indeks: number, alinti: string): string {
  const onceki = metin.slice(0, indeks);
  const eslesmeler = [...onceki.matchAll(MADDE_DESENI)];
  if (eslesmeler.length === 0) return "";
  // Alıntı bir madde başlığı içeriyorsa hangi maddeye ait olduğu belirsizdir.
  if (new RegExp(MADDE_DESENI.source, "i").test(alinti)) return "";
  const son = eslesmeler[eslesmeler.length - 1];
  return basligiBicimle(String(son[1]), String(son[2]));
}

// Kavram aramasıyla referans üretir. Bulunamazsa BOŞ döner.
async function referansBul(admin: any, ifadeler: string[]): Promise<string> {
  for (const ifade of ifadeler) {
    const { data, error } = await admin.from("knowledge_base_chunks")
      .select("source_title, chunk_text")
      .ilike("chunk_text", `%${ifade}%`)
      .limit(20);
    if (error) {
      console.error(`[usul-engeli] bilgi tabanı okunamadı (${ifade}): ${error.message}`);
      continue;
    }
    for (const r of ((data ?? []) as any[])) {
      // 1) Kaynak süzgeci: yalnız mevzuat. Eğitim/uzmanlık modülü atıf kaynağı değil.
      if (!mevzuatKaynagiMi(r.source_title)) continue;
      // 2) Parça ÖNCE onarılır; kırık kalırsa bu parça kullanılmaz.
      const metin = metniOnar(String(r.chunk_text ?? ""));
      if (!metin || metinKirikMi(metin)) continue;
      const indeks = metin.toLocaleLowerCase("tr-TR").indexOf(ifade.toLocaleLowerCase("tr-TR"));
      if (indeks < 0) continue;
      const alinti = cumleAl(metin, indeks);
      if (!alinti || metinKirikMi(alinti)) continue;
      // 3) Doğrulama: alıntı (onarılmış) parçada birebir geçmeli.
      if (!sadeKarsilastir(metin).includes(sadeKarsilastir(alinti))) continue;
      // 4) Madde numarası güvenli değilse hiç yazılmaz — yalnız kaynak adı + alıntı.
      const madde = maddeBasligi(metin, indeks, alinti);
      const kaynak = temiz(r.source_title) || "Bilgi tabanı kaydı";
      return madde
        ? `${kaynak} ${madde} — “${alinti}”`
        : `${kaynak} — “${alinti}”`;
    }
  }
  return "";
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
      .select("id, user_id, assigned_mediator_id, mediation_type, deadline_total, deadline_extended, dispute_type, dispute_subtype")
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

    // Her başlık için referans BİR KEZ aranır (satır sayısı kadar sorgu yapılmaz).
    // Kaynak süzgeci sorgunun İÇİNDE değil, sonucun üstünde çalışır: yalnız mevzuat
    // kayıtları kabul edilir (bkz. mevzuatKaynagiMi).
    const [refTemsil, refTebligat, refSure] = await Promise.all([
      referansBul(admin, IFADELER_TEMSIL),
      referansBul(admin, IFADELER_TEBLIGAT),
      referansBul(admin, IFADELER_SURE),
    ]);
    // Kaç başlıkta güvenli referans bulunamadığı dönüş özetinde görünür.
    const referansBos = [refTemsil, refTebligat, refSure].filter((x) => !x).length;

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
          referans: refTemsil,
        });
      }

      // b) TÜZEL KİŞİDE İMZA/TEMSİL YETKİLİSİ — belge içeriğine BAKILMAZ.
      if (tuzel && !temiz(p.authorized_person)) {
        engeller.push({
          baslik: "Temsil/imza yetkilisi kayıtlı değil",
          tespit: `${ad} tüzel kişi olarak kayıtlı; yetkili kişi alanı boş — yetki belgeden kontrol edilmeli.`,
          referans: refTemsil,
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
          referans: refTebligat,
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
            referans: refSure,
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
      last_output: {
        sonuc: durum, engel: engeller.length, taraf: taraflar.length,
        referans_bos: referansBos,
      },
    });
    return json({ durum, engel: engeller.length, referans_bos: referansBos });
  } catch (e: any) {
    console.error("[usul-engeli] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, {
      status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500),
    });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
