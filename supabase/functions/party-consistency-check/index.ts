// İç Tutarlılık Denetimi — MEDIATOR_ONLY.
// TEK tarafın KENDİ beyanı ile KENDİ belgeleri (veya beyanın kendi içindeki farklı
// yerleri) arasındaki uyumsuzlukları bulur ve iki dayanağı yan yana sunar.
// Karşı tarafın hiçbir verisi prompt'a GİRMEZ. Yalnız party_consistency_findings
// tablosuna yazar (RLS: yalnız arabulucu + admin) — RAG / benzer dava / worklog YOK.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ajan Kontrol Paneli ilerleme satırı — party-confidential-analysis'teki agent_states
// yazımının aynısı (aynı kolonlar, aynı case_id+agent_type+party_id anahtarı). Yalnız
// durum yazılır, analiz içeriği ASLA buraya girmez; buradaki hata ana akışı durdurmaz.
//
// DURUM DEĞERLERİ: agent_states.status bir CHECK kısıtıyla sınırlı —
// ('pending','running','completed','failed','flagged'). 'error' kabul EDİLMİYOR, bu
// yüzden hata yolunda 'failed' yazılır (kısıtın izin verdiği hata değeri budur).
// agent_type için de CHECK kısıtı var; 'party_consistency' değerinin kısıta eklenmiş
// olması ŞART — eklenmezse insert reddedilir ve panelde hiç satır görünmez.
const AGENT_TYPE = "party_consistency";

async function upsertConsistencyState(
  admin: ReturnType<typeof createClient>,
  case_id: string,
  party_id: string,
  patch: Record<string, unknown>,
) {
  const { data: existing } = await admin.from("agent_states")
    .select("id").eq("case_id", case_id).eq("agent_type", AGENT_TYPE).eq("party_id", party_id).maybeSingle();
  // supabase-js DB hatasını FIRLATMAZ, {error} olarak döndürür — kontrol edilmezse
  // CHECK kısıtı ihlali sessizce yutulur ve satır hiç oluşmaz. Bu yüzden açıkça atılır.
  const { error } = existing?.id
    ? await admin.from("agent_states").update(patch).eq("id", existing.id)
    : await admin.from("agent_states").insert({ case_id, agent_type: AGENT_TYPE, party_id, ...patch });
  if (error) throw error;
}

// Belge içerik bütçesi — party-confidential-analysis/index.ts kalıbının aynısı.
const PER_DOC_CHAR_BUDGET = 6_000;
const TOTAL_CHAR_BUDGET = 24_000;
const MAX_DOC_FINDINGS_CHARS = 4_000;
const MAX_STATEMENT_CHARS = 12_000;

// "Bilirkişi raporu:" etiketi bu fonksiyondan değil, party_analyses.document_findings
// içeriğinden geliyor (party-confidential-analysis oradaki kaynağı böyle etiketliyor).
// case_documents'ta belge türü kolonu YOK; bu yüzden ifade hem prompt'a giren bağlamda
// hem de model cevabındaki kaynak alanlarında gerçek türüne çevrilir.
function relabelBilirkisi(s: string): string {
  return s.replace(/Bilirkişi\s*raporu\s*:/gi, "Belge:");
}

