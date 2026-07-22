import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAi(messages: any[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (!resp.ok) throw new Error(`AI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { newNote, priorNotes = [], priorAnalyses = [], caseSummary = "", case_id } = await req.json();
    if (!newNote || typeof newNote !== "string") {
      return new Response(JSON.stringify({ error: "newNote required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!case_id) {
      return new Response(JSON.stringify({ error: "case_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: caseRow } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id").eq("id", case_id).maybeSingle();
    if (!caseRow) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    const allowed = caseRow.assigned_mediator_id === userData.user.id
      || caseRow.user_id === userData.user.id
      || !!roleRow;
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Sen deneyimli bir arabuluculuk asistanısın. Görüşme notlarını analiz eder ve arabulucuya
yardımcı içgörüler üretirsin. YALNIZCA geçerli JSON döndür — markdown fence yok. Şema:
{
  "yeni_tespitler": ["..."],
  "degisen_pozisyonlar": ["..."],
  "guncellenmis_oneriler": ["..."],
  "yeni_strateji": "..."
}`;

    const user = `DOSYA ÖZETİ:\n${caseSummary || "(yok)"}\n\nÖNCEKI NOTLAR:\n${priorNotes.slice(-5).join("\n---\n") || "(yok)"}\n\nÖNCEKI AI ANALİZLERİ:\n${priorAnalyses.slice(-3).map((a: any) => typeof a === "string" ? a : JSON.stringify(a)).join("\n---\n") || "(yok)"}\n\nYENİ GÖRÜŞME NOTU:\n${newNote}\n\nGörev: Yukarıdaki bilgilerle taraf pozisyonlarındaki değişimi, yeni tespit edilen ihtiyaçları, güncellenmiş çözüm önerilerini ve arabulucuya yeni strateji önerisini üret.`;

    const raw = await callAi([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { yeni_strateji: cleaned };
    }
    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
