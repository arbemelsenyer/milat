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
function sade(metin: string): string {
  return temiz(metin)
    .toLocaleLowerCase("tr-TR")
    .replace(/[""''`.,;:!?()\[\]{}""]/g, " ")
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

// Alıntının kaynak metinde gerçekten geçip geçmediği: sadeleştirilmiş karşılaştırma,
// önce tam alıntı, tutmazsa ilk 40 karakter (model kırpma/noktalama değiştirebiliyor).
function alintiKaynaktaVar(alinti: string, kaynak: string): boolean {
  const a = sade(alinti);
  const k = sade(kaynak);
  if (a.length < 10) return false;
  if (k.includes(a)) return true;
  return k.includes(a.slice(0, 40));
}

function trGun(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "tarihsiz";
  const g = String(d.getDate()).padStart(2, "0");
  const a = String(d.getMonth() + 1).padStart(2, "0");
  return `${g}.${a}.${d.getFullYear()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const party_id = temiz((body as any)?.party_id);
    const yenile = (body as any)?.yenile === true;
    if (!case_id || !party_id) return json({ error: "case_id ve party_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id").eq("id", case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf çağıramaz.
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    const yetkili = (caseRow as any).assigned_mediator_id === userId
      || (caseRow as any).user_id === userId
      || !!roleRow;
    if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);

    const { data: party, error: pErr } = await admin.from("case_parties")
      .select("id, case_id, user_id, statement, created_at").eq("id", party_id).maybeSingle();
    if (pErr) return json({ error: pErr.message }, 500);
    if (!party || String((party as any).case_id) !== String(case_id)) {
      return json({ error: "Taraf bu dosyaya ait değil" }, 400);
    }

    // Var olan kayıt: "yenile" denmedikçe yeniden üretilmez (ücret tekrarlanmasın).
    const { data: mevcut } = await admin.from("iletisim_degisim")
      .select("id, paragraf, durum").eq("party_id", party_id).maybeSingle();
    if (mevcut && !yenile) {
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
    const alintiIlk = tekCumle(temiz(parsed?.alinti_ilk));
    const alintiSon = tekCumle(temiz(parsed?.alinti_son));

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
      } else if (!alintiKaynaktaVar(alintiIlk, ilk.metin) || !alintiKaynaktaVar(alintiSon, son.metin)) {
        durum = "elendi";
        sebep = "Alıntı kaynak metinde bulunamadı; uydurma alıntı kaydedilmez.";
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

    return json({ durum, sebep, paragraf: satir.paragraf });
  } catch (e: any) {
    console.error("[iletisim-degisim] hata", e?.message ?? e);
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
