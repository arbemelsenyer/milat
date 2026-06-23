// dual-ai-validate: Reads pending_pool rows, runs Gemini Flash pre-filter,
// then Gemini Pro deep legal review via Lovable AI Gateway, and promotes
// approved items into cases_vector_pool. Invoked by pg_cron nightly at 02:00.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function aiCall(model: string, system: string, user: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`AI ${model} ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: pending, error } = await sb
      .from("pending_pool")
      .select("*")
      .eq("status", "pending")
      .limit(20);
    if (error) throw error;

    let approved = 0, rejected = 0;
    const results: Array<Record<string, unknown>> = [];

    for (const row of pending ?? []) {
      const text: string = (row as any).content ?? (row as any).text ?? JSON.stringify(row);
      const niche: string = (row as any).niche ?? (row as any).alan ?? "genel";

      // Stage 1: Gemini Flash pre-filter
      const flash = await aiCall(
        "google/gemini-2.5-flash",
        "Türk hukuku ön elemesi: bu metin gerçek bir Yargıtay/BAM kararı veya hukuk doktrini midir? Sadece 'EVET' veya 'HAYIR: <kısa neden>' döndür.",
        text.slice(0, 6000),
      );
      if (!/^EVET/i.test(flash.trim())) {
        await sb.from("pending_pool").update({ status: "rejected", review_notes: flash }).eq("id", (row as any).id);
        rejected++;
        results.push({ id: (row as any).id, stage: "flash", verdict: "rejected", reason: flash });
        continue;
      }

      // Stage 2: Gemini Pro deep legal review
      const pro = await aiCall(
        "google/gemini-2.5-pro",
        `Derin hukuki inceleme. Uyuşmazlık alanı: ${niche}. JSON döndür: {"approved": boolean, "summary": string, "keywords": string[], "relevance_score": 0-1, "reason": string}`,
        text.slice(0, 12000),
      );

      let parsed: any = {};
      try {
        const m = pro.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : {};
      } catch { parsed = {}; }

      if (parsed.approved && (parsed.relevance_score ?? 0) >= 0.6) {
        await sb.from("cases_vector_pool").insert({
          source_id: (row as any).id,
          niche,
          summary: parsed.summary ?? "",
          keywords: parsed.keywords ?? [],
          content: text,
          relevance_score: parsed.relevance_score,
        });
        await sb.from("pending_pool").update({ status: "approved", review_notes: parsed.reason ?? "" }).eq("id", (row as any).id);
        approved++;
        results.push({ id: (row as any).id, stage: "pro", verdict: "approved", score: parsed.relevance_score });
      } else {
        await sb.from("pending_pool").update({ status: "rejected", review_notes: parsed.reason ?? "low relevance" }).eq("id", (row as any).id);
        rejected++;
        results.push({ id: (row as any).id, stage: "pro", verdict: "rejected", reason: parsed.reason });
      }
    }

    return new Response(JSON.stringify({ processed: pending?.length ?? 0, approved, rejected, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("dual-ai-validate", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
