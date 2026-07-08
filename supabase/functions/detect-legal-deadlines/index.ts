// Detects legal mediation deadlines by classifying the court type (tuketici/is/sulh/ticaret/yok)
// using RAG over knowledge_base_chunks + strict rule set. AI does not invent numbers — mapping
// hafta/uzatma is derived from the classified court type.
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

const COURT_RULES: Record<string, { sure_hafta: number | null; uzatma_hafta: number | null; dayanak: string; label: string }> = {
  tuketici: { sure_hafta: 3, uzatma_hafta: 1, dayanak: "TKHK 73/A", label: "Tüketici Mahkemesi" },
  is:       { sure_hafta: 3, uzatma_hafta: 1, dayanak: "7036 sayılı İş Mahkemeleri Kanunu md. 3", label: "İş Mahkemesi" },
  sulh:     { sure_hafta: 3, uzatma_hafta: 1, dayanak: "HUAK 18/B (7445 sayılı Kanun)", label: "Sulh Hukuk Mahkemesi" },
  ticaret:  { sure_hafta: 6, uzatma_hafta: 2, dayanak: "TTK 5/A", label: "Ticaret Mahkemesi" },
  yok:      { sure_hafta: null, uzatma_hafta: null, dayanak: "-", label: "Dava şartı kapsamı dışı" },
};

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
    const { dispute_type, dispute_text, persist } = body;
    if (!case_id || !dispute_type) {
      return new Response(JSON.stringify({ error: "case_id ve dispute_type gerekli" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    admin = createClient(supabaseUrl, serviceKey);
    const { data: canAccess } = await admin.rpc("can_access_case", {
      _case_id: case_id, _user_id: userData.user.id,
    });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Activity log: mark deadline detection as running. Best-effort — never block the flow.
    try {
      await upsertAgentActivityState(admin, case_id, "deadline_detect", null, { status: "running" });
    } catch { /* activity log is non-critical */ }

    // Retrieve RAG context
    const query = `arabuluculuk mahkeme türü tüketici iş sulh ticaret dava şartı ${dispute_type} ${dispute_text ?? ""}`.slice(0, 500);
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
          query_embedding: vec, filter_category: null, match_count: 8, match_threshold: 0.4,
        });
        chunks = Array.isArray(data) ? data : [];
      }
    }
    const ragBlock = chunks.length
      ? chunks.map((r: any, i: number) =>
          `[${i + 1}] (${r.category ?? "genel"} · ${r.source_title})\n${String(r.chunk_text ?? "").slice(0, 600)}`
        ).join("\n\n")
      : "(bilgi tabanında ilgili kaynak bulunamadı)";

    const systemPrompt = `Sen Türk arabuluculuk hukukunda uzman bir sınıflandırıcısın. Uyuşmazlığı SADECE aşağıdaki 5 kategoriden birine ata. UYDURMA YAPMA.

KARAR KURALLARI:
A) tuketici (Tüketici Mahkemesi — 3+1 hafta, TKHK 73/A):
   - Bireysel hasta vs özel doktor/hastane
   - Bireysel kredi kartı, tüketici kredisi, mortgage
   - Bireysel kasko, konut, sağlık sigortası
   - Ayıplı mal/hizmet, e-ticaret, abonelik
   - Tüketici sıfatıyla yapılan işlemler

B) is (İş Mahkemesi — 3+1 hafta, 7036 sayılı Kanun):
   - Kıdem/ihbar tazminatı, fazla mesai
   - İşe iade, mobbing, iş kazası

C) sulh (Sulh Hukuk — 3+1 hafta, HUAK 18/B - 7445 s.K.):
   - Kira ilişkisinden doğan uyuşmazlıklar (ilamsız icra tahliyesi hariç)
   - Ortaklığın giderilmesi (izale-i şüyuu)
   - Kat Mülkiyeti Kanunu uyuşmazlıkları
   - Komşu hakkı

D) ticaret (Ticaret Mahkemesi — 6+2 hafta, TTK 5/A):
   - Ticari kredi, leasing, faktoring, kurumsal banka
   - Ticari sigorta, rücu, kurumsal poliçe
   - İnşaat/yüklenici sözleşmeleri
   - FSMH para/tazminat talebi
   - Spor, enerji, maden sözleşmeleri
   - Ortaklık, bayilik, franchise
   - Hasta vs sigorta şirketi (malpraktis sigortası)

E) yok (Dava şartı kapsamı DIŞINDA):
   - Kamu hastanesi/idare aleyhine malpraktis
   - FSMH hükümsüzlük/iptal/tecavüzün durdurulması (parasal talep yoksa)
   - İdari yargı kapsamındaki uyuşmazlıklar

ÖNEMLİ: Hem tüketici hem ticari unsur varsa → TÜKETİCİ önceliklidir.
Emin değilsen mahkeme_turu=null döndür ve kaynak_bulunamadi=true de.`;

    const userPrompt = `Uyuşmazlık türü etiketi: ${dispute_type}
Uyuşmazlık açıklaması: ${(dispute_text ?? "").slice(0, 800) || "(yok)"}

KAYNAK METİNLER (bilgi tabanı):
${ragBlock}

YALNIZCA aşağıdaki JSON şemasında yanıt ver:
{
  "mahkeme_turu": "tuketici" | "is" | "sulh" | "ticaret" | "yok" | null,
  "aciklama": "1-2 cümle Türkçe gerekçe",
  "kaynak_bulunamadi": true | false
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

    const rawKind = String(parsed?.mahkeme_turu ?? "").toLowerCase();
    const mahkeme_turu = ["tuketici", "is", "sulh", "ticaret", "yok"].includes(rawKind) ? rawKind : null;
    const rule = mahkeme_turu ? COURT_RULES[mahkeme_turu] : null;
    const kaynak_bulunamadi = !!parsed?.kaynak_bulunamadi || !mahkeme_turu || chunks.length === 0;

    const result = {
      mahkeme_turu,
      sure_hafta: rule?.sure_hafta ?? null,
      uzatma_hafta: rule?.uzatma_hafta ?? null,
      toplam_max_hafta: rule && rule.sure_hafta != null ? (rule.sure_hafta + (rule.uzatma_hafta ?? 0)) : null,
      dayanak: rule?.dayanak ?? "bulunamadı",
      mahkeme_label: rule?.label ?? "Tespit Edilemedi",
      aciklama: String(parsed?.aciklama ?? "").slice(0, 500),
      kaynak_bulunamadi,
      kullanilan_kaynaklar: chunks.map((c) => c.source_title).slice(0, 12),
      // legacy compatibility
      dava_sarti_mi: mahkeme_turu ? mahkeme_turu !== "yok" : null,
    };

    if (persist) {
      const { data: caseRow } = await admin
        .from("cases")
        .select("application_date, created_at")
        .eq("id", case_id)
        .maybeSingle();
      const startIso = caseRow?.application_date ?? caseRow?.created_at ?? new Date().toISOString();
      const start = new Date(startIso);
      const sure_gun = result.sure_hafta != null ? result.sure_hafta * 7 : null;
      const uzatma_gun = result.uzatma_hafta != null ? result.uzatma_hafta * 7 : null;
      const deadline_total = sure_gun != null
        ? new Date(start.getTime() + sure_gun * 86400000).toISOString() : null;
      const deadline_extended = (sure_gun != null && uzatma_gun && uzatma_gun > 0)
        ? new Date(start.getTime() + (sure_gun + uzatma_gun) * 86400000).toISOString() : null;

      await admin.from("cases").update({
        mediation_type: "dava_sarti",
        mahkeme_turu: result.mahkeme_turu,
        sure_hafta: result.sure_hafta,
        uzatma_hafta: result.uzatma_hafta,
        is_mandatory: result.dava_sarti_mi,
        legal_duration_days: sure_gun,
        extension_days: uzatma_gun,
        legal_basis: result.dayanak,
        deadline_total,
        deadline_extended,
        deadline_sources: result.kullanilan_kaynaklar,
        deadline_conflict: false,
        deadline_conflict_note: null,
        deadline_detected_at: new Date().toISOString(),
      } as any).eq("id", case_id);
    }

    // Activity log: mark completed. Fire via waitUntil so it can't delay the response,
    // and so it still finishes even though the response is about to be sent.
    if (admin && case_id) {
      const finalAdmin = admin, finalCaseId = case_id;
      EdgeRuntime.waitUntil(
        upsertAgentActivityState(finalAdmin, finalCaseId, "deadline_detect", null, { status: "completed" }).catch(() => {})
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    // Activity log: mark failed with a short status summary only — never the deadline content.
    if (admin && case_id) {
      const finalAdmin = admin, finalCaseId = case_id;
      const errorSummary = String(e?.message ?? "unknown error").slice(0, 300);
      EdgeRuntime.waitUntil(
        upsertAgentActivityState(finalAdmin, finalCaseId, "deadline_detect", null, { status: "failed", error_message: errorSummary }).catch(() => {})
      );
    }
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
