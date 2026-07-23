// Send invite email to a party so they can sign in and access only their data
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // Declared outside the try block so the catch clause can still surface
  // invite_url/token if the failure happened after they were minted (e.g. Resend error).
  let token: string | undefined;
  let inviteUrl: string | undefined;
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
      .select("id, case_id, email, first_name, last_name, company_name, party_type, cases:case_id(assigned_mediator_id, application_no, user_id)")
      .eq("id", party_id).maybeSingle();
    if (!party) return new Response(JSON.stringify({ error: "Party not found" }), { status: 404, headers: corsHeaders });

    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    const isPrivileged = !!roleRow
      || (party as any).cases?.assigned_mediator_id === u.user.id
      || (party as any).cases?.user_id === u.user.id;
    if (!isPrivileged) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Always mint a fresh token; only its SHA-256 hash is persisted so the
    // plaintext value never leaves this response.
    token = crypto.randomUUID();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: existingInvite } = await admin.from("case_party_invites")
      .select("id, invite_status").eq("case_party_id", party_id).maybeSingle();
    if (existingInvite && existingInvite.invite_status === "accepted") {
      return new Response(JSON.stringify({ error: "Invite already accepted" }), { status: 409, headers: corsHeaders });
    }
    if (existingInvite) {
      await admin.from("case_party_invites").update({
        token_hash: tokenHash, invite_status: "pending", updated_at: new Date().toISOString(),
      }).eq("id", existingInvite.id);
    } else {
      await admin.from("case_party_invites").insert({
        case_party_id: party_id, token_hash: tokenHash, invite_status: "pending",
      });
    }
    await admin.from("case_parties").update({ invite_status: "pending" }).eq("id", party_id);

    const name = party.party_type === "individual"
      ? `${party.first_name ?? ""} ${party.last_name ?? ""}`.trim() || "Sayın Taraf"
      : party.company_name || "Sayın Taraf";

    // Validate app_url against allowed origins to prevent phishing via open redirect
    const allowedOrigins = (Deno.env.get("APP_ALLOWED_ORIGINS") ??
      "https://medipact-ai.lovable.app,https://id-preview--5ffedb1b-4087-4fe1-a1ef-873c9754f71d.lovable.app")
      .split(",").map((s) => s.trim()).filter(Boolean);
    let baseUrl = allowedOrigins[0];
    if (app_url && typeof app_url === "string") {
      try {
        const u = new URL(app_url);
        const origin = `${u.protocol}//${u.host}`;
        if (allowedOrigins.includes(origin)) baseUrl = origin;
      } catch { /* invalid URL -> fallback */ }
    }
    inviteUrl = `${baseUrl}/auth?invite=${token}`;
    const applicationNo = (party as any).cases?.application_no ?? "";

    if (resendKey && party.email) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MİLAT Arabuluculuk <info@milatmediation.com>",
          to: [party.email],
          subject: `Arabuluculuk Davet - ${applicationNo}`,
          html: `<p>Sayın ${name},</p>
                 <p>${applicationNo} numaralı arabuluculuk dosyasına taraf olarak davet edildiniz. Aşağıdaki bağlantıdan giriş yaparak sürece katılabilirsiniz.</p>
                 <p><a href="${inviteUrl}">${inviteUrl}</a></p>
                 <p>Yalnızca kendi belgelerinizi ve analizinizi görebilirsiniz. Diğer tarafın verileri gizli kalır.</p>
                 <p>MediPact AI</p>`,
        }),
      });
      if (!emailRes.ok) {
        const errText = await emailRes.text();
        throw new Error(`Resend API error: ${emailRes.status} - ${errText}`);
      }
    }

    return new Response(JSON.stringify({ invite_url: inviteUrl, token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, invite_url: inviteUrl, token }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
