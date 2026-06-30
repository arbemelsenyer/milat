// Mediator-only: combine both party analyses → common ground + strategy
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { case_id } = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

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

    const { data: analyses } = await admin.from("party_analyses")
      .select("party_id, analysis, discovery_questions, case_parties:party_id(party_role, first_name, last_name, company_name)")
      .eq("case_id", case_id);

    const { data: discAnswers } = await admin.from("case_discovery_questions")
      .select("party_id, question_text, answer_text").eq("case_id", case_id);

    const systemPrompt = `Sen kıdemli bir Türk arabuluculuk danışmanısın. Tarafların gizli analizlerini okuyup ortak zemin raporu ve arabulucu stratejisi üretiyorsun.
Çıktı YALNIZCA JSON: {
  "common_interests": [],
  "zopa": {"description":"", "lower_bound":"", "upper_bound":""},
  "scenarios": [
    {"label":"A - Hızlı Çözüm","summary":"","tradeoffs":[]},
    {"label":"B - Dengeli","summary":"","tradeoffs":[]},
    {"label":"C - Yaratıcı","summary":"","tradeoffs":[]}
  ],
  "mediator_strategy": {
    "opening_statement": "",
    "critical_questions": [],
    "deadlock_techniques": []
  },
  "red_lines": []
}`;

    const ragQuery = [caseRow.title, caseRow.dispute_type, caseRow.dispute_subtype, caseRow.issue_description]
      .filter(Boolean).join(" — ");
    const ragCategory = mapDisputeToCategory(caseRow.dispute_type, caseRow.dispute_subtype);
    const ragBlock = await fetchKnowledgeBlock(admin, apiKey, ragQuery, ragCategory);

    const userPrompt = `BAŞVURU: ${caseRow.title ?? ""} — ${caseRow.dispute_type ?? ""} / ${caseRow.dispute_subtype ?? ""}
ÖZET: ${caseRow.issue_description ?? ""}

TARAF ANALİZLERİ:
${(analyses ?? []).map((a: any) => `--- ${a.case_parties?.party_role ?? ""} (${a.case_parties?.first_name ?? a.case_parties?.company_name ?? ""}) ---\n${JSON.stringify(a.analysis, null, 2)}`).join("\n\n")}

İHTİYAÇ TESPİTİ CEVAPLARI:
${(discAnswers ?? []).map((d) => `[Party ${d.party_id?.slice(0, 8)}] Q: ${d.question_text}\nA: ${d.answer_text ?? "(cevap yok)"}`).join("\n")}
${ragBlock}
Yukarıdaki resmi kaynaklardan yararlanarak ortak zemin raporu ve arabulucu stratejisi üret; alakalıysa kaynak göster.`;

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

    const { data: inserted, error: upErr } = await admin.from("common_ground_reports").upsert({
      case_id, report: parsed, strategy: parsed.mediator_strategy ?? {},
      round_number: caseRow.round_number ?? 1,
    }, { onConflict: "case_id,round_number" }).select().maybeSingle();
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ report: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});

function mapDisputeToCategory(disputeType?: string | null, subtype?: string | null): string | null {
  const t = `${disputeType ?? ""} ${subtype ?? ""}`.toLowerCase();
  if (/iş|isci|işçi|işveren|isveren|kıdem|kidem/.test(t)) return "işçi_işveren";
  if (/ticari|ticaret|şirket|sirket/.test(t)) return "ticari";
  if (/tüketici|tuketici/.test(t)) return "tüketici";
  if (/aile|boşan|bosan|nafaka|velayet/.test(t)) return "aile";
  if (/sigorta/.test(t)) return "sigorta";
  if (/sağlık|saglik|malpraktis/.test(t)) return "sağlık";
  if (/inşaat|insaat|yapı|yapi/.test(t)) return "inşaat";
  if (/fikri|marka|patent|telif/.test(t)) return "fikri_mülkiyet";
  if (/enerji|maden/.test(t)) return "enerji_maden";
  if (/banka|finans|kredi/.test(t)) return "bankacılık";
  if (/spor/.test(t)) return "spor";
  return null;
}

async function fetchKnowledgeBlock(admin: any, apiKey: string, query: string, category: string | null): Promise<string> {
  try {
    if (!query || query.trim().length < 10) return "";
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query, dimensions: 768 }),
    });
    if (!embRes.ok) return "";
    const embJson = await embRes.json();
    const vec = embJson?.data?.[0]?.embedding;
    if (!vec) return "";
    const { data } = await admin.rpc("match_knowledge_base", {
      query_embedding: vec, filter_category: category, match_count: 5, match_threshold: 0.65,
    });
    if (!data || data.length === 0) return "";
    const parts = data.map((r: any) =>
      `[Kaynak: ${r.source_title}]\n${r.chunk_text}`
    ).join("\n\n");
    return `\n═══ İLGİLİ KAYNAK BİLGİSİ (Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından) ═══\n${parts}\n═══════════════════════════\n`;
  } catch {
    return "";
  }
}

