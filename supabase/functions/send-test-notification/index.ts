import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendResend(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "MediPact AI <notifications@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { channels } = (await req.json().catch(() => ({}))) as { channels?: { email?: boolean; inapp?: boolean } };
    const wantEmail = channels?.email ?? true;
    const wantInapp = channels?.inapp ?? true;

    const result: { email?: { ok: boolean; error?: string }; inapp?: { ok: boolean; error?: string } } = {};

    if (wantInapp) {
      const { error } = await supabase.rpc("create_notification", {
        p_user_id: user.id,
        p_title: "Deneme bildirimi",
        p_message: "Bu, bildirim ayarlarınızın çalıştığını doğrulayan bir test bildirimidir.",
        p_type: "info",
        p_link: "/notification-settings",
      });
      result.inapp = error ? { ok: false, error: error.message } : { ok: true };
    }

    if (wantEmail) {
      try {
        if (!user.email) throw new Error("Kullanıcı e-postası yok");
        await sendResend(
          user.email,
          "MediPact AI — Deneme bildirimi",
          `<div style="font-family:sans-serif;padding:24px"><h2>Deneme bildirimi</h2><p>Bu, MediPact AI bildirim ayarlarınızın çalıştığını doğrulayan bir test e-postasıdır.</p><p style="color:#666;font-size:12px">Bu mesajı siz talep ettiniz. Aksi halde yok sayabilirsiniz.</p></div>`
        );
        result.email = { ok: true };
      } catch (e: any) {
        result.email = { ok: false, error: e.message };
      }
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
