// Admin-only: upload .docx/.pdf/.txt template file(s).
// Auto-detects template_type from the file's text content unless one is explicitly provided.
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

// Otomatik şablon türü tespiti — dosya metnindeki başlık/anahtar kelimelere bakar.
function detectTemplateType(text: string): { type: string; auto: boolean } {
  const t = (text || "").toUpperCase();
  const has = (kw: string) => t.includes(kw.toUpperCase());

  if (has("ANLAŞMA BELGESİ") || has("ANLAŞMA SON TUTANA")) {
    if (has("İŞÇİ")) return { type: "isci_isveren_anlasma", auto: true };
    if (has("TİCARİ")) return { type: "ticari_anlasma", auto: true };
    if (has("TÜKETİCİ")) return { type: "tuketici_anlasma", auto: true };
    if (has("KİRA")) return { type: "kira_anlasma", auto: true };
    if (has("ORTAKLIK")) return { type: "ortaklik_anlasma", auto: true };
    if (has("İHTİYARİ")) return { type: "ihtiyari_anlasma", auto: true };
  }
  if (has("ANLAŞAMAMA")) {
    if (has("İŞÇİ")) return { type: "isci_isveren_anlasamamama", auto: true };
    if (has("TİCARİ")) return { type: "ticari_anlasamamama", auto: true };
    if (has("KİRA")) return { type: "kira_anlasamamama", auto: true };
    if (has("ORTAKLIK")) return { type: "ortaklik_anlasamamama", auto: true };
    if (has("İHTİYARİ")) return { type: "ihtiyari_anlasamamama", auto: true };
  }
  if (has("İLK OTURUM") || has("İLK TOPLANTI")) {
    if (has("İŞÇİ")) return { type: "isci_isveren_ilk_oturum", auto: true };
    if (has("TİCARİ")) return { type: "ticari_ilk_oturum", auto: true };
  }
  if (has("DAVET MEKTUBU")) {
    if (has("İŞÇİ")) return { type: "isci_isveren_davet", auto: true };
    if (has("TİCARİ")) return { type: "ticari_davet", auto: true };
    if (has("TÜKETİCİ")) return { type: "tuketici_davet", auto: true };
    if (has("İHTİYARİ")) return { type: "ihtiyari_davet", auto: true };
  }
  if (has("ÜCRET SÖZLEŞMESİ")) {
    if (has("İŞÇİ")) return { type: "isci_isveren_ucret", auto: true };
    if (has("TİCARİ")) return { type: "ticari_ucret", auto: true };
  }
  if (has("BİLGİLENDİRME TUTANAĞI")) return { type: "bilgilendirme_tutanagi", auto: true };

  return { type: "diger", auto: false };
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
    // Manuel override: kullanıcı sarı uyarıdan sonra tür seçtiyse.
    const overrideType = String(form.get("template_type") ?? "").trim();

    if (!(file instanceof File)) return json({ error: "Dosya bulunamadı" }, 400);
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

    let templateType = overrideType;
    let autoDetected = false;
    if (!templateType) {
      const det = detectTemplateType(text);
      templateType = det.type;
      autoDetected = det.auto;
    }

    const { error: upErr } = await admin.from("document_templates").upsert({
      template_type: templateType,
      template_content: text,
      source_url: `admin-upload://${file.name}`,
      is_active: templateType !== "diger",
      uploaded_at: new Date().toISOString(),
    }, { onConflict: "template_type" });

    if (upErr) return json({ error: upErr.message }, 500);

    return json({
      ok: true,
      template_type: templateType,
      auto_detected: autoDetected,
      needs_manual: templateType === "diger",
      chars: text.length,
      filename: file.name,
    });
  } catch (e: any) {
    console.error("admin-upload-template error", e);
    return json({ error: e?.message ?? "Sunucu hatası" }, 500);
  }
});
