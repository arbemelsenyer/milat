// TARAFA OTURUM HAZIRLIK FÖYÜ (İBA 3.1) — 1. TUR: yalnız üretim.
//
// Bu fonksiyon TARAFA HİÇBİR ŞEY GÖNDERMEZ. Föyü 'taslak' olarak yazar; arabulucu
// kokpitte düzenleyip onaylar. Gönderim ayrı bir turda açılacaktır.
//
// KÖR VERİ (constitution m.1 — en sıkı kural): Föy TEK BİR TARAF için kurulur ve
// yalnız O TARAFIN verisi kullanılır — kendi beyanı, kendi belgeleri ve özetleri,
// kendi cevaplanmamış keşif soruları, dosyanın genel konusu ve oturum bilgisi.
// Karşı tarafın beyanı, belgesi, analizi, teklifi, kabul aralığı ve gizli notu
// girdiye HİÇBİR KOŞULDA girmez.
//
// DİL SINIRI: sade Türkçe; hukuki tavsiye, sonuç tahmini, "kabul edin/etmeyin",
// rakam önerisi, karşı taraf hakkında yorum ve duygu/kişilik/niyet etiketi YASAK.
// Dosyada karşılığı olmayan madde sunucuda ELENİR.
//
// ONAYLI FÖYE DOKUNULMAZ: durumu 'onaylandi' ya da 'gonderildi' olan satır
// yeniden üretilmez (arabulucunun onayladığı metni ajan değiştiremez).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KAPANIS_CUMLESI = "Bu föy hazırlık amaçlıdır; arabulucunuz tarafından gözden geçirilmiştir.";
const MAX_METIN = 4_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* ── AJAN DURUM YAZIMI ───────────────────────────────────────────────────────
   Durum yazımı asıl işi ASLA bozmaz: try/catch içinde, hata yutulur ve loglanır. */
const AGENT_TYPE = "hazirlik_foyu";
async function durumYaz(admin: any, caseId: string, partyId: string | null, patch: Record<string, unknown>) {
  if (!admin || !caseId) return;
  try {
    let sorgu = admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE);
    sorgu = partyId ? sorgu.eq("party_id", partyId) : sorgu.is("party_id", null);
    const { data: mevcut } = await sorgu.maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcut?.id) await admin.from("agent_states").update(govde).eq("id", mevcut.id);
    else await admin.from("agent_states")
      .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: partyId, ...govde });
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

