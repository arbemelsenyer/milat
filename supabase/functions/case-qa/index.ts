// Mediator-only: free-form Q&A grounded ONLY in this case's own records.
// Read-only by design — this function writes to NO table (not even agent_states):
// it is a query tool, not an agent run. No RAG / knowledge-base call either (V1 scope).
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

// Belge içerik bütçesi — party-confidential-analysis/index.ts kalıbının aynısı.
const PER_DOC_CHAR_BUDGET = 6_000;
const TOTAL_CHAR_BUDGET = 24_000;
// Diğer blok sınırları: tek prompt'a sığması için üst sınır.
const MAX_ANALYSIS_CHARS_PER_PARTY = 5_000;
const MAX_COMMON_GROUND_CHARS = 5_000;
const MAX_WORKLOG_CHARS = 3_000;
const MAX_NOTES_CHARS = 3_000;
const MAX_QUESTION_CHARS = 2_000;

// Uzun JSON alanlarını sınır içinde tutar; kırpıldığında bunu açıkça belirtir ki
// model eksik veriyi tam veri sanmasın.
function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n…(bu kayıt karakter bütçesi nedeniyle kırpıldı)`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const case_id: string | undefined = body?.case_id;
    const question = String(body?.question ?? "").trim();
    if (!case_id || !question) {
      return new Response(JSON.stringify({ error: "case_id and question required" }), { status: 400, headers: corsHeaders });
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return new Response(JSON.stringify({ error: `Soru en fazla ${MAX_QUESTION_CHARS} karakter olabilir.` }), {
        status: 400, headers: corsHeaders,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // ── YETKİ: sunucu tarafı asıl sınır. Bu ekran MEDIATOR_ONLY — cevap üretiminde
    // taraf-gizli veriler (party_analyses, common_ground_reports) kullanıldığından
    // party-confidential-analysis'teki "taraf kendi analizini çağırabilir" gevşetmesi
    // burada BİLEREK yok: yalnızca atanmış arabulucu, dosya sahibi veya admin.
    const { data: caseRow } = await admin.from("cases")
      .select(
        "id, user_id, assigned_mediator_id, title, issue_description, dispute_type, dispute_subtype, " +
        "current_phase, status, agreement_terms, ai_summary, application_no, application_date, " +
        "deadline_total, deadline_extended, deadline_sources, legal_duration_days, extension_days, " +
        "legal_basis, mahkeme_turu, deadline_conflict_note, extension_used, sure_hafta, uzatma_hafta"
      )
      .eq("id", case_id).maybeSingle();
    if (!caseRow) {
      return new Response(JSON.stringify({ error: "Case not found" }), { status: 404, headers: corsHeaders });
    }
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    const allowed = caseRow.assigned_mediator_id === userData.user.id
      || caseRow.user_id === userData.user.id
      || !!roleRow;
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // ── BAĞLAM: hepsi service-role okuması, hiçbir yazma yok.
    // Her bloğun başında tablo adı, her kaydın başında kayit_id var — model
    // sources dizisinde tam olarak bu iki değeri kullanacak.

    // 1) cases
    const caseBlock = `\n═══ TABLO: cases — DOSYA KÜNYESİ VE SÜRELER ═══
