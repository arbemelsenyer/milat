// Orchestrator v1 (Causa Prima) — Parça 1: analiz zinciri motoru.
// classify-dispute → detect-legal-deadlines → party-confidential-analysis (her taraf) →
// party-consistency-check (her taraf, best-effort) → party-communication-analysis (her taraf,
// best-effort) → common-ground-report.
// Mevcut function'ların hiçbirinin kodu değişmedi — her adım kendi HTTP arayüzünden,
// çağıranın Authorization header'ı aynen ileri iletilerek (aynı kullanıcı kimliğiyle) tetikleniyor;
// multi-agent-negotiation'ın agent:"all" sıralı-zincir deseniyle birebir aynı mantık.
// Kapsam dışı (bilinçli): multi-agent-negotiation (Kör Teklif) ve generate-official-document
// (belge üretimi mediator kontrolünde) — bu zincire dahil edilmedi.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// Takılı koşu eşiği: bu süreden eski, hâlâ "running" görünen orchestrator satırı
// yarıda kalmış bir koşudur; yeni koşu başlarken kapatılır.
const STALE_RUNNING_MS = 30 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Admin = ReturnType<typeof createClient>;

// Orkestratörün kendi ilerleme satırı: agent_type="orchestrator", party_id=null (case başına tek satır).
async function upsertOrchestratorState(admin: Admin, case_id: string, patch: Record<string, unknown>) {
  const { data: existing } = await admin.from("agent_states")
    .select("id").eq("case_id", case_id).eq("agent_type", "orchestrator").is("party_id", null).maybeSingle();
  // supabase-js DB hatasını FIRLATMAZ, {error} olarak döndürür — kontrol edilmezse
  // yazım sessizce düşer ve satır eski durumunda ("running") asılı kalır.
  const { error } = existing?.id
    ? await admin.from("agent_states").update(patch).eq("id", existing.id)
    : await admin.from("agent_states").insert({ case_id, agent_type: "orchestrator", party_id: null, ...patch });
  if (error) throw error;
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

// Belirli bir adımın KENDİ agent_states satırını yazar — ilgili function'ların
// kullandığı anahtarın aynısı (case_id + agent_type + party_id). flagSkippedStep'ten
// farkı: durumu ve last_output'u çağıran belirler.
async function upsertStepState(
  admin: Admin, case_id: string, agent_type: string, party_id: string | null, patch: Record<string, unknown>,
) {
  let query = admin.from("agent_states").select("id").eq("case_id", case_id).eq("agent_type", agent_type);
  query = party_id ? query.eq("party_id", party_id) : query.is("party_id", null);
  const { data: existing } = await query.maybeSingle();
  const { error } = existing?.id
    ? await admin.from("agent_states").update(patch).eq("id", existing.id)
    : await admin.from("agent_states").insert({ case_id, agent_type, party_id, ...patch });
  if (error) throw error;
}

// İletişim analizinin ön koşulu: dosyada görüşme malzemesi var mı?
// Kaynak (1) case_notes, phase=7 — MeetingNotesPanel/analyze-meeting-notes akışının
// görüşme notlarını yazdığı yer; (2) case_sessions.notes — oturum özeti alanı.
// En az bir kayıt varsa VAR sayılır.
// Sorgu hata verirse VAR kabul edilir: geçici bir okuma hatası yüzünden analiz sessizce
// atlanmasın — gereksiz çalıştırmak, sessizce atlamaktan daha az zararlı.
async function hasMeetingMaterial(admin: Admin, case_id: string): Promise<boolean> {
  try {
    const [notesRes, sessionsRes] = await Promise.all([
      admin.from("case_notes").select("id", { count: "exact", head: true }).eq("case_id", case_id).eq("phase", 7),
      admin.from("case_sessions").select("id").eq("case_id", case_id).not("notes", "is", null).neq("notes", "").limit(1),
    ]);
    if (notesRes.error || sessionsRes.error) {
      console.error("[orchestrator-run] görüşme malzemesi kontrolü hata verdi — analiz çalıştırılacak:",
        notesRes.error?.message ?? sessionsRes.error?.message);
      return true;
    }
    return (notesRes.count ?? 0) > 0 || (sessionsRes.data ?? []).length > 0;
  } catch (e: any) {
    console.error(`[orchestrator-run] görüşme malzemesi kontrolü başarısız — analiz çalıştırılacak: ${e?.message ?? String(e)}`);
    return true;
  }
}

async function callFn(
  supabaseUrl: string, authHeader: string, anonKey: string, name: string, body: unknown,
  cronSecret?: string,
) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
      "Content-Type": "application/json",
      // İç çağrı zinciri: alt fonksiyonlar da aynı kapıdan geçer (kullanıcı JWT'si yok).
      ...(cronSecret ? { "x-cron-secret": cronSecret } : {}),
    },
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
  // chainStarted: orchestrator satırı açıldı mı (yetki/doğrulama dönüşlerinde satır
  // hiç yazılmadığı için finally'nin dokunmaması gerekir).
  // terminalWritten: completed/failed yazımı yapıldı mı — finally yalnız yazılmadıysa
  // devreye girer ve fail()'in özel mesajının üzerine yazmaz.
  let chainStarted = false;
  let terminalWritten = false;

  try {
    // İç çağrı kapısı (create-video-room / randevu-teklif ile aynı desen): x-cron-secret
    // CRON_SECRET ile eşleşirse kullanıcı JWT'si aranmaz. Kullanıcı yolu aynen kalır.
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!isCron && !userData?.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });

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
      .select("role").eq("user_id", userData?.user?.id ?? "").eq("role", "admin").maybeSingle();
    const allowed = isCron || caseRow.assigned_mediator_id === userData?.user?.id || caseRow.user_id === userData?.user?.id || !!roleRow;
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const finalAdmin = admin, finalCaseId = case_id;
    const steps: Array<{ step: string; status: "completed" | "skipped" | "failed"; detail?: string }> = [];

    // Adım başarısız → orchestrator + o adımın kendi satırını "failed" yaz, arabulucuya bildir,
    // zinciri burada durdur (multi-agent-negotiation'daki throw deseniyle aynı sertlikte).
    const fail = async (agent_type: string, party_id: string | null, message: string) => {
      const errorSummary = message.slice(0, 300);
      const settled = await Promise.allSettled([
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
              p_link: `/cases/${finalCaseId}`,
            })
          : Promise.resolve(),
      ]);
      // Terminal durum burada yazıldıysa finally üzerine yazmasın. Yazım düştüyse
      // bayrak açılmaz ve finally satırı yine de terminal duruma getirir.
      terminalWritten = settled[0].status === "fulfilled";
      return new Response(JSON.stringify({ error: `${agent_type} failed`, detail: errorSummary, steps }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    };

    // Ara ilerleme yazımları BEST-EFFORT: geçici bir agent_states hatası zinciri
    // durdurmasın. Terminal durum yazımı (completed/failed) ise strict — doğrulanır.
    const progress = async (current_step: string) => {
      try {
        await upsertOrchestratorState(finalAdmin, finalCaseId, {
          status: "running", error_message: null, last_output: { current_step },
        });
      } catch (e: any) {
        console.error(`[orchestrator-run] ilerleme yazımı başarısız (${current_step}): ${e?.message ?? String(e)}`);
      }
    };

    // Takılı koşu temizliği: 30 dakikadan eski, hâlâ "running" duran orchestrator satırı
    // yarıda kalmış bir koşudur (canlıda görüldü: ortak zemin bitti, terminal durum
    // yazılmadı, panel sonsuza kadar döndü). Yeni koşuyu engellemesin diye kapatılır.
    // Kendi satırımızı yazmadan ÖNCE çalışır. Best-effort: hatası zinciri durdurmaz.
    try {
      const { data: stale } = await admin.from("agent_states")
        .select("id, status, updated_at").eq("case_id", case_id)
        .eq("agent_type", "orchestrator").is("party_id", null).maybeSingle();
      if (stale?.status === "running" && Date.now() - new Date(stale.updated_at as string).getTime() > STALE_RUNNING_MS) {
        await admin.from("agent_states")
          .update({ status: "failed", error_message: "önceki koşu yarıda kaldı" })
          .eq("id", stale.id);
        console.log(`[orchestrator-run] takılı kalmış önceki koşu kapatıldı: case=${case_id}`);
      }
    } catch (e: any) {
      console.error(`[orchestrator-run] takılı koşu temizliği başarısız: ${e?.message ?? String(e)}`);
    }

    chainStarted = true;
    await progress("classify_dispute");

    // ---- 1) classify-dispute ----
    const classifyText = (caseRow.issue_description || caseRow.title || "").trim();
    let disputeType: string | null = caseRow.dispute_type ?? null;
    if (classifyText.length < 5) {
      await flagSkippedStep(admin, case_id, "classify_dispute", null, "uyuşmazlık metni yok/çok kısa (issue_description ve title boş)");
      steps.push({ step: "classify_dispute", status: "skipped", detail: "metin yok" });
    } else {
      const r = await callFn(supabaseUrl, authHeader, anonKey, "classify-dispute", { case_id, text: classifyText, persist: true }, isCron ? CRON_SECRET : undefined);
      if (!r.ok) return await fail("classify_dispute", null, r.json?.error ?? `HTTP ${r.status}`);
      disputeType = r.json?.kategori ?? disputeType;
      steps.push({ step: "classify_dispute", status: "completed", detail: disputeType ?? undefined });
    }

    await progress("deadline_detect");

    // ---- 2) detect-legal-deadlines ----
    if (!disputeType) {
      await flagSkippedStep(admin, case_id, "deadline_detect", null, "dispute_type yok (classify-dispute atlandı veya sonuç üretmedi)");
      steps.push({ step: "deadline_detect", status: "skipped", detail: "dispute_type yok" });
    } else {
      const r = await callFn(supabaseUrl, authHeader, anonKey, "detect-legal-deadlines", {
        case_id, dispute_type: disputeType, dispute_text: classifyText, persist: true,
      }, isCron ? CRON_SECRET : undefined);
      if (!r.ok) return await fail("deadline_detect", null, r.json?.error ?? `HTTP ${r.status}`);
      steps.push({ step: "deadline_detect", status: "completed" });
    }

    await progress("party_analysis");

    // ---- 3) party-confidential-analysis (her taraf) ----
    const { data: parties } = await admin.from("case_parties").select("id").eq("case_id", case_id);
    if (!parties || parties.length === 0) {
      await flagSkippedStep(admin, case_id, "party_analysis", null, "case_parties boş — analiz edilecek taraf yok");
      steps.push({ step: "party_analysis", status: "skipped", detail: "taraf yok" });
    } else {
      for (const p of parties) {
        const r = await callFn(supabaseUrl, authHeader, anonKey, "party-confidential-analysis", { case_id, party_id: p.id }, isCron ? CRON_SECRET : undefined);
        if (!r.ok) return await fail("party_analysis", p.id, r.json?.error ?? `HTTP ${r.status}`);
      }
      steps.push({ step: "party_analysis", status: "completed", detail: `${parties.length} taraf` });
    }

    // ---- 3b) İç Tutarlılık Denetimi + 3c) İletişim İzi Analizi (her taraf, sırayla) ----
    // BEST-EFFORT (bilinçli): bu iki adım zinciri DURDURMAZ. Hata alan taraf uyarı olarak
    // steps[] özetine yazılır, döngü sıradaki tarafla devam eder ve ortak zemin adımı her
    // hâlükârda çalışır. Adımın kendi agent_states satırını ilgili function kendisi yazıyor;
    // burada üzerine yazılmaz. Mevcut adımların sırası ve davranışı değişmedi.
    const bestEffortSteps: Array<{ step: string; fn: string }> = [
      { step: "party_consistency", fn: "party-consistency-check" },
      { step: "party_communication", fn: "party-communication-analysis" },
    ];
    for (const be of bestEffortSteps) {
      if (!parties || parties.length === 0) {
        await flagSkippedStep(admin, case_id, be.step, null, "case_parties boş — analiz edilecek taraf yok");
        steps.push({ step: be.step, status: "skipped", detail: "taraf yok" });
        continue;
      }

      // İletişim analizi KOŞULLU: dosyada görüşme malzemesi yoksa hiçbir taraf için
      // çağrılmaz. Zincirden çıkarılmadı — atlandığı, her tarafın kendi satırında
      // gerekçesiyle görünür. İç tutarlılık denetimi bu koşuldan etkilenmez.
      if (be.step === "party_communication" && !(await hasMeetingMaterial(admin, case_id))) {
        for (const p of parties) {
          try {
            await upsertStepState(admin, case_id, be.step, p.id, {
              status: "completed",
              error_message: null,
              last_output: { current_step: "atlandı — görüşme notu yok" },
            });
          } catch (e: any) {
            console.error(`[orchestrator-run] ${be.step} atlandı satırı yazılamadı: ${e?.message ?? String(e)}`);
          }
        }
        console.log(`[orchestrator-run] ${be.step} atlandı: görüşme notu yok (case=${case_id})`);
        steps.push({ step: be.step, status: "skipped", detail: "görüşme notu yok" });
        continue;
      }

      await progress(be.step);
      const failures: string[] = [];
      for (const p of parties) {
        try {
          const res = await callFn(supabaseUrl, authHeader, anonKey, be.fn, { case_id, party_id: p.id }, isCron ? CRON_SECRET : undefined);
          if (!res.ok) failures.push(`${p.id}: ${res.json?.error ?? `HTTP ${res.status}`}`);
        } catch (e: any) {
          failures.push(`${p.id}: ${String(e?.message ?? e)}`);
        }
      }
      if (failures.length > 0) {
        console.error(`[orchestrator-run] ${be.step} best-effort hata:`, failures.join(" | ").slice(0, 500));
        steps.push({
          step: be.step,
          status: "failed",
          detail: `${failures.length}/${parties.length} taraf hata verdi — zincir devam etti`,
        });
      } else {
        steps.push({ step: be.step, status: "completed", detail: `${parties.length} taraf` });
      }
    }

    await progress("common_ground");

    // ---- 4) common-ground-report ----
    const r = await callFn(supabaseUrl, authHeader, anonKey, "common-ground-report", { case_id }, isCron ? CRON_SECRET : undefined);
    if (!r.ok) return await fail("common_ground", null, r.json?.error ?? `HTTP ${r.status}`);
    steps.push({ step: "common_ground", status: "completed" });

    // "completed" yazımı artık AWAIT ediliyor. Eskiden EdgeRuntime.waitUntil ile
    // gönderiliyordu; cevap dönerken izolat sonlandığında bu yazım kayboluyordu —
    // canlıda ortak zemin bittiği hâlde satır "running" kaldı (11.08 09:56 koşusu).
    await upsertOrchestratorState(finalAdmin, finalCaseId, {
      status: "completed", error_message: null, last_output: { steps },
    });
    terminalWritten = true;

    return new Response(JSON.stringify({ success: true, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (admin && case_id) {
      const errorSummary = String(e?.message ?? "unknown error").slice(0, 300);
      try {
        await upsertOrchestratorState(admin, case_id, { status: "failed", error_message: errorSummary });
        terminalWritten = true;
      } catch (stateErr: any) {
        console.error(`[orchestrator-run] hata durumu yazılamadı: ${stateErr?.message ?? String(stateErr)}`);
      }
    }
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    // MUTLAK GARANTİ: zincir hangi yoldan çıkarsa çıksın orchestrator satırı terminal
    // duruma gelir. Yukarıdaki yollardan biri zaten yazdıysa (terminalWritten) burası
    // dokunmaz; hiçbiri yazamadıysa satır "running" olarak asılı kalmasın diye kapatılır.
    if (chainStarted && !terminalWritten && admin && case_id) {
      try {
        await upsertOrchestratorState(admin, case_id, {
          status: "failed",
          error_message: "koşu terminal durum yazılmadan sonlandı",
        });
      } catch (e: any) {
        console.error(`[orchestrator-run] finally terminal durum yazımı başarısız: ${e?.message ?? String(e)}`);
      }
    }
  }
});
