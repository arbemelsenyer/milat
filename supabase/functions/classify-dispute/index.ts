// Classify dispute type via Gemini using RAG context from knowledge_base_chunks.
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

const ALLOWED = [
  "işçi_işveren", "ticari", "tüketici", "sağlık", "fikri_mülkiyet",
  "inşaat", "sigorta", "bankacılık", "aile", "spor", "enerji_maden",
  "kira", "gayrimenkul", "genel",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let admin: ReturnType<typeof createClient> | null = null;
  let case_id: string | undefined;

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

    const body = await req.json();
    case_id = body.case_id;
    const { text, persist } = body;
    const query = String(text ?? "").trim();
    if (query.length < 5) {
      return new Response(JSON.stringify({ error: "Metin çok kısa" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    admin = createClient(supabaseUrl, serviceKey);

    // Authorize case access when persisting
    if (case_id && persist) {
      const { data: ok } = await admin.rpc("can_access_case", { _case_id: case_id, _user_id: userData.user.id });
      if (!ok) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Activity log: mark classification as running. Only when tied to a case; best-effort.
    if (case_id) {
      try {
        await upsertAgentActivityState(admin, case_id, "classify_dispute", null, { status: "running" });
      } catch { /* activity log is non-critical */ }
    }

    // RAG: fetch related chunks (no category filter — this IS the classification step)
    let ragBlock = "";
    try {
      const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query, dimensions: 768 }),
      });
      if (embRes.ok) {
        const embJson = await embRes.json();
        const vec = embJson?.data?.[0]?.embedding;
        if (vec) {
          const { data } = await admin.rpc("match_knowledge_base", {
            query_embedding: vec, filter_category: null, match_count: 6, match_threshold: 0.6,
          });
          if (Array.isArray(data) && data.length > 0) {
            ragBlock = "\n═══ İLGİLİ KAYNAKLAR ═══\n" + data.map((r: any) =>
              `[${r.category ?? "genel"} · ${r.source_title}]\n${String(r.chunk_text ?? "").slice(0, 500)}`
            ).join("\n\n") + "\n═══════════════════════\n";
          }
        }
      }
    } catch (_) { /* rag optional */ }

    const systemPrompt = `Sen bir Türk hukuku sınıflandırma asistanısın.
Verilen uyuşmazlık metnini knowledge_base_chunks tablosundaki kaynaklara ve Türk hukuku bilgine dayanarak analiz et.
SADECE şu kategorilerden birini seç:
işçi_işveren | ticari | tüketici | sağlık | fikri_mülkiyet | inşaat | sigorta | bankacılık | aile | spor | enerji_maden | kira | gayrimenkul | genel

JSON formatında döndür:
{
  "kategori": "...",
  "guven_skoru": 0-100,
  "gerekce": "1-2 cümle Türkçe",
  "ilgili_kanun": ["gerçek kanun adları"]
}

KURALLAR:
- Uydurma kanun maddesi yazma. Sadece bilinen mevzuat (6098, 6325, 4857, 6502, 6100, 5510, 6098/Kira, HMK, TTK, TBK vb.) referans ver.
- Emin değilsen guven_skoru 50 altı ver.
- Emin değilsen "genel" seç.
- Yanıtın YALNIZCA geçerli JSON olmalı, başka metin yok.`;

    const userPrompt = `UYUŞMAZLIK METNİ:\n${query}\n${ragBlock}`;

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
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    let kategori = String(parsed?.kategori ?? "").trim();
    if (!ALLOWED.includes(kategori)) kategori = "genel";
    const guven = Math.max(0, Math.min(100, Number(parsed?.guven_skoru ?? 0) || 0));
    const gerekce = String(parsed?.gerekce ?? "").slice(0, 500);
    const ilgili_kanun = Array.isArray(parsed?.ilgili_kanun)
      ? parsed.ilgili_kanun.map((x: any) => String(x)).slice(0, 10)
      : [];

    const result = { kategori, guven_skoru: guven, gerekce, ilgili_kanun };

    if (case_id && persist) {
      await admin.from("cases").update({ dispute_type: kategori } as any).eq("id", case_id);
    }

    // Activity log: mark completed. Fire via waitUntil so it can't delay the response,
    // and so it still finishes even though the response is about to be sent.
    if (admin && case_id) {
      const finalAdmin = admin, finalCaseId = case_id;
      EdgeRuntime.waitUntil(
        upsertAgentActivityState(finalAdmin, finalCaseId, "classify_dispute", null, { status: "completed" }).catch(() => {})
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    // Activity log: mark failed with a short status summary only — never the classification content.
    if (admin && case_id) {
      const finalAdmin = admin, finalCaseId = case_id;
      const errorSummary = String(e?.message ?? "unknown error").slice(0, 300);
      EdgeRuntime.waitUntil(
        upsertAgentActivityState(finalAdmin, finalCaseId, "classify_dispute", null, { status: "failed", error_message: errorSummary }).catch(() => {})
      );
    }
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