[kayit_id: ${caseRow.id}]
Başvuru No: ${caseRow.application_no ?? "-"} | Başvuru Tarihi: ${caseRow.application_date ?? "-"}
Başlık: ${caseRow.title ?? "-"}
Uyuşmazlık: ${caseRow.dispute_type ?? "-"} / ${caseRow.dispute_subtype ?? "-"}
Aşama: ${caseRow.current_phase ?? "-"} | Durum: ${caseRow.status ?? "-"}
Konu Özeti: ${caseRow.issue_description ?? "-"}
Anlaşma Şartları: ${caseRow.agreement_terms ?? "-"}
AI Özeti: ${caseRow.ai_summary ? clip(JSON.stringify(caseRow.ai_summary), 2_000) : "-"}
--- SÜRELER ---
Yasal süre (gün): ${caseRow.legal_duration_days ?? "-"} | Uzatma (gün): ${caseRow.extension_days ?? "-"} | Uzatma kullanıldı: ${caseRow.extension_used ? "evet" : "hayır"}
Süre (hafta): ${caseRow.sure_hafta ?? "-"} | Uzatma (hafta): ${caseRow.uzatma_hafta ?? "-"}
Süre sonu: ${caseRow.deadline_total ?? "-"} | Uzatılmış süre sonu: ${caseRow.deadline_extended ?? "-"}
Yasal dayanak: ${caseRow.legal_basis ?? "-"} | Mahkeme türü: ${caseRow.mahkeme_turu ?? "-"}
Süre çakışma notu: ${caseRow.deadline_conflict_note ?? "-"}
Süre kaynakları: ${Array.isArray(caseRow.deadline_sources) ? caseRow.deadline_sources.join(" · ") : (caseRow.deadline_sources ?? "-")}
═══════════════════════════\n`;

    // 2) case_parties
    const { data: parties } = await admin.from("case_parties")
      .select("id, party_role, role, party_type, first_name, last_name, company_name, organization, statement, invite_status")
      .eq("case_id", case_id);
    const partiesBlock = (parties ?? []).length > 0
      ? `\n═══ TABLO: case_parties — TARAFLAR VE BEYANLARI ═══\n${(parties ?? []).map((p: any) => {
          const ad = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.company_name || p.organization || "(isim yok)";
          return `[kayit_id: ${p.id}] ${p.party_role ?? p.role ?? "-"} — ${ad} (${p.party_type ?? "-"}, davet: ${p.invite_status ?? "-"})\nBeyan: ${p.statement ? clip(String(p.statement), 4_000) : "(beyan yok)"}`;
        }).join("\n\n")}\n═══════════════════════════\n`
      : "";

    // 3) case_documents — belge metni bütçesi (party-confidential-analysis kalıbı):
    // belge başına en fazla 6.000, toplamda en fazla 24.000 karakter; sırayla eklenir,
    // toplam bütçe dolunca kalan belgeler dahil edilmez ve bu tek satır notla bildirilir.
    const { data: docs } = await admin.from("case_documents")
      .select("id, file_name, file_path, mime_type, extracted_text, extraction_status, party_id")
      .eq("case_id", case_id);
    let docExcerpts = "";
    let totalUsed = 0;
    let fullCount = 0, truncatedCount = 0, notIncludedCount = 0;
    for (const d of (docs ?? []) as any[]) {
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
      docExcerpts += `\n[kayit_id: ${d.id}] --- ${d.file_name} ---\n${slice}\n`;
      totalUsed += slice.length;
      if (slice.length < text.length) truncatedCount++; else fullCount++;
    }
    const docBudgetNote = (docs ?? []).length > 0
      ? `\nNOT (belge içerik bütçesi): ${(docs ?? []).length} belgeden ${fullCount} tam, ${truncatedCount} kırpılarak, ${notIncludedCount} dahil edilemeden işlendi. Dahil edilemeyen belgeler hakkında soru sorulursa cevap uydurma.`
      : "";
    const docsBlock = docExcerpts
      ? `\n═══ TABLO: case_documents — BELGE METİNLERİ ═══${docExcerpts}${docBudgetNote}\n═══════════════════════════\n`
      : ((docs ?? []).length > 0 ? `\n═══ TABLO: case_documents — BELGE METİNLERİ ═══\n(okunabilir belge metni yok)${docBudgetNote}\n═══════════════════════════\n` : "");

    // 4) party_analyses — taraf-gizli. Bu blok bu ekranın MEDIATOR_ONLY olmasının nedeni.
    const { data: analyses } = await admin.from("party_analyses")
      .select("id, party_id, analysis, risk_analizi, discovery_questions, round_number")
      .eq("case_id", case_id);
    const analysesBlock = (analyses ?? []).length > 0
      ? `\n═══ TABLO: party_analyses — TARAF GİZLİ ANALİZLERİ (yalnız arabulucuya) ═══\n${(analyses ?? []).map((a: any) => {
          const raw = `analysis: ${JSON.stringify(a.analysis ?? {}, null, 2)}\nrisk_analizi: ${JSON.stringify(a.risk_analizi ?? {}, null, 2)}\ndiscovery_questions: ${JSON.stringify(a.discovery_questions ?? [], null, 2)}`;
          return `[kayit_id: ${a.id}] (party_id: ${a.party_id}, tur: ${a.round_number ?? 1})\n${clip(raw, MAX_ANALYSIS_CHARS_PER_PARTY)}`;
        }).join("\n\n")}\n═══════════════════════════\n`
      : "";

    // 5) common_ground_reports
    const { data: cgRows } = await admin.from("common_ground_reports")
      .select("id, report, strategy, round_number")
      .eq("case_id", case_id).order("round_number", { ascending: false }).limit(1);
    const cg = (cgRows ?? [])[0] as any;
    const commonGroundBlock = cg
      ? `\n═══ TABLO: common_ground_reports — ORTAK ZEMİN RAPORU ═══\n[kayit_id: ${cg.id}] (tur: ${cg.round_number ?? 1})\n${clip(`report: ${JSON.stringify(cg.report ?? {}, null, 2)}\nstrategy: ${JSON.stringify(cg.strategy ?? {}, null, 2)}`, MAX_COMMON_GROUND_CHARS)}\n═══════════════════════════\n`
      : "";

    // 6) case_discovery_questions
    const { data: discRows } = await admin.from("case_discovery_questions")
      .select("id, party_id, question_text, answer_text, detected_need")
      .eq("case_id", case_id).order("question_order", { ascending: true });
    const discoveryBlock = (discRows ?? []).length > 0
      ? `\n═══ TABLO: case_discovery_questions — İHTİYAÇ TESPİTİ SORU/CEVAPLARI ═══\n${(discRows ?? []).map((d: any) =>
          `[kayit_id: ${d.id}] (party_id: ${d.party_id ?? "-"})\nS: ${d.question_text}\nC: ${d.answer_text ?? "(cevap yok)"}\nTespit edilen ihtiyaç: ${d.detected_need ?? "-"}`
        ).join("\n\n")}\n═══════════════════════════\n`
      : "";

    // 7) agent_worklog (entry_type='rapor_disi') — common-ground-report kalıbı: bu okuma
    // hiçbir koşulda ana akışı bozmamalı, bu yüzden kendi try-catch'i içinde.
    let worklogBlock = "";
    try {
      const { data: worklogRows } = await admin.from("agent_worklog")
        .select("id, content, agent_type, created_at")
        .eq("case_id", case_id).eq("entry_type", "rapor_disi")
        .order("created_at", { ascending: false })
        .limit(20);
      if (Array.isArray(worklogRows) && worklogRows.length > 0) {
        let used = 0;
        const lines: string[] = [];
        for (const row of worklogRows as any[]) {
          const c = row.content ?? {};
          const husus = String(c.husus ?? "").trim();
          const kategori = String(c.kategori ?? "").trim();
          const neden = String(c.neden_rapora_girmedi ?? "").trim();
          const adim = String(c.onerilen_adim ?? "").trim();
          if (!husus && !neden && !adim) continue;
          // created_at DESC ile çekildiği için sırayla eklemek en yeni kayıtları
          // önceliklendiriyor; bütçe dolunca kalan (daha eski) kayıtlar atlanır.
          const line = `[kayit_id: ${row.id}] [${kategori || "kategori yok"}] ${husus || "(husus belirtilmemiş)"} — Neden: ${neden || "-"} — Önerilen adım: ${adim || "-"}`;
          if (used + line.length > MAX_WORKLOG_CHARS) break;
          lines.push(line);
          used += line.length;
        }
        if (lines.length > 0) {
          worklogBlock = `\n═══ TABLO: agent_worklog — AJAN DEFTERİ (rapora girmeyen değerlendirmeler) ═══\n${lines.join("\n")}\n═══════════════════════════\n`;
        }
      }
    } catch (e: any) {
      console.error(`[case-qa] agent_worklog okuma başarısız (yoksayıldı): ${e?.message ?? String(e)}`);
    }

    // 8) case_notes
    const { data: noteRows } = await admin.from("case_notes")
      .select("id, content, phase, created_at")
      .eq("case_id", case_id).order("created_at", { ascending: false }).limit(30);
    let notesBlock = "";
    if ((noteRows ?? []).length > 0) {
      let used = 0;
      const parts: string[] = [];
      for (const n of (noteRows ?? []) as any[]) {
        const text = String(n.content ?? "").trim();
        if (!text) continue;
        const line = `[kayit_id: ${n.id}] (aşama: ${n.phase ?? "-"}, tarih: ${String(n.created_at ?? "").slice(0, 10)})\n${text}`;
        if (used + line.length > MAX_NOTES_CHARS) break;
        parts.push(line);
        used += line.length;
      }
      if (parts.length > 0) {
        notesBlock = `\n═══ TABLO: case_notes — DOSYA NOTLARI ═══\n${parts.join("\n\n")}\n═══════════════════════════\n`;
      }
    }

    const contextBlocks = [
      caseBlock, partiesBlock, docsBlock, analysesBlock,
      commonGroundBlock, discoveryBlock, worklogBlock, notesBlock,
    ].filter(Boolean).join("");

    const systemPrompt = `Sen bir arabuluculuk dosyası asistanısın. Cevabı YALNIZ aşağıdaki dosya kayıtlarından ver.
