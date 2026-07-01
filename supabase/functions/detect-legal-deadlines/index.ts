// Detects legal mediation deadlines for a case using RAG over knowledge_base_chunks.
// Calls Gemini with retrieved chunks; refuses to fabricate durations.
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

    const { case_id, dispute_type, persist } = await req.json();
    if (!case_id || !dispute_type) {
      return new Response(JSON.stringify({ error: "case_id ve dispute_type gerekli" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: canAccess } = await admin.rpc("can_access_case", {
      _case_id: case_id, _user_id: userData.user.id,
    });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Retrieve knowledge base chunks
    const query = `arabuluculuk süresi hafta gün dava şartı ${dispute_type}`;
    let chunks: any[] = [];
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
          query_embedding: vec, filter_category: null, match_count: 10, match_threshold: 0.5,
        });
        chunks = Array.isArray(data) ? data : [];
      }
    }

    const ragBlock = chunks.length
      ? chunks.map((r: any, i: number) =>
          `[${i + 1}] (${r.category ?? "genel"} · ${r.source_title})\n${String(r.chunk_text ?? "").slice(0, 700)}`
        ).join("\n\n")
      : "(bilgi tabanında ilgili kaynak bulunamadı)";

    const systemPrompt = `Sen bir Türk arabuluculuk hukuku uzmanısın. Sana verilen KAYNAK METİNLERİNE göre soruları cevapla.
KURAL: Sadece verilen metinlere dayan. Metinde açıkça yazmıyorsa "bulunamadı" de, UYDURMA YAPMA.
Emin olmadığın hiçbir sayıyı, kanun maddesini veya bilgiyi verme.`;

    const userPrompt = `Uyuşmazlık türü: ${dispute_type}

KAYNAK METİNLER:
${ragBlock}

Sorular:
1. Bu uyuşmazlık türü dava şartı arabuluculuk mu, ihtiyari mi? Hangi kanunun hangi maddesi düzenliyor?
2. Dava şartıysa: yasal süre kaç hafta/gün? Uzatma hakkı var mı, kaç hafta/gün? Hangi maddeye göre?
3. İhtiyariyse: kanunda üst sınır var mı?
4. Birden fazla kaynakta farklı bilgi varsa çelişkiyi belirt.

YALNIZCA aşağıdaki JSON şemasında yanıt ver (başka metin yok):
{
  "dava_sarti_mi": true | false | null,
  "ilgili_kanun": "kanun adı md. XX" veya "bulunamadı",
  "sure_gun": sayı veya null,
  "uzatma_gun": sayı veya null,
  "aciklama": "1-2 cümle Türkçe açıklama",
  "celiski_var": true | false,
  "celiski_aciklamasi": "varsa açıkla, yoksa boş",
  "kaynak_bulunamadi": true | false,
  "kullanilan_kaynaklar": ["kaynak başlığı 1", "kaynak başlığı 2"]
}`;

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

    const sure = parsed?.sure_gun == null ? null : Math.max(0, Math.min(365, Number(parsed.sure_gun) || 0));
    const uzatma = parsed?.uzatma_gun == null ? null : Math.max(0, Math.min(365, Number(parsed.uzatma_gun) || 0));
    const result = {
      dava_sarti_mi: typeof parsed?.dava_sarti_mi === "boolean" ? parsed.dava_sarti_mi : null,
      ilgili_kanun: String(parsed?.ilgili_kanun ?? "bulunamadı").slice(0, 300),
      sure_gun: sure,
      uzatma_gun: uzatma,
      aciklama: String(parsed?.aciklama ?? "").slice(0, 500),
      celiski_var: !!parsed?.celiski_var,
      celiski_aciklamasi: String(parsed?.celiski_aciklamasi ?? "").slice(0, 500),
      kaynak_bulunamadi: !!parsed?.kaynak_bulunamadi || chunks.length === 0,
      kullanilan_kaynaklar: Array.isArray(parsed?.kullanilan_kaynaklar)
        ? parsed.kullanilan_kaynaklar.map((x: any) => String(x)).slice(0, 15)
        : chunks.map((c) => c.source_title).slice(0, 15),
    };

    if (persist) {
      // Fetch application_date to compute deadline
      const { data: caseRow } = await admin
        .from("cases")
        .select("application_date, created_at")
        .eq("id", case_id)
        .maybeSingle();
      const startIso = caseRow?.application_date ?? caseRow?.created_at ?? new Date().toISOString();
      const start = new Date(startIso);
      const deadline_total = sure != null
        ? new Date(start.getTime() + sure * 86400000).toISOString()
        : null;
      const deadline_extended = (sure != null && uzatma != null && uzatma > 0)
        ? new Date(start.getTime() + (sure + uzatma) * 86400000).toISOString()
        : null;

      await admin.from("cases").update({
        is_mandatory: result.dava_sarti_mi,
        legal_duration_days: sure,
        extension_days: uzatma,
        legal_basis: result.ilgili_kanun,
        deadline_total,
        deadline_extended,
        deadline_sources: result.kullanilan_kaynaklar,
        deadline_conflict: result.celiski_var,
        deadline_conflict_note: result.celiski_aciklamasi,
        deadline_detected_at: new Date().toISOString(),
      } as any).eq("id", case_id);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
