// Calculate mediation fee using 2026 tarife chunks from knowledge base + Lovable AI
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Invalid session" }, 401);

    const body = await req.json();
    const dispute_value = Number(body.dispute_value ?? 0);
    const session_count = Math.max(1, Number(body.session_count ?? 1));
    const fee_type = String(body.fee_type ?? "anlasma");
    const dispute_type = String(body.dispute_type ?? "");
    if (!["anlasma", "anlasamama", "ihtiyari"].includes(fee_type)) {
      return json({ error: "Geçersiz ücret türü" }, 400);
    }
    if (!Number.isFinite(dispute_value) || dispute_value < 0) {
      return json({ error: "Geçersiz uyuşmazlık değeri" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1) Retrieve 2026 tarife chunks
    const query = `2026 arabuluculuk asgari ücret tarifesi ${fee_type} ${dispute_type} uyuşmazlık değeri ${dispute_value} TL oturum sayısı ${session_count}`;
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query, dimensions: 768 }),
    });
    let chunks: any[] = [];
    if (embRes.ok) {
      const embJson = await embRes.json();
      const vec = embJson?.data?.[0]?.embedding;
      if (vec) {
        const { data } = await admin.rpc("match_knowledge_base", {
          query_embedding: vec, filter_category: "ucret_tarifesi", match_count: 8, match_threshold: 0.3,
        });
        chunks = data ?? [];
      }
    }

    if (chunks.length === 0) {
      return json({
        error: "insufficient_data",
        message: "2026 arabuluculuk ücret tarifesi bilgi tabanında bulunamadı. Lütfen tarifeyi bilgi tabanına yükleyin.",
      }, 422);
    }

    const context = chunks
      .map((c, i) => `[${i + 1}] ${c.source_title ?? ""}\n${c.chunk_text}`)
      .join("\n\n---\n\n");

    // 2) Ask model to compute fee strictly from context
    const prompt = `Aşağıda 2026 Arabuluculuk Asgari Ücret Tarifesinden alıntılar var. Sadece bu alıntılara dayanarak ücreti hesapla. Uydurma. Alıntılarda kesin bir hesaplama için yeterli veri yoksa "insufficient_data": true döndür.

Girdiler:
- Uyuşmazlık değeri: ${dispute_value.toLocaleString("tr-TR")} TL
- Oturum sayısı: ${session_count}
- Sonuç türü: ${fee_type} (anlasma=anlaşma, anlasamama=anlaşamama, ihtiyari=ihtiyari arabuluculuk)
- Uyuşmazlık konusu: ${dispute_type || "belirtilmedi"}

Tarife alıntıları:
${context}

Yalnızca şu JSON şemasında yanıt ver (başka metin yok):
{
  "insufficient_data": boolean,
  "baz_ucret": number,
  "ek_oturum_ucreti": number,
  "toplam_ucret": number,
  "kdv": number,
  "genel_toplam": number,
  "tarife_maddesi": string,
  "aciklama": string
}
Notlar: KDV oranı %20'dir. toplam_ucret = baz_ucret + ek_oturum_ucreti. kdv = toplam_ucret * 0.20. genel_toplam = toplam_ucret + kdv. Tüm rakamlar TL cinsinden, ondalıklı olabilir.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Sen bir Türk arabuluculuk ücreti hesaplama uzmanısın. Sadece verilen tarife alıntılarına dayanarak hesaplama yaparsın." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: "AI hesaplama başarısız", detail: t }, 502);
    }
    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = null; }
    if (!parsed || typeof parsed !== "object") {
      return json({ error: "AI yanıtı çözümlenemedi" }, 502);
    }
    if (parsed.insufficient_data) {
      return json({ error: "insufficient_data", message: parsed.aciklama || "Yeterli veri yok" }, 422);
    }

    // Recompute totals defensively
    const baz = Number(parsed.baz_ucret ?? 0);
    const ek = Number(parsed.ek_oturum_ucreti ?? 0);
    const toplam = Number.isFinite(parsed.toplam_ucret) ? Number(parsed.toplam_ucret) : baz + ek;
    const kdv = Math.round(toplam * 0.20 * 100) / 100;
    const genel = Math.round((toplam + kdv) * 100) / 100;

    return json({
      baz_ucret: baz,
      ek_oturum_ucreti: ek,
      toplam_ucret: toplam,
      kdv,
      genel_toplam: genel,
      tarife_maddesi: String(parsed.tarife_maddesi ?? ""),
      aciklama: String(parsed.aciklama ?? ""),
      sources: chunks.map((c: any) => ({ title: c.source_title, url: c.source_url })),
    });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