function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n…(bu kayıt karakter bütçesi nedeniyle kırpıldı)`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Hata yolunda da "hata" yazabilmek için dış kapsamda tutulur.
  let stateAdmin: ReturnType<typeof createClient> | null = null;
  let stateCaseId: string | null = null;
  let statePartyId: string | null = null;
  const writeState = async (patch: Record<string, unknown>) => {
    if (!stateAdmin || !stateCaseId || !statePartyId) return;
    try {
      await upsertConsistencyState(stateAdmin, stateCaseId, statePartyId, patch);
    } catch (e: any) {
      // Best-effort: ana akış DURMAZ. Ama sessiz de kalmaz — kısıt ihlali gibi kalıcı
      // hatalar (agent_type/status CHECK) ancak logda görülerek fark edilebiliyor.
      console.error(`[party-consistency-check] agent_states yazımı başarısız: ${e?.message ?? String(e)}`);
    }
  };
  const step = (current_step: string) =>
    writeState({ status: "running", error_message: null, last_output: { current_step } });

  try {
    // İç çağrı kapısı (create-video-room / randevu-teklif ile aynı desen):
    // x-cron-secret CRON_SECRET ile eşleşirse çağıran sistemin kendisidir,
    // kullanıcı JWT'si aranmaz. Boş/yanlış secret'ta mevcut JWT yolu aynen işler.
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (!isCron && (userErr || !userData?.user)) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData?.user?.id ?? "";

    const body = await req.json();
    const case_id: string | undefined = body?.case_id;
    const party_id: string | undefined = body?.party_id;
    if (!case_id || !party_id) {
      return new Response(JSON.stringify({ error: "case_id and party_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // ── YETKİ: party-confidential-analysis'teki doğrulama kalıbı, ama "taraf kendi
    // analizini çağırabilir" gevşetmesi BİLEREK yok — bu çıktı MEDIATOR_ONLY:
    // yalnız atanmış arabulucu, dosya sahibi veya admin.
    const { data: caseRow } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, dispute_type, dispute_subtype, title")
      .eq("id", case_id).maybeSingle();
    if (!caseRow) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: party } = await admin.from("case_parties")
      .select("id, user_id, case_id, party_role, party_type, first_name, last_name, company_name, statement")
      .eq("id", party_id).eq("case_id", case_id).maybeSingle();
    if (!party) {
      return new Response(JSON.stringify({ error: "Party not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    const allowed = isCron || !!roleRow || caseRow.user_id === userId || caseRow.assigned_mediator_id === userId;
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const partyName = party.party_type === "individual"
      ? `${party.first_name ?? ""} ${party.last_name ?? ""}`.trim()
      : (party.company_name ?? "Taraf");

    // İlerleme satırı yetki kapısından SONRA açılır: yetkisiz çağrı panelde iz bırakmaz.
    stateAdmin = admin; stateCaseId = case_id; statePartyId = party_id;
    await step(`${partyName || "Taraf"} — beyan ve belgeler karşılaştırılıyor`);

    // ── BAĞLAM: YALNIZCA bu tarafın kendi verisi. Karşı tarafın hiçbir kaydı okunmaz.

    // 1) Tarafın kendi beyanı
    const statementText = clip(String(party.statement ?? "").trim(), MAX_STATEMENT_CHARS);
    // Kaynak etiketleri kaydın GERÇEK türüne göre sabittir ve modelin dayanak.kaynak
    // alanına birebir yazması istenen değerlerdir: "Taraf beyanı" | "Belge: <file_name>"
    // | "Analiz bulgusu". Uydurma tür adı (ör. "Bilirkişi raporu") yasaktır.
    const statementBlock = statementText
      ? `\n═══ KAYNAK: Taraf beyanı — ${partyName} (kendi anlatımı) ═══\n${statementText}\n═══════════════════════════\n`
      : "";

    // 2) Tarafın kendi belgeleri — party-confidential-analysis'teki eşleşme kalıbı
    // (party_id eşleşmesi; party_id boşsa uploaded_by fallback) + 6.000/24.000 bütçesi.
    const { data: allDocs } = await admin.from("case_documents")
      .select("id, file_name, file_path, mime_type, extracted_text, extraction_status, party_id, uploaded_by")
      .eq("case_id", case_id);
    const docs = (allDocs ?? []).filter((d: any) =>
      d.party_id === party_id || (!d.party_id && party.user_id && d.uploaded_by === party.user_id)
    );

    let docExcerpts = "";
    let totalUsed = 0;
    let fullCount = 0, truncatedCount = 0, notIncludedCount = 0;
    for (const d of docs as any[]) {
      if (totalUsed >= TOTAL_CHAR_BUDGET) { notIncludedCount++; continue; }
      let text = String(d.extracted_text ?? "").trim();
      if (!text && ((d.mime_type ?? "").startsWith("text/") || String(d.file_name).toLowerCase().endsWith(".txt"))) {
        try {
          const { data: blob, error: dlErr } = await admin.storage.from("case-documents").download(d.file_path);
          if (!dlErr && blob) text = (await blob.text()).trim();
        } catch { /* okunamadı, dahil edilemeyen olarak sayılacak */ }
      }
      if (!text) { notIncludedCount++; continue; }
      const perDocLimit = Math.min(PER_DOC_CHAR_BUDGET, TOTAL_CHAR_BUDGET - totalUsed);
      const slice = text.slice(0, perDocLimit);
      docExcerpts += `\n--- Belge: ${d.file_name} ---\n${slice}\n`;
      totalUsed += slice.length;
      if (slice.length < text.length) truncatedCount++; else fullCount++;
    }
    const docBudgetNote = docs.length > 0
      ? `\nNOT (belge içerik bütçesi): ${docs.length} belgeden ${fullCount} tam, ${truncatedCount} kırpılarak, ${notIncludedCount} dahil edilemeden işlendi. Dahil edilemeyen belgeler hakkında uyumsuzluk üretme.`
      : "";
    const docsBlock = docExcerpts
      ? `\n═══ KAYNAK: BU TARAFIN KENDİ BELGELERİ ═══${docExcerpts}${docBudgetNote}\n═══════════════════════════\n`
      : (docs.length > 0 ? `\n═══ KAYNAK: BU TARAFIN KENDİ BELGELERİ ═══\n(okunabilir belge metni yok)${docBudgetNote}\n═══════════════════════════\n` : "");

    // 3) Tarafın kendi party_analyses.analysis.document_findings (varsa)
    const { data: analysisRow } = await admin.from("party_analyses")
      .select("analysis").eq("case_id", case_id).eq("party_id", party_id).maybeSingle();
    const findingsArr = (analysisRow as any)?.analysis?.document_findings;
    // "Bilirkişi raporu: <belge adı>" ifadesi bu fonksiyondan değil, party_analyses'e
    // yazılan document_findings içeriğinden geliyor (party-confidential-analysis oradaki
    // kaynağı böyle etiketliyor). case_documents'ta belge türü kolonu YOK — bu yüzden
    // bloğa girmeden önce etiket gerçek türüne, yani "Belge: <ad>"a çevrilir.
    const docFindingsBlock = Array.isArray(findingsArr) && findingsArr.length > 0
      ? `\n═══ KAYNAK: Analiz bulgusu (bu tarafın kendi analizinden) ═══\n${clip(
          findingsArr.map((f: any) => `- ${typeof f === "string" ? f : JSON.stringify(f)}`).join("\n"),
          MAX_DOC_FINDINGS_CHARS,
        )}\n═══════════════════════════\n`
      : "";

    // (a) Prompt'a giden TÜM bağlam metni tek noktada süzülür: model bu ifadeyi hiç görmesin.
    const contextBlocks = relabelBilirkisi(
      [statementBlock, docsBlock, docFindingsBlock].filter(Boolean).join("")
    );

    const systemPrompt = `Sen bir arabuluculuk dosyasında İÇ TUTARLILIK DENETİMİ yapan asistansın.
