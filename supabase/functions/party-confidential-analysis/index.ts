// Party-confidential analysis: only the party (and mediator via RLS) can see results
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { case_id, party_id } = await req.json();
    if (!case_id || !party_id) {
      return new Response(JSON.stringify({ error: "case_id and party_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is this party
    const { data: party } = await admin
      .from("case_parties").select("id, user_id, case_id, party_role, party_type, first_name, last_name, company_name")
      .eq("id", party_id).eq("case_id", case_id).maybeSingle();
    if (!party || party.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: caseRow } = await admin.from("cases")
      .select("dispute_type, dispute_subtype, issue_description").eq("id", case_id).maybeSingle();

    const { data: docs } = await admin.from("case_documents")
      .select("file_name, analysis_result").eq("case_id", case_id).eq("uploaded_by", userId);

    const partyName = party.party_type === "individual"
      ? `${party.first_name ?? ""} ${party.last_name ?? ""}`.trim()
      : (party.company_name ?? "Taraf");

    const systemPrompt = `Sen bir Türk hukuk arabuluculuk uzmanı AI'sın. SADECE bu tarafın perspektifinden GİZLİ bir analiz hazırlıyorsun. Diğer taraf bunu ASLA göremeyecek. Çıktı JSON: {"strengths":[],"weaknesses":[],"risks":[],"opportunities":[],"precedents":[{"court":"","decision":"","relevance":""}],"discovery_questions":[{"id":1,"question":""}]} — tam 5 ihtiyaç tespiti sorusu üret.`;

    const userPrompt = `DAVA TÜRÜ: ${caseRow?.dispute_type ?? ""} / ${caseRow?.dispute_subtype ?? ""}
TARAF: ${partyName} (rol: ${party.party_role ?? "?"})
UYUŞMAZLIK ÖZETİ: ${caseRow?.issue_description ?? "(belirtilmemiş)"}
YÜKLENEN BELGELER: ${(docs ?? []).map((d) => `- ${d.file_name}`).join("\n") || "(belge yok)"}

Bu tarafın perspektifinden gizli analiz üret. Yargıtay ve BAM emsallerinden somut karar referansları ver.`;

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
      return new Response(JSON.stringify({ error: "AI error", details: t }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    // Upsert the party_analyses row (one per party per round)
    const { data: existing } = await admin.from("party_analyses")
      .select("id").eq("case_id", case_id).eq("party_id", party_id).maybeSingle();

    if (existing) {
      await admin.from("party_analyses").update({
        analysis: parsed,
        discovery_questions: parsed.discovery_questions ?? [],
      }).eq("id", existing.id);
    } else {
      await admin.from("party_analyses").insert({
        case_id, party_id, user_id: userId,
        analysis: parsed,
        discovery_questions: parsed.discovery_questions ?? [],
      });
    }

    // Seed discovery question rows (party-scoped)
    for (const q of parsed.discovery_questions ?? []) {
      const { data: exists } = await admin.from("case_discovery_questions")
        .select("id").eq("case_id", case_id).eq("party_id", party_id)
        .eq("question_order", q.id ?? 0).maybeSingle();
      if (!exists) {
        await admin.from("case_discovery_questions").insert({
          case_id, party_id, user_id: userId,
          question_text: q.question, question_order: q.id ?? 0,
        });
      }
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
