// Admin-only: upload a single .docx/.pdf/.txt file → upsert into document_templates.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import mammoth from "npm:mammoth@1.8.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_BYTES = 20 * 1024 * 1024;

const KNOWN_TEMPLATE_TYPES = new Set([
  "dava_sarti_anlasma",
  "dava_sarti_anlasamamama",
  "dava_sarti_ilk_oturum",
  "ihtiyari_anlasma",
  "ihtiyari_anlasamamama",
  "ihtiyari_davet",
  "isci_isveren_davet",
  "ticari_davet",
  "tuketici_davet",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function extractFromFile(bytes: Uint8Array, fileName: string, mime: string): Promise<string> {
  const name = fileName.toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }
  if (name.endsWith(".docx") || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: bytes as any });
    return result.value ?? "";
  }
  if (name.endsWith(".txt") || mime.startsWith("text/")) {
    return new TextDecoder("utf-8").decode(bytes);
  }
  throw new Error("Desteklenmeyen dosya formatı. PDF, DOCX veya TXT yükleyin.");
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

    const form = await req.formData();
    const file = form.get("file");
    const templateType = String(form.get("template_type") ?? "").trim();

    if (!(file instanceof File)) return json({ error: "Dosya bulunamadı" }, 400);
    if (!templateType) return json({ error: "Şablon türü zorunludur" }, 400);
    if (!KNOWN_TEMPLATE_TYPES.has(templateType)) return json({ error: `Bilinmeyen şablon türü: ${templateType}` }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Dosya 20MB'ı aşamaz" }, 400);

    const name = file.name.toLowerCase();
    if (!(name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt"))) {
      return json({ error: "Sadece PDF, DOCX veya TXT kabul edilir" }, 400);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let text = "";
    try {
      text = await extractFromFile(bytes, file.name, file.type);
    } catch (e: any) {
      return json({ error: `Metin çıkarma başarısız: ${e.message ?? e}` }, 400);
    }
    if (!text.trim()) return json({ error: "Dosyadan metin çıkarılamadı" }, 400);

    const { error: upErr } = await admin.from("document_templates").upsert({
      template_type: templateType,
      template_content: text,
      source_url: `admin-upload://${file.name}`,
      is_active: true,
      uploaded_at: new Date().toISOString(),
    }, { onConflict: "template_type" });

    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, template_type: templateType, chars: text.length, filename: file.name });
  } catch (e: any) {
    console.error("admin-upload-template error", e);
    return json({ error: e?.message ?? "Sunucu hatası" }, 500);
  }
});
