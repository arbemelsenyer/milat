// İLETİŞİMDE DEĞİŞİM — AYRINTI KOLU (İBA 1.5 · todo A4/5).
//
// Kartın SAYIM kolu ekranda, bedava ve kendiliğinden çalışır; bu fonksiyon yalnız
// arabulucu "Ayrıntısını çıkar" dediğinde çağrılır ve TEK model çağrısı yapar.
//
// NE YAPAR: AYNI TARAFIN en eski ve en yeni tarihli metnini karşılaştırıp değişimi
// tek paragrafta OLGU diliyle yazar; iki tarihten birer kısa alıntıyı dayanak koyar.
//
// BAĞLAYICI KURALLAR:
// · Duygu, kişilik, niyet ve psikolojik durum ifadesi YASAK (constitution m.2,
//   mimari §11). Yasaklı ifade geçen çıktı SUNUCUDA elenir.
// · İki taraf KARŞILAŞTIRILMAZ: girdiye yalnız o tarafın kendi metinleri girer.
// · Dayanak zorunludur: her alıntı kendi kaynak metninde GERÇEKTEN geçmelidir;
//   geçmiyorsa çıktı elenir (uydurma alıntı kapısı).
// · İki farklı tarihli metin yoksa üretim yapılmaz; sebep döner.
// · Çıktı iletisim_degisim tablosuna yazılır; tarafa SELECT politikası YOKTUR.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { anlatimYansit } from "../_shared/anlatim.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_METIN = 6_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Karşılaştırma için sadeleştirme: küçük harf (tr), noktalama ve fazla boşluk atılır.
//
// 16.08 GENİŞLETME (canlı bulgu — Serpil Karahan dosyası): alıntı gerçekte metinde
// geçtiği hâlde "kaynakta bulunamadı" deniyordu. Sebep uydurma alıntı DEĞİL,
// karşılaştırmanın fazla katı olmasıydı:
//  · PDF'ten çıkan metinde Türkçe harfler bozuk gelebiliyor (ş/s, ı/i, ğ/g …),
//    model ise düzgün yazıyor → aynı cümle iki farklı dizgi oluyor. Bu yüzden
//    karşılaştırmada Türkçe harfler ASCII karşılığına KATLANIR.
//  · Madde işaretleri, tire/uzun tire, eğik çizgi, üç nokta ve alt çizgi iki metinde
//    farklı yerlerde duruyor → boşluğa çevrilir.
//  · PDF satır sonlarında kelime tirelenmiş olabiliyor ("öde-\nnecek") → satır sonu
//    tiresi ve ardındaki satır başı birleştirilir.
//  · Satır sonları boşluğa çevrilir; model tek satır yazıyor, kaynak çok satırlı.
// BU SADELEŞTİRME YALNIZ KARŞILAŞTIRMA İÇİNDİR. Ekranda gösterilen ve tabloya yazılan
// alıntı HER ZAMAN modelin verdiği ORİJİNAL metindir; sadeleştirilmiş hâli kaydedilmez.
function sade(metin: string): string {
  return temiz(metin)
    // satır sonu tirelemesi: "öde-\nnecek" → "ödenecek"
    .replace(/[-‐‑]\s*\r?\n\s*/g, "")
    // tüm satır sonları boşluk
    .replace(/\r?\n/g, " ")
    .toLocaleLowerCase("tr-TR")
    // Türkçe harf katlaması (küçültme sonrası: yalnız küçük harfler kalır ama
    // büyük harf karşılıkları da güvenlik için listede tutuluyor)
    .replace(/[şŞ]/g, "s")
    .replace(/[ıİiI]/g, "i")
    .replace(/[ğĞ]/g, "g")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[""''`.,;:!?()\[\]{}""]/g, " ")
    // üç nokta · tire · uzun tire · eğik çizgi · alt çizgi · yıldız
    .replace(/[…\-‐‑‒–—/_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Duygu · kişilik · niyet · teşhis ifadeleri — çıktıda geçerse kayıt elenir.
const YASAK = [
  "sinirli", "öfke", "ofke", "kızgın", "kizgin", "agresif", "saldırgan", "saldirgan",
  "kaygılı", "kaygili", "endişeli", "endiseli", "panik", "stresli", "gergin",
  "manipülat", "manipulat", "oyalıyor", "oyaliyor", "kötü niyet", "kotu niyet",
  "iyi niyetli değil", "samimiyetsiz", "kişilik", "kisilik", "karakter", "psikoloj",
  "ruh hali", "ruhsal", "duygusal olarak", "bilinçli olarak", "bilincli olarak",
  "kasıtlı", "kasitli", "niyeti", "art niyet", "korkuyor", "çekiniyor", "cekiniyor",
  "güvenmiyor", "guvenmiyor", "inatçı", "inatci", "uzlaşmaz kişi", "haklı taraf",
  "hakli taraf", "mağdur", "magdur",
];
function yasakIfade(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return YASAK.find((x) => k.includes(x)) ?? null;
}

// Alıntı en çok BİR cümledir; model uzun yazarsa ilk cümlede kesilir.
function tekCumle(metin: string): string {
  const t = temiz(metin).replace(/\s+/g, " ");
  const m = t.match(/^[^.!?;]{10,}[.!?]?/);
  const parca = (m ? m[0] : t).trim();
  return parca.length > 200 ? `${parca.slice(0, 197)}…` : parca;
}

// Alıntının kaynak metinde gerçekten geçip geçmediği: sadeleştirilmiş karşılaştırma.
// ÜÇ ŞANS (16.08): (1) tam alıntı · (2) ilk 40 karakter · (3) alıntının ORTASINDAN
// alınan 40 karakter. Üçüncüsü şu yüzden var: model cümlenin başına madde numarası
// ya da başlık parçası ekleyip ("3. Kiracı, …") baştaki 40 karakteri kaydırabiliyor;
// cümlenin ortası ise kaynakla birebir kalıyor.
function alintiKaynaktaVar(alinti: string, kaynak: string): boolean {
  const a = sade(alinti);
  const k = sade(kaynak);
  if (a.length < 10) return false;
  if (k.includes(a)) return true;
  if (k.includes(a.slice(0, 40))) return true;
  if (a.length >= 60) {
    const bas = Math.max(0, Math.floor(a.length / 2) - 20);
    return k.includes(a.slice(bas, bas + 40));
  }
  return false;
}

function trGun(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "tarihsiz";
  const g = String(d.getDate()).padStart(2, "0");
  const a = String(d.getMonth() + 1).padStart(2, "0");
  return `${g}.${a}.${d.getFullYear()}`;
}

/* ── AJAN DURUM YAZIMI (Ajan Kontrol Paneli) ─────────────────────────────────
   Panel bu satırlardan beslenir. KRİTİK: durum yazımı asıl işi ASLA bozmaz —
   her yazma try/catch içindedir, hata yutulur ve yalnız konsola loglanır.
   Aynı case_id + agent_type (+ party_id) için TEK satır güncellenir; her koşumda
   yeni satır birikmez. tarafa_gorunur alanına DOKUNULMAZ (varsayılan false). */
const AGENT_TYPE = "iletisim_degisim";
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
      if (durumErr) console.error("[iletisim-degisim] ajan durum satırı yazılamadı:", durumErr.message);
    } else {
      const { error: durumErr } = await admin.from("agent_states")
        .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: partyId, ...govde });
      if (durumErr) console.error("[iletisim-degisim] ajan durum satırı yazılamadı:", durumErr.message);
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
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

    // İç çağrı kapısı: nöbetçi ajan bu fonksiyonu x-cron-secret ile çağırabilir;
    // dışarıdan gelen isteklerde kullanıcı yetkisi aranır. Anahtar tanımsız ya da
    // boşsa kapı KAPALIDIR (güvenli taraf). Kalıp guc-dengesi/belge-ozeti ile aynıdır.
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
    const party_id = temiz((body as any)?.party_id);
    const yenile = (body as any)?.yenile === true;
    if (!case_id || !party_id) return json({ error: "case_id ve party_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id").eq("id", case_id).maybeSingle();
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

    const { data: party, error: pErr } = await admin.from("case_parties")
      .select("id, case_id, user_id, statement, created_at").eq("id", party_id).maybeSingle();
    if (pErr) return json({ error: pErr.message }, 500);
    if (!party || String((party as any).case_id) !== String(case_id)) {
      return json({ error: "Taraf bu dosyaya ait değil" }, 400);
    }

    durumAdmin = admin;
    durumCaseId = case_id;
    durumPartyId = party_id;
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "running", error_message: null });

    // Var olan kayıt: "yenile" denmedikçe yeniden üretilmez (ücret tekrarlanmasın).
    const { data: mevcut } = await admin.from("iletisim_degisim")
      .select("id, paragraf, durum").eq("party_id", party_id).maybeSingle();
    if (mevcut && !yenile) {
      await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "completed", error_message: null, last_output: { sonuc: "atlandi", sebep: "ayrıntı zaten var" } });
      return json({ atlandi: true, sebep: "Bu taraf için ayrıntı zaten çıkarılmış" });
    }

    // ── Tarihli metinler: YALNIZ bu tarafın kendi metinleri ──────────────────
    const metinler: { tarih: string; etiket: string; metin: string }[] = [];
    const beyan = temiz((party as any).statement);
    if (beyan) metinler.push({ tarih: (party as any).created_at, etiket: "taraf beyanı", metin: beyan });

    const { data: docs } = await admin.from("case_documents")
      .select("file_name, extracted_text, created_at")
      .eq("case_id", case_id).eq("party_id", party_id).limit(50);
    for (const d of ((docs ?? []) as any[])) {
      const m = temiz(d.extracted_text);
      if (m.length > 80) metinler.push({ tarih: d.created_at, etiket: temiz(d.file_name) || "belge", metin: m });
    }

    const { data: kesif } = await admin.from("case_discovery_questions")
      .select("answer_text, updated_at").eq("case_id", case_id).eq("party_id", party_id).limit(50);
    for (const k of ((kesif ?? []) as any[])) {
      const m = temiz(k.answer_text);
      if (m.length > 40) metinler.push({ tarih: k.updated_at, etiket: "keşif sorusu cevabı", metin: m });
    }

    if ((party as any).user_id) {
      const { data: msj } = await admin.from("messages")
        .select("content, created_at").eq("case_id", case_id).eq("sender_id", (party as any).user_id).limit(100);
      for (const m0 of ((msj ?? []) as any[])) {
        const m = temiz(m0.content);
        if (m.length > 40) metinler.push({ tarih: m0.created_at, etiket: "mesaj", metin: m });
      }
    }

    metinler.sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));
    const gunler = new Set(metinler.map((m) => String(m.tarih).slice(0, 10)));
    if (metinler.length < 2 || gunler.size < 2) {
      await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "completed", error_message: null, last_output: { sonuc: "yetersiz", metin: metinler.length, gun: gunler.size } });
      return json({
        yetersiz: true,
        sebep: `Karşılaştırılacak yeterli tarihli metin yok — ${metinler.length} metin, ${gunler.size} ayrı gün.`,
      });
    }
    const ilk = metinler[0];
    const son = metinler[metinler.length - 1];

    if (!apiKey) return json({ error: "LOVABLE_API_KEY tanımlı değil" }, 500);

    const systemPrompt = `Sen bir arabuluculuk dosyasında AYNI TARAFIN iki farklı tarihli metnini karşılaştıran tarafsız bir asistansın.

GÖREV: İki metin arasındaki DEĞİŞİMİ tek paragrafta yaz. Yalnız METİNDE GÖRÜLEN somut değişimi anlat: hangi konuda, hangi tarihten hangi tarihe, ne yönde (talebin netleşmesi, taksitten tek seferde ödemeye geçiş, çözüm önerisinin kalkması, koşulun eklenmesi, geri çekilme gibi).

BİÇİM ÖRNEĞİ: "14.03 tarihli başvuruda taksitli ödeme önerisi geçiyor; 05.05 tarihli ihtarnamede talep tek seferde ödemeye dönmüş."

MUTLAK YASAKLAR:
1. Duygu, kişilik, niyet ve psikolojik durum hakkında TEK KELİME yazma ("sinirli", "kaygılı", "agresif", "oyalıyor", "kötü niyetli", "güvenmiyor" gibi).
2. Kimin haklı olduğuna, ne yapılması gerektiğine değinme; öneri ve tavsiye verme.
3. Metinde geçmeyen hiçbir olguyu yazma. Alıntıları AYNEN metinden al, değiştirme.
4. Belirgin bir değişim yoksa var=false döndür ve paragrafı boş bırak. Zorlama üretme.
5. Karşı taraftan söz etme; yalnız bu tarafın kendi iki metnini karşılaştır.

var=true ise:
· paragraf: tek paragraf (en çok 3 cümle), olgu dili, iki tarihi de içerir.
· alinti_ilk: BİRİNCİ (eski) metinden en çok BİR cümlelik alıntı, birebir.
· alinti_son: İKİNCİ (yeni) metinden en çok BİR cümlelik alıntı, birebir.

Çıktı YALNIZCA JSON: {"var":true veya false,"paragraf":"","alinti_ilk":"","alinti_son":""}`;

    const userPrompt = `[BİRİNCİ METİN — ${trGun(ilk.tarih)} · ${ilk.etiket}]\n${ilk.metin.slice(0, MAX_METIN)}\n\n`
      + `[İKİNCİ METİN — ${trGun(son.tarih)} · ${son.etiket}]\n${son.metin.slice(0, MAX_METIN)}`;

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
      console.error(`[iletisim-degisim] HTTP ${aiRes.status}: ${t.slice(0, 300)}`);
      return json({ error: `Model çağrısı başarısız (HTTP ${aiRes.status})` }, 502);
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    const varMi = parsed?.var === true;
    const paragraf = temiz(parsed?.paragraf);
    let alintiIlk = tekCumle(temiz(parsed?.alinti_ilk));
    let alintiSon = tekCumle(temiz(parsed?.alinti_son));

    // ── SUNUCU TARAFI ELEME ─────────────────────────────────────────────────
    let durum = "hazir";
    let sebep = "";
    if (!varMi || paragraf.length < 30) {
      durum = "degisim_yok";
      sebep = "Model iki metin arasında belirgin bir değişim bildirmedi.";
    } else {
      const etiket = yasakIfade(`${paragraf} ${alintiIlk} ${alintiSon}`);
      if (etiket) {
        durum = "elendi";
        sebep = `Çıktıda yasaklı ifade geçti ("${etiket}") — duygu/kişilik/niyet dili kullanılamaz.`;
      } else if (!alintiIlk || !alintiSon) {
        durum = "elendi";
        sebep = "İki tarihli metinden birer alıntı gelmedi; dayanaksız paragraf yazılmaz.";
      } else {
        // ── ONARIM TURU (16.08) ───────────────────────────────────────────
        // Paragraf temiz, yalnız ALINTI kaynakta bulunamıyorsa kayıt hemen
        // elenmez: model BİR KEZ daha çağrılır ve YALNIZ alıntılar istenir
        // (paragraf yeniden yazdırılmaz). Amaç, doğru bulguyu kopyalama
        // hatası yüzünden kaybetmemek.
        // MALİYET: bu İKİNCİ ücretli çağrıdır — yalnız doğrulama düştüğünde
        // çalışır; ilk çağrı temiz geçtiyse hiç çalışmaz. Tur EN FAZLA BİR kez
        // yapılır, döngü kurulmaz.
        let ilkTamam = alintiKaynaktaVar(alintiIlk, ilk.metin);
        let sonTamam = alintiKaynaktaVar(alintiSon, son.metin);

        if (!ilkTamam || !sonTamam) {
          const eksikler = [!ilkTamam ? "BİRİNCİ" : "", !sonTamam ? "İKİNCİ" : ""]
            .filter(Boolean).join(" ve ");
          console.error(`[iletisim-degisim] onarım turu: ${eksikler} metnin alıntısı bulunamadı`);
          const onarimSystem = `Sen bir metinden ALINTI ÇIKARAN yardımcısın. Yorum yapmazsın, paragraf yazmazsın.

GÖREV: Aşağıdaki iki metinden BİRER cümle seç ve BİREBİR KOPYALA. Önceki denemede ${eksikler} metnin alıntısı kaynakta bulunamadı.

KURALLAR:
1. Cümleyi metinden AYNEN kopyala; tek karakterini bile değiştirme, kısaltma, düzeltme, birleştirme.
2. Madde numarası, başlık ya da senin eklediğin hiçbir sözcük alıntıya girmesin.
3. Her alıntı EN ÇOK BİR cümledir ve kendi metninden gelir: alinti_ilk BİRİNCİ metinden, alinti_son İKİNCİ metinden.
4. Duygu, kişilik, niyet ve psikolojik durum hakkında hiçbir şey yazma; zaten yalnız alıntı vereceksin.
5. Uygun cümle bulamazsan o alanı boş bırak; uydurma.

Çıktı YALNIZCA JSON: {"alinti_ilk":"","alinti_son":""}`;
          try {
            const onarimRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: onarimSystem },
                  { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
              }),
            });
            if (onarimRes.ok) {
              const onarimJson = await onarimRes.json();
              let op: any = {};
              try { op = JSON.parse(onarimJson?.choices?.[0]?.message?.content ?? "{}"); } catch { op = {}; }
              const yeniIlk = tekCumle(temiz(op?.alinti_ilk));
              const yeniSon = tekCumle(temiz(op?.alinti_son));
              if (!ilkTamam && yeniIlk && alintiKaynaktaVar(yeniIlk, ilk.metin)) {
                alintiIlk = yeniIlk;
                ilkTamam = true;
              }
              if (!sonTamam && yeniSon && alintiKaynaktaVar(yeniSon, son.metin)) {
                alintiSon = yeniSon;
                sonTamam = true;
              }
              // Onarım turundan gelen alıntılar da yasak ifade süzgecinden geçer.
              const etiket2 = yasakIfade(`${alintiIlk} ${alintiSon}`);
              if (etiket2) {
                durum = "elendi";
                sebep = `Onarım turundaki alıntıda yasaklı ifade geçti ("${etiket2}").`;
              }
            } else {
              console.error(`[iletisim-degisim] onarım turu HTTP ${onarimRes.status}`);
            }
          } catch (e: any) {
            console.error(`[iletisim-degisim] onarım turu başarısız: ${e?.message ?? e}`);
          }
        }

        if (durum === "hazir" && (!ilkTamam || !sonTamam)) {
          const eksik = !ilkTamam && !sonTamam
            ? "her iki metnin de"
            : !ilkTamam ? "BİRİNCİ (eski) metnin" : "İKİNCİ (yeni) metnin";
          durum = "elendi";
          sebep = `Alıntı kaynak metinde bulunamadı — ${eksik} alıntısı doğrulanamadı (onarım turu da tutmadı).`;
        }
      }
    }

    const satir = {
      case_id,
      party_id,
      paragraf: durum === "hazir" ? paragraf.slice(0, 1200) : "",
      alinti_ilk: durum === "hazir" ? alintiIlk : "",
      alinti_son: durum === "hazir" ? alintiSon : "",
      tarih_ilk: ilk.tarih,
      tarih_son: son.tarih,
      kaynak_ilk: ilk.etiket.slice(0, 200),
      kaynak_son: son.etiket.slice(0, 200),
      durum,
      sebep: sebep.slice(0, 400),
      updated_at: new Date().toISOString(),
    };

    const { error: yErr } = await admin.from("iletisim_degisim")
      .upsert(satir, { onConflict: "party_id" });
    if (yErr) return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);

    await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "completed", error_message: null, last_output: { sonuc: durum, sebep } });
    return json({ durum, sebep, paragraf: satir.paragraf });
  } catch (e: any) {
    console.error("[iletisim-degisim] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500) });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
