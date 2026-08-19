// Mediator-only: combine both party analyses → common ground + strategy
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { anlatimYansit } from "../_shared/anlatim.ts";
import { olayYaz } from "../_shared/olay.ts";

// Provided by the Supabase Edge Runtime; lets background writes (agent_states) finish
// after the response is sent instead of a bare fire-and-forget that may get cut off.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OPENAI_API_KEY tanımlıysa embedding çağrıları doğrudan OpenAI'a gider (paylaşımlı
// Lovable gateway kuyruğunu atlar); tanımlı değilse Lovable gateway + LOVABLE_API_KEY'e döner.
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

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
  // ANLATIM (best-effort): aynı satıra düz Türkçe adım yazılır; davranış değişmez.
  await anlatimYansit(admin, { case_id, agent_type, party_id }, patch);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let admin: ReturnType<typeof createClient> | null = null;
  let case_id: string | undefined;

  try {
    // İç çağrı kapısı (create-video-room / randevu-teklif ile aynı desen):
    // x-cron-secret CRON_SECRET ile eşleşirse çağıran sistemin kendisidir,
    // kullanıcı JWT'si aranmaz. Boş/yanlış secret'ta mevcut JWT yolu aynen işler.
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!isCron && !userData?.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    case_id = body.case_id;
    admin = createClient(supabaseUrl, serviceKey);

    // Only mediator/admin/case owner may run this
    const { data: caseRow } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, dispute_type, dispute_subtype, issue_description, round_number, title")
      .eq("id", case_id).maybeSingle();
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    const allowed = caseRow && (isCron || caseRow.assigned_mediator_id === userData?.user?.id || caseRow.user_id === userData?.user?.id || !!roleRow);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Activity log: mark common-ground synthesis as running. Best-effort — never block the flow.
    try {
      await upsertAgentActivityState(admin, case_id!, "common_ground", null, { status: "running" });
    } catch { /* activity log is non-critical */ }

    const { data: analyses } = await admin.from("party_analyses")
      .select("party_id, analysis, discovery_questions, risk_analizi, case_parties:party_id(party_role, first_name, last_name, company_name)")
      .eq("case_id", case_id);

    const { data: discAnswers } = await admin.from("case_discovery_questions")
      .select("party_id, question_text, answer_text").eq("case_id", case_id);

    // Meeting-note AI analyses (phase 7) — same "surface prior analysis as context" pattern as party-confidential-analysis.
    // This function's output is mediator-only, so unlike party-confidential-analysis, private-session notes are
    // included too: the mediator is entitled to see all of their own session notes.
    const { data: noteRows } = await admin.from("case_notes")
      .select("content, created_at").eq("case_id", case_id).eq("phase", 7)
      .order("created_at", { ascending: false });
    let meetingNotesBlock = "";
    if (noteRows && noteRows.length > 0) {
      const usableNotes = noteRows
        .map((n: any) => { try { return JSON.parse(n.content); } catch { return null; } })
        .filter((p: any) => p?.ai && (p.ai.yeni_tespitler?.length || p.ai.degisen_pozisyonlar?.length || p.ai.yeni_strateji));
      if (usableNotes.length > 0) {
        const parts = usableNotes.map((p: any) =>
          `Yeni Tespitler: ${(p.ai.yeni_tespitler ?? []).join("; ") || "-"}\nDeğişen Pozisyonlar: ${(p.ai.degisen_pozisyonlar ?? []).join("; ") || "-"}\nStrateji: ${p.ai.yeni_strateji ?? "-"}`
        ).join("\n\n");
        meetingNotesBlock = `\n═══ GÖRÜŞME NOTLARI ANALİZİ (önceden çıkarılmış arabulucu görüşme notu analizleri) ═══\n${parts}\n═══════════════════════════\n`;
      }
    }

    // Ajan Defteri: agent_worklog(entry_type='rapor_disi') — taraf analizlerinin rapora
    // almadığı, bilgi boşluğu/temkinli kalınan hususlar. Salt bilgilendirme; bu fonksiyon
    // orkestratörün son halkası olduğundan bu okuma hiçbir koşulda ana akışı bozmamalı.
    let worklogBlock = "";
    try {
      const { data: worklogRows } = await admin.from("agent_worklog")
        .select("content, created_at")
        .eq("case_id", case_id).eq("entry_type", "rapor_disi")
        .order("created_at", { ascending: false })
        .limit(20);
      if (Array.isArray(worklogRows) && worklogRows.length > 0) {
        const MAX_WORKLOG_CHARS = 3000;
        let used = 0;
        const lines: string[] = [];
        for (const row of worklogRows as any[]) {
          const c = row.content ?? {};
          const husus = String(c.husus ?? "").trim();
          const kategori = String(c.kategori ?? "").trim();
          const neden = String(c.neden_rapora_girmedi ?? "").trim();
          const adim = String(c.onerilen_adim ?? "").trim();
          if (!husus && !neden && !adim) continue;
          // created_at DESC ile çekildiği için sırayla eklemek zaten en yeni kayıtları
          // önceliklendiriyor; bütçe dolunca kalan (daha eski) kayıtlar atlanır.
          const line = `- [${kategori || "kategori yok"}] ${husus || "(husus belirtilmemiş)"} — Neden: ${neden || "-"} — Önerilen adım: ${adim || "-"}`;
          if (used + line.length > MAX_WORKLOG_CHARS) break;
          lines.push(line);
          used += line.length;
        }
        if (lines.length > 0) {
          worklogBlock = `\n═══ AJAN DEFTERİ — RAPORA GİRMEYEN DEĞERLENDİRMELER (bilgi boşlukları ve önerilen adımlar) ═══\n${lines.join("\n")}\nSentezi bu boşluklardan haberdar olarak yap: belgesiz kalan hususlarda kesin dil kullanma, uygun yerlerde eksik bilgiye ve önerilen adımlara işaret et.\n═══════════════════════════\n`;
        }
      }
    } catch (e: any) {
      console.error(`[common-ground-report] agent_worklog okuma başarısız (yoksayıldı): ${e?.message ?? String(e)}`);
    }

    // Rapor öncesi defter tartımı — dürüstlük bandı (mimari §5.2i). Yukarıdaki prompt
    // okumasından AYRI ve ondan bağımsız: aynı dosyanın rapor_disi kayıtlarını daha geniş
    // bir pencereyle sayar. Salt hesap — prompt'a, sentez akışına ve mevcut çıktı alanlarına
    // dokunmaz. Okuma başarısız olursa bant üretilmez (goster=false) ve ana analiz sürer.
    let durustlukBandi: {
      goster: boolean;
      toplam_rapor_disi: number;
      veri_yetersiz_sayisi: number;
      kategori_dagilimi: Record<string, number>;
      hususlar: Array<{ husus: string; neden_rapora_girmedi: string; onerilen_adim: string }>;
      metin: string;
    } = {
      goster: false, toplam_rapor_disi: 0, veri_yetersiz_sayisi: 0,
      kategori_dagilimi: {}, hususlar: [], metin: "",
    };
    try {
      const { data: tartimRows } = await admin.from("agent_worklog")
        .select("content")
        .eq("case_id", case_id).eq("entry_type", "rapor_disi")
        .order("created_at", { ascending: false })
        .limit(200);
      if (Array.isArray(tartimRows)) {
        const dagilim: Record<string, number> = {};
        const hususlar: Array<{ husus: string; neden_rapora_girmedi: string; onerilen_adim: string }> = [];
        let veriYetersiz = 0;
        for (const row of tartimRows as any[]) {
          const c = row.content ?? {};
          // Beklenmedik/boş kategori değeri hata değildir; sabit listeye zorlanmadan olduğu gibi sayılır.
          const kategori = String(c.kategori ?? "").trim() || "kategori yok";
          dagilim[kategori] = (dagilim[kategori] ?? 0) + 1;
          if (kategori === "veri_yetersiz") {
            veriYetersiz += 1;
            // Husus metni ajanın yazdığı hâliyle taşınır — yeniden yazılmaz, yorumlanmaz.
            if (hususlar.length < 5) {
              hususlar.push({
                husus: String(c.husus ?? "").trim(),
                // Gerekçe de banda taşınır (defterde zaten var); yoksa boş kalır, üretilmez.
                neden_rapora_girmedi: String(c.neden_rapora_girmedi ?? "").trim(),
                onerilen_adim: String(c.onerilen_adim ?? "").trim(),
              });
            }
          }
        }
        durustlukBandi = {
          goster: veriYetersiz >= 2,
          toplam_rapor_disi: tartimRows.length,
          veri_yetersiz_sayisi: veriYetersiz,
          kategori_dagilimi: dagilim,
          hususlar,
          metin: veriYetersiz >= 2
            ? `Bu analiz ${veriYetersiz} belgesiz hususa dayanıyor. Masaya oturmadan önce aşağıdaki eksikleri kapatmanız önerilir.`
            : "",
        };
      }
    } catch (e: any) {
      console.error(`[common-ground-report] dürüstlük bandı tartımı başarısız (yoksayıldı): ${e?.message ?? String(e)}`);
    }

    const systemPrompt = `Sen kıdemli bir Türk arabuluculuk danışmanısın. Tarafların gizli analizlerini okuyup ortak zemin raporu, arabulucu stratejisi ve iki tarafın risk analizlerini karşılaştıran risk_ozeti üretiyorsun.
Eğer "GÖRÜŞME NOTLARI ANALİZİ" bloğu verilmişse, bu bloktaki önceden çıkarılmış tespit/pozisyon/strateji bulgularını ortak zemin (common_interests), senaryolar (scenarios) ve arabulucu stratejisi (mediator_strategy) değerlendirmende dikkate al.
KESİN KURAL: Sabit/uydurma % ASLA verme. Kaynak yoksa "Yeterli veri yok" yaz.
KESİN KURAL (halüsinasyon yasağı): "GÖRÜŞME NOTLARI ANALİZİ" bloğundan yalnızca orada yazılı olan tespit/pozisyon/strateji içeriğinden alıntı/özetleme yap; blokta yer almayan bulgu uydurma.
KESİN KURAL (uzlaşma ortalaması ZORUNLU): "TARAF ANALİZLERİ" bloğundaki her tarafın risk_analizi.uzlasma_orani alanını oku. İki tarafın da uzlasma_orani değeri mevcutsa (sayısal % olarak parse edilebiliyorsa), risk_ozeti.genel_uzlasma_orani alanına bu değerlerin ortalamasını (ağırlıklı veri yoksa basit ortalama) "%68" formatında SAYISAL YÜZDE olarak yaz — ayrı ayrı iki % vermek yerine tek bir ortalama % üret; genel_uzlasma_orani_kaynak alanına hangi iki taraf oranından ve nasıl hesaplandığını belirt (ör. "Taraf A %72 ve Taraf B %64 ortalaması"). "Yeterli veri yok" cevabı YALNIZCA iki taraf analizinde de uzlasma_orani mevcut değilse kabul edilir; tek taraf verisi bile varsa onu temel alıp genel_uzlasma_orani_kaynak alanında bunun tek taraf verisine dayandığını belirt, boş bırakma.
KESİN KURAL (yüzdesel risk formatı): risk_ozeti.genel_risk_puani ve taraf_karsilastirma[].risk_puani alanlarında yalnızca sözel derece (Düşük/Orta/Yüksek) YETERSİZDİR — MUTLAKA yanına sayısal yüzde ekle, "Yüksek (%75)", "Orta (%45)", "Düşük (%20)" formatında yaz. Bu yüzdeyi kaynak disiplini kurallarına uyarak (taraf risk_analizi verisi, resmi kaynak veya benzer dava istatistiklerinden) türet; hiçbir kaynağa dayanmıyorsa sözel dereceyi ver ama % kısmını "Yeterli veri yok" yaz, uydurma % ekleme.
Çıktı YALNIZCA JSON: {
  "common_interests": [],
  "zopa": {"description":"", "lower_bound":"", "upper_bound":""},
  "scenarios": [
    {"label":"A - Hızlı Çözüm","summary":"","tradeoffs":[]},
    {"label":"B - Dengeli","summary":"","tradeoffs":[]},
    {"label":"C - Yaratıcı","summary":"","tradeoffs":[]}
  ],
  "mediator_strategy": {"opening_statement":"","critical_questions":[],"deadlock_techniques":[]},
  "red_lines": [],
  "risk_ozeti": {
    "genel_uzlasma_orani":"iki taraf uzlasma_orani ortalaması, örn. %68",
    "genel_uzlasma_orani_kaynak":"",
    "genel_risk_puani":"Düşük (%..)|Orta (%..)|Yüksek (%..)",
    "taraf_karsilastirma":[{"taraf":"","risk_puani":"Düşük (%..)|Orta (%..)|Yüksek (%..)","guclu_yon":"","zayif_yon":""}],
    "ortak_kritik_faktorler":[],
    "ortak_uzlasma_engelleri":[],
    "kaynak_listesi":[],
    "arabulucu_onerisi":""
  }
}`;

    const ragQuery = [caseRow.title, caseRow.dispute_type, caseRow.dispute_subtype, caseRow.issue_description]
      .filter(Boolean).join(" — ");
    const ragCategory = mapDisputeToCategory(caseRow.dispute_type, caseRow.dispute_subtype);
    const { block: ragBlock, sources: ragSources, embedding: queryEmb } = await fetchKnowledgeBlock(admin, apiKey, ragQuery, ragCategory);
    console.log(`[common-ground-report] RAG category=${ragCategory} sources=${ragSources.length}`);
    const { block: similarBlock } = await fetchSimilarCases(admin, queryEmb, ragCategory);

    // Extracted into a named const so the citation guard (below) can treat any
    // künye already present here — verified upstream by party-confidential-analysis
    // against its own RAG context — as legitimate "context" too, not a fresh hallucination.
    const partyAnalysesBlock = (analyses ?? []).map((a: any) => `--- ${a.case_parties?.party_role ?? ""} (${a.case_parties?.first_name ?? a.case_parties?.company_name ?? ""}) ---\nanalysis: ${JSON.stringify(a.analysis, null, 2)}\nrisk_analizi: ${JSON.stringify(a.risk_analizi ?? {}, null, 2)}`).join("\n\n");

    const userPrompt = `BAŞVURU: ${caseRow.title ?? ""} — ${caseRow.dispute_type ?? ""} / ${caseRow.dispute_subtype ?? ""}
ÖZET: ${caseRow.issue_description ?? ""}

TARAF ANALİZLERİ (risk_analizi dahil):
${partyAnalysesBlock}

İHTİYAÇ TESPİTİ CEVAPLARI:
${(discAnswers ?? []).map((d) => `[Party ${d.party_id?.slice(0, 8)}] Q: ${d.question_text}\nA: ${d.answer_text ?? "(cevap yok)"}`).join("\n")}
${meetingNotesBlock}
${ragBlock}
${similarBlock}
${worklogBlock}
Yukarıdaki resmi kaynaklardan ve benzer geçmiş davalardan yararlanarak ortak zemin raporu ve iki tarafı karşılaştıran risk_ozeti üret; uydurma % verme.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI error", details: t }), { status: aiRes.status, headers: corsHeaders });
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson.choices[0].message.content); } catch { parsed = {}; }

    // Deterministic backstop for citation hallucination: strips any Yargıtay/BAM
    // E./K. number not verbatim in the context this model actually saw (its own
    // RAG blocks, plus the party analyses text embedded in userPrompt above —
    // a künye already vetted at the party level counts as legitimate context here).
    parsed = sanitizeCitationHallucinations(parsed, `${ragBlock}\n${similarBlock}\n${partyAnalysesBlock}`);

    parsed.sources = ragSources;
    parsed.rag_debug = { category: ragCategory, count: ragSources.length, threshold: 0.25 };
    parsed.durustluk_bandi = durustlukBandi;

    const { data: inserted, error: upErr } = await admin.from("common_ground_reports").upsert({
      case_id, report: parsed, strategy: parsed.mediator_strategy ?? {},
      risk_ozeti: parsed.risk_ozeti ?? null,
      round_number: caseRow.round_number ?? 1,
    }, { onConflict: "case_id,round_number" }).select().maybeSingle();
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: corsHeaders });
    }

    // Activity log: mark completed. Fire via waitUntil so it can't delay the response,
    // and so it still finishes even though the response is about to be sent.
    if (admin && case_id) {
      const finalAdmin = admin, finalCaseId = case_id;
      EdgeRuntime.waitUntil(
        upsertAgentActivityState(finalAdmin, finalCaseId, "common_ground", null, { status: "completed", error_message: null }).catch(() => {})
      );
    }

    // AKIŞ OLAYI (best-effort): ortak zemin raporu üretildi. Rapor METNİ yazılmaz.
    await olayYaz(admin, {
      case_id: case_id!, olay_kodu: "ortak_zemin_raporu_uretildi",
      veri: { rapor_id: (inserted as any)?.id ?? null },
    });
    return new Response(JSON.stringify({ report: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    // Activity log: mark failed with a short status summary only — never the report content.
    if (admin && case_id) {
      const finalAdmin = admin, finalCaseId = case_id;
      const errorSummary = String(e?.message ?? "unknown error").slice(0, 300);
      EdgeRuntime.waitUntil(
        upsertAgentActivityState(finalAdmin, finalCaseId, "common_ground", null, { status: "failed", error_message: errorSummary }).catch(() => {})
      );
    }
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
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
    if (!query || query.trim().length < 10) {
      console.log(`[common-ground-report] RAG skip: query too short (${query?.trim().length ?? 0} chars)`);
      return { block: "", sources: [], embedding: null };
    }
    const embUrl = OPENAI_API_KEY ? "https://api.openai.com/v1/embeddings" : "https://ai.gateway.lovable.dev/v1/embeddings";
    const embAuthKey = OPENAI_API_KEY || apiKey;
    const embModel = OPENAI_API_KEY ? "text-embedding-3-small" : "openai/text-embedding-3-small";
    const embRes = await fetch(embUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${embAuthKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: embModel, input: query, dimensions: 768 }),
    });
    if (!embRes.ok) {
      console.error(`[common-ground-report] RAG embeddings HTTP ${embRes.status}: ${(await embRes.text()).slice(0, 300)}`);
      return { block: "", sources: [], embedding: null };
    }
    const embJson = await embRes.json();
    const vec = embJson?.data?.[0]?.embedding;
    if (!vec) {
      console.error(`[common-ground-report] RAG embeddings response had no vector: ${JSON.stringify(embJson).slice(0, 300)}`);
      return { block: "", sources: [], embedding: null };
    }
    const { data, error } = await admin.rpc("match_knowledge_base", {
      query_embedding: vec, filter_category: category, match_count: 5, match_threshold: 0.25,
    });
    if (error) {
      console.error(`[common-ground-report] RAG match_knowledge_base RPC error: ${error.message}`);
    }
    if (!data || data.length === 0) {
      console.log(`[common-ground-report] RAG match_knowledge_base returned 0 rows (category=${category})`);
      return { block: "", sources: [], embedding: vec };
    }
    const sources = data.map((r: any) => ({
      title: r.source_title,
      url: r.source_url,
      category: r.category,
      excerpt: String(r.chunk_text ?? "").slice(0, 400),
      similarity: r.similarity,
      page: r.metadata?.page ?? null,
    }));
    const parts = data.map((r: any) =>
      `[Kaynak: ${r.source_title}]\n${r.chunk_text}`
    ).join("\n\n");
    const block = `\n═══ İLGİLİ KAYNAK BİLGİSİ (Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından) ═══\n${parts}\n═══════════════════════════\n`;
    return { block, sources, embedding: vec };
  } catch (e: any) {
    console.error(`[common-ground-report] RAG fetchKnowledgeBlock exception: ${e?.message ?? String(e)}`);
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
// Deterministic citation guard (no extra AI call, no schema change). Copied
// verbatim from party-confidential-analysis/index.ts — this repo has no
// _shared/ module between edge functions, so each function stays self-contained.
// Runs after JSON.parse, before the row is ever persisted.
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
// cites an E./K. number not present in context is dropped entirely. This function's
// own output schema has no precedents field, so this block is a no-op here — kept
// for parity with party-confidential-analysis so both stay identical, copy-paste-able.
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
      `[common-ground-report] citation guard: ${stats.removed} inline künye temizlendi, ${stats.precedentsDropped} precedent kaydı bağlamda doğrulanamadığı için silindi`
    );
  }

  return sanitized;
}
