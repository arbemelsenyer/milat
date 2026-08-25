// Tarafın kendi sohbet asistanı. Kör veri ilkesi bu fonksiyonun kurucu kuralıdır:
// bağlama YALNIZ tarafın kendi verisi ve dosyanın herkese açık künyesi girer.
// Karşı tarafın belgeleri/beyanları, analiz raporları (party_analyses,
// common_ground_reports, kök neden, tutarlılık, iletişim analizi) ve arabulucu
// kokpiti hiçbir koşulda okunmaz.
//
// NOT: Şemada tarafa özel ayrı bir "gizli kanal" tablosu yok; tarafın gizli içeriği
// kendi belgeleri (case_documents.party_id) ve kendi beyanı (case_parties.statement)
// üzerinden gelir. Yeni tablo varsayılmadı.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { sinirdanGecir, ajanaTalimatMi } from "../_shared/anlatim.ts";

/* ORTAK SINIR KATMANI: insana giden metin süzgeçten geçer (hukuki tavsiye,
   teşhis etiketi, suçlayıcı dil, dayanaksız rakam, sonuç tahmini elenir;
   künyeli alıntı serbesttir). Bu fonksiyon bir SOHBET/BİLDİRİM yüzeyidir:
   ortak motora BAĞLANMAZ — eşzamanlılık kilidi uygulanırsa üst üste iki mesaj
   yazan kullanıcının ikinci mesajı reddedilir ve sohbet kırılır. */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Belge içerik bütçesi — case-qa / party-confidential-analysis kalıbının aynısı.
const PER_DOC_CHAR_BUDGET = 4_000;
const TOTAL_DOC_CHAR_BUDGET = 16_000;
const MAX_STATEMENT_CHARS = 4_000;
const MAX_HISTORY_TURNS = 10;
const MAX_MESSAGE_CHARS = 4_000;

function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n…(karakter bütçesi nedeniyle kırpıldı)`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function partyLabel(p: any): string {
  return p?.party_type === "individual"
    ? `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim()
    : String(p?.company_name ?? "").trim();
}

const ROL_ETIKET: Record<string, string> = {
  applicant: "Başvuran", respondent: "Karşı taraf", third_party: "Üçüncü taraf",
};

