// Mediator-only: combine both party analyses → common ground + strategy
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// Provided by the Supabase Edge Runtime; lets background writes (agent_states) finish
// after the response is sent instead of a bare fire-and-forget that may get cut off.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Activity-log upsert for the Agent Control Panel. Status-only — never store analysis
// content here; failures here must never block the main flow, so every call site
// wraps this in its own try-catch.
async function upsertAgentActivityState(
  admin: ReturnType<typeof createClient>,
  case_id: string,
  agent_type: string,
  party_id: string | null,
  patch: Record<string, unknown>,
) {
  let query = admin.from("agent_states").select("id").eq("case_id", case_id).eq("agent_type", agent_type);
  query = party_id ? query.eq("party_id", party_id) : query.is("party_id", null);
  const { data: existing } = await query.maybeSingle();
  if (existing?.id) {
    await admin.from("agent_states").update(patch).eq("id", existing.id);
  } else {
    await admin.from("agent_states").insert({ case_id, agent_type, party_id, ...patch });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let admin: ReturnType<typeof createClient> | null = null;
  let case_id: string | undefined;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    case_id = body.case_id;
    admin = createClient(supabaseUrl, serviceKey);

    // Only mediator/admin/case owner may run this
    const { data: caseRow } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, dispute_type, dispute_subtype, issue_description, round_number, title")
      .eq("id", case_id).maybeSingle();
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).in("role", ["admin", "mediator"]).maybeSingle();
    const allowed = caseRow && (caseRow.assigned_mediator_id === userData.user.id || caseRow.user_id === userData.user.id || !!roleRow);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Activity log: mark common-ground synthesis as running. Best-effort — never block the flow.
    try {
      await upsertAgentActivityState(admin, case_id!, "common_ground", null, { status: "running" });
    } catch { /* activity log is non-critical */ }

    const { data: analyses } = await admin.from("party_analyses")
      .select("party_id, analysis, discovery_questions, risk_analizi, case_parties:party_id(party_role, first_name, last_name, company_name)")
      .eq("case_id", case_id);

    const { data: discAnswers } = await admin.from("case_discovery_questions")
      .select("party_id, question_text, answer_text").eq("case_id", case_id);

    // Meeting-note AI analyses (phase 7) — same "surface prior analysis as context" pattern as party-confidential-analysis.
    // This function's output is mediator-only, so unlike party-confidential-analysis, private-session notes are
    // included too: the mediator is entitled to see all of their own session notes.
    const { data: noteRows } = await admin.from("case_notes")
      .select("content, created_at").eq("case_id", case_id).eq("phase", 7)
      .order("created_at", { ascending: false });
    let meetingNotesBlock = "";
    if (noteRows && noteRows.length > 0) {
      const usableNotes = noteRows
        .map((n: any) => { try { return JSON.parse(n.content); } catch { return null; } })
        .filter((p: any) => p?.ai && (p.ai.yeni_tespitler?.length || p.ai.degisen_pozisyonlar?.length || p.ai.yeni_strateji));
      if (usableNotes.length > 0) {
        const parts = usableNotes.map((p: any) =>
          `Yeni Tespitler: ${(p.ai.yeni_tespitler ?? []).join("; ") || "-"}\nDeğişen Pozisyonlar: ${(p.ai.degisen_pozisyonlar ?? []).join("; ") || "-"}\nStrateji: ${p.ai.yeni_strateji ?? "-"}`
        ).join("\n\n");
        meetingNotesBlock = `\n═══ GÖRÜŞME NOTLARI ANALİZİ (önceden çıkarılmış arabulucu görüşme notu analizleri) ═══\n${parts}\n═══════════════════════════\n`;
      }
    }

    const systemPrompt = `Sen kıdemli bir Türk arabuluculuk danışmanısın. Tarafların gizli analizlerini okuyup ortak zemin raporu, arabulucu stratejisi ve iki tarafın risk analizlerini karşılaştıran risk_ozeti üretiyorsun.
Eğer "GÖRÜŞME NOTLARI ANALİZİ" bloğu verilmişse, bu bloktaki önceden çıkarılmış tespit/pozisyon/strateji bulgularını ortak zemin (common_interests), senaryolar (scenarios) ve arabulucu stratejisi (mediator_strategy) değerlendirmende dikkate al.
KESİN KURAL: Sabit/uydurma % ASLA verme. Kaynak yoksa "Yeterli veri yok" yaz.
KESİN KURAL (halüsinasyon yasağı): "GÖRÜŞME NOTLARI ANALİZİ" bloğundan yalnızca orada yazılı olan tespit/pozisyon/strateji içeriğinden alıntı/özetleme yap; blokta yer almayan bulgu uydurma.
Çıktı YALNIZCA JSON: {
  "common_interests": [],
  "zopa": {"description":"", "lower_bound":"", "upper_bound":""},
  "scenarios": [
    {"label":"A - Hızlı Çözüm","summary":"","tradeoffs":[]},
    {"label":"B - Dengeli","summary":"","tradeoffs":[]},
    {"label":"C - Yaratıcı","summary":"","tradeoffs":[]}
  ],
  "mediator_strategy": {"opening_statement":"","critical_questions":[],"deadlock_techniques":[]},
  "red_lines": [],
  "risk_ozeti": {
    "genel_uzlasma_orani":"",
    "genel_uzlasma_orani_kaynak":"",
    "genel_risk_puani":"Düşük|Orta|Yüksek",
    "taraf_karsilastirma":[{"taraf":"","risk_puani":"","guclu_yon":"","zayif_yon":""}],
    "ortak_kritik_faktorler":[],
    "ortak_uzlasma_engelleri":[],
    "kaynak_listesi":[],
    "arabulucu_onerisi":""
  }
}`;

    const ragQuery = [caseRow.title, caseRow.dispute_type, caseRow.dispute_subtype, caseRow.issue_description]
      .filter(Boolean).join(" — ");
    const ragCategory = mapDisputeToCategory(caseRow.dispute_type, caseRow.dispute_subtype);
    const { block: ragBlock, sources: ragSources, embedding: queryEmb } = await fetchKnowledgeBlock(admin, apiKey, ragQuery, ragCategory);
    const { block: similarBlock } = await fetchSimilarCases(admin, queryEmb, ragCategory);

    const userPrompt = `BAŞVURU: ${caseRow.title ?? ""} — ${caseRow.dispute_type ?? ""} / ${caseRow.dispute_subtype ?? ""}
ÖZET: ${caseRow.issue_description ?? ""}

TARAF ANALİZLERİ (risk_analizi dahil):
${(analyses ?? []).map((a: any) => `--- ${a.case_parties?.party_role ?? ""} (${a.case_parties?.first_name ?? a.case_parties?.company_name ?? ""}) ---\nanalysis: ${JSON.stringify(a.analysis, null, 2)}\nrisk_analizi: ${JSON.stringify(a.risk_analizi ?? {}, null, 2)}`).join("\n\n")}

İHTİYAÇ TESPİTİ CEVAPLARI:
${(discAnswers ?? []).map((d) => `[Party ${d.party_id?.slice(0, 8)}] Q: ${d.question_text}\nA: ${d.answer_text ?? "(cevap yok)"}`).join("\n")}
${meetingNotesBlock}
${ragBlock}
${similarBlock}
Yukarıdaki resmi kaynaklardan ve benzer geçmiş davalardan yararlanarak ortak zemin raporu ve iki tarafı karşılaştıran risk_ozeti üret; uydurma % verme.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI error", details: t }), { status: aiRes.status, headers: corsHeaders });
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson.choices[0].message.content); } catch { parsed = {}; }
    parsed.sources = ragSources;

    const { data: inserted, error: upErr } = await admin.from("common_ground_reports").upsert({
      case_id, report: parsed, strategy: parsed.mediator_strategy ?? {},
      risk_ozeti: parsed.risk_ozeti ?? null,
      round_number: caseRow.round_number ?? 1,
    }, { onConflict: "case_id,round_number" }).select().maybeSingle();
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: corsHeaders });
    }

    // Activity log: mark completed. Fire via waitUntil so it can't delay the response,
    // and so it still finishes even though the response is about to be sent.
    if (admin && case_id) {
      const finalAdmin = admin, finalCaseId = case_id;
      EdgeRuntime.waitUntil(
        upsertAgentActivityState(finalAdmin, finalCaseId, "common_ground", null, { status: "completed" }).catch(() => {})
      );
    }

    return new Response(JSON.stringify({ report: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    // Activity log: mark failed with a short status summary only — never the report content.
    if (admin && case_id) {
      const finalAdmin = admin, finalCaseId = case_id;
      const errorSummary = String(e?.message ?? "unknown error").slice(0, 300);
      EdgeRuntime.waitUntil(
        upsertAgentActivityState(finalAdmin, finalCaseId, "common_ground", null, { status: "failed", error_message: errorSummary }).catch(() => {})
      );
    }
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});

function mapDisputeToCategory(disputeType?: string | null, subtype?: string | null): string | null {
  const t = `${disputeType ?? ""} ${subtype ?? ""}`.toLowerCase();
  // IP pilotu adım 1: eski slug ("fikri_mülkiyet", classify-dispute çıktısı) ve yeni
  // taksonomi slug'ı ("fikri_mulkiyet", başvuru formu) ile marka/patent/tasarım/telif
  // içeren serbest metin tespitlerini tek bilgi tabanı kategorisinde birleştir.
  if (/fikri|marka|patent|tasarım|tasarim|telif/.test(t)) return "fikri_mulkiyet";
  if (/iş|isci|işçi|işveren|isveren|kıdem|kidem/.test(t)) return "işçi_işveren";
  if (/ticari|ticaret|şirket|sirket/.test(t)) return "ticari";
  if (/tüketici|tuketici/.test(t)) return "tüketici";
  if (/aile|boşan|bosan|nafaka|velayet/.test(t)) return "aile";
  if (/sigorta/.test(t)) return "sigorta";
  if (/sağlık|saglik|malpraktis/.test(t)) return "sağlık";
  if (/inşaat|insaat|yapı|yapi/.test(t)) return "inşaat";
  if (/enerji|maden/.test(t)) return "enerji_maden";
  if (/banka|finans|kredi/.test(t)) return "bankacılık";
  if (/spor/.test(t)) return "spor";
  return null;
}

async function fetchKnowledgeBlock(admin: any, apiKey: string, query: string, category: string | null): Promise<{ block: string; sources: any[]; embedding: number[] | null }> {
  try {
    if (!query || query.trim().length < 10) return { block: "", sources: [], embedding: null };
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query, dimensions: 768 }),
    });
    if (!embRes.ok) return { block: "", sources: [], embedding: null };
    const embJson = await embRes.json();
    const vec = embJson?.data?.[0]?.embedding;
    if (!vec) return { block: "", sources: [], embedding: null };
    const { data } = await admin.rpc("match_knowledge_base", {
      query_embedding: vec, filter_category: category, match_count: 5, match_threshold: 0.65,
    });
    if (!data || data.length === 0) return { block: "", sources: [], embedding: vec };
    const sources = data.map((r: any) => ({
      title: r.source_title,
      url: r.source_url,
      category: r.category,
      excerpt: String(r.chunk_text ?? "").slice(0, 400),
      similarity: r.similarity,
    }));
    const parts = data.map((r: any) =>
      `[Kaynak: ${r.source_title}]\n${r.chunk_text}`
    ).join("\n\n");
    const block = `\n═══ İLGİLİ KAYNAK BİLGİSİ (Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından) ═══\n${parts}\n═══════════════════════════\n`;
    return { block, sources, embedding: vec };
  } catch {
    return { block: "", sources: [], embedding: null };
  }
}

async function fetchSimilarCases(admin: any, embedding: number[] | null, category: string | null): Promise<{ block: string; matches: any[] }> {
  try {
    if (!embedding || !category) return { block: "", matches: [] };
    const { data } = await admin.rpc("match_cases", {
      query_embedding: embedding, match_threshold: 0.7, match_count: 4, filter_niche_area: category,
    });
    if (!data || data.length === 0) return { block: "", matches: [] };
    const parts = data.map((r: any, i: number) =>
      `[Benzer Dava #${i + 1} — benzerlik ${(r.similarity * 100).toFixed(0)}%]\n${String(r.anonymized_text ?? "").slice(0, 800)}`
    ).join("\n\n");
    const block = `\n═══ BENZER GEÇMİŞ DAVALAR (anonimleştirilmiş) ═══\n${parts}\n═══════════════════════════\n`;
    return { block, matches: data };
  } catch {
    return { block: "", matches: [] };
  }
}


