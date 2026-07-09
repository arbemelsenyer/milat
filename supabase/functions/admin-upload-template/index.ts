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
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const MAX_BYTES = 20 * 1024 * 1024;

// document_templates'te gerçekten var olan / generate-official-document'ın tanıdığı
// tür kataloğu — hem detectTemplateType() hem de AI eşlemesi bu kümenin dışına çıkamaz.
const TEMPLATE_TYPE_CATALOG = new Set([
  "ihtiyari_davet", "isci_isveren_davet", "ticari_davet", "tuketici_davet",
  "dava_sarti_ilk_oturum", "isci_isveren_ilk_oturum", "ticari_ilk_oturum",
  "ihtiyari_anlasma", "ihtiyari_anlasamamama",
  "dava_sarti_anlasma", "dava_sarti_anlasamamama",
  "isci_isveren_anlasma", "isci_isveren_anlasamamama",
  "ticari_anlasma", "ticari_anlasamamama",
  "tuketici_anlasma",
  "kira_anlasma", "kira_anlasamamama",
  "ortaklik_anlasma", "ortaklik_anlasamamama",
  "isci_isveren_ucret", "ticari_ucret",
  "bilgilendirme_tutanagi",
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

// AI (Gemini, Lovable AI Gateway) ile içerik-tabanlı tespit: dosya adı/başlığa değil,
// belgenin gerçek metnine bakar. Anahtar-kelime tespitinin göremediği durumları (başlık
// eksik/farklı ifade edilmiş vb.) yakalamak için birincil yöntem olarak denenir.
async function detectTemplateTypeAI(text: string): Promise<{ belge_tipi: string; uyusmazlik_turu: string } | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const excerpt = text.slice(0, 4000);
    const systemPrompt = `Sen bir Türk arabuluculuk şablon sınıflandırma asistanısın. Sana bir arabuluculuk belgesi şablonunun metni verilecek. Metni analiz ederek belgenin türünü ve ilgili uyuşmazlık türünü tespit et.

SADECE şu değerlerden birini kullanarak JSON döndür:
{
  "belge_tipi": "davet" | "ilk_oturum" | "son_tutanak_anlasma" | "son_tutanak_anlasamama" | "ucret_sozlesmesi",
  "uyusmazlik_turu": "isci_isveren" | "ticari" | "tuketici" | "kira" | "ortaklik" | "genel"
}

KURALLAR:
- "davet": arabuluculuk davet mektubu / ilk toplantı davetiyesi.
- "ilk_oturum": ilk oturum / ilk toplantı bilgilendirme tutanağı.
- "son_tutanak_anlasma": tarafların anlaştığı son tutanak.
- "son_tutanak_anlasamama": tarafların anlaşamadığı son tutanak.
- "ucret_sozlesmesi": arabulucu ücret sözleşmesi.
- Emin değilsen "uyusmazlik_turu" için "genel" seç.
- Yanıtın YALNIZCA geçerli JSON olmalı, başka metin yok.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: excerpt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }
    const belge_tipi = String(parsed?.belge_tipi ?? "").trim();
    const uyusmazlik_turu = String(parsed?.uyusmazlik_turu ?? "").trim();
    if (!belge_tipi || !uyusmazlik_turu) return null;
    return { belge_tipi, uyusmazlik_turu };
  } catch {
    return null;
  }
}

// AI'nin (belge_tipi, uyusmazlik_turu) çıktısını mevcut template_type kataloğuna eşler.
// Katalogda karşılığı olmayan bir kombinasyon (ör. "tüketici + anlaşamama") için null
// döner — çağıran taraf bu durumda anahtar-kelime tespitine düşer.
function mapAiClassificationToTemplateType(belgeTipi: string, uyusmazlikTuru: string): string | null {
  let type: string | null;
  switch (belgeTipi) {
    case "davet":
      if (uyusmazlikTuru === "isci_isveren") type = "isci_isveren_davet";
      else if (uyusmazlikTuru === "ticari") type = "ticari_davet";
      else if (uyusmazlikTuru === "tuketici") type = "tuketici_davet";
      else type = "ihtiyari_davet"; // kira/ortaklik/genel için jenerik davet
      break;
    case "ilk_oturum":
      if (uyusmazlikTuru === "isci_isveren") type = "isci_isveren_ilk_oturum";
      else if (uyusmazlikTuru === "ticari") type = "ticari_ilk_oturum";
      else type = "dava_sarti_ilk_oturum";
      break;
    case "son_tutanak_anlasma":
      if (uyusmazlikTuru === "isci_isveren") type = "isci_isveren_anlasma";
      else if (uyusmazlikTuru === "ticari") type = "ticari_anlasma";
      else if (uyusmazlikTuru === "tuketici") type = "tuketici_anlasma";
      else if (uyusmazlikTuru === "kira") type = "kira_anlasma";
      else if (uyusmazlikTuru === "ortaklik") type = "ortaklik_anlasma";
      else type = "dava_sarti_anlasma";
      break;
    case "son_tutanak_anlasamama":
      if (uyusmazlikTuru === "isci_isveren") type = "isci_isveren_anlasamamama";
      else if (uyusmazlikTuru === "ticari") type = "ticari_anlasamamama";
      else if (uyusmazlikTuru === "kira") type = "kira_anlasamamama";
      else if (uyusmazlikTuru === "ortaklik") type = "ortaklik_anlasamamama";
      else type = "dava_sarti_anlasamamama"; // tüketici/genel: katalogda özel tür yok
      break;
    case "ucret_sozlesmesi":
      if (uyusmazlikTuru === "isci_isveren") type = "isci_isveren_ucret";
      else if (uyusmazlikTuru === "ticari") type = "ticari_ucret";
      else type = null; // katalogda jenerik ücret sözleşmesi yok
      break;
    default:
      type = null;
  }
  return type && TEMPLATE_TYPE_CATALOG.has(type) ? type : null;
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
    let detectedBy: "manual" | "ai" | "keyword" | "fallback" = "manual";

    if (!templateType) {
      const aiCls = await detectTemplateTypeAI(text);
      const aiType = aiCls ? mapAiClassificationToTemplateType(aiCls.belge_tipi, aiCls.uyusmazlik_turu) : null;

      if (aiType) {
        templateType = aiType;
        autoDetected = true;
        detectedBy = "ai";
      } else {
        const det = detectTemplateType(text);
        templateType = det.type;
        autoDetected = det.auto;
        detectedBy = det.auto ? "keyword" : "fallback";
      }
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
      detected_by: detectedBy,
      needs_manual: templateType === "diger",
      chars: text.length,
      filename: file.name,
    });
  } catch (e: any) {
    console.error("admin-upload-template error", e);
    return json({ error: e?.message ?? "Sunucu hatası" }, 500);
  }
});
