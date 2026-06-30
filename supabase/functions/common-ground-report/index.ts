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

    const userPrompt = `BAŞVURU: ${caseRow.title ?? ""} — ${caseRow.dispute_type ?? ""} / ${caseRow.dispute_subtype ?? ""}
ÖZET: ${caseRow.issue_description ?? ""}

TARAF ANALİZLERİ:
${(analyses ?? []).map((a: any) => `--- ${a.case_parties?.party_role ?? ""} (${a.case_parties?.first_name ?? a.case_parties?.company_name ?? ""}) ---\n${JSON.stringify(a.analysis, null, 2)}`).join("\n\n")}

İHTİYAÇ TESPİTİ CEVAPLARI:
${(discAnswers ?? []).map((d) => `[Party ${d.party_id?.slice(0, 8)}] Q: ${d.question_text}\nA: ${d.answer_text ?? "(cevap yok)"}`).join("\n")}`;

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