// Karşılaştırma için sadeleştirme (Türkçe harfler katlanır). Yalnız eşleştirme içindir.
function sade(metin: string): string {
  return temiz(metin)
    .toLocaleLowerCase("tr-TR")
    .replace(/[şŞ]/g, "s").replace(/[ıİiI]/g, "i").replace(/[ğĞ]/g, "g")
    .replace(/[çÇ]/g, "c").replace(/[öÖ]/g, "o").replace(/[üÜ]/g, "u")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* YASAK DİL — madde bu ifadelerden birini taşıyorsa elenir. Tavsiye, tahmin,
   rakam önerisi, karşı taraf yorumu ve kişilik/duygu etiketi föye giremez. */
const YASAK_IFADELER = [
  "kabul edin", "kabul etmeyin", "reddedin", "kabul etmelisiniz", "reddetmelisiniz",
  "tavsiye ederiz", "tavsiye ederim", "öneririz size", "hukuki tavsiye",
  "kazanırsınız", "kaybedersiniz", "mahkeme", "dava açarsanız", "haklısınız",
  "haksızsınız", "karşı taraf haksız", "karşı taraf haklı", "kötü niyet", "oyalıyor",
  "sinirli", "kaygılı", "agresif", "kişilik", "psikoloj", "niyeti",
  "şu tutarı", "şu rakamı", "teklif edin", "tl teklif",
];
function yasakIfade(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return YASAK_IFADELER.find((x) => k.includes(x)) ?? null;
}

/* SORU SINIRI (16.08 canlı bulgu) — Serpil Karahan föyünde sorular tarafın hukuki
   tezini kurmaya yaklaşmıştı ("formu okuma fırsatınız oldu mu", "riskler size ne
   kadar açıklandı"). Bunlar karşı tarafın kusurunu araştıran sorulardır ve
   arabulucunun tarafsızlığını zedeler.
   İZİNLİ: tarafın KENDİ talebini, beklentisini, belgesini netleştiren sorular.
   YASAK: karşı tarafın kusuru/ihmali/yükümlülüğü/niyeti · tarafa hukuki tez
   kurduran ("size açıklandı mı", "bilgilendirildiniz mi") · yönlendiren · duygu
   sorgulayan sorular. Kararsız kalınan soru ELENİR (az soru, riskli sorudan iyidir). */
const SORU_YASAK_KALIPLARI = [
  // karşı tarafın kusuru / yükümlülüğü
  // Edilgen çatı: "…açıklandı / anlatıldı / bildirildi / alındı" kalıpları karşı
  // tarafın ne yapıp yapmadığını araştırır; hepsi elenir (kararsızlıkta eleme).
  "açıkland", "aciklan", "anlatıld", "anlatild", "izah edil", "bildirild",
  "bilgilendir", "bilgi verildi", "onay alınd", "onay alind", "rıza alınd",
  "riza alind", "imzalatıld", "imzalatild", "gösterild", "gosterild",
  "haklarınız anlatıl", "haklariniz anlatil", "uyarıldınız", "uyarildiniz",
  "izin verildi mi", "fırsatınız oldu", "firsatiniz oldu", "imkânınız oldu",
  "imkaniniz oldu", "sorgulama fırsat", "okuma fırsat",
  "ihmal", "kusur", "hata yapıl", "hata yapil", "yükümlülüğünü", "yukumlulugunu",
  "gerekeni yaptı", "gerekeni yapti", "yeterince", "yeterli miydi", "gereği gibi",
  "usulüne uygun mu", "usulune uygun mu", "kim sorumlu", "sorumlusu kim",
  // duygu sorgulama
  "ne hissettiniz", "hissediyorsunuz", "stresin", "endişen", "endisen",
  "kaygın", "kaygin", "üzüldünüz", "uzuldunuz", "rahatsız oldunuz",
  // yönlendirme
  "değil mi?", "degil mi?", "katılıyor musunuz", "katiliyor musunuz",
  "haklı olduğunuzu", "hakli oldugunuzu",
];
function soruYasakMi(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return SORU_YASAK_KALIPLARI.find((x) => k.includes(x)) ?? null;
}

/* SORU YÖNÜ KURALI (16.08 ikinci canlı bulgu — Anadolu Sağlık Hizmetleri föyü):
   İlk eleme "karşı tarafın kusurunu araştıran soru" için kurulmuştu; bu kez sorular
   TARAFIN KENDİSİNİ hesap vermeye zorladı ve süzgeçten geçti ("… neden ilk etapta
   teslim edilmemiştir?", "yasal dayanağı nedir?", "ne anlama gelmektedir?").
   Kural artık İSİM değil YÖN üzerinedir: soru KİMSEYİ — ne tarafın kendisini ne
   karşı tarafı — savunmaya, gerekçe göstermeye, hesap vermeye çağıramaz.
   Kararsız kalınan soru ELENİR. */
const SORU_YON_KALIPLARI = [
  "neden", "niçin", "nicin", "niye",
  "yasal dayanağı", "yasal dayanagi", "hukuki dayanağı", "hukuki dayanagi",
  "dayanağı nedir", "dayanagi nedir", "ne anlama gel", "izah ed",
  "gerekçesi nedir", "gerekcesi nedir", "gerekçelendir", "gerekcelendir",
  "iddia edilen", "iddia ettiği", "iddia ettigi", "öne sürülen", "one surulen",
  "yapılmış mıdır", "yapilmis midir", "edilmiş midir", "edilmis midir",
  "mı yapıldı", "mi yapildi", "teslim edilmem", "verilmem", "yerine getirilm",
  "savun", "hesap ver",
];
function soruYonYasakMi(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return SORU_YON_KALIPLARI.find((x) => k.includes(x)) ?? null;
}

/* HUKUKİ NİTELEME YASAĞI: föy metninde niteleme kelimesi kullanılmaz; olgu dili
   esastır ("tedavi sonrası ortaya çıkan durum", "talep edilen tutar"). */
const HUKUKI_NITELEME = [
  "kusur", "ihmal", "sorumluluk", "sorumlu tut", "malpraktis", "haksız fiil",
  "haksiz fiil", "tazminat hakkı", "tazminat hakki", "hukuka aykırı", "hukuka aykiri",
  "ihlal", "zarar sorumlus", "kast", "taksir", "illiyet",
];
function hukukiNitelemeVarMi(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return HUKUKI_NITELEME.find((x) => k.includes(x)) ?? null;
}

/* MAKİNE ETİKETİ: madde sonuna "(Özel Vita Hastanesi)" gibi taraf etiketi
   yazılıyordu. Föy zaten o tarafa aittir; sondaki parantez etiketi kırpılır. */
function makineEtiketiniKirp(metin: string): string {
  return temiz(metin).replace(/\s*\([^()]{2,60}\)\s*$/u, "").trim();
}

/* HAM VERİ TEMİZLİĞİ (16.08 canlı bulgu): föye "Katılım biçimi: main" yazılmıştı —
   veritabanı kodu tarafın göreceği metne sızdı. Tanınmayan kod ASLA yazılmaz. */
const KATILIM_BICIMI: Record<string, string> = {
  online: "çevrimiçi",
  cevrimici: "çevrimiçi",
  video: "çevrimiçi",
  yuz_yuze: "yüz yüze",
  yuzyuze: "yüz yüze",
  fiziksel: "yüz yüze",
  ofis: "yüz yüze",
};
function katilimBicimiMetni(kod: string): string {
  return KATILIM_BICIMI[temiz(kod).toLocaleLowerCase("tr-TR")] ?? "";
}

// Dosya adı/uzantı föy metnine girmez (taraf için anlamsız).
function dosyaAdiIceriyorMu(metin: string): boolean {
  return /\.(pdf|docx?|xlsx?|png|jpe?g|txt)\b/i.test(metin) || /[\w-]+_[\w-]+\./.test(metin);
}

/* DOSYA KARŞILIĞI: maddede geçen anlamlı bir sözcük (≥5 harf) tarafın kendi
   metinlerinde geçmiyorsa madde ELENİR — model dosyada olmayan madde uyduramaz. */
function dosyadaKarsiligiVar(madde: string, korpus: string): boolean {
  const sadeKorpus = sade(korpus);
  const kelimeler = sade(madde).split(" ").filter((k) => k.length >= 5);
  if (kelimeler.length === 0) return false;
  return kelimeler.some((k) => sadeKorpus.includes(k));
}

function trTarihSaat(iso: string): { tarih: string; saat: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { tarih: "—", saat: "—" };
  return {
    tarih: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    saat: d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let durumAdmin: any = null;
  let durumCaseId = "";
  let durumPartyId: string | null = null;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

    // İç çağrı kapısı: nöbetçi ajan bu fonksiyonu x-cron-secret ile çağırabilir;
    // dışarıdan gelen isteklerde kullanıcı yetkisi aranır. Anahtar tanımsız ya da
    // boşsa kapı KAPALIDIR. Kalıp elverislilik/usul-onerisi ile aynıdır.
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
    const session_id = temiz((body as any)?.session_id);
    const party_id = temiz((body as any)?.party_id);
    if (!case_id || !session_id || !party_id) {
      return json({ error: "case_id, session_id ve party_id gerekli" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, title, issue_description")
      .eq("id", case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf çağıramaz.
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
    durumPartyId = party_id;
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "running", error_message: null });

    // ONAYLI / GÖNDERİLMİŞ FÖYE DOKUNULMAZ.
    const { data: mevcutFoy } = await admin.from("oturum_hazirlik_foyleri")
      .select("id, durum").eq("session_id", session_id).eq("party_id", party_id).maybeSingle();
    if (mevcutFoy && ["onaylandi", "gonderildi"].includes(String((mevcutFoy as any).durum))) {
      await durumYaz(durumAdmin, durumCaseId, durumPartyId, {
        status: "completed", error_message: null,
        last_output: { sonuc: "atlandi", sebep: "föy onaylanmış/gönderilmiş" },
      });
      return json({ atlandi: true, sebep: "Föy onaylanmış ya da gönderilmiş; üzerine yazılmaz." });
    }

    const { data: taraf, error: pErr } = await admin.from("case_parties")
      .select("id, case_id, party_role, party_type, first_name, last_name, company_name, full_name, statement")
      .eq("id", party_id).maybeSingle();
    if (pErr) return json({ error: pErr.message }, 500);
    if (!taraf || String((taraf as any).case_id) !== String(case_id)) {
      return json({ error: "Taraf bu dosyaya ait değil" }, 400);
    }

    const { data: oturum, error: sErr } = await admin.from("case_sessions")
      .select("id, case_id, scheduled_at, status, session_type, meeting_type, video_link")
      .eq("id", session_id).maybeSingle();
    if (sErr) return json({ error: sErr.message }, 500);
    if (!oturum || String((oturum as any).case_id) !== String(case_id)) {
      return json({ error: "Oturum bu dosyaya ait değil" }, 400);
    }

    // ── YALNIZ BU TARAFIN VERİSİ ────────────────────────────────────────────
    const { data: belgeler } = await admin.from("case_documents")
      .select("id, file_name").eq("case_id", case_id).eq("party_id", party_id).limit(50);
    const belgeIdleri = ((belgeler ?? []) as any[]).map((d) => d.id);
    const { data: ozetler } = belgeIdleri.length
      ? await admin.from("belge_ozetleri")
        .select("document_id, ozet, kaniti, durum").in("document_id", belgeIdleri).limit(50)
      : { data: [] as any[] };
    const ozetBlogu = ((ozetler ?? []) as any[])
      .filter((o) => temiz(o.durum) === "uretildi")
      .map((o) => `${temiz(o.ozet)} ${temiz(o.kaniti)}`.trim())
      .join("\n");

    const { data: sorular } = await admin.from("case_discovery_questions")
      .select("question_text, answer_text").eq("case_id", case_id).eq("party_id", party_id).limit(30);
    const cevapsizSorular = ((sorular ?? []) as any[])
      .filter((q) => !temiz(q.answer_text))
      .map((q) => temiz(q.question_text))
      .filter(Boolean);

    // Yüklenmiş belge adları: "eksik belgeler" bölümünde bunlar TEKRAR YAZILMAZ.
    const yuklenmisAdlar = ((belgeler ?? []) as any[])
      .map((d) => temiz(d.file_name)).filter(Boolean);

    /* Arabulucunun/ajanın daha önce istediği ama gelmeyen bilgi-belge: taraf ajanı
       panosundaki kendi satırları. Yalnız BU TARAFA yönelik kayıtlar okunur. */
    const { data: istekler } = await admin.from("ajan_gorevleri")
      .select("gorev_tipi, gerekce, sonuc, durum")
      .eq("case_id", case_id).eq("hedef_party_id", party_id)
      .in("gorev_tipi", ["taraf_eksik_bilgi", "soru_gonder"]).limit(20);
    const istenenler = ((istekler ?? []) as any[])
      .map((g) => `${temiz(g.gerekce)} ${temiz(g.sonuc)}`.trim())
      .filter((x) => x.length > 10);

    const beyan = temiz((taraf as any).statement);
    const konu = temiz((caseRow as any).issue_description);
    const korpus = [konu, beyan, ozetBlogu, ((belgeler ?? []) as any[]).map((d) => temiz(d.file_name)).join(" ")]
      .filter(Boolean).join("\n");

    type Bolum = { baslik: string; maddeler: string[] };
    const bolumler: Bolum[] = [];
    const elenen: string[] = [];

    // ── (a) ve (b): model üretir, sunucu eler ───────────────────────────────
    if (apiKey && korpus.trim().length > 40) {
      const systemPrompt = `Sen bir arabuluculuk dosyasında TARAFA VERİLECEK HAZIRLIK FÖYÜNÜ yazan yardımcısın. Föyü okuyacak kişi hukukçu değildir.

MUTLAK SINIRLAR:
1. Yalnız sana verilen DOSYA METİNLERİNE dayan. Karşılığı olmayan hiçbir madde yazma.
2. Hukuki tavsiye verme, sonuç tahmin etme, "kabul edin/etmeyin" deme, rakam önerme.
3. Karşı taraf hakkında yorum yapma; karşı tarafın verisi sana zaten verilmedi.
4. Duygu, kişilik ve niyet değerlendirmesi yapma.
5. Sade Türkçe yaz, hukuk jargonu kullanma. Her madde tek cümle olsun.

SORU YÖNÜ (en önemli kural): Hiçbir madde KİMSEYİ — ne bu tarafı ne karşı tarafı — savunmaya, gerekçe göstermeye ya da hesap vermeye çağırmaz. "Neden …", "yasal dayanağı nedir", "ne anlama gelmektedir", "… neden teslim edilmemiştir", "iddia edilen …" gibi maddeler YAZILMAZ.
İZİNLİ ÇERÇEVE: yalnız bu tarafın KENDİ talebini, beklentisini, önceliğini ve elindeki bilgiyi netleştiren maddeler — "sizin için hangi başlık önce çözülmeli", "talebinizin kalemleri neler", "hangi gideri hangi belgeyle gösteriyorsunuz", "para dışında bir beklentiniz var mı", "hangi belge ne zaman hazır olabilir", "oturuma kim katılacak ve yetkisi ne".
HUKUKİ NİTELEME YASAĞI: kusur, ihmal, sorumluluk, malpraktis, haksız fiil, tazminat hakkı, ihlal gibi niteleme kelimeleri KULLANMA. Olgu dili kullan ("tedavi sonrası ortaya çıkan durum", "talep edilen tutar").
ETİKET YASAĞI: madde sonuna "(Taraf Adı)" gibi etiket yazma; föy zaten o tarafa aittir.

İki bölüm üret:
· "Oturumda konuşulacak başlıklar": dosyanın konusundan ve bu tarafın kendi anlatımından çıkan, oturumda ele alınması beklenen başlıklar (en çok 6 madde). Örnek çerçeve: talebin kalemleri, hangi başlığın önce çözülmesi, para dışı beklenti, olayların tarih sırası.
· "EKSİK BELGELER": tarafın anlatımında ya da dosyada ADI GEÇEN ama HENÜZ YÜKLENMEMİŞ belgeler (en çok 5 madde). Sana "zaten yüklenmiş belgeler" listesi veriliyor; ORADA OLAN HİÇBİR BELGEYİ YAZMA. Dosya adı yazma; insan diliyle yaz ("ameliyat görüntü kayıtları", "hemşire gözlem formları"). Eksik görünmüyorsa listeyi BOŞ bırak.

Çıktı YALNIZCA JSON: {"basliklar":[""],"eksik_belgeler":[""]}`;

      const userPrompt = `[DOSYA KONUSU]\n${konu || "—"}\n\n`
        + `[TARAFIN KENDİ ANLATIMI]\n${beyan.slice(0, MAX_METIN) || "—"}\n\n`
        + `[ZATEN YÜKLENMİŞ BELGELER — BUNLARI YAZMA]\n${yuklenmisAdlar.join(" · ") || "—"}\n\n`
        + `[TARAFIN BELGE ÖZETLERİ]\n${ozetBlogu.slice(0, MAX_METIN) || "—"}\n\n`
        + `[ARABULUCUNUN DAHA ÖNCE İSTEDİĞİ AMA GELMEYEN BİLGİ/BELGE]\n${istenenler.join("\n") || "—"}`;

      try {
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
        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          let parsed: any = {};
          try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

          const suz = (liste: unknown, etiket: string): string[] => {
            const ham = Array.isArray(liste) ? liste : [];
            const kalan: string[] = [];
            for (const m of ham) {
              const madde = makineEtiketiniKirp(temiz(m));
              if (madde.length < 10) continue;
              const yasak = yasakIfade(madde);
              if (yasak) { elenen.push(`${etiket}: yasak dil ("${yasak}")`); continue; }
              const niteleme = hukukiNitelemeVarMi(madde);
              if (niteleme) { elenen.push(`${etiket}: hukuki niteleme ("${niteleme}")`); continue; }
              if (!dosyadaKarsiligiVar(madde, korpus)) {
                elenen.push(`${etiket}: dosyada karşılığı bulunamadı`);
                continue;
              }
              kalan.push(madde.slice(0, 300));
            }
            return kalan;
          };

          // Başlıklar: yasak dil + dosya karşılığı + SORU SINIRI süzgecinden geçer.
          const basliklar = suz(parsed?.basliklar, "başlık")
            .filter((m) => {
              const y = soruYasakMi(m);
              if (y) { elenen.push(`başlık: tarafsızlık sınırı ("${y}")`); return false; }
              const yon = soruYonYasakMi(m);
              if (yon) { elenen.push(`başlık: yön sınırı — hesap sorma ("${yon}")`); return false; }
              return true;
            })
            .slice(0, 6);

          /* Eksik belgeler: ZATEN YÜKLENMİŞ belge tekrar yazılmaz, dosya adı/uzantı
             içeren madde elenir. Not: bu bölümde "dosyada karşılığı olsun" kuralı
             gevşetilir — istenen belge tanımı gereği dosyada YOKTUR; bunun yerine
             tarafın anlatımında ya da arabulucunun isteklerinde karşılığı aranır. */
          const eksikKorpus = [beyan, istenenler.join("\n")].filter(Boolean).join("\n");
          const eksikBelgeler = (Array.isArray(parsed?.eksik_belgeler) ? parsed.eksik_belgeler : [])
            .map((m: unknown) => makineEtiketiniKirp(temiz(m)))
            .filter((m: string) => {
              if (m.length < 8) return false;
              const y = yasakIfade(m) ?? soruYasakMi(m) ?? soruYonYasakMi(m);
              if (y) { elenen.push(`eksik belge: yasak dil/yön ("${y}")`); return false; }
              const n = hukukiNitelemeVarMi(m);
              if (n) { elenen.push(`eksik belge: hukuki niteleme ("${n}")`); return false; }
              if (dosyaAdiIceriyorMu(m)) { elenen.push("eksik belge: dosya adı yazılmış"); return false; }
              if (yuklenmisAdlar.some((ad) => sade(m).includes(sade(ad)) || sade(ad).includes(sade(m)))) {
                elenen.push("eksik belge: zaten yüklenmiş");
                return false;
              }
              if (eksikKorpus.trim().length > 0 && !dosyadaKarsiligiVar(m, eksikKorpus)) {
                elenen.push("eksik belge: anlatımda ya da istek kaydında karşılığı yok");
                return false;
              }
              return true;
            })
            .slice(0, 5)
            .map((m: string) => m.slice(0, 300));

          if (basliklar.length > 0) bolumler.push({ baslik: "Oturumda konuşulacak başlıklar", maddeler: basliklar });
          if (eksikBelgeler.length > 0) bolumler.push({ baslik: "Yanınızda bulundurmanız iyi olur", maddeler: eksikBelgeler });
        } else {
          console.error(`[hazirlik-foyu] HTTP ${aiRes.status}`);
        }
      } catch (e: any) {
        console.error(`[hazirlik-foyu] model çağrısı başarısız: ${e?.message ?? e}`);
      }
    }

    /* ── (c) Cevaplanmamış keşif soruları — KODDAN, ama SORU SINIRINDAN GEÇEREK.
       16.08: bu sorular başka bir ajan tarafından üretiliyor; tarafsızlık sınırını
       aşan soru (karşı tarafın kusurunu araştıran, tez kurduran, duygu sorgulayan)
       föye ALINMAZ. Kararsız kalınan soru elenir. */
    const guvenliSorular = cevapsizSorular
      .map((q) => makineEtiketiniKirp(q))
      .filter((q) => {
        const y = soruYasakMi(q) ?? yasakIfade(q);
        if (y) { elenen.push(`keşif sorusu elendi: tarafsızlık sınırı ("${y}")`); return false; }
        const yon = soruYonYasakMi(q);
        if (yon) { elenen.push(`keşif sorusu elendi: yön sınırı — hesap sorma ("${yon}")`); return false; }
        const n = hukukiNitelemeVarMi(q);
        if (n) { elenen.push(`keşif sorusu elendi: hukuki niteleme ("${n}")`); return false; }
        return true;
      });
    if (guvenliSorular.length > 0) {
      bolumler.push({
        baslik: "Cevabını hazırlamanız iyi olur",
        maddeler: guvenliSorular.slice(0, 8).map((q) => q.slice(0, 300)),
      });
    }

    // ── (d) Oturum bilgileri — KODDAN, kayıttan ────────────────────────────
    const oturumMaddeleri: string[] = [];
    const zaman = temiz((oturum as any).scheduled_at);
    if (zaman) {
      const { tarih, saat } = trTarihSaat(zaman);
      oturumMaddeleri.push(`Tarih: ${tarih}`);
      oturumMaddeleri.push(`Saat: ${saat}`);
    }
    // Tanınmayan kod ASLA yazılmaz (ör. "main" gibi iç değerler föye sızmasın).
    const bicimMetni = katilimBicimiMetni(temiz((oturum as any).meeting_type));
    if (bicimMetni) oturumMaddeleri.push(`Katılım biçimi: ${bicimMetni}`);
    if (temiz((oturum as any).video_link)) {
      oturumMaddeleri.push("Görüşme bağlantısı oturum davetinde paylaşılır.");
    }
    if (oturumMaddeleri.length > 0) {
      bolumler.push({ baslik: "Oturum bilgileri", maddeler: oturumMaddeleri });
    }

    /* 16.08: Kapanış cümlesi ARTIK BÖLÜM OLARAK YAZILMIYOR — başlıksız boş bölüm
       gibi görünüyordu. Metin sabit olduğu için ekranda alt not olarak gösterilmesi
       ön yüz işidir; veriden çıkarıldı. (Sabit metin aşağıda dursun ki gerektiğinde
       tek yerden okunabilsin.) */
    const dolu = bolumler.filter((b) => b.baslik && b.maddeler.length > 0).length > 0;
    const satir = {
      case_id, session_id, party_id,
      bolumler,
      durum: "taslak",
      updated_at: new Date().toISOString(),
    };
    const { error: yErr } = await admin.from("oturum_hazirlik_foyleri")
      .upsert(satir, { onConflict: "session_id,party_id" });
    if (yErr) {
      await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "failed", error_message: yErr.message });
      return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);
    }

    await durumYaz(durumAdmin, durumCaseId, durumPartyId, {
      status: "completed", error_message: null,
      last_output: { sonuc: dolu ? "taslak_hazir" : "bos_taslak", bolum: bolumler.length, elenen: elenen.slice(0, 5) },
    });
    return json({
      durum: "taslak",
      bolum: bolumler.length,
      bos: !dolu,
      elenen: elenen.slice(0, 5),
    });
  } catch (e: any) {
    console.error("[hazirlik-foyu] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, {
      status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500),
    });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
