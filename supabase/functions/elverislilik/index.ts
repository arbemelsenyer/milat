// ELVERİŞLİLİK KONTROLÜ (İBA 2.1).
//
// Dosyanın arabuluculuğa elverişliliği bakımından DİKKAT GEREKTİREN işaretleri
// arabulucuya bildirir. KARAR VERMEZ, hukuki yorum yapmaz, hüküm cümlesi kurmaz.
//
// KAYNAK KURALI (bağlayıcı): Model kendi hukuk bilgisinden hüküm ÜRETMEZ. Kaynak
// YALNIZ bilgi tabanıdır (knowledge_base_chunks): 6325 sayılı Kanun · Yönetmelik ·
// dosyanın türüne karşılık gelen uzmanlık modülü (varsa). İnternete çıkılmaz.
// Her bulguda kaynak künyesi ZORUNLUDUR (kaynak adı + madde/bölüm + kısa alıntı);
// alıntı kaynak metninde geçmiyorsa bulgu SUNUCUDA elenir. Bilgi tabanında dayanak
// bulunamazsa uyarı üretilmez, durum 'kaynak_yok' yazılır.
//
// Dil kuralı: "elverişli değildir" gibi hüküm cümlesi YASAK; kalıp
// "…bakımından değerlendirme gerekebilir; karar arabulucuya aittir".
//
// Çıktı elverislilik_kontrol tablosuna yazılır; tarafa SELECT politikası YOKTUR.
// Yalnız arabulucu düğmeye bastığında çalışır (ücretli çağrı) — kendiliğinden
// tetiklenmez.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PARCA_METIN = 1_800;   // tek bilgi tabanı parçasından alınacak en çok karakter
const MAX_PARCA = 14;            // isteme giren en çok parça sayısı
const MAX_BEYAN = 1_500;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* ── AJAN DURUM YAZIMI (Ajan Kontrol Paneli) ─────────────────────────────────
   KRİTİK: durum yazımı asıl işi ASLA bozmaz — try/catch içindedir, hata yutulur
   ve yalnız konsola loglanır. Aynı case_id + agent_type için TEK satır güncellenir.
   tarafa_gorunur alanına DOKUNULMAZ (varsayılan false). */
const AGENT_TYPE = "elverislilik";
async function durumYaz(admin: any, caseId: string, patch: Record<string, unknown>) {
  if (!admin || !caseId) return;
  try {
    const { data: mevcutSatir } = await admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE).is("party_id", null).maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcutSatir?.id) {
      await admin.from("agent_states").update(govde).eq("id", mevcutSatir.id);
    } else {
      await admin.from("agent_states")
        .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: null, ...govde });
    }
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

/* ── ALINTI DOĞRULAMA ────────────────────────────────────────────────────────
   Alıntı, kaynak parçasında GERÇEKTEN geçmeli. Karşılaştırma sadeleştirilmiş
   metin üzerinde yapılır: Türkçe harfler ASCII'ye katlanır (mevzuat metinleri
   farklı dizgilerle geliyor), satır sonu tirelemesi birleştirilir, noktalama ve
   fazla boşluk atılır. SADELEŞTİRME YALNIZ KARŞILAŞTIRMA İÇİNDİR — kaydedilen
   alıntı modelin verdiği ORİJİNAL metindir. */
