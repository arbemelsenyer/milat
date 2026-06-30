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
    // AuthZ: shared cron secret OR an authenticated admin user
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    let authorized = !!(cronSecret && provided && provided === cronSecret);
    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: u } = await sb.auth.getUser();
        if (u?.user) {
          const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
          const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
          authorized = isAdmin === true;
        }
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      const text: string = row.raw_content ?? "";
      const niche: string = row.niche_area ?? "genel";

      // Stage 1: Gemini Flash pre-filter
      const flash = await aiCall(
        "google/gemini-2.5-flash",
        "Türk hukuku ön elemesi: bu metin gerçek bir Yargıtay/BAM kararı, hukuk doktrini veya mevzuat midir? Sadece 'EVET' veya 'HAYIR: <kısa neden>' döndür.",
        text.slice(0, 6000),
      );
      if (!/^EVET/i.test(flash.trim())) {
        await sb.from("pending_pool").update({
          status: "rejected",
          approved: false,
          rejection_reason: flash.slice(0, 500),
        }).eq("id", row.id);
        rejected++;
        results.push({ id: row.id, stage: "flash", verdict: "rejected" });
        continue;
      }

      // Stage 2: Gemini Pro deep legal review
      const pro = await aiCall(
        "google/gemini-2.5-pro",
        `Derin hukuki inceleme. Uyuşmazlık alanı: ${niche}. Sadece JSON döndür: {"approved": boolean, "summary": string, "keywords": string[], "relevance_score": 0-1, "reason": string}`,
        text.slice(0, 12000),
      );

      let parsed: { approved?: boolean; summary?: string; keywords?: string[]; relevance_score?: number; reason?: string } = {};
      try {
        const m = pro.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : {};
      } catch { parsed = {}; }

      const score = parsed.relevance_score ?? 0;
      if (parsed.approved && score >= 0.6) {
        await sb.from("cases_vector_pool").insert({
          niche_area: niche,
          anonymized_text: parsed.summary ? `${parsed.summary}\n\n---\n${text}` : text,
        });
        await sb.from("pending_pool").update({
          status: "approved",
          approved: true,
          relevance_score: score,
          metadata: { keywords: parsed.keywords ?? [], reason: parsed.reason ?? "" },
        }).eq("id", row.id);
        approved++;
        results.push({ id: row.id, stage: "pro", verdict: "approved", score });
      } else {
        await sb.from("pending_pool").update({
          status: "rejected",
          approved: false,
          relevance_score: score,
          rejection_reason: (parsed.reason ?? "düşük alaka").slice(0, 500),
        }).eq("id", row.id);
        rejected++;
        results.push({ id: row.id, stage: "pro", verdict: "rejected" });
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