Yalnızca AYNI tarafın kendi beyanı ile kendi belgeleri arasındaki, ya da beyanın kendi içindeki uyumsuzlukları bul.
Her bulgu için: gozlem (nötr, tek cümle), a_deger, b_deger, dayanak_a {kaynak, alinti}, dayanak_b {kaynak, alinti}, guven_seviyesi ("yuksek"|"orta"|"dusuk").
a_deger ve b_deger ZORUNLUDUR: çelişkinin iki ucundaki SOMUT değeri yazarlar — tarih, tutar, kişi veya olay ifadesi (ör. a_deger: "Haziran 2025 temerrüt", b_deger: "Mayıs 2025'te 180.000 TL ödeme"). Bu iki alanı somut değerlerle dolduramıyorsan o bulguyu ÜRETME. a_deger dayanak_a'dan, b_deger dayanak_b'den gelmelidir.
kaynak alanı, kaydın GERÇEK türünü gösteren şu üç etiketten biri olmalı ve AYNEN böyle yazılmalı: "Taraf beyanı" | "Belge: <dosya adı>" | "Analiz bulgusu". Bu üçü dışında tür adı (ör. "Bilirkişi raporu", "Tanık ifadesi") uydurmak YASAKTIR; belge etiketinde dosya adını verilen bloktaki haliyle yaz. Bloklarda "Bilirkişi raporu: <ad>" benzeri bir ifadeye rastlarsan bunu kaynak alanına "Belge: <ad>" olarak yaz — dosyaya bilirkişi raporu deme.
alinti alanları, verilen kaynaklarda BİREBİR geçen kısa alıntı olmalı (en fazla 200 karakter) — kendi cümleni alıntı diye yazma.
YASAK: kişilik teşhisi, niyet atfı, "yalan söylüyor" türü hüküm cümlesi — yalnız iki dayanağı yan yana koy.
EŞİK (çok önemli): Bir bulgu ancak İKİ DAYANAK BİRBİRİYLE GERÇEKTEN ÇELİŞİYORSA üretilir: aynı olguya dair farklı tarih/tutar/kişi/olay bilgisi ya da birinin açıkça yalanladığı bir beyan. Konu benzerliği, ton farkı, eksik bilgi veya "destekleyici" iki alıntı ÇELİŞKİ DEĞİLDİR — bunları üretme. Emin değilsen bulguyu atla; boş dizi döndürmek yanlış bulgu üretmekten iyidir. Her bulguda çelişkinin NE OLDUĞUNU gozlem alanında tek cümlede açıkça yaz (ör. "ihtarnamede Haziran 2025, cevapta Mayıs 2025 deniyor").
KESİN KURAL (iki değer şartı): Bir bulgu ancak iki dayanak AYNI OLGU hakkında BİRBİRİNİ TUTMAYAN iki değer içeriyorsa üretilir (farklı tarih, farklı tutar, farklı kişi, ya da biri "oldu" diğeri "olmadı" diyorsa). gozlem cümlesi bu iki değeri de içermek ZORUNDA — "A kaynağında X, B kaynağında Y" biçiminde. Tek bir kaynağın beyanını tekrar eden, iki alıntısı da aynı yöne bakan veya "örtüşmüyor/farklılık var" deyip iki değeri yazmayan bulgu ÜRETME. Hiç uygun bulgu yoksa boş dizi döndür — bu başarısızlık değildir.
SOMUTLUK: gozlem alanı çelişkinin İKİ UCUNU da açıkça yazmalı — hangi kaynakta ne, diğerinde ne (tarih/tutar/kişi/olay belirtilerek). Örnek biçim: "İhtarnamede temerrüt Haziran 2025 deniyor, ihtara cevapta Mayıs 2025 ödemesi gösteriliyor." İki ucu somut yazamıyorsan o bulguyu ÜRETME. "Örtüşmemektedir", "tutarsızlık göze çarpıyor" gibi muğlak, ucu belirtilmeyen cümleler KABUL EDİLMEZ.
Uyumsuzluk yoksa boş dizi döndür, ZORLAMA. Dayanağı gösterilemeyen bulgu üretme. Türkçe yaz.
Çıktı YALNIZCA şu JSON: {
  "findings": [{"gozlem":"", "a_deger":"", "b_deger":"", "dayanak_a":{"kaynak":"","alinti":""}, "dayanak_b":{"kaynak":"","alinti":""}, "guven_seviyesi":"yuksek|orta|dusuk"}]
}`;

    const userPrompt = `TARAF: ${partyName} (rol: ${party.party_role ?? "?"}, tür: ${party.party_type ?? "-"})
