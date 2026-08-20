// AJAN — BİLİRKİŞİ SEÇİM AKIŞI (beyan · aday · sunum · yanıt · atama · evrak)
//
// Bu fonksiyon canlıda KURULU beş tablonun üzerine oturur; tablo, politika ya da
// tetikleyici KURMAZ (komut: SQL yazma · migration yok · politika yok).
//
// ═══ İNSAN KAPISI (constitution m.3 · m.5) ═══════════════════════════════════
// HİÇBİR KOŞULDA yapay zekâ tek başına bilirkişi ATAMAZ. 'sistem_oneri' beyanı
// verilmiş olsa bile son dokunuş arabulucudadır: 'ata' ve 'evrak_onayla'
// adımları YALNIZ arabulucunun (ya da dosya sahibinin/yöneticinin) oturumuyla
// çalışır; iç çağrı kapısından (cron/akış) çağrılamaz. Ajan yalnız aday çıkarır,
// sunar, yazar ve hatırlatır.
//
// ═══ KÖR VERİ (constitution m.1) ═════════════════════════════════════════════
// Taraf, karşı tarafın yanıtını GÖRMEZ. Süzme SORGUDADIR: 'liste' adımı taraf
// için çalışırken karşı tarafın satırları sorguya yalnız İKİ TARAF DA
// gosterim_izni verdiyse girer; ekranda gizleme yapılmaz.
// experts tablosunu taraf OKUYAMAZ (canlı politika: yalnız yönetici ve görevli
// arabulucu). Bu yüzden aday profili tarafa BURADAN, sunucudan verilir.
//
// ═══ HALÜSİNASYON YASAĞI (constitution m.2) ══════════════════════════════════
// Eşleşme gerekçesi UYDURULMAZ: yalnız uzmanın kendi kaydındaki uzmanlık/alt
// alan metniyle, istenen alan ve dosyanın kayıtlı uyuşmazlık türü arasında
// GERÇEKTEN örtüşen ifadelerden kurulur. Örtüşme yoksa aday yazılmaz;
// "uygun aday bulamadım" denir ve dış aday yolu açılır.
//
// ═══ TARAFSIZLIK (constitution m.4) ══════════════════════════════════════════
// Ajan "bu uzman daha iyidir" DEMEZ; "şu alanla örtüşüyor" der. Ücret yorumu,
// tarafgirlik yorumu, kişilik yorumu üretilmez.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { anlatimAc, anaAjanaBildir, sinirdanGecir, devirYaz } from "../_shared/anlatim.ts";
import { olayYaz } from "../_shared/olay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const AGENT_TYPE = "mediator"; // masa ajanı — izinli agent_type listesinden

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function metin(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/* ── DETERMİNİSTİK EŞLEŞME ───────────────────────────────────────────────────
   Sıralama modele bırakılmaz; ölçülebilir dört ölçüte göre yapılır:
   (1) alan/alt alan örtüşmesi → (2) tecrübe yılı → (3) puan → (4) şehir.
   Dosyada şehir kaydı YOKTUR (cases tablosunda şehir alanı yok), bu yüzden
   şehir yalnız son eşitlik bozucudur: alfabetik. Bu bir kalite yargısı değildir. */
function kucuk(v: unknown): string {
  return String(v ?? "").toLocaleLowerCase("tr-TR");
}

function kelimeler(v: unknown): string[] {
  return kucuk(v)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((k) => k.length >= 3);
}

type Aday = {
  uzman: any;
  puan: number;
  ortusenler: string[];
  gerekce: string;
};

function adaylariSirala(
  uzmanlar: any[], alan: string, dosyaKonusu: string, disarida: Set<string>,
): Aday[] {
  const alanKelimeleri = new Set(kelimeler(alan));
  const konuKelimeleri = new Set(kelimeler(dosyaKonusu));
  const cikti: Aday[] = [];

  for (const u of uzmanlar) {
    if (disarida.has(String(u.id))) continue;
    const altAlan = kelimeler(u.niche_area);
    const uzmanlik = kelimeler(u.specialization);

    let puan = 0;
    const ortusenler: string[] = [];
    // Alt alan örtüşmesi daha güçlü sayılır (3), uzmanlık alanı (2).
    for (const kel of altAlan) {
      if (alanKelimeleri.has(kel)) { puan += 3; ortusenler.push(kel); }
      else if (konuKelimeleri.has(kel)) { puan += 2; ortusenler.push(kel); }
    }
    for (const kel of uzmanlik) {
      if (alanKelimeleri.has(kel)) { puan += 2; ortusenler.push(kel); }
      else if (konuKelimeleri.has(kel)) { puan += 1; ortusenler.push(kel); }
    }
    if (puan <= 0) continue; // UYDURMA YASAK: örtüşme yoksa aday değildir.

    const benzersiz = Array.from(new Set(ortusenler));
    const kaynak = benzersiz.some((x) => alanKelimeleri.has(x))
      ? "istenen alan"
      : "dosyanın kayıtlı uyuşmazlık türü";
    const gerekce = sinirdanGecir(
      `Uzmanlık alanı "${metin(u.specialization)}", alt alanı "${metin(u.niche_area)}"; `
      + `${kaynak} ile örtüşen ifadeler: ${benzersiz.slice(0, 6).join(", ")}. `
      + `Kayıtlı tecrübe: ${Number(u.years_experience ?? 0)} yıl.`,
      "bilirkisi-secim.gerekce",
    );
    cikti.push({ uzman: u, puan, ortusenler: benzersiz, gerekce });
  }

  cikti.sort((a, b) =>
    (b.puan - a.puan)
    || (Number(b.uzman.years_experience ?? 0) - Number(a.uzman.years_experience ?? 0))
    || (Number(b.uzman.rating ?? 0) - Number(a.uzman.rating ?? 0))
    || kucuk(a.uzman.city).localeCompare(kucuk(b.uzman.city), "tr")
    || kucuk(a.uzman.full_name).localeCompare(kucuk(b.uzman.full_name), "tr"));
  return cikti;
}

/** Tarafa/arabulucuya gösterilecek profil kartı. E-posta ve telefon GEÇMEZ. */
function profilKarti(u: any) {
  return {
    id: u.id,
    full_name: u.full_name,
    title: u.title ?? null,
    specialization: u.specialization,
    niche_area: u.niche_area,
    years_experience: u.years_experience ?? null,
    city: u.city ?? null,
    hourly_rate: u.hourly_rate ?? null,
    bio: u.bio ?? null,
    rating: u.rating ?? null,
  };
}

type Kimlik = {
  rol: "arabulucu" | "taraf" | "ic_cagri";
  user_id: string | null;
  party_id: string | null;
};

async function kimlikCoz(
  admin: any, req: Request, caseId: string,
): Promise<Kimlik | { hata: string; kod: number }> {
  const cronHeader = req.headers.get("x-cron-secret");
  if (!!CRON_SECRET && cronHeader === CRON_SECRET) {
    return { rol: "ic_cagri", user_id: null, party_id: null };
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { hata: "Oturum doğrulanamadı", kod: 401 };
  const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  const uid = userRes?.user?.id;
  if (!uid) return { hata: "Oturum doğrulanamadı", kod: 401 };

  const { data: dosya } = await admin.from("cases")
    .select("id, user_id, assigned_mediator_id").eq("id", caseId).maybeSingle();
  if (!dosya) return { hata: "Dosya bulunamadı", kod: 404 };

  const { data: yonetici } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (yonetici || (dosya as any).assigned_mediator_id === uid || (dosya as any).user_id === uid) {
    return { rol: "arabulucu", user_id: uid, party_id: null };
  }

  const { data: taraf } = await admin.from("case_parties")
    .select("id").eq("case_id", caseId).eq("user_id", uid).maybeSingle();
  if (taraf) return { rol: "taraf", user_id: uid, party_id: String((taraf as any).id) };

  return { hata: "Bu dosyaya erişiminiz yok", kod: 403 };
}

/** Beyanlar okunur; katılımcı yöntem kuralı burada tek yerde uygulanır. */
async function beyanlariOku(admin: any, caseId: string) {
  const { data: taraflar } = await admin.from("case_parties")
    .select("id, party_role, user_id").eq("case_id", caseId).limit(50);
  const { data: beyanlar } = await admin.from("bilirkisi_secim_beyani")
    .select("party_id, secim_yontemi, tikanma_halinde_arabulucu, masraf_kabul, created_at")
    .eq("case_id", caseId).limit(50);
  const harita = new Map<string, any>();
  for (const b of (beyanlar ?? []) as any[]) harita.set(String(b.party_id), b);
  const liste = ((taraflar ?? []) as any[]).map((t) => ({
    party_id: String(t.id),
    party_role: t.party_role,
    user_id: t.user_id ?? null,
    beyan: harita.get(String(t.id)) ?? null,
  }));
  /* KATILIMCI YÖNTEM: taraflar farklı yöntem seçtiyse liste İKİSİNE DE gider.
     Kimse seçmeye zorlanmaz, kimsenin seçme hakkı da kaldırılmaz. */
  const hepsiArabulucu = liste.length > 0
    && liste.every((t) => t.beyan && t.beyan.secim_yontemi === "arabulucu");
  const tikanmaYetkisi = liste.some((t) => t.beyan?.tikanma_halinde_arabulucu === true);
  return { taraflar: liste, hepsiArabulucu, tikanmaYetkisi };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let anlatim: ReturnType<typeof anlatimAc> | null = null;

  try {
    const govde = await req.json().catch(() => ({}));
    const case_id = metin((govde as any)?.case_id);
    const adim = metin((govde as any)?.adim) || "ilerlet";
    const alan = metin((govde as any)?.alan);
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const kimlik = await kimlikCoz(admin, req, case_id);
    if ((kimlik as any).hata) return json({ error: (kimlik as any).hata }, (kimlik as any).kod);
    const k = kimlik as Kimlik;

    const { data: dosya } = await admin.from("cases")
      .select("id, application_no, dispute_type, dispute_subtype, title, assigned_mediator_id, user_id")
      .eq("id", case_id).maybeSingle();
    if (!dosya) return json({ error: "Dosya bulunamadı" }, 404);
    const dosyaKonusu = [metin((dosya as any).dispute_type), metin((dosya as any).dispute_subtype)]
      .filter(Boolean).join(" ");

    // ───────────────────────────────────────────────────────────── 1) BEYAN
    if (adim === "beyan_yaz") {
      if (k.rol !== "taraf" || !k.party_id) return json({ error: "Beyanı yalnız tarafın kendisi verir" }, 403);
      const yontem = metin((govde as any)?.secim_yontemi);
      if (!["taraflar", "arabulucu", "sistem_oneri"].includes(yontem)) {
        return json({ error: "secim_yontemi: taraflar | arabulucu | sistem_oneri" }, 400);
      }
      const satir = {
        case_id, party_id: k.party_id,
        secim_yontemi: yontem,
        tikanma_halinde_arabulucu: (govde as any)?.tikanma_halinde_arabulucu === true,
        masraf_kabul: (govde as any)?.masraf_kabul === true,
      };
      const { data: mevcut } = await admin.from("bilirkisi_secim_beyani")
        .select("id").eq("case_id", case_id).eq("party_id", k.party_id).maybeSingle();
      const { error } = mevcut
        ? await admin.from("bilirkisi_secim_beyani").update(satir).eq("id", (mevcut as any).id)
        : await admin.from("bilirkisi_secim_beyani").insert(satir);
      if (error) return json({ error: `Beyan yazılamadı: ${error.message}` }, 500);

      await olayYaz(admin, {
        case_id, party_id: k.party_id, olay_kodu: "bilirkisi_beyani_verildi",
        veri: { secim_yontemi: yontem },
      });
      return json({ ok: true, beyan: satir });
    }

    if (adim === "beyanim") {
      if (k.rol !== "taraf" || !k.party_id) return json({ error: "Bu adım tarafındır" }, 403);
      const { data } = await admin.from("bilirkisi_secim_beyani")
        .select("secim_yontemi, tikanma_halinde_arabulucu, masraf_kabul, created_at")
        .eq("case_id", case_id).eq("party_id", k.party_id).maybeSingle();
      return json({ ok: true, beyan: data ?? null });
    }

    if (adim === "beyanlar") {
      // Beyanların TAMAMI yalnız arabulucuya açıktır (kim ne dedi bilgisi).
      if (k.rol === "taraf") return json({ error: "Bu döküm arabulucunundur" }, 403);
      const b = await beyanlariOku(admin, case_id);
      return json({ ok: true, ...b });
    }

    // ─────────────────────────────────────────────── 2) ALAN + ADAY ÇIKARMA
    if (adim === "aday_cikar" || adim === "ikinci_tur") {
      if (k.rol === "taraf") return json({ error: "Aday çıkarma masa ajanının işidir" }, 403);
      if (!alan) return json({ error: "alan gerekli" }, 400);

      anlatim = anlatimAc(admin, { case_id, agent_type: AGENT_TYPE, party_id: null });
      await anlatim.baslat(`"${alan}" alanı için uzman kayıtlarını tarıyorum.`);

      const { data: mevcutOneriler } = await admin.from("bilirkisi_onerileri")
        .select("expert_id, sira, durum").eq("case_id", case_id).eq("alan", alan).limit(200);
      const disarida = new Set(((mevcutOneriler ?? []) as any[]).map((r) => String(r.expert_id)));
      const oncekiSayi = disarida.size;

      const { data: uzmanlar, error: uErr } = await admin.from("experts")
        .select("id, full_name, title, specialization, niche_area, bio, hourly_rate, city, years_experience, rating, active")
        .eq("active", true).limit(500);
      if (uErr) {
        await anlatim.hata(`Uzman kayıtları okunamadı: ${uErr.message}`);
        return json({ error: `Uzman kayıtları okunamadı: ${uErr.message}` }, 500);
      }

      /* Zaten bu alana yazılmış adaylar HER TURDA dışlanır — aynı düğmeye iki
         kez basmak mükerrer satır üretmesin (mükerrer koşum dersi, 20.08). */
      const adaylar = adaylariSirala((uzmanlar ?? []) as any[], alan, dosyaKonusu, disarida)
        .slice(0, 3);

      if (adaylar.length === 0) {
        /* UYDURMA YASAK: uygun aday yoksa isim üretilmez. İki ayrı durum vardır
           ve ikisi AYNI CÜMLEYLE yazılmaz: hiç örtüşme yok / örtüşenler zaten
           listede. */
        const tukendi = oncekiSayi > 0;
        const cumle = tukendi
          ? `"${alan}" alanında çıkarılabilecek YENİ aday kalmadı; örtüşen uzmanlar zaten listede.`
          : `"${alan}" alanında kayıtlı uzmanlarla örtüşme bulamadım. `
            + `Taraflardan dışarıdan isim önermelerini isteyebilirim.`;
        await anaAjanaBildir(admin, {
          case_id, gorev_tipi: "arabulucu_sorusu", hedef_party_id: null,
          gerekce: `[bilirkisi:aday-yok:${alan}] ${cumle}`,
          kaynak: "sistem", bekleyen: "arabulucu_onayi",
        });
        await anlatim.bitti({
          yapildi: `"${alan}" alanı tarandı`,
          eksik: tukendi ? "yeni aday kalmadı" : "uygun aday bulamadım",
        });
        return json({
          ok: true, alan, adaylar: [], bulunamadi: true, tukendi,
          sebep: cumle, defter_notu: anlatim.defter_notu,
        });
      }

      const yazilacak = adaylar.map((a, i) => ({
        case_id, expert_id: a.uzman.id, alan,
        oneren: "masa_ajani", oneren_party_id: null,
        eslesme_gerekcesi: a.gerekce,
        sira: oncekiSayi + i + 1,
        durum: "taslak",
      }));
      const { error: iErr } = await admin.from("bilirkisi_onerileri").insert(yazilacak);
      if (iErr) {
        await anlatim.hata(`Aday listesi yazılamadı: ${iErr.message}`);
        return json({ error: `Aday listesi yazılamadı: ${iErr.message}` }, 500);
      }

      await olayYaz(admin, {
        case_id, olay_kodu: "bilirkisi_onerildi",
        veri: { alan, aday_sayisi: yazilacak.length, tur: adim === "ikinci_tur" ? 2 : 1 },
      });
      await anlatim.bitti({ yapildi: `"${alan}" alanı için ${yazilacak.length} aday çıkarıldı` });
      return json({
        ok: true, alan, tur: adim === "ikinci_tur" ? 2 : 1,
        adaylar: adaylar.map((a) => ({ ...profilKarti(a.uzman), eslesme_gerekcesi: a.gerekce })),
        defter_notu: anlatim.defter_notu,
      });
    }

    /* ── 2a) ADAY ÖNERİSİ (YAZMADAN) ──────────────────────────────────────
       Arabulucu sohbetten "bu alan için kimi önerirsin" diye sorduğunda ajan
       adayları PROFİL ÖZETİYLE verir ama HİÇBİR ŞEY YAZMAZ; arabulucu tek
       dokunuşla ('arabulucu_ekle') alan satırına ekler. Elle arama yaptırılmaz. */
    if (adim === "aday_oner") {
      if (k.rol === "taraf") return json({ error: "Bu adım masa ajanınındır" }, 403);
      if (!alan) return json({ error: "alan gerekli" }, 400);
      const { data: uzmanlar, error: uErr } = await admin.from("experts")
        .select("id, full_name, title, specialization, niche_area, bio, hourly_rate, city, years_experience, rating, active")
        .eq("active", true).limit(500);
      if (uErr) return json({ error: `Uzman kayıtları okunamadı: ${uErr.message}` }, 500);
      const adaylar = adaylariSirala((uzmanlar ?? []) as any[], alan, dosyaKonusu, new Set<string>()).slice(0, 5);
      return json({
        ok: true, alan, yazilmadi: true,
        adaylar: adaylar.map((a) => ({ ...profilKarti(a.uzman), eslesme_gerekcesi: a.gerekce })),
        bulunamadi: adaylar.length === 0,
      });
    }

    // ───────────────────────────────── 2b) ARABULUCUNUN / TARAFIN ADAY EKLEMESİ
    if (adim === "arabulucu_ekle" || adim === "taraf_aday_oner") {
      const expert_id = metin((govde as any)?.expert_id);
      if (!expert_id || !alan) return json({ error: "expert_id ve alan gerekli" }, 400);
      if (adim === "arabulucu_ekle" && k.rol === "taraf") {
        return json({ error: "Bu adım arabulucunundur" }, 403);
      }
      if (adim === "taraf_aday_oner" && k.rol !== "taraf") {
        return json({ error: "Bu adım tarafındır" }, 403);
      }
      const { data: u } = await admin.from("experts")
        .select("id, full_name, specialization, niche_area, years_experience")
        .eq("id", expert_id).maybeSingle();
      if (!u) return json({ error: "Uzman kaydı bulunamadı" }, 404);

      const { data: varOlan } = await admin.from("bilirkisi_onerileri")
        .select("id").eq("case_id", case_id).eq("alan", alan).eq("expert_id", expert_id).maybeSingle();
      if (varOlan) return json({ ok: true, zaten_var: true });

      const { count } = await admin.from("bilirkisi_onerileri")
        .select("id", { count: "exact", head: true }).eq("case_id", case_id).eq("alan", alan);
      const gerekce = adim === "arabulucu_ekle"
        ? `Arabulucunun önerisi. Uzmanlık alanı "${metin((u as any).specialization)}", alt alanı "${metin((u as any).niche_area)}".`
        : `Tarafın önerisi. Uzmanlık alanı "${metin((u as any).specialization)}", alt alanı "${metin((u as any).niche_area)}".`;
      const { error } = await admin.from("bilirkisi_onerileri").insert({
        case_id, expert_id, alan,
        oneren: adim === "arabulucu_ekle" ? "masa_ajani" : "taraf_ajani",
        oneren_party_id: adim === "taraf_aday_oner" ? k.party_id : null,
        eslesme_gerekcesi: gerekce,
        sira: Number(count ?? 0) + 1,
        durum: "taslak",
        arabulucu_secimi: adim === "arabulucu_ekle",
      });
      if (error) return json({ error: `Aday eklenemedi: ${error.message}` }, 500);
      await olayYaz(admin, { case_id, olay_kodu: "bilirkisi_onerildi", veri: { alan, kaynak: adim } });
      return json({ ok: true });
    }

    // ─────────────────────────────────────────── 3) TARAFLARA SUNUM / İLERLET
    if (adim === "ilerlet" || adim === "taraflara_sun") {
      if (k.rol === "taraf") return json({ error: "Bu adım masa ajanınındır" }, 403);
      anlatim = anlatimAc(admin, { case_id, agent_type: AGENT_TYPE, party_id: null });
      await anlatim.baslat("Bilirkişi seçim akışını ilerletiyorum.");

      const { taraflar, hepsiArabulucu } = await beyanlariOku(admin, case_id);
      let sunulan = 0;
      const notlar: string[] = [];

      let q = admin.from("bilirkisi_onerileri")
        .select("id, alan, expert_id, durum").eq("case_id", case_id).eq("durum", "taslak");
      if (alan) q = q.eq("alan", alan);
      const { data: taslaklar } = await q.limit(200);
      const alanlar = Array.from(new Set(((taslaklar ?? []) as any[]).map((r) => metin(r.alan))));

      for (const a of alanlar) {
        const satirlar = ((taslaklar ?? []) as any[]).filter((r) => metin(r.alan) === a);
        const idler = satirlar.map((r) => r.id);
        if (hepsiArabulucu) {
          /* İKİ TARAF DA "arabulucu seçsin" dediyse sunum bölümü ATLANIR;
             doğrudan arabulucuya gider (4. bölüm). */
          await admin.from("bilirkisi_onerileri").update({ durum: "taraflara_sunuldu" }).in("id", idler);
          await anaAjanaBildir(admin, {
            case_id, gorev_tipi: "arabulucu_sorusu", hedef_party_id: null,
            gerekce: `[bilirkisi:arabulucu-secsin:${a}] İki taraf da seçimi size bıraktı. `
              + `"${a}" alanında ${satirlar.length} aday hazır; seçimi siz yapacaksınız.`,
            kaynak: "sistem", bekleyen: "arabulucu_onayi",
          });
          notlar.push(`${a}: iki taraf da arabulucuya bıraktı`);
          sunulan += satirlar.length;
          continue;
        }
        await admin.from("bilirkisi_onerileri").update({ durum: "taraflara_sunuldu" }).in("id", idler);
        for (const t of taraflar) {
          // Taraf ajanı KENDİ tarafına, kendi sohbetinde sunar.
          await anaAjanaBildir(admin, {
            case_id, gorev_tipi: "bilirkisi_secimi", hedef_party_id: t.party_id,
            gerekce: `[bilirkisi:sunum:${a}] "${a}" alanı için ${satirlar.length} aday hazırlandı. `
              + `Bilirkişi bölümünden inceleyip işaretleyebilirsiniz.`,
            kaynak: "taraf_ajani", bekleyen: "taraf_cevabi",
          });
          await devirYaz(admin, {
            /* Anahtar kısaltılırken taraf kimliği KAYBOLMAMALI: alan başı 12
               karakterle sınırlanır, taraf kimliği sonda tutulur — yoksa iki
               tarafın devir kaydı aynı anahtara düşer ve biri ötekini ezer. */
            case_id, sira_no: `bilirkisi-${a.slice(0, 12)}-${t.party_id}`,
            kimden: "ana ajan", kime: "taraf ajanı",
            istek_turu: "bilirkisi_secimi", sonuc: "bekliyor",
          });
        }
        sunulan += satirlar.length;
        notlar.push(`${a}: ${satirlar.length} aday taraflara sunuldu`);
      }

      await olayYaz(admin, {
        case_id, olay_kodu: "bilirkisi_durumu_degisti",
        veri: { adim: "taraflara_sunuldu", alan_sayisi: alanlar.length, aday_sayisi: sunulan },
      });
      await anlatim.bitti({
        yapildi: alanlar.length ? notlar.join(" · ") : "sunulacak yeni aday yok",
      });
      return json({ ok: true, sunulan, alanlar, notlar, defter_notu: anlatim.defter_notu });
    }

    // ────────────────────────────────────────────── 3b) LİSTE (KÖR PERDELİ)
    if (adim === "liste") {
      let q = admin.from("bilirkisi_onerileri")
        .select("id, alan, expert_id, oneren, oneren_party_id, eslesme_gerekcesi, sira, durum, arabulucu_secimi, arabulucu_onayi, created_at")
        .eq("case_id", case_id);
      if (alan) q = q.eq("alan", alan);
      if (k.rol === "taraf") q = q.neq("durum", "taslak"); // taraf, sunulmamış taslağı görmez
      const { data: oneriler, error: oErr } = await q.order("alan").order("sira").limit(300);
      if (oErr) return json({ error: `Liste okunamadı: ${oErr.message}` }, 500);

      const idler = Array.from(new Set(((oneriler ?? []) as any[]).map((r) => String(r.expert_id))));
      const { data: uzmanlar } = idler.length
        ? await admin.from("experts")
          .select("id, full_name, title, specialization, niche_area, bio, hourly_rate, city, years_experience, rating")
          .in("id", idler)
        : { data: [] as any[] };
      const profiller = new Map<string, any>();
      for (const u of (uzmanlar ?? []) as any[]) profiller.set(String(u.id), profilKarti(u));

      /* KÖR PERDE — SÜZME SORGUDA: taraf için sorgu KENDİ party_id'siyle
         sınırlanır. Karşı tarafın satırı ancak İKİ TARAF DA gosterim_izni
         verdiyse ayrıca okunur. Ekranda gizleme YOKTUR. */
      let yanitlar: any[] = [];
      let karsiTarafGorunur = false;
      if (k.rol === "taraf" && k.party_id) {
        const { data: kendi } = await admin.from("bilirkisi_taraf_yanitlari")
          .select("id, expert_id, alan, yanit, not_metni, gosterim_izni, party_id, created_at")
          .eq("case_id", case_id).eq("party_id", k.party_id).limit(200);
        yanitlar = (kendi ?? []) as any[];

        const { data: tumIzinler } = await admin.from("bilirkisi_taraf_yanitlari")
          .select("party_id, gosterim_izni").eq("case_id", case_id).limit(500);
        const izinliTaraflar = new Set(
          ((tumIzinler ?? []) as any[]).filter((r) => r.gosterim_izni === true).map((r) => String(r.party_id)),
        );
        const { data: tumTaraflar } = await admin.from("case_parties")
          .select("id").eq("case_id", case_id).limit(50);
        const tarafIdler = ((tumTaraflar ?? []) as any[]).map((r) => String(r.id));
        karsiTarafGorunur = tarafIdler.length > 1 && tarafIdler.every((id) => izinliTaraflar.has(id));
        if (karsiTarafGorunur) {
          const { data: otekiler } = await admin.from("bilirkisi_taraf_yanitlari")
            .select("id, expert_id, alan, yanit, not_metni, gosterim_izni, party_id, created_at")
            .eq("case_id", case_id).neq("party_id", k.party_id).limit(200);
          yanitlar = yanitlar.concat((otekiler ?? []) as any[]);
        }
      } else {
        // Arabulucu bütün yanıtları görür (kararı o verecek).
        const { data: hepsi } = await admin.from("bilirkisi_taraf_yanitlari")
          .select("id, expert_id, alan, yanit, not_metni, gosterim_izni, party_id, created_at")
          .eq("case_id", case_id).limit(500);
        yanitlar = (hepsi ?? []) as any[];
        karsiTarafGorunur = true;
      }

      const { data: atamalar } = await admin.from("case_expert_assignments")
        .select("id, expert_id, status, note, created_at").eq("case_id", case_id).limit(100);

      return json({
        ok: true,
        rol: k.rol,
        party_id: k.party_id,
        oneriler: ((oneriler ?? []) as any[]).map((r) => ({
          ...r, profil: profiller.get(String(r.expert_id)) ?? null,
        })),
        yanitlar,
        karsi_taraf_gorunur: karsiTarafGorunur,
        atamalar: atamalar ?? [],
      });
    }

    // ───────────────────────────────────────────────── 3c) TARAFIN YANITI
    if (adim === "yanit_yaz") {
      if (k.rol !== "taraf" || !k.party_id) return json({ error: "Bu adım tarafındır" }, 403);
      const expert_id = metin((govde as any)?.expert_id);
      const yanit = metin((govde as any)?.yanit);
      if (!expert_id) return json({ error: "expert_id gerekli" }, 400);
      if (!["kabul", "ret", "cekimser"].includes(yanit)) {
        return json({ error: "yanit: kabul | ret | cekimser" }, 400);
      }
      const satir = {
        case_id, party_id: k.party_id, expert_id, alan: alan || null,
        yanit,
        not_metni: metin((govde as any)?.not_metni).slice(0, 800) || null,
        gosterim_izni: (govde as any)?.gosterim_izni === true,
      };
      const { data: mevcut } = await admin.from("bilirkisi_taraf_yanitlari")
        .select("id").eq("case_id", case_id).eq("party_id", k.party_id)
        .eq("expert_id", expert_id).maybeSingle();
      const { error } = mevcut
        ? await admin.from("bilirkisi_taraf_yanitlari").update(satir).eq("id", (mevcut as any).id)
        : await admin.from("bilirkisi_taraf_yanitlari").insert(satir);
      if (error) return json({ error: `Yanıt yazılamadı: ${error.message}` }, 500);

      // Tarafın sohbetindeki bekleyen sunum satırı kapatılır (mükerrer hatırlatma olmasın).
      const { data: bekleyen } = await admin.from("ajan_gorevleri")
        .select("id, gerekce").eq("case_id", case_id).eq("gorev_tipi", "bilirkisi_secimi")
        .eq("hedef_party_id", k.party_id).eq("durum", "bekliyor").limit(50);
      for (const g of (bekleyen ?? []) as any[]) {
        if (!alan || String(g.gerekce ?? "").includes(`[bilirkisi:sunum:${alan}]`)) {
          await admin.from("ajan_gorevleri")
            .update({ durum: "yapildi", sonuc: "taraf işaretlemesini yaptı" }).eq("id", g.id);
        }
      }
      await olayYaz(admin, {
        case_id, party_id: k.party_id, olay_kodu: "bilirkisi_durumu_degisti",
        veri: { adim: "taraf_yaniti", alan: alan || null },
      });
      return json({ ok: true });
    }

    // ─────────────────────────────────────────────────────── 3d) TIKANMA
    if (adim === "tikanma") {
      if (k.rol === "taraf") return json({ error: "Bu adım masa ajanınındır" }, 403);
      if (!alan) return json({ error: "alan gerekli" }, 400);
      const { taraflar, tikanmaYetkisi } = await beyanlariOku(admin, case_id);

      if (tikanmaYetkisi) {
        await anaAjanaBildir(admin, {
          case_id, gorev_tipi: "arabulucu_onayi", hedef_party_id: null,
          gerekce: `[bilirkisi:tikanma:${alan}] "${alan}" alanında taraflar ortak adda buluşamadı. `
            + `Beyanlarında tıkanma hâlinde sizin belirlemenizi kabul etmişlerdi: `
            + `bir adayı onaylayabilir ya da kendiniz belirleyebilirsiniz.`,
          kaynak: "sistem", bekleyen: "arabulucu_onayi", durum: "onay_bekliyor",
        });
        return json({ ok: true, yol: "arabulucuya_soruldu" });
      }
      // Yetki yoksa ajan taraflara YENİDEN sorar; arabulucuya kendiliğinden gitmez.
      for (const t of taraflar) {
        await anaAjanaBildir(admin, {
          case_id, gorev_tipi: "bilirkisi_secimi", hedef_party_id: t.party_id,
          gerekce: `[bilirkisi:tikanma-soru:${alan}] "${alan}" alanında ortak ad çıkmadı. `
            + `Seçimi arabulucunun belirlemesini ister misiniz?`,
          kaynak: "taraf_ajani", bekleyen: "taraf_cevabi",
        });
      }
      return json({ ok: true, yol: "taraflara_soruldu" });
    }

    // ─────────────────────────────────────────── 4) ATAMA — İNSAN KAPISIDIR
    if (adim === "ata") {
      /* Bu adım cron/akış çağrısından ÇALIŞMAZ: atama beş insan kapısından
         biridir (constitution m.3). Ajan yalnız yazar; kararı insan verir. */
      if (k.rol !== "arabulucu" || !k.user_id) {
        return json({ error: "Bilirkişi atamasını yalnız arabulucu yapar" }, 403);
      }
      const expert_id = metin((govde as any)?.expert_id);
      if (!expert_id || !alan) return json({ error: "expert_id ve alan gerekli" }, 400);

      const { data: oneri } = await admin.from("bilirkisi_onerileri")
        .select("id").eq("case_id", case_id).eq("alan", alan).eq("expert_id", expert_id).maybeSingle();
      if (!oneri) return json({ error: "Bu alan için böyle bir aday yok" }, 404);

      /* Tarafların KENDİ adlarına verdiği yanıtlar sunucu tarafında türetilir;
         hiçbir taraf tek başına sonucu belirlemez (constitution m.1). */
      const { data: yanitlar } = await admin.from("bilirkisi_taraf_yanitlari")
        .select("party_id, yanit").eq("case_id", case_id).eq("expert_id", expert_id).limit(100);
      const approvals: Record<string, string> = {};
      for (const y of (yanitlar ?? []) as any[]) {
        if (y.yanit === "kabul") approvals[String(y.party_id)] = "approved";
        else if (y.yanit === "ret") approvals[String(y.party_id)] = "rejected";
      }

      const { data: atama, error: aErr } = await admin.from("case_expert_assignments").insert({
        case_id, expert_id, status: "pending", assigned_by: k.user_id, approvals,
        note: `Alan: ${alan}`,
      }).select("id").maybeSingle();
      if (aErr) return json({ error: `Atama yazılamadı: ${aErr.message}` }, 500);

      await admin.from("bilirkisi_onerileri")
        .update({ durum: "atandi", arabulucu_onayi: true, arabulucu_onay_zamani: new Date().toISOString() })
        .eq("id", (oneri as any).id);

      await admin.from("expert_assignment_logs").insert({
        case_id, assignment_id: (atama as any)?.id ?? null, expert_id,
        actor_id: k.user_id, actor_role: "mediator", action: "assigned",
        details: { note: `"${alan}" alanında atandı` },
      });

      // Arabulucu + iki tarafın sohbetine "atandı" bildirimi düşer.
      const { taraflar } = await beyanlariOku(admin, case_id);
      for (const t of taraflar) {
        await anaAjanaBildir(admin, {
          case_id, gorev_tipi: "bilirkisi_secimi", hedef_party_id: t.party_id,
          gerekce: `[bilirkisi:atandi:${alan}] "${alan}" alanında bilirkişi atandı. `
            + `Bilirkişinin kabulü bekleniyor.`,
          kaynak: "taraf_ajani", bekleyen: null, durum: "yapildi",
        });
      }
      await anaAjanaBildir(admin, {
        case_id, gorev_tipi: "arabulucu_sorusu", hedef_party_id: null,
        gerekce: `[bilirkisi:atandi:${alan}] Atama yazıldı. Bilirkişiye davet gönderebilir, `
          + `kabulünden sonra evrak kümesini onaya alabilirsiniz.`,
        kaynak: "sistem", bekleyen: null, durum: "yapildi",
      });
      await olayYaz(admin, {
        case_id, olay_kodu: "bilirkisi_durumu_degisti",
        veri: { adim: "atandi", alan },
      });
      return json({ ok: true, assignment_id: (atama as any)?.id ?? null });
    }

    // ─────────────────────────── 6) EVRAK KÜMESİ — AJAN HAZIRLAR, İNSAN ONAYLAR
    if (adim === "evrak_oner") {
      if (k.rol === "taraf") return json({ error: "Bu adım masa ajanınındır" }, 403);
      const expert_id = metin((govde as any)?.expert_id);
      if (!expert_id) return json({ error: "expert_id gerekli" }, 400);

      anlatim = anlatimAc(admin, { case_id, agent_type: AGENT_TYPE, party_id: null });
      await anlatim.baslat("Bilirkişiye açılacak belgeleri seçiyorum.");

      const { data: belgeler } = await admin.from("case_documents")
        .select("id, file_name, mime_type, created_at").eq("case_id", case_id).limit(300);
      const { data: mevcutKume } = await admin.from("bilirkisi_evrak_kumesi")
        .select("document_id").eq("case_id", case_id).eq("expert_id", expert_id).limit(300);
      const zatenVar = new Set(((mevcutKume ?? []) as any[]).map((r) => String(r.document_id)));

      const alanKelimeleri = new Set(kelimeler(alan || dosyaKonusu));
      const secilen: any[] = [];
      for (const b of (belgeler ?? []) as any[]) {
        if (zatenVar.has(String(b.id))) continue;
        const adKelimeleri = kelimeler(b.file_name);
        const ortusen = adKelimeleri.filter((x) => alanKelimeleri.has(x));
        /* Alanla örtüşen belge önce gelir; örtüşme yoksa gerekçe "belge adında
           alan ifadesi geçmiyor" diye AÇIKÇA yazılır — uydurma gerekçe yok. */
        const gerekce = ortusen.length
          ? `Belge adı "${alan || dosyaKonusu}" alanıyla örtüşüyor: ${ortusen.slice(0, 4).join(", ")}.`
          : `Dosyaya yüklenmiş belge; belge adında alan ifadesi geçmiyor, kapsam kararı sizindir.`;
        secilen.push({
          case_id, expert_id, document_id: b.id,
          gerekce: sinirdanGecir(gerekce, "bilirkisi-secim.evrak"),
          onaylandi: false,
          _oncelik: ortusen.length ? 0 : 1,
        });
      }
      secilen.sort((a, b) => a._oncelik - b._oncelik);
      const yazilacak = secilen.slice(0, 40).map((r) => {
        const kopya = { ...r };
        delete kopya._oncelik;
        return kopya;
      });

      if (yazilacak.length === 0) {
        await anlatim.bitti({ yapildi: "açılacak yeni belge yok" });
        return json({ ok: true, eklenen: 0, defter_notu: anlatim.defter_notu });
      }
      const { error: eErr } = await admin.from("bilirkisi_evrak_kumesi").insert(yazilacak);
      if (eErr) {
        await anlatim.hata(`Evrak kümesi yazılamadı: ${eErr.message}`);
        return json({ error: `Evrak kümesi yazılamadı: ${eErr.message}` }, 500);
      }
      /* İNSAN KAPISI: onaylandi=false kalır. Arabulucu onaylamadan hiçbir belge
         açılmaz — tarafların verisi dosya dışına çıkıyor. */
      await anaAjanaBildir(admin, {
        case_id, gorev_tipi: "arabulucu_onayi", hedef_party_id: null,
        gerekce: `[bilirkisi:evrak:${expert_id.slice(0, 8)}] Bilirkişiye ${yazilacak.length} belge açmayı öneriyorum. `
          + `Her birinin gerekçesi Bilirkişi bölümünde yazılı; onaylamadan hiçbiri açılmaz.`,
        kaynak: "sistem", bekleyen: "arabulucu_onayi", durum: "onay_bekliyor",
      });
      await anlatim.bitti({ yapildi: `${yazilacak.length} belge arabulucunun onayına sunuldu` });
      return json({ ok: true, eklenen: yazilacak.length, defter_notu: anlatim.defter_notu });
    }

    if (adim === "evrak_listesi") {
      if (k.rol === "taraf") {
        /* Tarafa BİLGİ düşer: hangi başlıklarda belge açıldı. Belge içeriği
           karşı tarafa gösterilmez; yalnız açılan kümenin adları bildirilir. */
        const { data: kume } = await admin.from("bilirkisi_evrak_kumesi")
          .select("document_id, onaylandi").eq("case_id", case_id).eq("onaylandi", true).limit(300);
        const belgeIdler = Array.from(new Set(((kume ?? []) as any[]).map((r) => String(r.document_id))));
        const { data: belgeler } = belgeIdler.length
          ? await admin.from("case_documents").select("id, file_name").in("id", belgeIdler)
          : { data: [] as any[] };
        return json({
          ok: true, rol: "taraf",
          basliklar: ((belgeler ?? []) as any[]).map((b) => b.file_name),
        });
      }
      const { data: kume } = await admin.from("bilirkisi_evrak_kumesi")
        .select("id, expert_id, document_id, gerekce, onaylandi, onay_zamani, created_at")
        .eq("case_id", case_id).limit(400);
      const belgeIdler = Array.from(new Set(((kume ?? []) as any[]).map((r) => String(r.document_id))));
      const { data: belgeler } = belgeIdler.length
        ? await admin.from("case_documents").select("id, file_name, mime_type").in("id", belgeIdler)
        : { data: [] as any[] };
      const adlar = new Map<string, any>();
      for (const b of (belgeler ?? []) as any[]) adlar.set(String(b.id), b);
      return json({
        ok: true, rol: k.rol,
        kume: ((kume ?? []) as any[]).map((r) => ({ ...r, belge: adlar.get(String(r.document_id)) ?? null })),
      });
    }

    if (adim === "evrak_onayla") {
      // İNSAN KAPISI: yalnız arabulucunun oturumu. Cron/akış çağrısı reddedilir.
      if (k.rol !== "arabulucu" || !k.user_id) {
        return json({ error: "Evrak kümesini yalnız arabulucu onaylar" }, 403);
      }
      const idler = Array.isArray((govde as any)?.ids) ? (govde as any).ids.map(String) : [];
      const onayla = (govde as any)?.onaylandi !== false;
      if (idler.length === 0) return json({ error: "ids gerekli" }, 400);
      const { error } = await admin.from("bilirkisi_evrak_kumesi").update({
        onaylandi: onayla,
        onaylayan: onayla ? k.user_id : null,
        onay_zamani: onayla ? new Date().toISOString() : null,
      }).in("id", idler).eq("case_id", case_id);
      if (error) return json({ error: `Onay yazılamadı: ${error.message}` }, 500);

      if (onayla) {
        const { taraflar } = await beyanlariOku(admin, case_id);
        for (const t of taraflar) {
          await anaAjanaBildir(admin, {
            case_id, gorev_tipi: "bilirkisi_secimi", hedef_party_id: t.party_id,
            gerekce: `[bilirkisi:evrak-bilgi] Bilirkişiye ${idler.length} belge açıldı. `
              + `Belge içerikleri karşı tarafa gösterilmez; yalnız açılan kümenin başlıkları bildirilir.`,
            kaynak: "taraf_ajani", bekleyen: null, durum: "yapildi",
          });
        }
        await olayYaz(admin, {
          case_id, olay_kodu: "bilirkisi_durumu_degisti",
          veri: { adim: "evrak_acildi", belge_sayisi: idler.length },
        });
      }
      return json({ ok: true, guncellenen: idler.length });
    }

    // ───────────────────────────────────────── 6b) DIŞ ADAY — AJAN KAYDETMEZ
    if (adim === "dis_aday") {
      if (k.rol !== "taraf" || !k.party_id) return json({ error: "Bu adım tarafındır" }, 403);
      const ad = metin((govde as any)?.ad_soyad).slice(0, 120);
      const iletisim = metin((govde as any)?.iletisim).slice(0, 160);
      if (!ad) return json({ error: "ad_soyad gerekli" }, 400);
      /* ÜÇÜNCÜ KİŞİNİN VERİSİ: ajan kendiliğinden experts tablosuna YAZMAZ.
         Bilgi arabulucuya bildirilir; listeye ekleme arabulucu onayıyla olur. */
      const r = await anaAjanaBildir(admin, {
        case_id, gorev_tipi: "arabulucu_onayi", hedef_party_id: null,
        gerekce: `[bilirkisi:dis-aday] Taraf, "${alan || "belirtilmeyen alan"}" alanı için dışarıdan bir isim önerdi: `
          + `${ad}${iletisim ? ` — ${iletisim}` : ""}. Listeye eklenmesi onayınıza bağlıdır; `
          + `uzman kaydı açılmadı.`,
        kaynak: "sistem", bekleyen: "arabulucu_onayi", durum: "onay_bekliyor",
      });
      return json({ ok: r.yazildi, sebep: r.sebep });
    }

    // ─────────────────────────────── 7b) RAPORA TARAFIN DİYECEĞİ (dosyaya işlenir)
    if (adim === "rapor_yorumu") {
      if (k.rol !== "taraf" || !k.party_id) return json({ error: "Bu adım tarafındır" }, 403);
      const yorum = metin((govde as any)?.yorum).slice(0, 2000);
      if (!yorum) return json({ error: "yorum gerekli" }, 400);
      /* YAZIM YERİ: tarafın kendi bekleyen pano satırı kapatılır ve diyeceği
         `sonuc` alanına işlenir. Yeni tablo açılmadı; arabulucu bu satırı
         panosunda görür. Karşı tarafa açılmaz (satır hedef_party_id ile bağlı). */
      const { data: bekleyen } = await admin.from("ajan_gorevleri")
        .select("id, gerekce").eq("case_id", case_id).eq("gorev_tipi", "bilirkisi_secimi")
        .eq("hedef_party_id", k.party_id).eq("durum", "bekliyor").limit(50);
      const hedef = ((bekleyen ?? []) as any[])
        .find((g) => String(g.gerekce ?? "").includes("[bilirkisi:rapor-sunum]"));
      const guvenli = sinirdanGecir(yorum, "bilirkisi-secim.rapor_yorumu");
      if (hedef) {
        await admin.from("ajan_gorevleri")
          .update({ durum: "yapildi", sonuc: guvenli.slice(0, 1500) }).eq("id", hedef.id);
      } else {
        await anaAjanaBildir(admin, {
          case_id, gorev_tipi: "bilirkisi_secimi", hedef_party_id: k.party_id,
          gerekce: `[bilirkisi:rapor-yorum] Taraf bilirkişi raporu hakkında görüşünü yazdı: ${guvenli}`,
          kaynak: "taraf_ajani", bekleyen: null, durum: "yapildi",
        });
      }
      await olayYaz(admin, {
        case_id, party_id: k.party_id, olay_kodu: "bilirkisi_durumu_degisti",
        veri: { adim: "rapor_yorumu" },
      });
      return json({ ok: true });
    }

    // ────────────────────────────────────────────────── 7) RAPOR DÖKÜMÜ
    if (adim === "raporlar") {
      const { data: raporlar } = await admin.from("bilirkisi_raporlari")
        .select("id, expert_id, alan, durum, teslim_zamani, rapor_metni, dosya_yolu, created_at")
        .eq("case_id", case_id).eq("durum", "teslim").limit(100);
      const idler = Array.from(new Set(((raporlar ?? []) as any[]).map((r) => String(r.expert_id))));
      const { data: uzmanlar } = idler.length
        ? await admin.from("experts").select("id, full_name, title, specialization").in("id", idler)
        : { data: [] as any[] };
      const adlar = new Map<string, any>();
      for (const u of (uzmanlar ?? []) as any[]) adlar.set(String(u.id), u);
      return json({
        ok: true,
        raporlar: ((raporlar ?? []) as any[]).map((r) => ({
          ...r, uzman: adlar.get(String(r.expert_id)) ?? null,
        })),
      });
    }

    return json({ error: `Tanınmayan adım: ${adim}` }, 400);
  } catch (e: any) {
    const mesaj = String(e?.message ?? e).slice(0, 300);
    console.error("[bilirkisi-secim] hata", mesaj);
    if (anlatim) await anlatim.hata(mesaj);
    return json({ error: mesaj }, 500);
  }
});
