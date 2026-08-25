// OLAY ZAMAN ÇİZELGESİ (İBA 2.3 · mimari/05 §5.2g "hafif kademe").
//
// Dosyadaki bütün tarihleri tek çizelgede, eskiden yeniye sıralar. Her satırda
// tarih · tek cümlelik olay · kaynak (hangi belge / hangi bölüm-sayfa / tarafın beyanı).
//
// KAYNAK: mevcut belge metni çıkarma hattının çıktısı (case_documents.extracted_text),
// tarafların kendi beyanı (case_parties.statement) ve dosya kayıtları (başvuru tarihi).
// Yeni bağımsız bir zincir kurulmaz — §5.2d hattının üstüne oturur.
//
// GİZLİLİK: Çıktı olay_cizelgesi tablosuna yazılır; o tabloda tarafa hiçbir SELECT
// politikası yoktur. Çizelge yalnız arabulucu/yöneticide kalır (constitution m.1).
//
// HALÜSİNASYON KAPISI (m.2): kaynağı olmayan satır ÇİZELGEYE GİRMEZ. Tahmini tarih
// üretilmez; belgede "yaklaşık/civarında" gibi ifade varsa tarih_metni'ne aynen aktarılır.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { anlatimYansit } from "../_shared/anlatim.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Belge başına çizelgeye girdi olarak okunacak en fazla karakter.
const MAX_BELGE = 9_000;
// Toplam girdi tavanı (çok belgeli dosyalarda istem şişmesin).
const MAX_TOPLAM = 45_000;
const MAX_SATIR = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Ajanın KENDİ hükmü yasaktır; tarafın iddiasının aktarımı serbesttir
// (belge-ozeti ile aynı desen).
const HUKUM_KELIMELERI = [
  "haksız", "hukuka aykırı", "ihlal", "kusur", "suç", "geçersiz", "borçlu", "sorumludur",
];
const ATIF_KALIPLARI = [
  "ileri sür", "iddia", "belirtil", "belirtiyor", "belirtmekte", "talep ed",
  "denilmekte", "denmekte", "ifade ed", "beyan ed", "öne sür", "aktarıl", "savun",
  "yer alıyor", "yer almakta", "yer veril", "kaydedil", "istenmekte", "bildiril", "göre",
];
function hukumKuruyor(cumle: string): boolean {
  const k = cumle.toLocaleLowerCase("tr-TR");
  if (!HUKUM_KELIMELERI.some((w) => k.includes(w))) return false;
  return !ATIF_KALIPLARI.some((a) => k.includes(a));
}

// "14.03.2026" / "2026-03-14" / "14 Mart 2026" → ISO tarih. Çözülemezse null
// döner ve satır yalnız tarih_metni ile durur (tahmin ÜRETİLMEZ).
const TR_AYLAR: Record<string, number> = {
  "ocak": 1, "şubat": 2, "subat": 2, "mart": 3, "nisan": 4, "mayıs": 5, "mayis": 5,
  "haziran": 6, "temmuz": 7, "ağustos": 8, "agustos": 8, "eylül": 9, "eylul": 9,
  "ekim": 10, "kasım": 11, "kasim": 11, "aralık": 12, "aralik": 12,
};
// Çizelge YALNIZ uyuşmazlığın olay zincirine ait tarihleri alır. Kişisel künye
// bilgileri (doğum tarihi, kimlik/belge düzenlenme tarihi) ve matbu form tarihleri
// olay değildir — istemde yasaklanır, burada da sunucuda elenir.
const ILGISIZ_KALIPLAR = [
  "doğum tarihi", "dogum tarihi", "doğum günü", "dogum gunu", "doğumlu", "dogumlu",
  "nüfus cüzdan", "nufus cuzdan", "kimlik kart", "kimlik belgesi",
  "t.c. kimlik", "tc kimlik", "kimlik numaras",
  "belge düzenlenme tarihi", "belge duzenlenme tarihi",
  "düzenlenme tarihi", "duzenlenme tarihi",
  "matbu", "form tarihi", "baskı tarihi", "baski tarihi",
  "geçerlilik tarihi", "gecerlilik tarihi", "son kullanma",
];
function ilgisizOlay(olay: string): string | null {
  const k = olay.toLocaleLowerCase("tr-TR");
  return ILGISIZ_KALIPLAR.find((x) => k.includes(x)) ?? null;
}