function sade(metin: string): string {
  return temiz(metin)
    .replace(/[-‐‑]\s*\r?\n\s*/g, "")
    .replace(/\r?\n/g, " ")
    .toLocaleLowerCase("tr-TR")
    .replace(/[şŞ]/g, "s")
    .replace(/[ıİiI]/g, "i")
    .replace(/[ğĞ]/g, "g")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[""''`.,;:!?()\[\]{}""]/g, " ")
    .replace(/[…\-‐‑‒–—/_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Üç şans: tam alıntı · ilk 40 karakter · alıntının ortasından 40 karakter.
function alintiKaynaktaVar(alinti: string, kaynak: string): boolean {
  const a = sade(alinti);
  const k = sade(kaynak);
  if (a.length < 12) return false;
  if (k.includes(a)) return true;
  if (k.includes(a.slice(0, 40))) return true;
  if (a.length >= 60) {
    const bas = Math.max(0, Math.floor(a.length / 2) - 20);
    return k.includes(a.slice(bas, bas + 40));
  }
  return false;
}

// Hüküm dili süzgeci: ajan "elverişli değildir" diyemez.
const HUKUM_KALIPLARI = [
  "elverişli değildir", "elverisli degildir", "elverişli olmadığı", "arabuluculuğa uygun değildir",
  "geçersizdir", "gecersizdir", "hükümsüzdür", "hukumsuzdur", "yapılamaz", "reddedilmelidir",
  "dava açılmalıdır", "suç teşkil eder", "yasaya aykırıdır",
];
function hukumDili(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return HUKUM_KALIPLARI.find((x) => k.includes(x)) ?? null;
}

/* ── BİLGİ TABANI KAYNAKLARI ────────────────────────────────────────────────
   16.08 SIKILAŞTIRMA (canlı bulgu): kaynaklar BULANIK kalıpla ("%Yönetmelik%")
   çekilince taranan listeye alakasız yönetmelikler (ör. Sınai Mülkiyet) karışıyordu.
   Artık kaynak adları TAM AD ile seçilir; ada uymayan hiçbir kayıt isteme girmez.
   Temel kaynaklar her dosyada; EK kaynaklar yalnız uyuşmazlık türü eşleşirse. */
const TEMEL_KAYNAKLAR = [
  "6325 Sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu",
  "Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu Yönetmeliği",
];

const MODUL_ESLESME: { anahtarlar: string[]; baslik: string[] }[] = [
  { anahtarlar: ["aile", "bosanma", "boşanma", "nafaka", "velayet"], baslik: ["Aile Arabuluculuğu"] },
  { anahtarlar: ["is", "iş", "isci", "işçi", "kidem", "kıdem", "ihbar", "employment"], baslik: ["Uzman Arabuluculuk - İş"] },
  { anahtarlar: ["saglik", "sağlık", "malpraktis", "hasta", "tibbi", "tıbbi"], baslik: ["Uzman Arabuluculuk - Sağlık"] },
  {
    anahtarlar: ["tuketici", "tüketici"],
    baslik: ["6502 sayılı Tüketicinin Korunması Hakkında Kanun", "Uzman Arabuluculuk - Tüketici"],
  },
  {
    anahtarlar: ["ticari", "ticaret", "sirket", "şirket"],
    baslik: ["6102 sayılı Türk Ticaret Kanunu (Başlangıç ve Ticari İşletme)", "Uzman Arabuluculuk - Ticaret"],
  },
  { anahtarlar: ["sigorta"], baslik: ["Uzman Arabuluculuk - Sigorta Hukuku"] },
  { anahtarlar: ["banka", "finans", "kredi"], baslik: ["Uzman Arabuluculuk - Banka ve Finans"] },
  { anahtarlar: ["insaat", "inşaat", "yapi", "yapı", "kentsel"], baslik: ["Uzman Arabuluculuk - İnşaat"] },
  { anahtarlar: ["enerji", "maden"], baslik: ["Uzman Arabuluculuk - Enerji ve Maden"] },
  { anahtarlar: ["fikri", "telif", "marka", "patent"], baslik: ["Uzman Arabuluculuk - Fikri Mülkiyet"] },
];

// Elverişlilik başlığıyla ilgili parçalar + tür ölçütü (tacir/ticari iş/tüketici
// işlemi) parçaları. Tür ölçütü ifadeleri 16.08'de eklendi: dosyanın türü
// tartışmalıysa model ölçütü KANUN METNİNDEN okusun diye.
const KONU_ANAHTARLARI = [
  "elverişli", "tasarruf", "kamu düzeni", "dava şartı", "aile içi şiddet",
  "cebir", "tehdit", "kamu düzenini", "iradi", "zorunlu arabuluculuk",
  "tacir", "ticari iş", "ticari dava", "tüketici işlemi", "tüketici sayılır",
];

// Künye: iç sıra numarası ("parça 0") EKRANA YAZILMAZ. Madde numarası
// tespit edilebiliyorsa yazılır, edilemiyorsa yalnız kaynak adı kalır.
function maddeKunyesi(maddeBolum: string, kaynakMetni: string): string {
  const m1 = maddeBolum.match(/madde\s*\d+(\/\d+)?/i);
  if (m1) return m1[0].toLocaleUpperCase("tr-TR");
  const m2 = maddeBolum.match(/\bm\.\s*\d+(\/\d+)?/i);
  if (m2) return m2[0];
  const m3 = kaynakMetni.match(/MADDE\s*\d+/i);
  if (m3) return m3[0].toLocaleUpperCase("tr-TR");
  return "";
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
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const case_id = temiz((body as any)?.case_id);
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, title, issue_description, dispute_type, dispute_subtype, mediation_type")
      .eq("id", case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf çağıramaz.
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    const yetkili = (caseRow as any).assigned_mediator_id === userId
      || (caseRow as any).user_id === userId
      || !!roleRow;
    if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);

    durumAdmin = admin;
    durumCaseId = case_id;
    await durumYaz(durumAdmin, durumCaseId, { status: "running", error_message: null });

    if (!apiKey) return json({ error: "LOVABLE_API_KEY tanımlı değil" }, 500);

    // ── DOSYA BİLGİSİ: konu, tür ve taraf beyanları ─────────────────────────
    const { data: taraflar } = await admin.from("case_parties")
      .select("party_role, party_type, statement").eq("case_id", case_id).limit(20);
    const beyanlar = ((taraflar ?? []) as any[])
      .map((t) => temiz(t.statement))
      .filter((x) => x.length > 40)
      .map((x, i) => `[TARAF BEYANI ${i + 1}]\n${x.slice(0, MAX_BEYAN)}`)
      .join("\n\n");

    // 16.08: Belge özetleri de DOSYA METNİNE girer — uyarıyı tetikleyen somut
    // ifade (dosya_isareti) bu metinde aranır; bulunamazsa bulgu elenir.
    const { data: ozetler } = await admin.from("belge_ozetleri")
      .select("ozet, kaniti, durum").eq("case_id", case_id).limit(30);
    const ozetBlogu = ((ozetler ?? []) as any[])
      .filter((o) => temiz(o.durum) === "uretildi")
      .map((o, i) => `[BELGE ÖZETİ ${i + 1}] ${temiz(o.ozet)} ${temiz(o.kaniti)}`.trim())
      .join("\n");

    const turMetni = [temiz((caseRow as any).dispute_type), temiz((caseRow as any).dispute_subtype)]
      .filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");

    // ── KAYNAK SEÇİMİ: TAM AD ile kanun + yönetmelik + (varsa) tür kaynakları ──
    const kaynakAdlari = [...TEMEL_KAYNAKLAR];
    const modul = MODUL_ESLESME.find((m) => m.anahtarlar.some((a) => turMetni.includes(a)));
    if (modul) kaynakAdlari.push(...modul.baslik);

    type Parca = { no: number; kaynak: string; bolum: string; metin: string };
    const parcalar: Parca[] = [];
    for (const ad of kaynakAdlari) {
      const { data: satirlar, error: kErr } = await admin.from("knowledge_base_chunks")
        .select("source_title, chunk_index, chunk_text, metadata")
        .eq("source_title", ad)
        .or(KONU_ANAHTARLARI.map((a) => `chunk_text.ilike.%${a}%`).join(","))
        .limit(6);
      if (kErr) {
        console.error(`[elverislilik] bilgi tabanı okunamadı (${ad}): ${kErr.message}`);
        continue;
      }
      for (const r of ((satirlar ?? []) as any[])) {
        if (parcalar.length >= MAX_PARCA) break;
        const metin = temiz(r.chunk_text);
        if (metin.length < 80) continue;
        const madde = maddeKunyesi("", metin);
        parcalar.push({
          no: parcalar.length + 1,
          kaynak: temiz(r.source_title) || "Bilgi tabanı kaydı",
          bolum: madde,   // boş olabilir; boşsa künyede yalnız kaynak adı yazılır
          metin: metin.slice(0, MAX_PARCA_METIN),
        });
      }
    }

    const kaynakOzeti = [...new Set(parcalar.map((p) => p.kaynak))].join(" · ");

    // Bilgi tabanında dayanak yoksa UYARI ÜRETİLMEZ.
    if (parcalar.length === 0) {
      const bos = {
        case_id, durum: "kaynak_yok", bulgular: [],
        kaynaklar: kaynakAdlari.join(" · "),
        updated_at: new Date().toISOString(),
      };
      const { error: bErr } = await admin.from("elverislilik_kontrol")
        .upsert(bos, { onConflict: "case_id" });
      if (bErr) return json({ error: `Kayıt yazılamadı: ${bErr.message}` }, 500);
      await durumYaz(durumAdmin, durumCaseId, {
        status: "completed", error_message: null,
        last_output: { sonuc: "kaynak_yok" },
      });
      return json({ durum: "kaynak_yok", sebep: "Bilgi tabanında dayanak bulunamadı — uyarı üretilmedi." });
    }

    const systemPrompt = `Sen bir arabuluculuk dosyasında ELVERİŞLİLİK BAKIMINDAN DİKKAT GEREKTİREN İŞARETLERİ arayan tarafsız bir asistansın.

MUTLAK KAYNAK KURALI: Yalnız sana verilen KAYNAK METİNLERE dayan. Kendi hukuk bilgini KULLANMA. Verilen metinlerde karşılığı olmayan hiçbir işaret yazma. Emin değilsen boş dön.

MUTLAK DİL KURALI: Hüküm kurma. "Elverişli değildir", "yapılamaz", "geçersizdir" gibi cümleler YASAK. Kalıbın şudur: "... bakımından değerlendirme gerekebilir; karar arabulucuya aittir."

DOSYA İŞARETİ ŞARTI (en önemli kural): Bir başlık için uyarı ancak DOSYA metninde o başlığa işaret eden SOMUT bir ifade varsa üretilir. "Dosyada buna dair işaret yok ama değerlendirilebilir", "bilgi bulunmamakla birlikte" tarzı bulgu ÜRETME — işaret yoksa o başlığı hiç yazma.

TÜR ÖLÇÜTÜ: Dosyanın türü (tüketici/ticari) tartışmalıysa veya dosyadaki taraflar bu ayrımı etkiliyorsa, verilen KANUN METİNLERİNDEKİ ölçütleri uygula: ticari iş/tacir ölçütleri TTK metninden, tüketici işlemi tanımı 6502 metninden. Ölçütü uygularken hangi kanun cümlesine dayandığını kaynak_alinti olarak, dosyadaki hangi olguya uyguladığını dosya_isareti olarak ver. İlgili kanun metni verilmemişse bu değerlendirmeyi HİÇ yapma.

Her işaret için:
· baslik: kısa başlık (en çok 8 kelime).
· neden: neden dikkat gerektiği — OLGU dili, tek cümle, dosyadaki hangi bilgiyle bağlantılı olduğunu söyler ve yukarıdaki kalıpla biter.
· dosya_isareti: DOSYA metninden (konu, taraf beyanı, belge özeti) BİREBİR kopyalanmış en çok bir cümle — uyarıyı tetikleyen somut ifade. Tek karakterini değiştirme.
· kaynak_adi: hangi KAYNAK METİNDEN geldiği (metnin başındaki kaynak adı, aynen).
· madde_bolum: kaynak metinde geçen madde numarası (ör. "MADDE 1"). Yoksa boş bırak; sıra numarası uydurma.
· kaynak_alinti: o kaynak metinden BİREBİR kopyalanmış en çok bir cümle. Tek karakterini değiştirme.

Dikkat gerektiren bir işaret yoksa: {"bulgular":[]} döndür. Zorlama üretme.

Çıktı YALNIZCA JSON: {"bulgular":[{"baslik":"","neden":"","dosya_isareti":"","kaynak_adi":"","madde_bolum":"","kaynak_alinti":""}]}`;

    const kaynakBlogu = parcalar
      .map((p) => `[KAYNAK ${p.no} — ${p.kaynak} · ${p.bolum}]\n${p.metin}`)
      .join("\n\n");

    // Dosya metni tek blokta: dosya_isareti alıntısı BU metinde aranacak.
    const dosyaBlogu = `[DOSYA]\nBaşlık: ${temiz((caseRow as any).title) || "—"}\n`
      + `Uyuşmazlık konusu: ${temiz((caseRow as any).issue_description) || "—"}\n`
      + `Uyuşmazlık türü: ${temiz((caseRow as any).dispute_type) || "—"}`
      + `${temiz((caseRow as any).dispute_subtype) ? ` / ${temiz((caseRow as any).dispute_subtype)}` : ""}\n`
      + `Süreç türü: ${temiz((caseRow as any).mediation_type) || "—"}\n\n`
      + `${beyanlar || "[TARAF BEYANI YOK]"}\n\n`
      + `${ozetBlogu || "[BELGE ÖZETİ YOK]"}`;

    const userPrompt = `${dosyaBlogu}\n\n${kaynakBlogu}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error(`[elverislilik] HTTP ${aiRes.status}: ${t.slice(0, 300)}`);
      await durumYaz(durumAdmin, durumCaseId, {
        status: "failed", error_message: `Model çağrısı başarısız (HTTP ${aiRes.status})`,
      });
      return json({ error: `Model çağrısı başarısız (HTTP ${aiRes.status})` }, 502);
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    const ham = Array.isArray(parsed?.bulgular) ? parsed.bulgular : [];

    // ── SUNUCU TARAFI ELEME ─────────────────────────────────────────────────
    const bulgular: any[] = [];
    const elenen: string[] = [];
    for (const b of ham) {
      const baslik = temiz(b?.baslik);
      const neden = temiz(b?.neden);
      const kaynakAdi = temiz(b?.kaynak_adi);
      const maddeBolum = temiz(b?.madde_bolum);
      // Geriye dönük uyum: eski alan adı 'alinti' de kabul edilir.
      const kaynakAlinti = temiz(b?.kaynak_alinti) || temiz(b?.alinti);
      const dosyaIsareti = temiz(b?.dosya_isareti);

      if (!baslik || neden.length < 20 || !kaynakAlinti || !kaynakAdi || !dosyaIsareti) {
        elenen.push(`${baslik || "başlıksız"}: eksik alan (dosya işareti ve kaynak alıntısı zorunlu)`);
        continue;
      }
      const hukum = hukumDili(`${baslik} ${neden}`);
      if (hukum) {
        elenen.push(`${baslik}: hüküm cümlesi ("${hukum}")`);
        continue;
      }
      // 16.08 SIKILAŞTIRMA: uyarıyı tetikleyen ifade DOSYA metninde gerçekten
      // geçmeli. "Dosyada işaret yok ama değerlendirilebilir" tarzı içeriksiz
      // uyarılar bu kapıdan geçemez.
      if (!alintiKaynaktaVar(dosyaIsareti, dosyaBlogu)) {
        elenen.push(`${baslik}: dosya işareti dosya metninde bulunamadı`);
        continue;
      }
      // Kaynak alıntısı, kaynak parçalarının HERHANGİ BİRİNDE geçmeli.
      const eslesen = parcalar.find((p) => alintiKaynaktaVar(kaynakAlinti, p.metin));
      if (!eslesen) {
        elenen.push(`${baslik}: kaynak alıntısı kaynak metinde bulunamadı`);
        continue;
      }
      // Künye: madde tespit edilebiliyorsa yazılır; edilemiyorsa alan BOŞ kalır
      // (iç sıra numarası "parça 0" ekrana yazılmaz).
      const madde = maddeKunyesi(maddeBolum, eslesen.metin);
      bulgular.push({
        baslik: baslik.slice(0, 160),
        neden: neden.slice(0, 600),
        dosya_isareti: dosyaIsareti.slice(0, 300),
        kaynak_adi: eslesen.kaynak,
        madde_bolum: madde,
        kaynak_alinti: kaynakAlinti.slice(0, 300),
        // Ekranın eski alan adıyla da çalışması için aynı değer 'alinti'de de durur.
        alinti: kaynakAlinti.slice(0, 300),
      });
    }

    const durum = bulgular.length > 0 ? "isaret_var" : "isaret_yok";
    const satir = {
      case_id,
      durum,
      bulgular,
      kaynaklar: kaynakOzeti.slice(0, 500),
      updated_at: new Date().toISOString(),
    };
    const { error: yErr } = await admin.from("elverislilik_kontrol")
      .upsert(satir, { onConflict: "case_id" });
    if (yErr) {
      await durumYaz(durumAdmin, durumCaseId, { status: "failed", error_message: yErr.message });
      return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);
    }

    await durumYaz(durumAdmin, durumCaseId, {
      status: "completed", error_message: null,
      last_output: { sonuc: durum, bulgu: bulgular.length, elenen: elenen.slice(0, 5) },
    });
    return json({ durum, bulgu: bulgular.length, elenen: elenen.slice(0, 5) });
  } catch (e: any) {
    console.error("[elverislilik] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, {
      status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500),
    });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
