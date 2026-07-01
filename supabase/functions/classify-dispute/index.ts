// Classify dispute type via Gemini using RAG context from knowledge_base_chunks.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED = [
  "işçi_işveren", "ticari", "tüketici", "sağlık", "fikri_mülkiyet",
  "inşaat", "sigorta", "bankacılık", "aile", "spor", "enerji_maden",
  "kira", "gayrimenkul", "genel",
];

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

    const { case_id, text, persist } = await req.json();
    const query = String(text ?? "").trim();
    if (query.length < 5) {
      return new Response(JSON.stringify({ error: "Metin çok kısa" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Authorize case access when persisting
    if (case_id && persist) {
      const { data: ok } = await admin.rpc("can_access_case", { _case_id: case_id, _user_id: userData.user.id });
      if (!ok) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