// Ekranda TEK BİÇİM: GG.AA.YYYY. Aralık "GG.AA.YYYY – GG.AA.YYYY" olarak kalır.
// Belirsiz ifadeler ("yaklaşık Mart 2026") AYNEN korunur — biçime zorlanmaz.
function ggAaYyyy(iso: string): string {
  const [y, a, g] = iso.split("-");
  return `${g}.${a}.${y}`;
}
function tarihBicimle(metin: string): string {
  const t = temiz(metin);
  if (!t) return t;
  // Aralık: "–", "—" ya da boşluklu "-" / " ile " ayracı.
  const ayrac = /\s+(?:–|—|-|ile|arası|arasında)\s+/i;
  if (ayrac.test(t)) {
    const parcalar = t.split(ayrac);
    if (parcalar.length === 2) {
      const a = isoTarih(parcalar[0]);
      const b = isoTarih(parcalar[1]);
      if (a && b && /^[\d.\-/\s]+$/.test(parcalar[0]) && /^[\d.\-/\s]+$/.test(parcalar[1])) {
        return `${ggAaYyyy(a)} – ${ggAaYyyy(b)}`;
      }
    }
    return t;
  }
  // Tek tarih: metnin TAMAMI tarihse biçimlendirilir; içinde açıklama varsa dokunulmaz.
  const iso = isoTarih(t);
  if (iso && /^[\d.\-/]+$/.test(t)) return ggAaYyyy(iso);
  return t;
}

