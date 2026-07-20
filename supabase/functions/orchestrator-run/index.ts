// Orchestrator v1 (Causa Prima) — Parça 1: analiz zinciri motoru.
// classify-dispute → detect-legal-deadlines → party-confidential-analysis (her taraf) → common-ground-report.
// Mevcut function'ların hiçbirinin kodu değişmedi — her adım kendi HTTP arayüzünden,
// çağıranın Authorization header'ı aynen ileri iletilerek (aynı kullanıcı kimliğiyle) tetikleniyor;
// multi-agent-negotiation'ın agent:"all" sıralı-zincir deseniyle birebir aynı mantık.
// Kapsam dışı (bilinçli): multi-agent-negotiation (Kör Teklif) ve generate-official-document
// (belge üretimi mediator kontrolünde) — bu zincire dahil edilmedi.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Admin = ReturnType<typeof createClient>;

// Orkestratörün kendi ilerleme satırı: agent_type="orchestrator", party_id=null (case başına tek satır).
async function upsertOrchestratorState(admin: Admin, case_id: string, patch: Record<string, unknown>) {
  const { data: existing } = await admin.from("agent_states")
    .select("id").eq("case_id", case_id).eq("agent_type", "orchestrator").is("party_id", null).maybeSingle();
  if (existing?.id) {
    await admin.from("agent_states").update(patch).eq("id", existing.id);
  } else {
    await admin.from("agent_states").insert({ case_id, agent_type: "orchestrator", party_id: null, ...patch });
  }
}

// Bir adımı ATLARKEN, o adımın KENDİ agent_states satırını (mevcut function'ların yazdığı
// aynı satır) "flagged" + neden ile işaretler — panelde ilgili kart üzerinde görünür,
// orchestrator'ın kendi satırına gömülü kalmaz.
async function flagSkippedStep(admin: Admin, case_id: string, agent_type: string, party_id: string | null, reason: string) {
  let query = admin.from("agent_states").select("id").eq("case_id", case_id).eq("agent_type", agent_type);
  query = party_id ? query.eq("party_id", party_id) : query.is("party_id", null);
  const { data: existing } = await query.maybeSingle();
  const patch = { status: "flagged", error_message: `Atlandı: ${reason}` };
  if (existing?.id) {
    await admin.from("agent_states").update(patch).eq("id", existing.id);
  } else {
    await admin.from("agent_states").insert({ case_id, agent_type, party_id, ...patch });
  }
}

