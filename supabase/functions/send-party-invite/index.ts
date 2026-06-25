// Send invite email to a party so they can sign in and access only their data
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });

    const { party_id, app_url } = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: party } = await admin.from("case_parties")
      .select("id, case_id, email, first_name, last_name, company_name, party_type, invite_token, cases:case_id(assigned_mediator_id, application_no)")
      .eq("id", party_id).maybeSingle();
    if (!party) return new Response(JSON.stringify({ error: "Party not found" }), { status: 404, headers: corsHeaders });
    if ((party as any).cases?.assigned_mediator_id !== u.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    let token = party.invite_token;
    if (!token) {
      token = crypto.randomUUID();
      await admin.from("case_parties").update({ invite_token: token, invite_status: "pending" }).eq("id", party_id);
    }

    const name = party.party_type === "individual"
      ? `${party.first_name ?? ""} ${party.last_name ?? ""}`.trim() || "Sayın Taraf"
      : party.company_name || "Sayın Taraf";

    const inviteUrl = `${app_url || ""}/auth?invite=${token}`;
    const applicationNo = (party as any).cases?.application_no ?? "";

    if (resendKey && party.email) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MediPact AI <onboarding@resend.dev>",
          to: [party.email],
          subject: `Arabuluculuk Davet - ${applicationNo}`,
          html: `<p>Sayın ${name},</p>
                 <p>${applicationNo} numaralı arabuluculuk dosyasına taraf olarak davet edildiniz. Aşağıdaki bağlantıdan giriş yaparak sürece katılabilirsiniz.</p>
                 <p><a href="${inviteUrl}">${inviteUrl}</a></p>
                 <p>Yalnızca kendi belgelerinizi ve analizinizi görebilirsiniz. Diğer tarafın verileri gizli kalır.</p>
                 <p>MediPact AI</p>`,
        }),
      });
      if (!emailRes.ok) console.error("Resend error", await emailRes.text());
    }

    return new Response(JSON.stringify({ invite_url: inviteUrl, token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
