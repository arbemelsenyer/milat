// Bind logged-in user to a case_party via invite token
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { olayYaz } from "../_shared/olay.ts";

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

    const { token } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: corsHeaders });

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
      .select("id, case_id, user_id").eq("id", invite.case_party_id).maybeSingle();
    if (!party) return new Response(JSON.stringify({ error: "Party not found" }), { status: 404, headers: corsHeaders });
    if (party.user_id) {
      return new Response(JSON.stringify({ error: "Party slot already claimed" }), { status: 409, headers: corsHeaders });
    }


    // 25.08.2026 — uc yazimin sonucu da OKUNMUYORDU. KATILIMI GERCEKLESTIREN
    // yazim asagidaki BIRINCISIDIR (`case_parties.user_id` baglanmasi). Sessizce
    // basarisiz olursa taraf "katildiniz" cevabini alir ama erisimi olmaz; ustelik
    // davet "accepted" isaretlenirse yeniden davet de 409 doner ve taraf KALICI
    // OLARAK DISARIDA KALIR. Once bag kurulur, ancak basarili olursa devam edilir.
    const { error: bagErr } = await admin.from("case_parties").update({
      user_id: u.user.id, invite_status: "accepted",
    }).eq("id", party.id);
    if (bagErr) {
      console.error("[accept-party-invite] taraf bağlanamadı", { party_id: party.id, error: bagErr.message });
      return new Response(
        JSON.stringify({ error: `Katılım tamamlanamadı, davetiniz hâlâ geçerli: ${bagErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Buradan sonrasi erisimi etkilemez; eksik kalirsa kayda dusurulur.
    const { error: davetErr } = await admin.from("case_party_invites").update({
      invite_status: "accepted", accepted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", invite.id);
    if (davetErr) console.error("[accept-party-invite] davet durumu yazılamadı", { invite: invite.id, error: davetErr.message });

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
    const { error: izErr } = await admin.from("party_invite_logs").insert({
      case_id: party.case_id, party_id: party.id, event_type: "accepted", ip_address: ip,
    });
    if (izErr) console.error("[accept-party-invite] katılım izi yazılamadı", { party_id: party.id, error: izErr.message });

    // AKIŞ OLAYI (best-effort): taraf daveti kabul etti ve hesabına bağlandı.
    await olayYaz(admin, {
      case_id: party.case_id, party_id: party.id,
      olay_kodu: "taraf_katilim_kabul_edildi", veri: {},
    });
    return new Response(JSON.stringify({ case_id: party.case_id, party_id: party.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