function isoTarih(metin: string): string | null {
  const t = temiz(metin);
  if (!t) return null;
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(t);
  if (m) {
    const g = m[1].padStart(2, "0"), a = m[2].padStart(2, "0");
    if (Number(a) >= 1 && Number(a) <= 12 && Number(g) >= 1 && Number(g) <= 31) return `${m[3]}-${a}-${g}`;
    return null;
  }
  m = /(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/.exec(t);
  if (m) {
    const ay = TR_AYLAR[m[2].toLocaleLowerCase("tr-TR")];
    if (ay) return `${m[3]}-${String(ay).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

/* ── AJAN DURUM YAZIMI (Ajan Kontrol Paneli) ─────────────────────────────────
   Panel bu satırlardan beslenir. KRİTİK: durum yazımı asıl işi ASLA bozmaz —
   her yazma try/catch içindedir, hata yutulur ve yalnız konsola loglanır.
   Aynı case_id + agent_type (+ party_id) için TEK satır güncellenir; her koşumda
   yeni satır birikmez. tarafa_gorunur alanına DOKUNULMAZ (varsayılan false). */
const AGENT_TYPE = "olay_cizelgesi";
async function durumYaz(
  admin: any, caseId: string, partyId: string | null, patch: Record<string, unknown>,
) {
  if (!admin || !caseId) return;
  try {
    let sorgu = admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE);
    sorgu = partyId ? sorgu.eq("party_id", partyId) : sorgu.is("party_id", null);
    const { data: mevcutSatir } = await sorgu.maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcutSatir?.id) {
      const { error: durumErr } = await admin.from("agent_states").update(govde).eq("id", mevcutSatir.id);
      if (durumErr) console.error("[olay-cizelgesi] ajan durum satırı yazılamadı:", durumErr.message);
    } else {
      const { error: durumErr } = await admin.from("agent_states")
        .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: partyId, ...govde });
      if (durumErr) console.error("[olay-cizelgesi] ajan durum satırı yazılamadı:", durumErr.message);
    }
    // ANLATIM (best-effort): aynı satıra düz Türkçe adım yazılır; davranış değişmez.
    await anlatimYansit(admin, { case_id: caseId, agent_type: AGENT_TYPE, party_id: partyId }, patch);
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Hata dalında da durum yazılabilmesi için asıl iş içinde doldurulur.
  let durumAdmin: any = null;
  let durumCaseId = "";
  let durumPartyId: string | null = null;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY tanımlı değil" }, 500);

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
    // yenile=true: mevcut çizelge silinip yeniden üretilir.
    const yenile = (body as any)?.yenile === true;
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, title, application_date, created_at")
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
    await durumYaz(durumAdmin, durumCaseId, null, { status: "running", error_message: null });

    // Zaten üretilmiş çizelge TEKRAR ÜRETİLMEZ — yalnız açık istekle yenilenir.
    const { count: mevcutSayi } = await admin.from("olay_cizelgesi")
      .select("id", { count: "exact", head: true }).eq("case_id", case_id);
    if ((mevcutSayi ?? 0) > 0 && !yenile) {
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "atlandi", sebep: "çizelge zaten var" } });
      return json({ atlandi: true, sebep: "Bu dosyanın çizelgesi zaten var", satir: mevcutSayi });
    }

    // ── GİRDİ: belgeler (çıkarma hattının metni) + taraf beyanları + dosya kayıtları ──
    const { data: docs } = await admin.from("case_documents")
      .select("id, file_name, extracted_text, extraction_status")
      .eq("case_id", case_id).limit(50);
    const belgeler = ((docs ?? []) as any[]).filter((d) => temiz(d.extracted_text).length >= 60);

    const { data: taraflar } = await admin.from("case_parties")
      .select("id, first_name, last_name, company_name, statement, created_at")
      .eq("case_id", case_id).limit(20);

    let toplam = 0;
    const belgeBloklari: string[] = [];
    for (const d of belgeler) {
      if (toplam >= MAX_TOPLAM) break;
      const parca = temiz(d.extracted_text).slice(0, MAX_BELGE);
      toplam += parca.length;
      belgeBloklari.push(`[BELGE #${d.id} — ${temiz(d.file_name)}]\n${parca}`);
    }

    const beyanBloklari: string[] = [];
    for (const t of ((taraflar ?? []) as any[])) {
      const s = temiz(t.statement);
      if (s.length < 40) continue;
      const ad = temiz(t.company_name) || `${temiz(t.first_name)} ${temiz(t.last_name)}`.trim() || "Taraf";
      beyanBloklari.push(`[BEYAN — ${ad}]\n${s.slice(0, 4000)}`);
    }

    if (belgeBloklari.length === 0 && beyanBloklari.length === 0) {
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "atlandi", sebep: "yeterli veri yok" } });
      return json({
        atlandi: true,
        sebep: "Yeterli veri yok: metni okunabilen belge ve taraf beyanı bulunamadı",
      });
    }

    const systemPrompt = `Sen bir arabuluculuk dosyasının OLAY ZAMAN ÇİZELGESİNİ çıkaran tarafsız bir asistansın.
Sana dosyadaki belgelerin metni ve tarafların beyanları verilir. Bunlarda geçen TARİHLERİ
tek bir çizelgeye toplayacaksın.

MUTLAK KURALLAR:
1. KAYNAĞI OLMAYAN SATIR YAZILAMAZ. Her satır, verilen bloklardan birine dayanmalıdır.
   kaynak_id alanına o bloğun [BELGE #...] kimliğini, beyandan geliyorsa "beyan" yaz.
2. TAHMİNİ TARİH ÜRETME. Metinde açıkça yazmayan hiçbir tarihi çizelgeye koyma.
   Metinde "yaklaşık", "civarında", "Mart ayı içinde" gibi belirsiz ifade varsa
   tarih_metni alanına AYNEN böyle yaz; kesin bir güne çevirme.
3. olay alanı TEK CÜMLE olacak. Kendi hukuki nitelemeni yapma ("haksızdır",
   "kusurludur", "hukuka aykırıdır" gibi HÜKÜM cümlesi kurma). Bir taraf iddia ediyorsa
   aktarım kalıbı kullan: "…olduğu ileri sürülmektedir", "…belirtilmektedir".
4. kaynak_bolum alanına belgede tespit edebildiğin yeri yaz (ör. "s.3", "madde 7",
   "giriş paragrafı"). Tespit edemiyorsan BOŞ bırak — uydurma.
5. İKİ KAYNAK AYNI OLAYI FARKLI TARİHLE gösteriyorsa TEK satır yaz ve celiski_notu
   alanına şu biçimde not düş: "Çelişki: X belgesi 14.03, Y belgesi 18.03 diyor".
   Aynı olay için iki ayrı satır açma.
6. Aynı olayın tekrarını yazma. En çok ${MAX_SATIR} satır üret.
7. Çizelgeye girecek olay yoksa satirlar dizisini BOŞ döndür; doldurmak için uydurma.
8. ÇİZELGEYE YALNIZ UYUŞMAZLIĞIN OLAY ZİNCİRİNE AİT TARİHLER GİRER: tıbbi veya hukuki
   işlem, başvuru, yazışma/ihtar, ödeme, rapor, oturum, süre başlangıcı-bitişi gibi.
   ÇİZELGEYE GİRMEYECEKLER: doğum tarihi, kimlik/nüfus cüzdanı veya belgenin kendi
   düzenlenme tarihi gibi kişisel künye bilgileri; matbu form tarihleri; belgenin
   baskı/geçerlilik tarihi. Bir tarihin olay zincirine ait olduğundan emin değilsen
   O SATIRI HİÇ YAZMA.
9. tarih_metni biçimi: belgede kesin bir gün yazıyorsa GG.AA.YYYY yaz (ör. 13.08.2026).
   Aralıksa "GG.AA.YYYY – GG.AA.YYYY" yaz. Belirsizse ("yaklaşık Mart 2026") olduğu
   gibi bırak; kesin güne çevirme.

Çıktı YALNIZCA JSON:
{"satirlar":[{"tarih_metni":"belgede yazdığı gibi","olay":"tek cümle","kaynak_id":"BELGE #<id> veya beyan","kaynak_adi":"belge adı veya taraf adı","kaynak_bolum":"","celiski_notu":""}]}`;

    const userPrompt = `DOSYA BAŞLIĞI: ${temiz((caseRow as any).title)}

${belgeBloklari.join("\n\n")}

${beyanBloklari.join("\n\n")}

Yukarıdaki kaynaklardaki tarihleri tek çizelgede topla.`;

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
      return json({ error: "Çizelge üretilemedi", detay: t.slice(0, 300) }, aiRes.status);
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }
    const ham = Array.isArray(parsed?.satirlar) ? parsed.satirlar : [];

    // ── SUNUCU TARAFI ELEME (m.2 · m.12): kaynağı olmayan satır GİRMEZ ──
    const belgeIdSet = new Set(belgeler.map((d) => String(d.id)));
    const belgeAdi = new Map(belgeler.map((d) => [String(d.id), temiz(d.file_name)]));
    const elenen: string[] = [];
    const satirlar: any[] = [];

    for (const r of ham.slice(0, MAX_SATIR)) {
      const tarihMetni = temiz(r?.tarih_metni);
      const olay = temiz(r?.olay);
      const kaynakId = temiz(r?.kaynak_id);
      if (!tarihMetni || !olay) { elenen.push("tarih veya olay boş"); continue; }
      if (olay.length < 10) { elenen.push(`olay çok kısa: "${olay}"`); continue; }
      if (hukumKuruyor(olay)) { elenen.push(`ajanın kendi hükmü: "${olay.slice(0, 120)}"`); continue; }
      // Uyuşmazlığın olay zincirine ait olmayan künye/matbu tarihleri çizelgeye girmez.
      const ilgisiz = ilgisizOlay(olay);
      if (ilgisiz) { elenen.push(`olay zinciriyle ilgisiz ("${ilgisiz}"): ${tarihMetni}`); continue; }

      // Kaynak çözümlemesi: belge kimliği tanınmıyorsa ve beyan da değilse satır ELENİR.
      const m = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(kaynakId);
      const docId = m && belgeIdSet.has(m[1]) ? m[1] : null;
      const beyanMi = /beyan/i.test(kaynakId);
      if (!docId && !beyanMi) { elenen.push(`kaynağı çözülemedi: "${kaynakId}" (${tarihMetni})`); continue; }

      satirlar.push({
        case_id,
        tarih: isoTarih(tarihMetni),
        // Tek biçim: GG.AA.YYYY (aralıkta iki yan da). Belirsiz ifade aynen korunur.
        tarih_metni: tarihBicimle(tarihMetni).slice(0, 200),
        olay: olay.slice(0, 500),
        kaynak_tipi: docId ? "belge" : "beyan",
        kaynak_document_id: docId,
        kaynak_adi: (docId ? belgeAdi.get(docId) : temiz(r?.kaynak_adi)) || null,
        kaynak_bolum: temiz(r?.kaynak_bolum).slice(0, 120) || null,
        celiski_notu: temiz(r?.celiski_notu).slice(0, 400) || null,
      });
    }

    // Dosya kaydından gelen sabit nokta: başvuru tarihi (kaynağı sistemin kendi kaydı).
    const basvuru = temiz((caseRow as any).application_date) || temiz((caseRow as any).created_at);
    const basvuruIso = basvuru ? basvuru.slice(0, 10) : null;
    if (basvuruIso) {
      satirlar.push({
        case_id,
        tarih: basvuruIso,
        tarih_metni: ggAaYyyy(basvuruIso),
        olay: "Arabuluculuk başvurusu sisteme kaydedildi",
        kaynak_tipi: "kayit",
        kaynak_document_id: null,
        kaynak_adi: "Dosya kaydı",
        kaynak_bolum: null,
        celiski_notu: null,
      });
    }

    if (satirlar.length === 0) {
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "atlandi", sebep: "kaynağa bağlanabilen tarih yok" } });
      return json({
        atlandi: true,
        sebep: `Kaynağa bağlanabilen tarih bulunamadı${elenen.length ? ` (${elenen.length} satır elendi)` : ""}`,
        elenen: elenen.slice(0, 10),
      });
    }

    // Eskiden yeniye sırala: tarihi çözülenler önce (kronolojik), çözülemeyenler sona.
    satirlar.sort((a, b) => {
      if (a.tarih && b.tarih) return String(a.tarih).localeCompare(String(b.tarih));
      if (a.tarih) return -1;
      if (b.tarih) return 1;
      return 0;
    });
    satirlar.forEach((r, i) => { r.sira = i; });

    // Yenilemede eski çizelge silinir (mükerrer satır kalmaz).
    const { error: sErr } = await admin.from("olay_cizelgesi").delete().eq("case_id", case_id);
    if (sErr) return json({ error: `Eski çizelge silinemedi: ${sErr.message}` }, 500);
    const { error: yErr } = await admin.from("olay_cizelgesi").insert(satirlar);
    if (yErr) return json({ error: `Çizelge yazılamadı: ${yErr.message}` }, 500);

    await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "uretildi", satir: satirlar.length } });
    return json({ satir: satirlar.length, elenen: elenen.slice(0, 10) });
  } catch (e: any) {
    console.error("[olay-cizelgesi] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500) });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
