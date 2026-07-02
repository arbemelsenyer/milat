// Revoke a party invite: invalidates the token hash and logs the event
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

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });

    const { party_id } = await req.json();
    if (!party_id) return new Response(JSON.stringify({ error: "party_id required" }), { status: 400, headers: corsHeaders });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: party } = await admin.from("case_parties")
      .select("id, case_id, cases:case_id(assigned_mediator_id)").eq("id", party_id).maybeSingle();
    if (!party) return new Response(JSON.stringify({ error: "Party not found" }), { status: 404, headers: corsHeaders });

    const { data: isAdminRow } = await admin.from("user_roles")
      .select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    const isMediator = (party as any).cases?.assigned_mediator_id === u.user.id;
    if (!isAdminRow && !isMediator) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Invalidate the invite (rotate hash to random so any prior token is dead)
    const rand = crypto.randomUUID() + ":revoked:" + Date.now();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rand));
    const tokenHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

    await admin.from("case_party_invites").update({
      invite_status: "revoked", token_hash: tokenHash, updated_at: new Date().toISOString(),
    }).eq("case_party_id", party_id);
    await admin.from("case_parties").update({ invite_status: "revoked" }).eq("id", party_id);

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
    await admin.from("party_invite_logs").insert({
      case_id: party.case_id, party_id: party.id, event_type: "revoked", ip_address: ip,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
