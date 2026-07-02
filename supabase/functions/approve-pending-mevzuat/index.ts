// Admin-only: onaylanmış mevzuat kaydını knowledge_base_chunks'a taşır veya reddederse siler.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function sanitize(s: string) {
  return (s || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[\uFEFF\u200B\u200C\u200D]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chunk(text: string, target = 1800, overlap = 150): string[] {
  const clean = sanitize(text);
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).length > target && cur) {
      chunks.push(cur.trim());
      cur = cur.slice(Math.max(0, cur.length - overlap)) + " " + s;
    } else {
      cur = cur ? cur + " " + s : s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter((c) => c.length > 200);
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: texts, dimensions: 768 }),
  });
  if (!res.ok) throw new Error(`Embedding hatası ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return j.data.map((d: any) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Yetkisiz istek" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) return json({ error: "Oturum doğrulanamadı" }, 401);
    const userId = claimsRes.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin yetkisi gereklidir" }, 403);

    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    const action = String(body.action ?? "").trim();
    if (!id) return json({ error: "id zorunludur" }, 400);
    if (!["approve", "reject"].includes(action)) return json({ error: "action 'approve' veya 'reject' olmalı" }, 400);

    const { data: row, error: rowErr } = await admin
      .from("pending_pool")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (rowErr) return json({ error: rowErr.message }, 500);
    if (!row) return json({ error: "Kayıt bulunamadı" }, 404);
    if (row.niche_area !== "mevzuat") return json({ error: "Bu uç yalnızca mevzuat kayıtları içindir" }, 400);

    if (action === "reject") {
      const reason = String(body.reason ?? "").trim().slice(0, 500);
      const { error: delErr } = await admin.from("pending_pool").delete().eq("id", id);
      if (delErr) return json({ error: delErr.message }, 500);
      return json({ ok: true, action: "rejected", id, reason: reason || null });
    }

    // approve → chunk + embed + insert into knowledge_base_chunks
    const chunks = chunk(row.raw_content ?? "");
    if (!chunks.length) return json({ error: "Yeterli metin çıkarılamadı" }, 400);

    const title = sanitize(String((row.metadata as any)?.source_title ?? row.source_url ?? "Mevzuat")).slice(0, 300);
    const sourceUrl = row.source_url ?? `pending://${id}`;

    // Idempotency
    await admin.from("knowledge_base_chunks").delete().eq("source_url", sourceUrl);

    let total = 0;
    const BATCH = 16;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const vectors = await embed(slice);
      const rows = slice.map((c, j) => ({
        source_title: title,
        source_url: sourceUrl,
        category: "mevzuat",
        chunk_text: c,
        chunk_index: i + j,
        embedding: vectors[j] as any,
        metadata: {
          ...(row.metadata ?? {}),
          approved_by: userId,
          approved_at: new Date().toISOString(),
          from_pending_id: id,
        },
      }));
      const { error } = await admin.from("knowledge_base_chunks").insert(rows);
      if (error) throw new Error(error.message);
      total += rows.length;
    }

    await admin.from("pending_pool").delete().eq("id", id);

    return json({ ok: true, action: "approved", id, chunks: total, source_url: sourceUrl });
  } catch (e: any) {
    console.error("approve-pending-mevzuat error", e);
    return json({ error: e?.message ?? "Sunucu hatası" }, 500);
  }
});
