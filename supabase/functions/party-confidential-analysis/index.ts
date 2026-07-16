// Party-confidential analysis: only the party (and mediator via RLS) can see results
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// Provided by the Supabase Edge Runtime; lets background writes (agent_states) finish
// after the response is sent instead of a bare fire-and-forget that may get cut off.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Activity-log upsert for the Agent Control Panel. Status-only — never store analysis
// content here (that belongs to party_analyses); failures here must never block the
// main analysis flow, so every call site wraps this in its own try-catch.
async function upsertPartyAnalysisState(
  admin: ReturnType<typeof createClient>,
  case_id: string,
  party_id: string,
  patch: Record<string, unknown>,
) {
  const { data: existing } = await admin.from("agent_states")
    .select("id").eq("case_id", case_id).eq("agent_type", "party_analysis").eq("party_id", party_id).maybeSingle();
  if (existing?.id) {
    await admin.from("agent_states").update(patch).eq("id", existing.id);
  } else {
    await admin.from("agent_states").insert({ case_id, agent_type: "party_analysis", party_id, ...patch });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let admin: ReturnType<typeof createClient> | null = null;
  let case_id: string | undefined;
  let party_id: string | undefined;

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

    const body = await req.json();
    case_id = body.case_id;
    party_id = body.party_id;
    if (!case_id || !party_id) {
      return new Response(JSON.stringify({ error: "case_id and party_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    admin = createClient(supabaseUrl, serviceKey);

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
      .from("case_parties").select("id, user_id, case_id, party_role, party_type, first_name, last_name, company_name, email, gsm, phone, address, authorized_person, statement")
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

    // Activity log: mark this party's analysis as running. Best-effort — never block the analysis.
    try {
      await upsertPartyAnalysisState(admin, case_id, party_id, { status: "running" });
    } catch { /* activity log is non-critical */ }

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

    // Meeting-note AI analyses (phase 7) — same "surface prior analysis as context" pattern as bilirkişi reports.
    // Never include notes tied to a private session: this function's output is party-visible, while a private
    // session's notes belong only to that session's participants + mediator (mirrors MeetingNotesPanel's visibleNotes).
    const { data: sessionRows } = await admin.from("case_sessions")
      .select("id, session_type").eq("case_id", case_id);
    const privateSessionIds = new Set(
      (sessionRows ?? []).filter((s: any) => s.session_type === "private").map((s: any) => s.id)
    );
    const { data: noteRows } = await admin.from("case_notes")
      .select("content, created_at").eq("case_id", case_id).eq("phase", 7)
      .order("created_at", { ascending: false });
    let meetingNotesBlock = "";
    if (noteRows && noteRows.length > 0) {
      const usableNotes = noteRows
        .map((n: any) => { try { return JSON.parse(n.content); } catch { return null; } })
        .filter((p: any) => p && !(p.session_id && privateSessionIds.has(p.session_id)))
        .filter((p: any) => p.ai && (p.ai.yeni_tespitler?.length || p.ai.degisen_pozisyonlar?.length || p.ai.yeni_strateji));
      if (usableNotes.length > 0) {
        const parts = usableNotes.map((p: any) =>
          `Yeni Tespitler: ${(p.ai.yeni_tespitler ?? []).join("; ") || "-"}\nDeğişen Pozisyonlar: ${(p.ai.degisen_pozisyonlar ?? []).join("; ") || "-"}\nStrateji: ${p.ai.yeni_strateji ?? "-"}`
        ).join("\n\n");
        meetingNotesBlock = `\n═══ GÖRÜŞME NOTLARI ANALİZİ (önceden çıkarılmış arabulucu görüşme notu analizleri) ═══\n${parts}\n═══════════════════════════\n`;
      }
    }

    // Party's own free-text statement — primary source when present; the AI should
    // ground the analysis in the party's own words before leaning on documents.
    const statementBlock = (party.statement ?? "").trim()
      ? `\n═══ TARAF BEYANI (tarafın kendi anlatımı — birincil kaynak) ═══\n${party.statement.trim()}\n═══════════════════════════\n`
      : "";

    const partyName = party.party_type === "individual"
      ? `${party.first_name ?? ""} ${party.last_name ?? ""}`.trim()
      : (party.company_name ?? "Taraf");

    // RAG: pull relevant chunks from the Ministry of Justice mediation knowledge base.
    const ragQuery = [caseRow?.title, caseRow?.dispute_type, caseRow?.dispute_subtype, caseRow?.issue_description]
      .filter(Boolean).join(" — ");
    const ragCategory = mapDisputeToCategory(caseRow?.dispute_type, caseRow?.dispute_subtype);
    const { block: ragBlock, sources: ragSources, embedding: queryEmb } = await fetchKnowledgeBlock(admin, apiKey, ragQuery, ragCategory);
    const { block: similarBlock, matches: similarMatches } = await fetchSimilarCases(admin, queryEmb, ragCategory);

    // IP pilotu: yalnızca fikri_mülkiyet kategorisinde ek uzman kimlik bloğu enjekte edilir;
    // diğer kategorilerde systemPrompt davranışı değişmez.
    const ipExpertBlock = ragCategory === "fikri_mülkiyet"
      ? `\n\nSen aynı zamanda fikri ve sınai haklar uzmanısın. Bu dosyada analiz yaparken: (a) Marka uyuşmazlıklarında SMK 6769 m.5/m.6 (mutlak-nispi ret nedenleri, karıştırılma ihtimali), m.7 (marka hakkının kapsamı), m.29-30 (tecavüz fiilleri), m.149-151 (talepler, tazminat hesap seçenekleri: yoksun kalınan kazanç / tecavüz edenin kazancı / lisans örneksemesi) çerçevesinde değerlendir ve İLGİLİ MADDE NUMARALARINI açıkça an. (b) Karıştırılma ihtimalini üç eksende değerlendir: işaret benzerliği + mal/hizmet benzerliği + ortalama tüketici algısı. (c) Telif uyuşmazlıklarında FSEK hükümlerini, alan adı uyuşmazlıklarında WIPO/UDRP üç şartını (benzerlik + meşru menfaat yokluğu + kötü niyet) uygula. (d) Lisans bedeli değerlendirmesinde emsal aralık mantığı kur: sektör, kullanım kapsamı, süre, münhasırlık. (e) BATNA/WATNA'da FSHHM yargılamasının gerçeklerini yansıt: bilirkişi ağırlıklı süreç, 2-4 yıl süre, ispat yükü. (f) Çözüm yelpazesinde IP'ye özgü seçenekleri değerlendir: lisans, coexistence (birlikte var olma) sözleşmesi, rebranding takvimi, coğrafi/ürün grubu kısıtlaması. KAYNAK DİSİPLİNİ AYNEN: bilgi tabanı kaynaklarına dayan, kaynak adını parantez içinde an, uydurma madde/emsal YASAK.`
      : "";

    const systemPrompt = `Sen bir Türk hukuk arabuluculuk uzmanı AI'sın. Bu tarafın perspektifinden detaylı bir analiz hazırlıyorsun.${ipExpertBlock}
Otomatik olarak: (1) niş hukuki alanı tespit et, (2) ilgili mevzuat ve Yargıtay/BAM emsallerini tara, (3) tarafın pozisyon/ihtiyaç/BATNA analizini yap, (4) yüklenen belgelerden somut bulgular çıkar. Sana verilen "İLGİLİ KAYNAK BİLGİSİ" ve "BENZER GEÇMİŞ DAVALAR" bloklarından yararlan, alakalıysa kaynak adını parantez içinde göster.
Eğer "TARAF BEYANI" bloğu verilmişse, bu tarafın kendi ağzından anlatımıdır ve party_position (pozisyon/ihtiyaç/BATNA) analizinin birincil kaynağıdır; belgeler ve dava özeti bunu tamamlayıcı ikincil kaynaklardır. Beyan ile belgeler çelişirse bu çelişkiyi risks[] içinde belirt.
Eğer "BELGE ANALİZ SONUÇLARI" bloğu verilmişse, bu bloktaki her belge için önceden çıkarılmış bilirkişi raporu bulguları (özet, bulgular, risk seviyesi, mevzuat) mevcuttur. Bu bulguları document_findings[] dizisine, kaynağını "Bilirkişi raporu: <belge adı>" şeklinde belirterek yansıt. Bu blok yoksa veya bir belge bu blokta geçmiyorsa document_findings davranışını değiştirme. Bu bloktaki riskLevel ve bulguları risk_analizi değerlendirmende (kritik_faktorler, risk_puani) de dikkate al.
Eğer "GÖRÜŞME NOTLARI ANALİZİ" bloğu verilmişse, bu bloktaki her görüşmeden önceden çıkarılmış tespit/pozisyon/strateji bulguları mevcuttur. Bu bulguları document_findings[] dizisine, kaynağını "Görüşme notu" şeklinde belirterek yansıt; ayrıca risk_analizi değerlendirmende (kritik_faktorler, risk_puani) de dikkate al.
KESİN KURAL (halüsinasyon yasağı): "BELGE ANALİZ SONUÇLARI" ve "GÖRÜŞME NOTLARI ANALİZİ" bloklarından yalnızca orada yazılı olan içerikten alıntı/özetleme yap; blokta yer almayan bulgu, mevzuat veya risk uydurma.
KESİN KURAL (emsal/künye halüsinasyon yasağı — TÜM ÇIKTI ALANLARI): Yargıtay/BAM esas-karar numarası (E./K.) yazma yasağı yalnızca legal_framework.precedents için değil, ÇIKTININ TÜM ALANLARI için geçerlidir (mahkeme_riski, mahkeme_riski_kaynak, party_position.strengths/weaknesses, risk_analizi.oneri dahil). "İLGİLİ KAYNAK BİLGİSİ" veya "BENZER GEÇMİŞ DAVALAR" bloklarında birebir geçmeyen hiçbir E./K. numarası hiçbir alanda yazılamaz. Bu bloklarda somut bir karar künyesi yoksa precedents'ı boş dizi bırak ve risk_analizi.kaynak_listesi'ne "Emsal için doğrulanmış kaynak bulunamadı" yaz. Genel içtihat ifadesi serbesttir (ör. "Yargıtay 11. HD yerleşik içtihadı uyarınca..."), somut esas/karar numarası uydurmak YASAKTIR. Bu kısıtlama legal_framework.statutes (mevzuat maddesi atıfları) için geçerli değildir.

SON ADIM — RİSK ANALİZİ & ANLAŞMA ORANI:
A) "İLGİLİ KAYNAK BİLGİSİ" bloklarını tara: bu alanda uzlaşma istatistiği/Yargıtay eğilimi/uzlaşma engeli var mı?
B) "BENZER GEÇMİŞ DAVALAR" bloklarına bak: benzer davalar nasıl sonuçlanmış?
C) Bu iki kaynaktan + tarafın mevcut durumundan (BATNA, belge güç durumu, ZOPA, ihtiyaç/pozisyon uyumu) risk_analizi üret.
A/B/C kaynaklarına ek olarak, varsa BELGE ANALİZ SONUÇLARI ve GÖRÜŞME NOTLARI ANALİZİ bloklarındaki bulguları da bu risk değerlendirmesine dahil et.
KESİN KURAL: Sabit/uydurma % ASLA verme. Kaynak yoksa "Yeterli veri yok" yaz. Verdiğin her % için kaynağını belirt.
KESİN KURAL (uzlaşma oranı tahmini ZORUNLU): uzlasma_orani için doğrudan istatistiksel kaynak (resmi kaynak/benzer dava) yoksa bile BATNA, ZOPA, belge güç durumu ve uyuşmazlık türünden MUTLAKA bir % tahmini türet; uzlasma_orani_kaynak alanında bunun türetilmiş bir tahmin olduğunu belirt (ör. "BATNA ve belge gücüne dayalı tahmin"). "Yeterli veri yok" YALNIZCA hiçbir sinyal (kaynak, benzer dava, BATNA, belge gücü, ZOPA) mevcut değilse kabul edilir.
KESİN KURAL (uzlasma_orani format ZORUNLU): uzlasma_orani alanı MUTLAKA ve YALNIZCA şu formatta olmalı: "Düşük (%NN)" | "Orta (%NN)" | "Yüksek (%NN)" — serbest cümle YASAKTIR; gerekçe/türetim açıklaması uzlasma_orani_kaynak alanına yazılır.

Çıktı YALNIZCA JSON: {"dispute_area":"","legal_framework":{"statutes":[],"precedents":[{"court":"","decision":"","relevance":""}]},"document_findings":[],"party_position":{"strengths":[],"weaknesses":[],"interests":[],"batna":"","watna":""},"risks":[],"opportunities":[],"discovery_questions":[{"id":1,"question":""}],"risk_analizi":{"uzlasma_orani":"","uzlasma_orani_kaynak":"","risk_puani":"Düşük|Orta|Yüksek","mahkeme_riski":"","mahkeme_riski_kaynak":"","tahmini_sure_tasarrufu_ay":"","kritik_faktorler":["","",""],"uzlasma_engelleri":["",""],"kaynak_listesi":[],"oneri":""}} — tam 5 ihtiyaç tespiti sorusu üret.`;

    const userPrompt = `UYUŞMAZLIK TÜRÜ: ${caseRow?.dispute_type ?? ""} / ${caseRow?.dispute_subtype ?? ""}
BAŞLIK: ${caseRow?.title ?? ""}
TARAF: ${partyName} (rol: ${party.party_role ?? "?"}, tür: ${party.party_type ?? ""})
İLETİŞİM: ${party.email ?? ""} ${party.gsm ?? ""}
UYUŞMAZLIK ÖZETİ: ${caseRow?.issue_description ?? "(belirtilmemiş)"}
${statementBlock}
YÜKLENEN BELGELER (${docs.length}): ${docs.map((d: any) => `- ${d.file_name}`).join("\n") || "(belge yok)"}
${docExcerpts ? `\nBELGE İÇERİKLERİ (kısmi):\n${docExcerpts}` : ""}
${docReadFailed ? "\nNOT: Bazı belgeler (PDF/Word) metin olarak okunamadı; yalnızca dosya adlarından çıkarım yapıldı." : ""}
${expertAnalysisBlock}
${meetingNotesBlock}
${ragBlock}
${similarBlock}
Bu tarafın perspektifinden detaylı analiz üret. Yukarıdaki bloklarda somut bir Yargıtay/BAM karar referansı varsa ver; yoksa precedents'ı boş bırak. Yukarıdaki resmi kaynaklardan ve benzer geçmiş davalardan yararlanarak risk_analizi üret; sabit/uydurma yüzde verme.`;

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

    // Deterministic backstop for the prompt's citation-hallucination ban: strips any
    // Yargıtay/BAM E./K. number not verbatim in the RAG context the model actually saw.
    parsed = sanitizeCitationHallucinations(parsed, `${ragBlock}\n${similarBlock}`);

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

    // Activity log: mark completed. Fire via waitUntil so it can't delay the response,
    // and so it still finishes even though the response is about to be sent.
    if (admin && case_id && party_id) {
      const finalAdmin = admin, finalCaseId = case_id, finalPartyId = party_id;
      EdgeRuntime.waitUntil(
        upsertPartyAnalysisState(finalAdmin, finalCaseId, finalPartyId, { status: "completed" }).catch(() => {})
      );
    }

    return new Response(JSON.stringify({ analysis: parsed, sources: ragSources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    // Activity log: mark failed with a short status summary only — never the analysis content.
    if (admin && case_id && party_id) {
      const finalAdmin = admin, finalCaseId = case_id, finalPartyId = party_id;
      const errorSummary = String(e?.message ?? "unknown error").slice(0, 300);
      EdgeRuntime.waitUntil(
        upsertPartyAnalysisState(finalAdmin, finalCaseId, finalPartyId, { status: "failed", error_message: errorSummary }).catch(() => {})
      );
    }

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapDisputeToCategory(disputeType?: string | null, subtype?: string | null): string | null {
  const CATS = ["işçi_işveren","ticari","tüketici","sağlık","inşaat","sigorta","bankacılık","aile","spor","enerji_maden","kira","gayrimenkul","genel"];
  const raw = (disputeType ?? "").trim().toLowerCase();
  const t = `${disputeType ?? ""} ${subtype ?? ""}`.toLowerCase();
  // IP pilotu adım 1: eski slug ("fikri_mülkiyet", classify-dispute çıktısı) ve yeni
  // taksonomi slug'ı ("fikri_mulkiyet", başvuru formu) ile marka/patent/tasarım/telif
  // içeren serbest metin tespitlerini tek bilgi tabanı kategorisinde birleştir.
  if (raw === "fikri_mulkiyet" || raw === "fikri_mülkiyet" || /fikri|marka|patent|tasarım|tasarim|telif/.test(t)) {
    return "fikri_mülkiyet";
  }
  if (CATS.includes(raw)) return raw === "genel" ? null : raw;
  if (/kira/.test(t)) return "kira";
  if (/gayrimenkul|tapu|emlak/.test(t)) return "gayrimenkul";
  if (/iş|isci|işçi|işveren|isveren|kıdem|kidem/.test(t)) return "işçi_işveren";
  if (/ticari|ticaret|şirket|sirket/.test(t)) return "ticari";
  if (/tüketici|tuketici/.test(t)) return "tüketici";
  if (/aile|boşan|bosan|nafaka|velayet/.test(t)) return "aile";
  if (/sigorta/.test(t)) return "sigorta";
  if (/sağlık|saglik|malpraktis/.test(t)) return "sağlık";
  if (/inşaat|insaat|yapı|yapi/.test(t)) return "inşaat";
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

// ─────────────────────────────────────────────────────────────────────────
// Deterministic citation guard (no extra AI call, no schema change).
// The system prompt bans fabricated Yargıtay/BAM esas-karar (E./K.) numbers,
// but a model can still ignore that instruction — this is the code-level
// backstop that runs after JSON.parse, before the row is ever persisted.
// ─────────────────────────────────────────────────────────────────────────

// Matches "2016/10292 E.", "E. 2017/3257", "K. 2018/7889", "2010/8939 K.",
// placeholder-digit variants like "2020/XXXX E." (number/E-or-K token pairs in
// either order), AND bare "YYYY/NNN+" case numbers with no E./K. label at all
// (min 3-digit docket segment so tarife/madde references like "2026/17" don't
// match). A bare match whose second segment is exactly 4 digits and within ±1
// of the first (e.g. "2024/2025") is a year range, not a citation — excluded
// via isYearRangeFalsePositive below, not in the regex itself.
const CITATION_PATTERN = /\b(\d{4}\/[0-9X]{1,7}\s*(?:E|K)\.?)\b|\b((?:E|K)\.?\s*\d{4}\/[0-9X]{1,7})\b|\b(\d{4})\/([0-9X]{3,7})\b/gi;

function isYearRangeFalsePositive(yearStr: string, secondStr: string): boolean {
  if (!/^\d{4}$/.test(secondStr)) return false;
  const y1 = Number(yearStr), y2 = Number(secondStr);
  return Math.abs(y2 - y1) === 1;
}

function extractCitations(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(CITATION_PATTERN);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[3] !== undefined) {
      if (isYearRangeFalsePositive(m[3], m[4])) continue;
      out.push(`${m[3]}/${m[4]}`);
    } else {
      out.push((m[1] ?? m[2] ?? m[0]).trim());
    }
  }
  return out;
}

function normalizeForCompare(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function citationInContext(citation: string, context: string): boolean {
  return normalizeForCompare(context).includes(normalizeForCompare(citation));
}

// Replaces any citation not verbatim in `context` with a generic phrase,
// then tidies the double-space/empty-parenthesis artifacts that leaves behind.
function scrubCitationsInString(text: string, context: string): { text: string; removed: number } {
  let removed = 0;
  const re = new RegExp(CITATION_PATTERN);
  const scrubbed = text.replace(re, (match: string, g1: string, g2: string, g3: string, g4: string) => {
    if (g3 !== undefined && isYearRangeFalsePositive(g3, g4)) return match;
    if (citationInContext(match, context)) return match;
    removed++;
    return "yerleşik içtihadı";
  });
  const cleaned = scrubbed
    .replace(/\(\s*\)/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
  return { text: cleaned, removed };
}

function sanitizeStringsDeep(value: any, context: string, stats: { removed: number }): any {
  if (typeof value === "string") {
    const { text, removed } = scrubCitationsInString(value, context);
    stats.removed += removed;
    return text;
  }
  if (Array.isArray(value)) return value.map((v) => sanitizeStringsDeep(v, context, stats));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeStringsDeep(v, context, stats);
    return out;
  }
  return value;
}

// legal_framework.precedents gets the stricter treatment: an item whose `decision`
// cites an E./K. number not present in the RAG context is dropped entirely (a
// fabricated-but-plausible-sounding precedent is worse than no precedent). Items
// with no numeric citation (a generic "yerleşik içtihat" statement) are kept.
function sanitizeCitationHallucinations(parsed: any, context: string): any {
  const stats = { removed: 0, precedentsDropped: 0 };

  if (Array.isArray(parsed?.legal_framework?.precedents)) {
    const before = parsed.legal_framework.precedents.length;
    parsed.legal_framework.precedents = parsed.legal_framework.precedents.filter((p: any) => {
      const citations = extractCitations(String(p?.decision ?? ""));
      if (citations.length === 0) return true;
      return citations.every((c) => citationInContext(c, context));
    });
    stats.precedentsDropped = before - parsed.legal_framework.precedents.length;
  }

  const sanitized = sanitizeStringsDeep(parsed, context, stats);

  if (stats.removed > 0 || stats.precedentsDropped > 0) {
    console.log(
      `[party-confidential-analysis] citation guard: ${stats.removed} inline künye temizlendi, ${stats.precedentsDropped} precedent kaydı bağlamda doğrulanamadığı için silindi`
    );
  }

  return sanitized;
}

