// Admin-only: knowledge_base_chunks içindeki bir kaynağı (source_url veya source_title) tamamen siler.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Yetkisiz istek" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) return json({ error: "Oturum doğrulanamadı" }, 401);
    const userId = claimsRes.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Bu işlem için admin yetkisi gereklidir" }, 403);

    const body = await req.json().catch(() => ({}));
    const source_url: string | undefined = body.source_url;
    const source_title: string | undefined = body.source_title;
    if (!source_url && !source_title) return json({ error: "source_url veya source_title gerekli" }, 400);

    let q = admin.from("knowledge_base_chunks").delete({ count: "exact" });
    if (source_url) q = q.eq("source_url", source_url);
    else if (source_title) q = q.eq("source_title", source_title);
    const { error, count } = await q;
    if (error) return json({ error: error.message }, 500);

    // Best-effort storage cleanup for admin-uploaded files
    if (source_url && source_url.startsWith("storage://case-documents/")) {
      const path = source_url.replace("storage://case-documents/", "");
      await admin.storage.from("case-documents").remove([path]);
    }

    return json({ ok: true, deleted: count ?? 0 });
  } catch (e: any) {
    console.error("admin-delete-knowledge error", e);
    return json({ error: e.message ?? "Sunucu hatası" }, 500);
  }
});
