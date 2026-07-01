// Cron job: sends 3-day-before-deadline notifications for cases that haven't been warned yet.
// Trigger via pg_cron or manual invoke. Uses service role.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (cronSecret && provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const nowIso = new Date().toISOString();
  const in3days = new Date(Date.now() + 3 * 86400000).toISOString();

  // Cases with a deadline in the next 3 days that haven't been warned yet
  const { data: rows, error } = await admin
    .from("cases")
    .select("id, user_id, assigned_mediator_id, application_no, title, deadline_total, deadline_extended, extension_used, deadline_warning_sent")
    .eq("deadline_warning_sent", false)
    .not("deadline_total", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  for (const c of rows ?? []) {
    const dl = (c.extension_used && c.deadline_extended) ? c.deadline_extended : c.deadline_total;
    if (!dl) continue;
    if (dl < nowIso) continue;
    if (dl > in3days) continue;

    const targets = [c.user_id, c.assigned_mediator_id].filter(Boolean) as string[];
    for (const uid of targets) {
      try {
        await admin.rpc("create_notification", {
          p_user_id: uid,
          p_title: "⏰ Süre bitişine 3 gün kaldı",
          p_message: `${c.application_no ?? "Başvuru"} — "${c.title ?? ""}" için yasal arabuluculuk süresi ${new Date(dl).toLocaleDateString("tr-TR")} tarihinde doluyor.`,
          p_type: "warning",
          p_link: `/mediation?case=${c.id}`,
        });
      } catch (_) { /* continue */ }
    }
    await admin.from("cases").update({ deadline_warning_sent: true } as any).eq("id", c.id);
    sent++;
  }

  return new Response(JSON.stringify({ processed: rows?.length ?? 0, notified: sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