Her iddianın kaynağını sources dizisinde belirt: tablo + kayit_id + cevabı destekleyen KISA birebir alıntı (alıntı, kayıtta geçtiği haliyle olmalı, en fazla 200 karakter).
Kayıtlarda cevap yoksa answer alanına kibarca "bu dosyanın kayıtlarında bu sorunun cevabı yok" yaz ve insufficient:true döndür — TAHMİN YASAK, genel hukuk bilgisi verme, dosya dışına çıkma.
Cevap dili Türkçe, arabulucuya hitaben, kısa ve net.
Çıktı YALNIZCA şu JSON: {
  "answer": "",
  "sources": [{"tablo":"", "kayit_id":"", "alinti":""}],
  "insufficient": false
}`;

    const userPrompt = `DOSYA KAYITLARI:
${contextBlocks}
ARABULUCUNUN SORUSU:
${question}

Yukarıdaki kayıtlara dayanarak cevapla; kayıtlarda karşılığı olmayan hiçbir bilgiyi ekleme.`;

    // ── MODEL KAPISI (üç kademe): (1) OPENAI_API_KEY varsa ÖNCE doğrudan OpenAI —
    // build-knowledge-base/index.ts gömme hattıyla AYNI secret adı; (2) düşerse
    // GEMINI_API_KEY ile doğrudan Google model listesi; (3) o da düşerse MEVCUT
    // Lovable gateway yedeği. Bu noktadan sonrası (JSON parse + sanitizer + şema
    // güvencesi) üç yolda da AYNI.
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
            console.log(`[case-qa] Sağlayıcı: OpenAI — model: ${OPENAI_MODEL}`);
          } else {
            console.error(`[case-qa] OpenAI (${OPENAI_MODEL}) boş yanıt döndürdü — Google'a düşülüyor.`);
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
          console.error("[case-qa] OpenAI error:", oRes.status, shortMsg);
          openaiFail = {
            status: code === "insufficient_quota" ? 402 : oRes.status,
            shortMsg: `${OPENAI_MODEL}: ${shortMsg}`,
          };
        }
      } catch (e: any) {
        const msg = redact(e?.message ?? String(e)).slice(0, 120);
        console.error(`[case-qa] OpenAI çağrısı başarısız: ${msg}`);
        openaiFail = { status: 502, shortMsg: `${OPENAI_MODEL}: ${msg}` };
      }
    }

    if (rawContent === null && geminiKey) {
      // Anahtar yalnız env'den okunur; log ve cevap gövdelerinden temizlenir.
      const redact = (s: string) => s.split(geminiKey).join("***");
      // Model adları hesaplarda/bölgelerde farklılaşabildiği için sıralı denenir:
      // 404 (model yok) veya 400 (istek/model reddi) alınırsa sıradaki denenir,
      // ilk başarılı cevapta durulur. Diğer kodlarda (429/403/5xx) denemeye devam
      // etmenin anlamı yok — doğrudan gateway yedeğine düşülür.
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
              console.log(`[case-qa] Sağlayıcı: Google — model: ${model}`);
              break;
            }
            console.error(`[case-qa] Google (${model}) boş yanıt döndürdü — sıradaki model deneniyor.`);
            googleFail = { status: 502, shortMsg: `${model} boş yanıt döndürdü` };
            continue;
          }
          const bodyText = redact(await gRes.text());
          let shortMsg = bodyText.replace(/\s+/g, " ").trim().slice(0, 120);
          try { shortMsg = String(JSON.parse(bodyText)?.error?.message ?? shortMsg).slice(0, 120); } catch { /* düz metin */ }
          console.error(`[case-qa] Google (${model}) error:`, gRes.status, shortMsg);
          googleFail = { status: gRes.status, shortMsg: `${model}: ${shortMsg}` };
          if (gRes.status === 404 || gRes.status === 400) continue;
          break;
        } catch (e: any) {
          const msg = redact(e?.message ?? String(e)).slice(0, 120);
          console.error(`[case-qa] Google (${model}) çağrısı başarısız: ${msg}`);
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
        console.error("[case-qa] Gateway error:", aiRes.status, errText.slice(0, 300));
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
        return new Response(JSON.stringify({ error: userMsg, detail: errText }), {
          status: openaiFail?.status ?? googleFail?.status ?? aiRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiJson = await aiRes.json();
      rawContent = aiJson.choices?.[0]?.message?.content ?? "{}";
      console.log("[case-qa] Sağlayıcı: Lovable gateway — model: google/gemini-2.5-flash");
    }

    let parsed: any = {};
    try { parsed = JSON.parse(rawContent ?? "{}"); } catch { parsed = {}; }

    // Deterministic citation guard: bağlamda birebir geçmeyen künyeleri temizler.
    parsed = sanitizeCitationHallucinations(parsed, contextBlocks);

    // Şema güvencesi: model alanları eksik/yanlış tipte döndürürse istemci kırılmasın.
    const answer = typeof parsed.answer === "string" && parsed.answer.trim()
      ? parsed.answer.trim()
      : "Bu dosyanın kayıtlarında bu sorunun cevabı yok.";
    const sources = Array.isArray(parsed.sources)
      ? parsed.sources
          .filter((s: any) => s && (s.tablo || s.kayit_id))
          .map((s: any) => ({
            tablo: String(s.tablo ?? ""),
            kayit_id: String(s.kayit_id ?? ""),
            alinti: String(s.alinti ?? "").slice(0, 400),
          }))
      : [];
    const insufficient = typeof parsed.insufficient === "boolean" ? parsed.insufficient : sources.length === 0;

    console.log(`[case-qa] case=${case_id} bağlam=${contextBlocks.length} krk | kaynak=${sources.length} | insufficient=${insufficient}`);

    // Bu fonksiyon hiçbir tabloya YAZMAZ — sorgu aracıdır, ajan koşusu değildir.
    // Cevap insana gidiyor: ortak sınır süzgecinden geçer.
    const guvenliCevap = sinirdanGecir(answer, "case-qa");
    return new Response(JSON.stringify({ answer: guvenliCevap, sources, insufficient }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[case-qa] Function error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: corsHeaders });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Deterministic citation guard (no extra AI call, no schema change). Copied
// verbatim from common-ground-report/index.ts — this repo has no _shared/
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
      `[case-qa] citation guard: ${stats.removed} inline künye temizlendi, ${stats.precedentsDropped} precedent kaydı bağlamda doğrulanamadığı için silindi`
    );
  }

  return sanitized;
}
