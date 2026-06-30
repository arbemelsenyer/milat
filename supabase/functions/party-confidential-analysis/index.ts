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

    const partyName = party.party_type === "individual"
      ? `${party.first_name ?? ""} ${party.last_name ?? ""}`.trim()
      : (party.company_name ?? "Taraf");

    const systemPrompt = `Sen bir Türk hukuk arabuluculuk uzmanı AI'sın. Bu tarafın perspektifinden detaylı bir analiz hazırlıyorsun. 
Otomatik olarak: (1) niş hukuki alanı tespit et, (2) ilgili mevzuat ve Yargıtay/BAM emsallerini tara, (3) tarafın pozisyon/ihtiyaç/BATNA analizini yap, (4) yüklenen belgelerden somut bulgular çıkar.
Çıktı YALNIZCA JSON: {"dispute_area":"","legal_framework":{"statutes":[],"precedents":[{"court":"","decision":"","relevance":""}]},"document_findings":[],"party_position":{"strengths":[],"weaknesses":[],"interests":[],"batna":"","watna":""},"risks":[],"opportunities":[],"discovery_questions":[{"id":1,"question":""}]} — tam 5 ihtiyaç tespiti sorusu üret.`;

    const userPrompt = `UYUŞMAZLIK TÜRÜ: ${caseRow?.dispute_type ?? ""} / ${caseRow?.dispute_subtype ?? ""}
BAŞLIK: ${caseRow?.title ?? ""}
TARAF: ${partyName} (rol: ${party.party_role ?? "?"}, tür: ${party.party_type ?? ""})
İLETİŞİM: ${party.email ?? ""} ${party.gsm ?? ""}
UYUŞMAZLIK ÖZETİ: ${caseRow?.issue_description ?? "(belirtilmemiş)"}
YÜKLENEN BELGELER (${docs.length}): ${docs.map((d: any) => `- ${d.file_name}`).join("\n") || "(belge yok)"}
${docExcerpts ? `\nBELGE İÇERİKLERİ (kısmi):\n${docExcerpts}` : ""}
${docReadFailed ? "\nNOT: Bazı belgeler (PDF/Word) metin olarak okunamadı; yalnızca dosya adlarından çıkarım yapıldı." : ""}

Bu tarafın perspektifinden detaylı analiz üret. Yargıtay ve BAM emsallerinden somut karar referansları ver.`;

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

    // Upsert the party_analyses row (one per party per round)
    const { data: existing } = await admin.from("party_analyses")
      .select("id").eq("case_id", case_id).eq("party_id", party_id).maybeSingle();

    if (existing) {
      await admin.from("party_analyses").update({
        analysis: parsed,
        discovery_questions: parsed.discovery_questions ?? [],
      }).eq("id", existing.id);
    } else {
      await admin.from("party_analyses").insert({
        case_id, party_id, user_id: userId,
        analysis: parsed,
        discovery_questions: parsed.discovery_questions ?? [],
      });
    }

    // Seed discovery question rows (party-scoped)
    for (const q of parsed.discovery_questions ?? []) {
      const { data: exists } = await admin.from("case_discovery_questions")
        .select("id").eq("case_id", case_id).eq("party_id", party_id)
        .eq("question_order", q.id ?? 0).maybeSingle();
      if (!exists) {
        await admin.from("case_discovery_questions").insert({
          case_id, party_id, user_id: userId,
          question_text: q.question, question_order: q.id ?? 0,
        });
      }
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
