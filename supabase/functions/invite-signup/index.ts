// Create an account for an invited (unauthenticated) party using a party-invite token.
// Public self-signup is disabled at the project level (Auth > disable_signup), so this
// uses the service-role admin API to bypass that gate — but only when the caller holds
// a valid, still-pending case_party_invites token. Uninvited signups still hit the
// disabled public signup endpoint and are rejected there.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, email: rawEmail, password, fullName } = await req.json();
    const email = String(rawEmail ?? "").trim().toLowerCase();

    if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: corsHeaders });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Geçerli bir e-posta adresi girin." }), { status: 400, headers: corsHeaders });
    }
    if (!password || String(password).length < 6) {
      return new Response(JSON.stringify({ error: "Şifre en az 6 karakter olmalıdır." }), { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const enc = new TextEncoder().encode(String(token));
    const digest = await crypto.subtle.digest("SHA-256", enc);
    const tokenHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: invite } = await admin.from("case_party_invites")
      .select("id, case_party_id, invite_status")
      .eq("token_hash", tokenHash).maybeSingle();
    if (!invite) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 404, headers: corsHeaders });
    if (invite.invite_status !== "pending") {
      return new Response(JSON.stringify({ error: "Invite already used or expired" }), { status: 409, headers: corsHeaders });
    }

    const { data: party } = await admin.from("case_parties")
      .select("id, user_id").eq("id", invite.case_party_id).maybeSingle();
    if (!party) return new Response(JSON.stringify({ error: "Party not found" }), { status: 404, headers: corsHeaders });
    if (party.user_id) {
      return new Response(JSON.stringify({ error: "Party slot already claimed" }), { status: 409, headers: corsHeaders });
    }

    const fullNameTrimmed = fullName ? String(fullName).trim().slice(0, 100) : undefined;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullNameTrimmed ? { full_name: fullNameTrimmed } : undefined,
    });

    if (createErr) {
      const msg = createErr.message || "Hesap oluşturulamadı.";
      const friendly = msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")
        ? "Bu e-posta adresi zaten kayıtlı."
        : `Hesap oluşturulamadı: ${msg}`;
      return new Response(JSON.stringify({ error: friendly }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, userId: created?.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