const SISTEM_TALIMATI = `Sen bir arabuluculuk sürecinde TARAFIN kendi yardımcısısın. Türkçe, sade ve kısa konuşursun.

Görevin:
- Süreci gündelik dille anlatmak (hangi aşamadasınız, sırada ne var).
- Eksik belge veya bilgiyi nazikçe istemek.
- Tarafa gönderilmiş keşif sorularını sohbete taşıyıp cevaplarını netleştirmesine yardım etmek.

Kesin sınırların:
- HUKUKİ TAVSİYE VERMEZSİN. Hukuki değerlendirme istenirse "Bu konuda hukuki değerlendirme yapamam; vekilinizle görüşün." dersin.
- Karşı taraf hakkında yorum, tahmin veya değerlendirme YAPMAZSIN. Karşı tarafın verisi sende yoktur.
- Kişilik, duygu veya niyet değerlendirmesi yapmazsın.
- Süreç sonucunu, tutarı veya kararı öngörmezsin.
- Sana verilen bilgilerde karşılığı olmayan hiçbir şeyi uydurmazsın; bilmiyorsan "Bu bilgi bende yok." dersin ve gerekirse hangi belgenin/bilginin gerektiğini söylersin.
- Arabulucunun analiz raporlarına, karşı tarafın dosyasına ve diğer dosyalara erişimin yoktur; istenirse bunu açıkça söylersin.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Oturum doğrulanamadı" }, 401);

    const body = await req.json().catch(() => ({}));
    const case_id = String((body as any)?.case_id ?? "");
    const mesaj = String((body as any)?.mesaj ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
    const gecmisRaw = Array.isArray((body as any)?.gecmis) ? (body as any).gecmis : [];
    if (!case_id) return json({ error: "case_id zorunlu" }, 400);
    if (!mesaj) return json({ error: "mesaj zorunlu" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Yetki: JWT'deki kullanıcı bu dosyada taraf mı? Değilse hiçbir veri dönmez.
    const { data: benimTaraf } = await admin.from("case_parties")
      .select("id, case_id, user_id, party_type, first_name, last_name, company_name, party_role, statement")
      .eq("case_id", case_id).eq("user_id", u.user.id).maybeSingle();
    if (!benimTaraf) return json({ error: "Bu dosyada taraf değilsiniz" }, 403);

    const partyId = String((benimTaraf as any).id);

    /* ---------- BAĞLAM: yalnız tarafın kendi verisi + dosya künyesi ---------- */
    const [dosyaRes, taraflarRes, belgeRes, soruRes, oturumRes] = await Promise.all([
      admin.from("cases").select("application_no, title, current_phase, status").eq("id", case_id).maybeSingle(),
      // Yalnız ad ve rol — künye bilgisi; karşı tarafın hiçbir içeriği okunmaz.
      admin.from("case_parties").select("party_type, first_name, last_name, company_name, party_role").eq("case_id", case_id),
      admin.from("case_documents").select("file_name, extracted_text, created_at").eq("case_id", case_id).eq("party_id", partyId).order("created_at", { ascending: false }).limit(20),
      admin.from("case_discovery_questions").select("question_order, question_text, answer_text").eq("case_id", case_id).eq("party_id", partyId).order("question_order", { ascending: true }),
      admin.from("case_sessions").select("scheduled_at, status").eq("case_id", case_id).eq("status", "scheduled").order("scheduled_at", { ascending: true }).limit(10),
    ]);

    const dosya = dosyaRes.data as any;
    const kunyeSatirlari = [
      dosya?.application_no ? `Dosya No: ${dosya.application_no}` : "",
      dosya?.title ? `Uyuşmazlık konusu: ${dosya.title}` : "",
      dosya?.current_phase ? `Aşama: ${dosya.current_phase}/8` : "",
      `Taraflar: ${((taraflarRes.data ?? []) as any[])
        .map((p) => `${partyLabel(p) || "(isimsiz)"} (${ROL_ETIKET[String(p.party_role)] ?? "Taraf"})`)
        .join(" · ") || "Kayıtlı taraf yok"}`,
      `Planlı oturumlar: ${((oturumRes.data ?? []) as any[])
        .map((s) => new Date(s.scheduled_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }))
        .join(" · ") || "Planlı oturum yok"}`,
    ].filter(Boolean).join("\n");

    const benimAd = partyLabel(benimTaraf) || "Taraf";
    const beyan = String((benimTaraf as any)?.statement ?? "").trim();

    let kalanBelgeButce = TOTAL_DOC_CHAR_BUDGET;
    const belgeBloklari: string[] = [];
    for (const d of (belgeRes.data ?? []) as any[]) {
      const metin = String(d?.extracted_text ?? "").trim();
      const baslik = `- ${d?.file_name ?? "belge"}`;
      if (!metin) { belgeBloklari.push(`${baslik} (metin henüz çıkarılmadı)`); continue; }
      if (kalanBelgeButce <= 0) { belgeBloklari.push(`${baslik} (bütçe dolduğu için içeriği eklenmedi)`); continue; }
      const parca = clip(metin, Math.min(PER_DOC_CHAR_BUDGET, kalanBelgeButce));
      kalanBelgeButce -= parca.length;
      belgeBloklari.push(`${baslik}\n${parca}`);
    }

    const sorular = ((soruRes.data ?? []) as any[])
      .map((q) => `${q.question_order}. ${q.question_text}${String(q.answer_text ?? "").trim() ? `\n   Cevabınız: ${q.answer_text}` : "\n   (henüz cevaplanmadı)"}`)
      .join("\n");

    const baglam = `DOSYA KÜNYESİ
${kunyeSatirlari}

SİZİN BİLGİLERİNİZ (yalnız bu tarafa ait)
Ad: ${benimAd}
Rol: ${ROL_ETIKET[String((benimTaraf as any).party_role)] ?? "Taraf"}
Beyanınız: ${beyan ? clip(beyan, MAX_STATEMENT_CHARS) : "(beyan girilmemiş)"}

SİZE GÖNDERİLEN SORULAR
${sorular || "(size gönderilmiş soru yok)"}

