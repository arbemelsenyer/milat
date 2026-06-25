// Multi-Agent Negotiation Engine (Causa Prima-style)
// Orchestrates 4 AI agents: PartyA, PartyB, Mediator, Validator
// Uses Lovable AI Gateway (server-side) — never expose API key to client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "google/gemini-2.5-flash";

type AgentType = "party_a" | "party_b" | "mediator" | "validator";

async function callAI(systemPrompt: string, userPrompt: string): Promise<{ text: string; confidence: number }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "{}";
  // Heuristic confidence: parse from JSON if present, else 0.8
  let confidence = 0.8;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.confidence === "number") confidence = parsed.confidence;
  } catch {}
  return { text, confidence };
}

async function upsertAgentState(
  supabase: ReturnType<typeof createClient>,
  caseId: string,
  agentType: AgentType,
  patch: Record<string, unknown>,
) {
  // Try update existing; if none, insert
  const { data: existing } = await supabase
    .from("agent_states")
    .select("id")
    .eq("case_id", caseId)
    .eq("agent_type", agentType)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("agent_states").update(patch).eq("id", existing.id);
    return existing.id;
  } else {
    const { data } = await supabase
      .from("agent_states")
      .insert({ case_id: caseId, agent_type: agentType, ...patch })
      .select("id")
      .single();
    return data?.id;
  }
}

const partySystem = (party: "A" | "B") => `Sen Türk hukuku alanında uzman, Taraf ${party}'yi temsil eden bir müzakere ajanısın.
Sana verilen anonimleştirilmiş pozisyon metnini analiz et.
SADECE şu JSON şemasında yanıt ver:
{
  "pozisyonlar": [string],
  "cikarlar": [string],
  "oncelikler": [string],
  "kirmizi_cizgiler": [string],
  "muzakere_esnekligi": "dusuk" | "orta" | "yuksek",
  "ozet": string,
  "confidence": number  // 0..1, kendi analizine güven seviyen
}
Türkçe yanıt ver. Kişisel veri ekleme — sadece anonim pozisyondan çıkarım yap.`;

const mediatorSystem = `Sen tarafsız bir arabuluculuk ajanısın. İki tarafın yapılandırılmış analizini alıp 3 farklı çözüm senaryosu üret.
SADECE şu JSON şemasında yanıt ver:
{
  "ortak_zemin": [string],
  "catismalar": [string],
  "senaryolar": [
    { "tip": "en_hizli", "baslik": string, "aciklama": string, "adimlar": [string], "tahmini_sure": string },
    { "tip": "en_adil", "baslik": string, "aciklama": string, "adimlar": [string], "tahmini_sure": string },
    { "tip": "en_surdurulebilir", "baslik": string, "aciklama": string, "adimlar": [string], "tahmini_sure": string }
  ],
  "confidence": number
}
Türkçe, tarafsız ve kazan-kazan odaklı yaz.`;

const validatorSystem = `Sen Türk mevzuatı ve Yargıtay içtihatlarına hakim bir hukuki doğrulama ajanısın.
Sana verilen senaryoları emsal kararlar ışığında değerlendir.
SADECE şu JSON şemasında yanıt ver:
{
  "dogrulanmis_senaryolar": [
    { "tip": string, "hukuki_dayanak": string, "emsal_referanslar": [string], "risk_seviyesi": "dusuk"|"orta"|"yuksek", "onay": boolean }
  ],
  "elenen_senaryolar": [ { "tip": string, "neden": string } ],
  "genel_degerlendirme": string,
  "confidence": number
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const { case_id, agent, party_a_text, party_b_text } = body as {
      case_id: string;
      agent: AgentType | "all";
      party_a_text?: string;
      party_b_text?: string;
    };

    if (!case_id) return new Response(JSON.stringify({ error: "case_id required" }), { status: 400, headers: corsHeaders });

    // Verify access via RLS-respecting client
    const { data: caseRow, error: caseErr } = await userClient.from("cases").select("id").eq("id", case_id).maybeSingle();
    if (caseErr || !caseRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const runAgent = async (type: AgentType, system: string, user: string) => {
      await upsertAgentState(admin, case_id, type, { status: "running", error_message: null });
      try {
        const { text, confidence } = await callAI(system, user);
        const parsed = JSON.parse(text);
        const flagged = confidence < 0.75;
        await upsertAgentState(admin, case_id, type, {
          status: flagged ? "flagged" : "completed",
          last_output: parsed,
          confidence_score: confidence,
          hallucination_risk: flagged,
        });
        return { type, output: parsed, confidence, flagged };
      } catch (e) {
        await upsertAgentState(admin, case_id, type, {
          status: "failed",
          error_message: String(e),
        });
        throw e;
      }
    };

    const results: Record<string, unknown> = {};

    if (agent === "party_a" || agent === "all") {
      if (!party_a_text) throw new Error("party_a_text required");
      results.party_a = await runAgent("party_a", partySystem("A"), party_a_text);
    }
    if (agent === "party_b" || agent === "all") {
      if (!party_b_text) throw new Error("party_b_text required");
      results.party_b = await runAgent("party_b", partySystem("B"), party_b_text);
    }
    if (agent === "mediator" || agent === "all") {
      const { data: states } = await admin
        .from("agent_states")
        .select("agent_type,last_output")
        .eq("case_id", case_id)
        .in("agent_type", ["party_a", "party_b"]);
      const a = states?.find((s) => s.agent_type === "party_a")?.last_output;
      const b = states?.find((s) => s.agent_type === "party_b")?.last_output;
      if (!a || !b) throw new Error("Both party analyses required before mediator");
      results.mediator = await runAgent(
        "mediator",
        mediatorSystem,
        JSON.stringify({ taraf_a: a, taraf_b: b }),
      );
    }
    if (agent === "validator" || agent === "all") {
      const { data: medState } = await admin
        .from("agent_states")
        .select("last_output")
        .eq("case_id", case_id)
        .eq("agent_type", "mediator")
        .maybeSingle();
      if (!medState?.last_output) throw new Error("Mediator output required before validator");
      results.validator = await runAgent(
        "validator",
        validatorSystem,
        JSON.stringify(medState.last_output),
      );
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
