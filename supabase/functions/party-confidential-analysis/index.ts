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

    // Authorization: caller must be the party themselves, the case owner, the assigned mediator, or an admin.
    const { data: caseRow } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, dispute_type, dispute_subtype, issue_description, title")
      .eq("id", case_id).maybeSingle();
    if (!caseRow) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: party } = await admin
      .from("case_parties").select("id, user_id, case_id, party_role, party_type, first_name, last_name, company_name, email, gsm, phone, address, authorized_person")
      .eq("id", party_id).eq("case_id", case_id).maybeSingle();
    if (!party) {
      return new Response(JSON.stringify({ error: "Party not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userId).in("role", ["admin", "mediator"]).maybeSingle();
    const isPrivileged = !!roleRow || caseRow.user_id === userId || caseRow.assigned_mediator_id === userId;
    if (!isPrivileged && party.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-party documents (preferred). Fallback to uploads by the party's user when party_id wasn't set.
    let docsQuery = admin.from("case_documents")
      .select("file_name, file_path, mime_type, analysis_result, party_id, uploaded_by")
      .eq("case_id", case_id);
    const { data: allDocs } = await docsQuery;
    const docs = (allDocs ?? []).filter((d: any) =>
      d.party_id === party_id || (!d.party_id && party.user_id && d.uploaded_by === party.user_id)
    );

    // Try to read the document text from storage (best-effort) so the AI can analyse content.
    let docExcerpts = "";
    let docReadFailed = false;
    for (const d of docs.slice(0, 5)) {
      try {
        const { data: blob, error: dlErr } = await admin.storage.from("case-documents").download(d.file_path);
        if (dlErr || !blob) { docReadFailed = true; continue; }
        if ((d.mime_type ?? "").startsWith("text/") || d.file_name.toLowerCase().endsWith(".txt")) {
          const txt = await blob.text();
          docExcerpts += `\n--- ${d.file_name} ---\n${txt.slice(0, 4000)}\n`;
        } else {
          // For PDF/Word we send only filenames; full extraction would need a parser.
          docReadFailed = true;
        }
      } catch { docReadFailed = true; }
    }

    // Documents that already have a stored expert-report (bilirkişi) analysis — surface those findings as context.
    const analyzedDocs = docs.filter((d: any) => d.analysis_result && typeof d.analysis_result === "object");
    let expertAnalysisBlock = "";
    if (analyzedDocs.length > 0) {
      const parts = analyzedDocs.map((d: any) => {
        const ar = d.analysis_result ?? {};
        const findings = Array.isArray(ar.keyFindings) ? ar.keyFindings.join("; ") : "";
        const laws = Array.isArray(ar.relevantLaw) ? ar.relevantLaw.join("; ") : "";
        return `[Belge: ${d.file_name}]\nÖzet: ${ar.summary ?? "-"}\nBulgular: ${findings || "-"}\nRisk Seviyesi: ${ar.riskLevel ?? "-"}\nİlgili Mevzuat: ${laws || "-"}`;
      }).join("\n\n");
      expertAnalysisBlock = `\n═══ BELGE ANALİZ SONUÇLARI (önceden analiz edilmiş bilirkişi raporları) ═══\n${parts}\n═══════════════════════════\n`;
    }

    const partyName = party.party_type === "individual"
      ? `${party.first_name ?? ""} ${party.last_name ?? ""}`.trim()
      : (party.company_name ?? "Taraf");

    // RAG: pull relevant chunks from the Ministry of Justice mediation knowledge base.
    const ragQuery = [caseRow?.title, caseRow?.dispute_type, caseRow?.dispute_subtype, caseRow?.issue_description]
      .filter(Boolean).join(" — ");
    const ragCategory = mapDisputeToCategory(caseRow?.dispute_type, caseRow?.dispute_subtype);
    const { block: ragBlock, sources: ragSources, embedding: queryEmb } = await fetchKnowledgeBlock(admin, apiKey, ragQuery, ragCategory);
    const { block: similarBlock, matches: similarMatches } = await fetchSimilarCases(admin, queryEmb, ragCategory);

    const systemPrompt = `Sen bir Türk hukuk arabuluculuk uzmanı AI'sın. Bu tarafın perspektifinden detaylı bir analiz hazırlıyorsun.
Otomatik olarak: (1) niş hukuki alanı tespit et, (2) ilgili mevzuat ve Yargıtay/BAM emsallerini tara, (3) tarafın pozisyon/ihtiyaç/BATNA analizini yap, (4) yüklenen belgelerden somut bulgular çıkar. Sana verilen "İLGİLİ KAYNAK BİLGİSİ" ve "BENZER GEÇMİŞ DAVALAR" bloklarından yararlan, alakalıysa kaynak adını parantez içinde göster.
Eğer "BELGE ANALİZ SONUÇLARI" bloğu verilmişse, bu bloktaki her belge için önceden çıkarılmış bilirkişi raporu bulguları (özet, bulgular, risk seviyesi, mevzuat) mevcuttur. Bu bulguları document_findings[] dizisine, kaynağını "Bilirkişi raporu: <belge adı>" şeklinde belirterek yansıt. Bu blok yoksa veya bir belge bu blokta geçmiyorsa document_findings davranışını değiştirme. Bu bloktaki riskLevel ve bulguları risk_analizi değerlendirmende (kritik_faktorler, risk_puani) de dikkate al.
KESİN KURAL (halüsinasyon yasağı): "BELGE ANALİZ SONUÇLARI" bloğundan yalnızca orada yazılı olan içerikten alıntı/özetleme yap; blokta yer almayan bulgu, mevzuat veya risk uydurma.

SON ADIM — RİSK ANALİZİ & ANLAŞMA ORANI:
A) "İLGİLİ KAYNAK BİLGİSİ" bloklarını tara: bu alanda uzlaşma istatistiği/Yargıtay eğilimi/uzlaşma engeli var mı?
B) "BENZER GEÇMİŞ DAVALAR" bloklarına bak: benzer davalar nasıl sonuçlanmış?
C) Bu iki kaynaktan + tarafın mevcut durumundan (BATNA, belge güç durumu, ZOPA, ihtiyaç/pozisyon uyumu) risk_analizi üret.
KESİN KURAL: Sabit/uydurma % ASLA verme. Kaynak yoksa "Yeterli veri yok" yaz. Verdiğin her % için kaynağını belirt.

Çıktı YALNIZCA JSON: {"dispute_area":"","legal_framework":{"statutes":[],"precedents":[{"court":"","decision":"","relevance":""}]},"document_findings":[],"party_position":{"strengths":[],"weaknesses":[],"interests":[],"batna":"","watna":""},"risks":[],"opportunities":[],"discovery_questions":[{"id":1,"question":""}],"risk_analizi":{"uzlasma_orani":"","uzlasma_orani_kaynak":"","risk_puani":"Düşük|Orta|Yüksek","mahkeme_riski":"","mahkeme_riski_kaynak":"","tahmini_sure_tasarrufu_ay":"","kritik_faktorler":["","",""],"uzlasma_engelleri":["",""],"kaynak_listesi":[],"oneri":""}} — tam 5 ihtiyaç tespiti sorusu üret.`;

    const userPrompt = `UYUŞMAZLIK TÜRÜ: ${caseRow?.dispute_type ?? ""} / ${caseRow?.dispute_subtype ?? ""}
BAŞLIK: ${caseRow?.title ?? ""}
TARAF: ${partyName} (rol: ${party.party_role ?? "?"}, tür: ${party.party_type ?? ""})
İLETİŞİM: ${party.email ?? ""} ${party.gsm ?? ""}
UYUŞMAZLIK ÖZETİ: ${caseRow?.issue_description ?? "(belirtilmemiş)"}
YÜKLENEN BELGELER (${docs.length}): ${docs.map((d: any) => `- ${d.file_name}`).join("\n") || "(belge yok)"}
${docExcerpts ? `\nBELGE İÇERİKLERİ (kısmi):\n${docExcerpts}` : ""}
${docReadFailed ? "\nNOT: Bazı belgeler (PDF/Word) metin olarak okunamadı; yalnızca dosya adlarından çıkarım yapıldı." : ""}
${expertAnalysisBlock}
${ragBlock}
${similarBlock}
Bu tarafın perspektifinden detaylı analiz üret. Yargıtay ve BAM emsallerinden somut karar referansları ver. Yukarıdaki resmi kaynaklardan ve benzer geçmiş davalardan yararlanarak risk_analizi üret; sabit/uydurma yüzde verme.`;

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
    // Attach the sources actually used by RAG so the UI can show transparency info.
    parsed.sources = ragSources;

    // Upsert the party_analyses row (one per party per round)
    const { data: existing } = await admin.from("party_analyses")
      .select("id").eq("case_id", case_id).eq("party_id", party_id).maybeSingle();

    if (existing) {
      await admin.from("party_analyses").update({
        analysis: parsed,
        discovery_questions: parsed.discovery_questions ?? [],
        risk_analizi: parsed.risk_analizi ?? null,
      }).eq("id", existing.id);
    } else {
      await admin.from("party_analyses").insert({
        case_id, party_id, user_id: party.user_id ?? userId,
        analysis: parsed,
        discovery_questions: parsed.discovery_questions ?? [],
        risk_analizi: parsed.risk_analizi ?? null,
      });
    }

    // Seed discovery question rows (party-scoped)
    for (const q of parsed.discovery_questions ?? []) {
      const { data: exists } = await admin.from("case_discovery_questions")
        .select("id").eq("case_id", case_id).eq("party_id", party_id)
        .eq("question_order", q.id ?? 0).maybeSingle();
      if (!exists) {
        await admin.from("case_discovery_questions").insert({
          case_id, party_id, user_id: party.user_id ?? userId,
          question_text: q.question, question_order: q.id ?? 0,
        });
      }
    }

    return new Response(JSON.stringify({ analysis: parsed, sources: ragSources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapDisputeToCategory(disputeType?: string | null, subtype?: string | null): string | null {
  const CATS = ["işçi_işveren","ticari","tüketici","sağlık","fikri_mülkiyet","inşaat","sigorta","bankacılık","aile","spor","enerji_maden","kira","gayrimenkul","genel"];
  const raw = (disputeType ?? "").trim().toLowerCase();
  if (CATS.includes(raw)) return raw === "genel" ? null : raw;
  const t = `${disputeType ?? ""} ${subtype ?? ""}`.toLowerCase();
  if (/kira/.test(t)) return "kira";
  if (/gayrimenkul|tapu|emlak/.test(t)) return "gayrimenkul";
  if (/iş|isci|işçi|işveren|isveren|kıdem|kidem/.test(t)) return "işçi_işveren";
  if (/ticari|ticaret|şirket|sirket/.test(t)) return "ticari";
  if (/tüketici|tuketici/.test(t)) return "tüketici";
  if (/aile|boşan|bosan|nafaka|velayet/.test(t)) return "aile";
  if (/sigorta/.test(t)) return "sigorta";
  if (/sağlık|saglik|malpraktis/.test(t)) return "sağlık";
  if (/inşaat|insaat|yapı|yapi/.test(t)) return "inşaat";
  if (/fikri|marka|patent|telif/.test(t)) return "fikri_mülkiyet";
  if (/enerji|maden/.test(t)) return "enerji_maden";
  if (/banka|finans|kredi/.test(t)) return "bankacılık";
  if (/spor/.test(t)) return "spor";
  return null;
}

async function fetchKnowledgeBlock(admin: any, apiKey: string, query: string, category: string | null): Promise<{ block: string; sources: any[]; embedding: number[] | null }> {
  try {
    if (!query || query.trim().length < 10) return { block: "", sources: [], embedding: null };
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query, dimensions: 768 }),
    });
    if (!embRes.ok) return { block: "", sources: [], embedding: null };
    const embJson = await embRes.json();
    const vec = embJson?.data?.[0]?.embedding;
    if (!vec) return { block: "", sources: [], embedding: null };
    const { data } = await admin.rpc("match_knowledge_base", {
      query_embedding: vec, filter_category: category, match_count: 5, match_threshold: 0.65,
    });
    if (!data || data.length === 0) return { block: "", sources: [], embedding: vec };
    const sources = data.map((r: any) => ({
      title: r.source_title,
      url: r.source_url,
      category: r.category,
      excerpt: String(r.chunk_text ?? "").slice(0, 400),
      similarity: r.similarity,
    }));
    const parts = data.map((r: any) =>
      `[Kaynak: ${r.source_title}]\n${r.chunk_text}`
    ).join("\n\n");
    const block = `\n═══ İLGİLİ KAYNAK BİLGİSİ (Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından) ═══\n${parts}\n═══════════════════════════\n`;
    return { block, sources, embedding: vec };
  } catch {
    return { block: "", sources: [], embedding: null };
  }
}

async function fetchSimilarCases(admin: any, embedding: number[] | null, category: string | null): Promise<{ block: string; matches: any[] }> {
  try {
    if (!embedding || !category) return { block: "", matches: [] };
    const { data } = await admin.rpc("match_cases", {
      query_embedding: embedding, match_threshold: 0.7, match_count: 4, filter_niche_area: category,
    });
    if (!data || data.length === 0) return { block: "", matches: [] };
    const parts = data.map((r: any, i: number) =>
      `[Benzer Dava #${i + 1} — benzerlik ${(r.similarity * 100).toFixed(0)}%]\n${String(r.anonymized_text ?? "").slice(0, 800)}`
    ).join("\n\n");
    const block = `\n═══ BENZER GEÇMİŞ DAVALAR (anonimleştirilmiş) ═══\n${parts}\n═══════════════════════════\n`;
    return { block, matches: data };
  } catch {
    return { block: "", matches: [] };
  }
}