SİZİN BELGELERİNİZ
${belgeBloklari.join("\n\n") || "(yüklenmiş belgeniz yok)"}`;

    const gecmis = gecmisRaw
      .slice(-MAX_HISTORY_TURNS)
      .map((m: any) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: String(m?.content ?? "").slice(0, MAX_MESSAGE_CHARS),
      }))
      .filter((m: any) => m.content.trim().length > 0);

    const messages = [
      { role: "system", content: `${SISTEM_TALIMATI}\n\nAşağıdaki bilgiler dışında hiçbir veriye sahip değilsin:\n\n${baglam}` },
      ...gecmis,
      { role: "user", content: mesaj },
    ];

    /* ---------- MODEL KAPISI: case-qa ile AYNI desen (OpenAI → Google → gateway) ---------- */
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const gatewayKey = Deno.env.get("LOVABLE_API_KEY");
    let cevap: string | null = null;
    let sonHata = "";

    if (openaiKey) {
      const redact = (s: string) => s.split(openaiKey).join("***");
      const OPENAI_MODEL = "gpt-4o-mini";
      try {
        const oRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature: 0.2 }),
        });
        if (oRes.ok) {
          const oJson = await oRes.json();
          const text = oJson?.choices?.[0]?.message?.content;
          if (typeof text === "string" && text.trim()) {
            cevap = text.trim();
            console.log(`[taraf-asistan] Sağlayıcı: OpenAI — model: ${OPENAI_MODEL}`);
          } else {
            sonHata = `${OPENAI_MODEL} boş yanıt döndürdü`;
          }
        } else {
          sonHata = redact(await oRes.text()).replace(/\s+/g, " ").trim().slice(0, 120);
          console.error(`[taraf-asistan] OpenAI hatası: ${oRes.status} ${sonHata}`);
        }
      } catch (e: any) {
        sonHata = String(e?.message ?? e).slice(0, 120);
        console.error(`[taraf-asistan] OpenAI çağrısı başarısız: ${sonHata}`);
      }
    }

    if (cevap === null && geminiKey) {
      const GEMINI_MODEL = "gemini-2.5-flash";
      try {
        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: messages[0].content }] },
              contents: messages.slice(1).map((m: any) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
              })),
              generationConfig: { temperature: 0.2 },
            }),
          },
        );
        if (gRes.ok) {
          const gJson = await gRes.json();
          const text = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text === "string" && text.trim()) {
            cevap = text.trim();
            console.log(`[taraf-asistan] Sağlayıcı: Google — model: ${GEMINI_MODEL}`);
          } else {
            sonHata = `${GEMINI_MODEL} boş yanıt döndürdü`;
          }
        } else {
          sonHata = (await gRes.text()).replace(/\s+/g, " ").trim().slice(0, 120);
          console.error(`[taraf-asistan] Google hatası: ${gRes.status} ${sonHata}`);
        }
      } catch (e: any) {
        sonHata = String(e?.message ?? e).slice(0, 120);
        console.error(`[taraf-asistan] Google çağrısı başarısız: ${sonHata}`);
      }
    }

    if (cevap === null && gatewayKey) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, temperature: 0.2 }),
        });
        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          const text = aiJson?.choices?.[0]?.message?.content;
          if (typeof text === "string" && text.trim()) {
            cevap = text.trim();
            console.log("[taraf-asistan] Sağlayıcı: Lovable gateway — model: google/gemini-2.5-flash");
          } else {
            sonHata = "gateway boş yanıt döndürdü";
          }
        } else {
          sonHata = (await aiRes.text()).replace(/\s+/g, " ").trim().slice(0, 120);
          console.error(`[taraf-asistan] Gateway hatası: ${aiRes.status} ${sonHata}`);
        }
      } catch (e: any) {
        sonHata = String(e?.message ?? e).slice(0, 120);
        console.error(`[taraf-asistan] Gateway çağrısı başarısız: ${sonHata}`);
      }
    }

    if (cevap === null) {
      return json({ error: `Asistan şu an yanıt veremiyor. ${sonHata}`.trim() }, 502);
    }

    /* ---------- İZ: içerik değil, koşum kaydı ---------- */
    try {
      const zaman = new Date().toISOString();
      const { data: mevcut } = await admin.from("agent_states")
        .select("id").eq("case_id", case_id).eq("agent_type", "taraf_asistan").eq("party_id", partyId).maybeSingle();
      const patch = {
        status: "completed",
        error_message: null,
        last_output: { son_mesaj_zamani: zaman, kullanici: u.user.id },
        updated_at: zaman,
      };
      /* İz yazımı sohbeti düşürmez ama SESSİZ de kalmaz: aşağıdaki catch
         koruma DEĞİLDİR — supabase-js DB hatasını fırlatmaz, `{error}` döner. */
      const { error: durumErr } = (mevcut as any)?.id
        ? await admin.from("agent_states").update(patch).eq("id", (mevcut as any).id)
        : await admin.from("agent_states").insert({ case_id, agent_type: "taraf_asistan", party_id: partyId, ...patch });
      if (durumErr) console.error(`[taraf-asistan] ajan durumu yazılamadı: ${durumErr.message}`);
      const { error: izErr } = await admin.from("agent_worklog").insert({
        case_id, party_id: partyId, agent_type: "taraf_asistan", entry_type: "iz",
        content: { olay: "taraf_asistan_sohbet", zaman, kullanici: u.user.id },
      });
      if (izErr) console.error(`[taraf-asistan] iş defteri izi yazılamadı: ${izErr.message}`);
    } catch (e: any) {
      // İz yazımı sohbeti düşürmez.
      console.error(`[taraf-asistan] iz yazılamadı: ${e?.message ?? e}`);
    }

    // Cevap tarafa gidiyor: ortak sınır süzgecinden geçer.
    return json({ cevap: sinirdanGecir(cevap, "taraf-asistan") });
  } catch (e: any) {
    console.error("[taraf-asistan] hata", e?.message ?? e);
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
