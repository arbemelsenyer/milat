// İletişim İzi Analizi — MEDIATOR_ONLY.
// Tarafın NE söylediğinden değil NASIL konuştuğundan asıl ihtiyacını çıkarır ve
// arabulucuya sıradaki en fazla 3 keşif sorusunu verir. Bağlama YALNIZCA bu tarafın
// kendi ifadeleri girer (beyan + kendi belgeleri + kendi soru/cevapları); karşı tarafın
// hiçbir metni girmez. Yalnız party_communication_analysis tablosuna yazar; RAG/worklog YOK.
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
// agent_type için de CHECK kısıtı var; 'party_communication' değerinin kısıta eklenmiş
// olması ŞART — eklenmezse insert reddedilir ve panelde hiç satır görünmez.
const AGENT_TYPE = "party_communication";

async function upsertCommunicationState(
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

// Belge içerik bütçesi — party-consistency-check/index.ts kalıbının aynısı.
const PER_DOC_CHAR_BUDGET = 6_000;
const TOTAL_CHAR_BUDGET = 24_000;
const MAX_STATEMENT_CHARS = 12_000;
const MAX_DISCOVERY_CHARS = 4_000;
const MAX_ISSUE_CHARS = 3_000;

// "Bilirkişi raporu:" etiketi bu fonksiyondan değil, party_analyses.document_findings
// içeriğinden geliyor (party-confidential-analysis oradaki kaynağı böyle etiketliyor).
// case_documents'ta belge türü kolonu YOK; bu yüzden ifade hem prompt'a giren bağlamda
// hem de model cevabında gerçek türüne çevrilir.
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
      await upsertCommunicationState(stateAdmin, stateCaseId, statePartyId, patch);
    } catch (e: any) {
      // Best-effort: ana akış DURMAZ. Ama sessiz de kalmaz — kısıt ihlali gibi kalıcı
      // hatalar (agent_type/status CHECK) ancak logda görülerek fark edilebiliyor.
      console.error(`[party-communication-analysis] agent_states yazımı başarısız: ${e?.message ?? String(e)}`);
    }
  };
  const step = (current_step: string) =>
    writeState({ status: "running", error_message: null, last_output: { current_step } });

  try {
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
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const case_id: string | undefined = body?.case_id;
    const party_id: string | undefined = body?.party_id;
    if (!case_id || !party_id) {
      return new Response(JSON.stringify({ error: "case_id and party_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // ── YETKİ: party-consistency-check ile aynı — taraf-izinli gevşetme YOK,
    // bu çıktı MEDIATOR_ONLY: yalnız atanmış arabulucu, dosya sahibi veya admin.
    const { data: caseRow } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, dispute_type, dispute_subtype, title, issue_description")
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
    const allowed = !!roleRow || caseRow.user_id === userId || caseRow.assigned_mediator_id === userId;
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
    await step(`${partyName || "Taraf"} — bağlam toplanıyor`);

    // ── BAĞLAM: YALNIZCA bu tarafın kendi ifadeleri.

    // 1) Tarafın kendi beyanı
    const statementText = clip(String(party.statement ?? "").trim(), MAX_STATEMENT_CHARS);
    const statementBlock = statementText
      ? `\n═══ KAYNAK: Taraf beyanı — ${partyName} (kendi anlatımı) ═══\n${statementText}\n═══════════════════════════\n`
      : "";

    // 2) Tarafın kendi belgeleri — party_id eşleşmesi; party_id boşsa uploaded_by
    // fallback + 6.000/24.000 karakter bütçesi (party-consistency-check kalıbı).
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
      ? `\nNOT (belge içerik bütçesi): ${docs.length} belgeden ${fullCount} tam, ${truncatedCount} kırpılarak, ${notIncludedCount} dahil edilemeden işlendi. Dahil edilemeyen belgeler hakkında iz üretme.`
      : "";
    const docsBlock = docExcerpts
      ? `\n═══ KAYNAK: BU TARAFIN KENDİ BELGELERİ ═══${docExcerpts}${docBudgetNote}\n═══════════════════════════\n`
      : (docs.length > 0 ? `\n═══ KAYNAK: BU TARAFIN KENDİ BELGELERİ ═══\n(okunabilir belge metni yok)${docBudgetNote}\n═══════════════════════════\n` : "");

    // NOT (bağlam daraltması): party_analyses metinleri bağlamdan ÇIKARILDI — üçüncü
    // şahıs dilinde yazıldıkları için model kimin konuştuğunu karıştırıyor ve karşı
    // tarafın davranışını bu tarafın izi sanıyordu. Aynı nedenle case_notes (dosya
    // geneli, iki tarafı birden anlatıyor) da çıkarıldı. Bağlamda artık YALNIZCA bu
    // tarafın kendi ifadeleri var: kendi beyanı, kendi belgeleri, kendi soru/cevapları.

    // 3) Bu tarafa ait ihtiyaç tespiti soru/cevapları (varsa) — party_id ile sınırlı,
    // yani cevaplar bu tarafın kendi sözleri.
    const { data: discRows } = await admin.from("case_discovery_questions")
      .select("id, question_text, answer_text, detected_need, question_order")
      .eq("case_id", case_id).eq("party_id", party_id)
      .order("question_order", { ascending: true });
    let discoveryBlock = "";
    if ((discRows ?? []).length > 0) {
      let used = 0;
      const lines: string[] = [];
      for (const d of (discRows ?? []) as any[]) {
        const line = `S: ${d.question_text}\nC: ${d.answer_text ?? "(cevap yok)"}\nTespit edilen ihtiyaç: ${d.detected_need ?? "-"}`;
        if (used + line.length > MAX_DISCOVERY_CHARS) break;
        lines.push(line);
        used += line.length;
      }
      if (lines.length > 0) {
        discoveryBlock = `\n═══ KAYNAK: İhtiyaç tespiti (bu tarafın soru/cevapları) ═══\n${lines.join("\n\n")}\n═══════════════════════════\n`;
      }
    }

    // 4) Aynı dosyadaki DİĞER tarafların adları — bağlama girmezler, yalnızca cevap
    // geldikten sonra "karşı tarafın davranışını anlatan iz" elemesi için kullanılır.
    const { data: otherParties } = await admin.from("case_parties")
      .select("id, party_type, first_name, last_name, company_name")
      .eq("case_id", case_id).neq("id", party_id);
    const otherPartyNames = (otherParties ?? []).flatMap((p: any) => [
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      String(p.company_name ?? "").trim(),
    ]).filter((n: string) => n.length >= 3);

    // 5) Uyuşmazlık başlıkları — "kacinilan_konu" izinin karşılaştırma listesi.
    // Kaynak: cases.issue_description + BU tarafın kendi belgelerinin adları.
    // Karşı tarafın beyanı bu listeye GİRMEZ (iz atfı karışmasın).
    const issueText = clip(String((caseRow as any).issue_description ?? "").trim(), MAX_ISSUE_CHARS);
    const docTitles = (docs as any[]).map((d) => String(d.file_name ?? "").trim()).filter(Boolean);
    const topicsBlock = (issueText || docTitles.length > 0)
      ? `\n═══ DOSYANIN UYUŞMAZLIK BAŞLIKLARI (karşılaştırma listesi — bu tarafın metni DEĞİL) ═══\n` +
        `${issueText ? `Uyuşmazlık konusu: ${issueText}\n` : ""}` +
        `${docTitles.length > 0 ? `Bu tarafın belge başlıkları:\n${docTitles.map((t) => `- ${t}`).join("\n")}\n` : ""}` +
        `═══════════════════════════\n`
      : "";

    // Prompt'a giden TÜM bağlam metni tek noktada süzülür.
    const contextBlocks = relabelBilirkisi(
      [statementBlock, docsBlock, discoveryBlock, topicsBlock].filter(Boolean).join("")
    );

    const systemPrompt = `Sen bir arabuluculuk dosyasında İLETİŞİM İZİ ANALİZİ yapan asistansın.
Tarafın NE söylediğine değil NASIL konuştuğuna bak: neyi atlıyor, neyi tekrar ediyor, nerede dili sertleşiyor, hangi alana hiç değinmiyor, talebi ile anlatısı nerede ayrışıyor.
BEŞ HANE KURALI: findings dizisi serbest değildir — şu BEŞ iz_tipi'nin HER BİRİ için TAM BİR kayıt döndür (toplam 5 öğe, sırayla): "kacinilan_konu", "tekrar_eden_tema", "sertlesme_noktasi", "hic_deginilmeyen_alan", "talep_anlati_farki". Bir tipten ikinci bir kayıt YAZMA, tip atlama.
Her kayıt için: iz_tipi, var_mi (true/false), gozlem (nötr, tek cümle), dayanak {kaynak, alinti}, guven_seviyesi ("yuksek"|"orta"|"dusuk"), yok_gerekcesi.
var_mi=true ise gozlem ve dayanak.alinti ZORUNLU, yok_gerekcesi boş kalır. var_mi=false ise yok_gerekcesi tek cümleyle ZORUNLU (ör. "beyanda sertleşme gösteren bir ifade yok"), gozlem ve dayanak boş kalır. Zorlama yapma: bir tip için gerçek bir iz yoksa var_mi=false demek DOĞRU cevaptır.
kaynak alanı, kaydın GERÇEK türünü gösteren şu etiketlerden biri olmalı ve AYNEN böyle yazılmalı: "Taraf beyanı" | "Belge: <dosya adı>" | "İhtiyaç tespiti". Başka tür adı uydurmak YASAKTIR.
KİMİN İZİ (çok önemli): İzler YALNIZ bu tarafın kendi ifadelerinden çıkarılır. Gözlem cümlesi bu tarafın davranışını anlatmalı ("bu taraf şu konuya hiç değinmiyor"), karşı tarafın davranışını DEĞİL. Karşı tarafın tutumunu anlatan iz ÜRETME (ör. "karşı taraf teklifi kabul etmiyor" bir iz değildir). Bu tarafın metninde karşı taraftan söz edilse bile iz, bu tarafın kendi anlatımı hakkında olmalıdır.
dayanak.alinti ZORUNLUDUR ve verilen kaynaklarda BİREBİR geçen kısa bir alıntı olmalı (en fazla 200 karakter) — kendi cümleni alıntı diye yazma, özetleme.
TEŞHİS DİLİ YASAK — kişilik yorumu ("savunmacı", "agresif"), niyet atfı, "yalan söylüyor" türü hüküm cümlesi kurma. Yalnız gözlem + birebir alıntı yaz. Örnek doğru gözlem: "Ödeme konusu üç ayrı yerde soruluyor, üçünde de cevap başka konuya kaydırılıyor."
Dayanağı gösterilemeyen iz için var_mi=false yaz — bu başarısızlık değildir.
"hic_deginilmeyen_alan" izinde de dayanak zorunludur: hangi metnin o alana girmeden geçtiğini gösteren birebir alıntı ver.
"kacinilan_konu": "DOSYANIN UYUŞMAZLIK BAŞLIKLARI" bloğunda geçen ama tarafın KENDİ beyanında hiç geçmeyen başlıktır. Dayanak alıntısı beyandan alınamıyorsa dayanak.kaynak alanına "Uyuşmazlık başlığı" yaz ve dayanak.alinti alanına konu başlığını + "beyanda karşılığı yok" notunu yaz (ör. "Marka lisans bedeli — beyanda karşılığı yok").
"talep_anlati_farki": bu tipte ayrıca talep_ne (taraf ne talep ediyor) ve anlati_agirlik_merkezi (anlatının ağırlık merkezi ne) alanlarını da doldur (ör. talep_ne: "840.000 TL alacak", anlati_agirlik_merkezi: "marka itibarı ve emsal endişesi"). İkisi de dolu VE birbirinden farklıysa var_mi=true; aynı şeyi söylüyorlarsa veya biri boşsa var_mi=false.
discovery_questions: arabulucunun sıradaki EN FAZLA 3 keşif sorusu. Her soru bir boşluğa bağlı olmalı ve hangi_boslugu_kapatir alanında bu boşluk açıkça yazılmalı; boşluğu yazamıyorsan o soruyu ÜRETME. Sorular kısa, açık uçlu ve arabulucunun ağzından olmalı.
Türkçe yaz.
Çıktı YALNIZCA şu JSON: {
  "findings": [{"iz_tipi":"", "var_mi":true, "gozlem":"", "dayanak":{"kaynak":"","alinti":""}, "guven_seviyesi":"yuksek|orta|dusuk", "yok_gerekcesi":"", "talep_ne":"", "anlati_agirlik_merkezi":""}],
  "discovery_questions": [{"soru":"", "hangi_boslugu_kapatir":""}]
}
findings dizisi TAM 5 öğe içermeli; talep_ne ve anlati_agirlik_merkezi yalnız "talep_anlati_farki" kaydında doldurulur, diğerlerinde boş bırakılır.`;

    const userPrompt = `TARAF: ${partyName} (rol: ${party.party_role ?? "?"}, tür: ${party.party_type ?? "-"})
UYUŞMAZLIK: ${caseRow.dispute_type ?? "-"} / ${caseRow.dispute_subtype ?? "-"}

BU TARAFIN KAYITLARI:
${contextBlocks || "(bu taraf için okunabilir beyan, belge veya not metni yok)"}
Yukarıdaki kayıtlar bu tarafa aittir (uyuşmazlık başlıkları bloğu yalnız karşılaştırma listesidir). Karşı tarafla karşılaştırma yapma.
Beş iz tipinin her biri için ayrı ayrı değerlendir ve TAM 5 kayıt döndür; iz bulunmayan tipe var_mi=false + yok_gerekcesi yaz. Ayrıca arabulucuya sıradaki en fazla 3 keşif sorusunu ver.`;

    await step("izler inceleniyor (kaçınılan konu · tekrar eden tema · sertleşme noktası · hiç değinilmeyen alan · talep–anlatı farkı)");

    // ── MODEL KAPISI (üç kademe): (1) OPENAI_API_KEY varsa ÖNCE doğrudan OpenAI;
    // (2) düşerse GEMINI_API_KEY ile doğrudan Google model listesi; (3) o da düşerse
    // Lovable gateway yedeği. party-consistency-check kalıbının aynısı.
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
            console.log(`[party-communication-analysis] Sağlayıcı: OpenAI — model: ${OPENAI_MODEL}`);
          } else {
            console.error(`[party-communication-analysis] OpenAI (${OPENAI_MODEL}) boş yanıt döndürdü — Google'a düşülüyor.`);
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
          console.error("[party-communication-analysis] OpenAI error:", oRes.status, shortMsg);
          openaiFail = {
            status: code === "insufficient_quota" ? 402 : oRes.status,
            shortMsg: `${OPENAI_MODEL}: ${shortMsg}`,
          };
        }
      } catch (e: any) {
        const msg = redact(e?.message ?? String(e)).slice(0, 120);
        console.error(`[party-communication-analysis] OpenAI çağrısı başarısız: ${msg}`);
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
              console.log(`[party-communication-analysis] Sağlayıcı: Google — model: ${model}`);
              break;
            }
            console.error(`[party-communication-analysis] Google (${model}) boş yanıt döndürdü — sıradaki model deneniyor.`);
            googleFail = { status: 502, shortMsg: `${model} boş yanıt döndürdü` };
            continue;
          }
          const bodyText = redact(await gRes.text());
          let shortMsg = bodyText.replace(/\s+/g, " ").trim().slice(0, 120);
          try { shortMsg = String(JSON.parse(bodyText)?.error?.message ?? shortMsg).slice(0, 120); } catch { /* düz metin */ }
          console.error(`[party-communication-analysis] Google (${model}) error:`, gRes.status, shortMsg);
          googleFail = { status: gRes.status, shortMsg: `${model}: ${shortMsg}` };
          if (gRes.status === 404 || gRes.status === 400) continue;
          break;
        } catch (e: any) {
          const msg = redact(e?.message ?? String(e)).slice(0, 120);
          console.error(`[party-communication-analysis] Google (${model}) çağrısı başarısız: ${msg}`);
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
        console.error("[party-communication-analysis] Gateway error:", aiRes.status, errText.slice(0, 300));
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
      console.log("[party-communication-analysis] Sağlayıcı: Lovable gateway — model: google/gemini-2.5-flash");
    }

    await step("bulgular eleniyor");

    // Etiket temizliği TEK NOKTADAN: model cevabının tamamı parse edilmeden önce süzülür.
    let parsed: any = {};
    try { parsed = JSON.parse(relabelBilirkisi(rawContent ?? "{}")); } catch { parsed = {}; }

    // Deterministic citation guard: bağlamda birebir geçmeyen künyeleri temizler.
    parsed = sanitizeCitationHallucinations(parsed, contextBlocks);

    // Yapısal kalite kuralı (iç tutarlılıkta kanıtlandı): dayanağı gösterilemeyen iz
    // ELENİR — alinti boş veya 15 karakterden kısaysa o finding listeden atılır.
    const MIN_ALINTI_CHARS = 15;
    const ALLOWED_IZ = [
      "kacinilan_konu", "tekrar_eden_tema", "sertlesme_noktasi",
      "hic_deginilmeyen_alan", "talep_anlati_farki",
    ];
    const ALLOWED_CONF = ["yuksek", "orta", "dusuk"];
    const rawFindings = Array.isArray(parsed?.findings) ? parsed.findings : [];
    const normalized = rawFindings
      .map((f: any) => {
        const iz = String(f?.iz_tipi ?? "").trim().toLowerCase();
        const conf = String(f?.guven_seviyesi ?? "").toLowerCase();
        return {
          iz_tipi: ALLOWED_IZ.includes(iz) ? iz : "",
          var_mi: f?.var_mi === true,
          gozlem: String(f?.gozlem ?? "").trim(),
          dayanak: {
            kaynak: String(f?.dayanak?.kaynak ?? "").slice(0, 200),
            alinti: String(f?.dayanak?.alinti ?? "").trim().slice(0, 400),
          },
          guven_seviyesi: ALLOWED_CONF.includes(conf) ? conf : "dusuk",
          yok_gerekcesi: String(f?.yok_gerekcesi ?? "").trim().slice(0, 400),
          talep_ne: String(f?.talep_ne ?? "").trim().slice(0, 300),
          anlati_agirlik_merkezi: String(f?.anlati_agirlik_merkezi ?? "").trim().slice(0, 300),
        };
      })
      .filter((f: any) => f.iz_tipi);

    // TİP BAŞINA EN FAZLA BİR KAYIT: aynı iz_tipi tekrar gelirse ilki tutulur.
    const seenTypes = new Set<string>();
    const perType = normalized.filter((f: any) => {
      if (seenTypes.has(f.iz_tipi)) return false;
      seenTypes.add(f.iz_tipi);
      return true;
    });

    const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
    // var_mi=true kaydın geçerlilik şartları — model "var" dese bile burada doğrulanır.
    const isValidPresent = (f: any): boolean => {
      if (!f.var_mi) return false;
      if (!f.gozlem || f.dayanak.alinti.length < MIN_ALINTI_CHARS) return false;
      // Karşı tarafın davranışını anlatan iz ELENİR: gozlem metninde bu dosyadaki
      // DİĞER taraflardan birinin adı geçiyorsa bu iz bu tarafa ait değildir.
      const g = norm(f.gozlem);
      if (otherPartyNames.some((n: string) => g.includes(norm(n)))) return false;
      // talep_anlati_farki: iki alan da dolu VE birbirinden farklı olmalı.
      if (f.iz_tipi === "talep_anlati_farki") {
        if (!f.talep_ne || !f.anlati_agirlik_merkezi) return false;
        if (norm(f.talep_ne) === norm(f.anlati_agirlik_merkezi)) return false;
      }
      return true;
    };

    // Tabloya BEŞ hanenin TAMAMI yazılır: doğrulamayı geçen izler var_mi=true, geçmeyenler
    // var_mi=false + yok_gerekcesi ile. Böylece "İncelendi — bulgu yok" hali de kalıcı olur
    // ve ekranda incelenmemiş tipten ayırt edilebilir. Tablo yapısı aynı (findings jsonb).
    const persistedFindings = perType.map((f: any) =>
      isValidPresent(f)
        ? {
            iz_tipi: f.iz_tipi,
            var_mi: true,
            gozlem: f.gozlem,
            dayanak: f.dayanak,
            guven_seviyesi: f.guven_seviyesi,
            ...(f.iz_tipi === "talep_anlati_farki"
              ? { talep_ne: f.talep_ne, anlati_agirlik_merkezi: f.anlati_agirlik_merkezi }
              : {}),
          }
        : {
            iz_tipi: f.iz_tipi,
            var_mi: false,
            yok_gerekcesi: f.yok_gerekcesi || "Bu tip için doğrulanabilir bir iz bulunamadı.",
          }
    );
    // Cevabın şekli DEĞİŞMEDİ: `findings` yine yalnız var_mi=true izleri taşır (elle
    // çalıştırma düğmesinin "N iz" toast sayımı bunu okuyor), `bulunmayan_izler` yine
    // ayrı döner. Beş hanenin tamamı yalnızca tabloya yazılır.
    const findings = persistedFindings.filter((f: any) => f.var_mi);
    const bulunmayan_izler = persistedFindings
      .filter((f: any) => !f.var_mi)
      .map((f: any) => ({ iz_tipi: f.iz_tipi, yok_gerekcesi: f.yok_gerekcesi }));

    await step("keşif soruları üretiliyor");

    // Her soru bir boşluğa bağlı olmalı: boşluğu yazılmayan soru elenir, en fazla 3 tutulur.
    const rawQuestions = Array.isArray(parsed?.discovery_questions) ? parsed.discovery_questions : [];
    const discovery_questions = rawQuestions
      .map((q: any) => ({
        soru: String(q?.soru ?? "").trim().slice(0, 500),
        hangi_boslugu_kapatir: String(q?.hangi_boslugu_kapatir ?? "").trim().slice(0, 500),
      }))
      .filter((q: any) => q.soru && q.hangi_boslugu_kapatir)
      .slice(0, 3);

    const droppedQuestions = rawQuestions.length - discovery_questions.length;
    console.log(
      `[party-communication-analysis] case=${case_id} party=${party_id} bağlam=${contextBlocks.length} krk | hane=${perType.length}/5 | iz=${findings.length} | yok=${bulunmayan_izler.length} | soru=${discovery_questions.length}` +
      (droppedQuestions > 0 ? ` | boşluğu yazılmayan ${droppedQuestions} soru elendi` : "")
    );

    await step("kayıt");

    // Yazma best-effort: bu satır yazılamazsa bile cevap döner, ana akış durmaz.
    // Başka hiçbir tabloya yazılmaz.
    let persisted = true;
    try {
      const { error: upsertErr } = await admin.from("party_communication_analysis")
        .upsert(
          { case_id, party_id, findings: persistedFindings, discovery_questions, updated_at: new Date().toISOString() },
          { onConflict: "case_id,party_id" },
        );
      if (upsertErr) throw upsertErr;
    } catch (e: any) {
      persisted = false;
      console.error(`[party-communication-analysis] party_communication_analysis yazımı başarısız: ${e?.message ?? String(e)}`);
    }

    await writeState(
      persisted
        ? { status: "completed", error_message: null }
        : { status: "failed", error_message: "party_communication_analysis yazılamadı" }
    );

    return new Response(JSON.stringify({ findings, bulunmayan_izler, discovery_questions, persisted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[party-communication-analysis] Function error:", e);
    await writeState({ status: "failed", error_message: String(e?.message ?? e).slice(0, 300) });
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Deterministic citation guard (no extra AI call, no schema change). Copied
// verbatim from party-consistency-check/index.ts — this repo has no _shared/
// module between edge functions, so each function stays self-contained.
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
      `[party-communication-analysis] citation guard: ${stats.removed} inline künye temizlendi, ${stats.precedentsDropped} precedent kaydı bağlamda doğrulanamadığı için silindi`
    );
  }

  return sanitized;
}