UYUŞMAZLIK: ${caseRow.dispute_type ?? "-"} / ${caseRow.dispute_subtype ?? "-"}

BU TARAFIN KENDİ KAYITLARI:
${contextBlocks || "(bu taraf için okunabilir beyan veya belge metni yok)"}
Yukarıdaki kayıtlar YALNIZCA bu tarafa aittir. Karşı tarafla karşılaştırma yapma.
Yalnızca bu kayıtlar arasındaki uyumsuzlukları, her biri için iki dayanağı yan yana göstererek çıkar; uyumsuzluk yoksa findings dizisini boş bırak.`;

    // ── MODEL KAPISI (üç kademe): (1) OPENAI_API_KEY varsa ÖNCE doğrudan OpenAI;
    // (2) düşerse GEMINI_API_KEY ile doğrudan Google model listesi; (3) o da düşerse
    // Lovable gateway yedeği. case-qa/index.ts kalıbının aynısı — bu noktadan sonrası
    // (JSON parse + sanitizer + şema güvencesi) üç yolda da AYNI.
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    let rawContent: string | null = null;
    let openaiFail: { status: number; shortMsg: string } | null = null;
    let googleFail: { status: number; shortMsg: string } | null = null;

    if (openaiKey) {
      // Anahtar yalnız env'den okunur; hata gövdelerinden temizlenir, hiçbir yere loglanmaz.
      const redact = (s: string) => s.split(openaiKey).join("***");
      const OPENAI_MODEL = "gpt-4o-mini";
      try {
        const oRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
        });
        if (oRes.ok) {
          const oJson = await oRes.json();
          const text = oJson?.choices?.[0]?.message?.content;
          if (typeof text === "string" && text.trim()) {
            rawContent = text;
            console.log(`[party-consistency-check] Sağlayıcı: OpenAI — model: ${OPENAI_MODEL}`);
          } else {
            console.error(`[party-consistency-check] OpenAI (${OPENAI_MODEL}) boş yanıt döndürdü — Google'a düşülüyor.`);
            openaiFail = { status: 502, shortMsg: `${OPENAI_MODEL} boş yanıt döndürdü` };
          }
        } else {
          const bodyText = redact(await oRes.text());
          let shortMsg = bodyText.replace(/\s+/g, " ").trim().slice(0, 120);
          let code = "";
          try {
            const errObj = JSON.parse(bodyText)?.error;
            shortMsg = String(errObj?.message ?? shortMsg).slice(0, 120);
            code = String(errObj?.code ?? errObj?.type ?? "");
          } catch { /* düz metin */ }
          console.error("[party-consistency-check] OpenAI error:", oRes.status, shortMsg);
          openaiFail = {
            status: code === "insufficient_quota" ? 402 : oRes.status,
            shortMsg: `${OPENAI_MODEL}: ${shortMsg}`,
          };
        }
      } catch (e: any) {
        const msg = redact(e?.message ?? String(e)).slice(0, 120);
        console.error(`[party-consistency-check] OpenAI çağrısı başarısız: ${msg}`);
        openaiFail = { status: 502, shortMsg: `${OPENAI_MODEL}: ${msg}` };
      }
    }

    if (rawContent === null && geminiKey) {
      const redact = (s: string) => s.split(geminiKey).join("***");
      // Model adları hesaplarda/bölgelerde farklılaşabildiği için sıralı denenir:
      // 404/400 alınırsa sıradaki denenir, ilk başarılı cevapta durulur.
      const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"];
      for (const model of GEMINI_MODELS) {
        try {
          const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
              }),
            },
          );
          if (gRes.ok) {
            const gJson = await gRes.json();
            const text = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof text === "string" && text.trim()) {
              rawContent = text;
              console.log(`[party-consistency-check] Sağlayıcı: Google — model: ${model}`);
              break;
            }
            console.error(`[party-consistency-check] Google (${model}) boş yanıt döndürdü — sıradaki model deneniyor.`);
            googleFail = { status: 502, shortMsg: `${model} boş yanıt döndürdü` };
            continue;
          }
          const bodyText = redact(await gRes.text());
          let shortMsg = bodyText.replace(/\s+/g, " ").trim().slice(0, 120);
          try { shortMsg = String(JSON.parse(bodyText)?.error?.message ?? shortMsg).slice(0, 120); } catch { /* düz metin */ }
          console.error(`[party-consistency-check] Google (${model}) error:`, gRes.status, shortMsg);
          googleFail = { status: gRes.status, shortMsg: `${model}: ${shortMsg}` };
          if (gRes.status === 404 || gRes.status === 400) continue;
          break;
        } catch (e: any) {
          const msg = redact(e?.message ?? String(e)).slice(0, 120);
          console.error(`[party-consistency-check] Google (${model}) çağrısı başarısız: ${msg}`);
          googleFail = { status: 502, shortMsg: `${model}: ${msg}` };
          break;
        }
      }
    }

    if (rawContent === null) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });
      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error("[party-consistency-check] Gateway error:", aiRes.status, errText.slice(0, 300));
        // Üç kademe de düştüyse hepsi tek satırda birleştirilir.
        const gatewayMsg =
          aiRes.status === 429 ? "Rate limit aşıldı. Lütfen biraz sonra tekrar deneyin." :
          aiRes.status === 402 ? "AI kredisi tükendi. Workspace ayarlarından kredi ekleyin." :
          "AI servisi hatası";
        const openaiMsg = openaiFail
          ? `OpenAI: ${openaiFail.status} ${openaiFail.shortMsg}` +
            (openaiFail.status === 429 ? " — OpenAI kota/hız sınırı, biraz sonra tekrar deneyin." :
             openaiFail.status === 401 ? " — OpenAI anahtarı geçersiz." :
             openaiFail.status === 402 ? " — OpenAI bakiyesi yetersiz." : "")
          : null;
        const googleMsg = googleFail
          ? `Google: ${googleFail.status} ${googleFail.shortMsg}` +
            (googleFail.status === 429 ? " — ücretsiz kota sınırına takıldı, 1 dakika sonra tekrar deneyin." :
             (googleFail.status === 400 || googleFail.status === 403) ? " — API anahtarını kontrol edin." : "")
          : null;
        const userMsg = [openaiMsg, googleMsg, `Gateway: ${aiRes.status} ${gatewayMsg}`]
          .filter(Boolean).join(" | ");
        await writeState({ status: "failed", error_message: userMsg.slice(0, 300) });
        return new Response(JSON.stringify({ error: userMsg, detail: errText }), {
          status: openaiFail?.status ?? googleFail?.status ?? aiRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const aiJson = await aiRes.json();
      rawContent = aiJson?.choices?.[0]?.message?.content ?? "{}";
      console.log("[party-consistency-check] Sağlayıcı: Lovable gateway — model: google/gemini-2.5-flash");
    }

    await step("çelişki adayları eleniyor");

    // Etiket temizliği TEK NOKTADAN: model cevabının tamamı parse edilmeden önce
    // süzülür, böylece hangi alanda geçtiğine bakmaya gerek kalmaz.
    let parsed: any = {};
    try { parsed = JSON.parse(relabelBilirkisi(rawContent ?? "{}")); } catch { parsed = {}; }

    // Deterministic citation guard: bağlamda birebir geçmeyen künyeleri temizler.
    parsed = sanitizeCitationHallucinations(parsed, contextBlocks);

    // Şema güvencesi: iki dayanağı da alıntısıyla gösteremeyen bulgu ELENİR —
    // "dayanağı gösterilemeyen bulgu üretme" kuralının kod tarafındaki karşılığı.
    // Buna ek olarak çelişkinin iki ucundaki somut değer (a_deger/b_deger) yazılamamışsa
    // bulgu yine ELENİR: prompt kuralının yapısal karşılığı, model onu yok sayamaz.
    const normSide = (s: any) => ({
      kaynak: String(s?.kaynak ?? "").slice(0, 200),
      alinti: String(s?.alinti ?? "").slice(0, 400),
    });
    const MIN_DEGER_CHARS = 10;
    const ALLOWED_CONF = ["yuksek", "orta", "dusuk"];
    const rawFindings = Array.isArray(parsed?.findings) ? parsed.findings : [];
    const findings = rawFindings
      .map((f: any) => {
        const conf = String(f?.guven_seviyesi ?? "").toLowerCase();
        return {
          gozlem: String(f?.gozlem ?? "").trim(),
          a_deger: String(f?.a_deger ?? "").trim().slice(0, 300),
          b_deger: String(f?.b_deger ?? "").trim().slice(0, 300),
          dayanak_a: normSide(f?.dayanak_a),
          dayanak_b: normSide(f?.dayanak_b),
          guven_seviyesi: ALLOWED_CONF.includes(conf) ? conf : "dusuk",
        };
      })
      .filter((f: any) =>
        f.gozlem && f.dayanak_a.alinti && f.dayanak_b.alinti
        && f.a_deger.length >= MIN_DEGER_CHARS && f.b_deger.length >= MIN_DEGER_CHARS
      );
    const droppedCount = rawFindings.length - findings.length;

    console.log(
      `[party-consistency-check] case=${case_id} party=${party_id} bağlam=${contextBlocks.length} krk | bulgu=${findings.length}` +
      (droppedCount > 0 ? ` | dayanaksız ${droppedCount} bulgu elendi` : "")
    );

    await step("kayıt");

    // Yazma best-effort: bu satır yazılamazsa bile cevap döner, ana akış durmaz.
    // Başka hiçbir tabloya yazılmaz.
    let persisted = true;
    try {
      const { error: upsertErr } = await admin.from("party_consistency_findings")
        .upsert(
          { case_id, party_id, findings, updated_at: new Date().toISOString() },
          { onConflict: "case_id,party_id" },
        );
      if (upsertErr) throw upsertErr;
    } catch (e: any) {
      persisted = false;
      console.error(`[party-consistency-check] party_consistency_findings yazımı başarısız: ${e?.message ?? String(e)}`);
    }

    await writeState(
      persisted
        ? { status: "completed", error_message: null }
        : { status: "failed", error_message: "party_consistency_findings yazılamadı" }
    );

    return new Response(JSON.stringify({ findings, persisted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[party-consistency-check] Function error:", e);
    await writeState({ status: "failed", error_message: String(e?.message ?? e).slice(0, 300) });
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Deterministic citation guard (no extra AI call, no schema change). Copied
// verbatim from case-qa/index.ts — this repo has no _shared/ module between
// edge functions, so each function stays self-contained.
// ─────────────────────────────────────────────────────────────────────────

// Matches "2016/10292 E.", "E. 2017/3257", "K. 2018/7889", "2010/8939 K.",
// placeholder-digit variants like "2020/XXXX E." (number/E-or-K token pairs in
// either order), AND bare "YYYY/NNN+" case numbers with no E./K. label at all
// (min 3-digit docket segment so tarife/madde references like "2026/17" don't
// match). A bare match whose second segment is exactly 4 digits and within ±1
// of the first (e.g. "2024/2025") is a year range, not a citation — excluded
// via isYearRangeFalsePositive below, not in the regex itself.
const CITATION_PATTERN = /\b(\d{4}\/[0-9X]{1,7}\s*(?:E|K)\.?)\b|\b((?:E|K)\.?\s*\d{4}\/[0-9X]{1,7})\b|\b(\d{4})\/([0-9X]{3,7})\b/gi;

function isYearRangeFalsePositive(yearStr: string, secondStr: string): boolean {
  if (!/^\d{4}$/.test(secondStr)) return false;
  const y1 = Number(yearStr), y2 = Number(secondStr);
  return Math.abs(y2 - y1) === 1;
}

function extractCitations(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(CITATION_PATTERN);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[3] !== undefined) {
      if (isYearRangeFalsePositive(m[3], m[4])) continue;
      out.push(`${m[3]}/${m[4]}`);
    } else {
      out.push((m[1] ?? m[2] ?? m[0]).trim());
    }
  }
  return out;
}

function normalizeForCompare(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function citationInContext(citation: string, context: string): boolean {
  return normalizeForCompare(context).includes(normalizeForCompare(citation));
}

// Replaces any citation not verbatim in `context` with a generic phrase,
// then tidies the double-space/empty-parenthesis artifacts that leaves behind.
function scrubCitationsInString(text: string, context: string): { text: string; removed: number } {
  let removed = 0;
  const re = new RegExp(CITATION_PATTERN);
  const scrubbed = text.replace(re, (match: string, g1: string, g2: string, g3: string, g4: string) => {
    if (g3 !== undefined && isYearRangeFalsePositive(g3, g4)) return match;
    if (citationInContext(match, context)) return match;
    removed++;
    return "yerleşik içtihadı";
  });
  const cleaned = scrubbed
    .replace(/\(\s*\)/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
  return { text: cleaned, removed };
}

function sanitizeStringsDeep(value: any, context: string, stats: { removed: number }): any {
  if (typeof value === "string") {
    const { text, removed } = scrubCitationsInString(value, context);
    stats.removed += removed;
    return text;
  }
  if (Array.isArray(value)) return value.map((v) => sanitizeStringsDeep(v, context, stats));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeStringsDeep(v, context, stats);
    return out;
  }
  return value;
}

// legal_framework.precedents gets the stricter treatment: an item whose `decision`
// cites an E./K. number not present in context is dropped entirely. This function's
// own output schema has no precedents field, so this block is a no-op here — kept
// for parity with the sibling functions so all stay identical, copy-paste-able.
function sanitizeCitationHallucinations(parsed: any, context: string): any {
  const stats = { removed: 0, precedentsDropped: 0 };

  if (Array.isArray(parsed?.legal_framework?.precedents)) {
    const before = parsed.legal_framework.precedents.length;
    parsed.legal_framework.precedents = parsed.legal_framework.precedents.filter((p: any) => {
      const citations = extractCitations(String(p?.decision ?? ""));
      if (citations.length === 0) return true;
      return citations.every((c) => citationInContext(c, context));
    });
    stats.precedentsDropped = before - parsed.legal_framework.precedents.length;
  }

  const sanitized = sanitizeStringsDeep(parsed, context, stats);

  if (stats.removed > 0 || stats.precedentsDropped > 0) {
    console.log(
      `[party-consistency-check] citation guard: ${stats.removed} inline künye temizlendi, ${stats.precedentsDropped} precedent kaydı bağlamda doğrulanamadığı için silindi`
    );
  }

  return sanitized;
}