async function callFn(supabaseUrl: string, authHeader: string, anonKey: string, name: string, body: unknown) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: { Authorization: authHeader, apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON response */ }
  return { ok: res.ok, status: res.status, json };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let admin: Admin | null = null;
  let case_id: string | undefined;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    case_id = body.case_id;
    if (!case_id) return new Response(JSON.stringify({ error: "case_id required" }), { status: 400, headers: corsHeaders });

    admin = createClient(supabaseUrl, serviceKey);

    const { data: caseRow } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, dispute_type, issue_description, title")
      .eq("id", case_id).maybeSingle();
    if (!caseRow) return new Response(JSON.stringify({ error: "Case not found" }), { status: 404, headers: corsHeaders });

    // Aynı yetki kapısı common-ground-report ile birebir: sadece arabulucu/dosya sahibi/admin.
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).in("role", ["admin", "mediator"]).maybeSingle();
    const allowed = caseRow.assigned_mediator_id === userData.user.id || caseRow.user_id === userData.user.id || !!roleRow;
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const finalAdmin = admin, finalCaseId = case_id;
    const steps: Array<{ step: string; status: "completed" | "skipped" | "failed"; detail?: string }> = [];

    // Adım başarısız → orchestrator + o adımın kendi satırını "failed" yaz, arabulucuya bildir,
    // zinciri burada durdur (multi-agent-negotiation'daki throw deseniyle aynı sertlikte).
    const fail = async (agent_type: string, party_id: string | null, message: string) => {
      const errorSummary = message.slice(0, 300);
      await Promise.allSettled([
        upsertOrchestratorState(finalAdmin, finalCaseId, {
          status: "failed",
          error_message: `${agent_type} adımında durdu: ${errorSummary}`,
        }),
        (async () => {
          let query = finalAdmin.from("agent_states").select("id").eq("case_id", finalCaseId).eq("agent_type", agent_type);
          query = party_id ? query.eq("party_id", party_id) : query.is("party_id", null);
          const { data: existing } = await query.maybeSingle();
          const patch = { status: "failed", error_message: errorSummary };
          if (existing?.id) await finalAdmin.from("agent_states").update(patch).eq("id", existing.id);
          else await finalAdmin.from("agent_states").insert({ case_id: finalCaseId, agent_type, party_id, ...patch });
        })(),
        caseRow.assigned_mediator_id
          ? finalAdmin.rpc("create_notification", {
              p_user_id: caseRow.assigned_mediator_id,
              p_title: "Orkestratör Zinciri Durdu",
              p_message: `"${caseRow.title ?? finalCaseId}" dosyasında ${agent_type} adımı hata verdi: ${errorSummary}`,
              p_type: "orchestrator_failed",
              p_link: `/case-room/${finalCaseId}`,
            })
          : Promise.resolve(),
      ]);
      return new Response(JSON.stringify({ error: `${agent_type} failed`, detail: errorSummary, steps }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    };

    await upsertOrchestratorState(admin, case_id, {
      status: "running", error_message: null, last_output: { current_step: "classify_dispute" },
    });

    // ---- 1) classify-dispute ----
    const classifyText = (caseRow.issue_description || caseRow.title || "").trim();
    let disputeType: string | null = caseRow.dispute_type ?? null;
    if (classifyText.length < 5) {
      await flagSkippedStep(admin, case_id, "classify_dispute", null, "uyuşmazlık metni yok/çok kısa (issue_description ve title boş)");
      steps.push({ step: "classify_dispute", status: "skipped", detail: "metin yok" });
    } else {
      const r = await callFn(supabaseUrl, authHeader, anonKey, "classify-dispute", { case_id, text: classifyText, persist: true });
      if (!r.ok) return await fail("classify_dispute", null, r.json?.error ?? `HTTP ${r.status}`);
      disputeType = r.json?.kategori ?? disputeType;
      steps.push({ step: "classify_dispute", status: "completed", detail: disputeType ?? undefined });
    }

    await upsertOrchestratorState(admin, case_id, {
      status: "running", error_message: null, last_output: { current_step: "deadline_detect" },
    });

    // ---- 2) detect-legal-deadlines ----
    if (!disputeType) {
      await flagSkippedStep(admin, case_id, "deadline_detect", null, "dispute_type yok (classify-dispute atlandı veya sonuç üretmedi)");
      steps.push({ step: "deadline_detect", status: "skipped", detail: "dispute_type yok" });
    } else {
      const r = await callFn(supabaseUrl, authHeader, anonKey, "detect-legal-deadlines", {
        case_id, dispute_type: disputeType, dispute_text: classifyText, persist: true,
      });
      if (!r.ok) return await fail("deadline_detect", null, r.json?.error ?? `HTTP ${r.status}`);
      steps.push({ step: "deadline_detect", status: "completed" });
    }

    await upsertOrchestratorState(admin, case_id, {
      status: "running", error_message: null, last_output: { current_step: "party_analysis" },
    });

    // ---- 3) party-confidential-analysis (her taraf) ----
    const { data: parties } = await admin.from("case_parties").select("id").eq("case_id", case_id);
    if (!parties || parties.length === 0) {
      await flagSkippedStep(admin, case_id, "party_analysis", null, "case_parties boş — analiz edilecek taraf yok");
      steps.push({ step: "party_analysis", status: "skipped", detail: "taraf yok" });
    } else {
      for (const p of parties) {
        const r = await callFn(supabaseUrl, authHeader, anonKey, "party-confidential-analysis", { case_id, party_id: p.id });
        if (!r.ok) return await fail("party_analysis", p.id, r.json?.error ?? `HTTP ${r.status}`);
      }
      steps.push({ step: "party_analysis", status: "completed", detail: `${parties.length} taraf` });
    }

    await upsertOrchestratorState(admin, case_id, {
      status: "running", error_message: null, last_output: { current_step: "common_ground" },
    });

    // ---- 4) common-ground-report ----
    const r = await callFn(supabaseUrl, authHeader, anonKey, "common-ground-report", { case_id });
    if (!r.ok) return await fail("common_ground", null, r.json?.error ?? `HTTP ${r.status}`);
    steps.push({ step: "common_ground", status: "completed" });

    EdgeRuntime.waitUntil(
      upsertOrchestratorState(finalAdmin, finalCaseId, {
        status: "completed", error_message: null, last_output: { steps },
      }).catch(() => {})
    );

    return new Response(JSON.stringify({ success: true, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (admin && case_id) {
      const finalAdmin = admin, finalCaseId = case_id;
      const errorSummary = String(e?.message ?? "unknown error").slice(0, 300);
      EdgeRuntime.waitUntil(
        upsertOrchestratorState(finalAdmin, finalCaseId, { status: "failed", error_message: errorSummary }).catch(() => {})
      );
    }
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
