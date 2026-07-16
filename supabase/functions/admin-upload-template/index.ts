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

// Uyuşmazlık grupları — her yüklenen şablon bu 6 gruptan birine atanır.
const TEMPLATE_GROUPS = ["ihtiyari", "isci_isveren", "ticari", "tuketici", "kira", "ortaklik"] as const;
type TemplateGroup = (typeof TEMPLATE_GROUPS)[number];

// Genişletilmiş belge tipi seti. Her kombinasyon önceden üretilmez — grup + belge tipi
// (+ varsa varyant) çalışma zamanında "{grup}_{belge_tipi}" ya da "{grup}_{varyant}_{belge_tipi}"
// deseniyle template_type'a dönüştürülür (bkz. buildTemplateType).
const DOCUMENT_TYPES = [
  "davet",
  "muracaat_tutanagi",
  "arabulucu_belirleme",
  "bilgilendirme",
  "surec_baslama",
  "ilk_oturum",
  "oturum_erteleme",
  "acilis_konusmasi",
  "anlasma_belgesi",
  "anlasma_son_tutanak",
  "anlasamama_son_tutanak",
  "gorusme_yapilmadan_anlasamama",
  "ucret_sozlesmesi",
  "yetki_belgesi",
  "makbuz_ust_yazisi",
  "icra_serhi_dilekce",
] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Geriye uyumluluk: document_templates'te önceden var olan / generate-official-document'ın
// selectTemplateCandidates() ile aradığı sabit türler. Bu isimler yeni {grup}_{belge_tipi}
// desenine uymaz (ör. "dava_sarti_*", "*_ucret") ama aynen tanınmaya devam eder.
const LEGACY_TEMPLATE_TYPES = new Set([
  "ihtiyari_davet", "isci_isveren_davet", "ticari_davet", "tuketici_davet",
  "dava_sarti_ilk_oturum", "isci_isveren_ilk_oturum", "ticari_ilk_oturum",
  "ihtiyari_anlasma", "ihtiyari_anlasamamama",
  "dava_sarti_anlasma", "dava_sarti_anlasamamama",
  "isci_isveren_anlasma", "isci_isveren_anlasamamama",
  "ticari_anlasma", "ticari_anlasamamama",
  "tuketici_anlasma", "tuketici_anlasamama",
  "kira_anlasma", "kira_anlasamamama",
  "ortaklik_anlasma", "ortaklik_anlasamamama",
  "isci_isveren_ucret", "ticari_ucret",
  "bilgilendirme_tutanagi",
]);

function isTemplateGroup(g: string): g is TemplateGroup {
  return (TEMPLATE_GROUPS as readonly string[]).includes(g);
}

function isDocumentType(b: string): b is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(b);
}

const TR_ASCII_MAP: Record<string, string> = {
  ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g", ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c",
};

function slugify(s: string): string {
  const ascii = (s || "").replace(/[ışŞğĞüÜöÖçÇİ]/g, (c) => TR_ASCII_MAP[c] ?? c);
  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// Grup + belge tipi (+ opsiyonel varyant, ör. "ise_iade", "nisbi") kombinasyonundan
// template_type üretir. Katalogda önceden var olması gerekmez — dinamik ve serbesttir.
function buildTemplateType(group: string, belgeTipi: string, variant?: string | null): string {
  const g = slugify(group);
  const b = slugify(belgeTipi);
  let v = variant ? slugify(variant) : "";
  // Varyant, belge tipiyle aynıysa ya da onu içeriyorsa/onun içindeyse (ör. varyant="oturum_erteleme",
  // tip="oturum_erteleme") çift-ek oluşmaması için varyantı at.
  if (v && (v === b || v.includes(b) || b.includes(v))) v = "";
  return v ? `${g}_${v}_${b}` : `${g}_${b}`;
}

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

// Metindeki grup anahtar kelimelerini tespit eder (İŞÇİ/TİCARİ/TÜKETİCİ/KİRA/ORTAKLIK/İHTİYARİ).
// `t` zaten toUpperCase() edilmiş olmalı.
function detectGroup(t: string): TemplateGroup | null {
  if (t.includes("İŞÇİ")) return "isci_isveren";
  if (t.includes("TİCARİ")) return "ticari";
  if (t.includes("TÜKETİCİ")) return "tuketici";
  if (t.includes("KİRA")) return "kira";
  if (t.includes("ORTAKLIK")) return "ortaklik";
  if (t.includes("İHTİYARİ")) return "ihtiyari";
  return null;
}

// Bilinen varyant anahtar kelimeleri (ör. işe iade davası, nispi ücret). Serbest varyant
// isimleri AI tespitinde (detectTemplateTypeAI) desteklenir; bu sadece anahtar-kelime
// tespitindeki (AI'siz) en yaygın iki örnek içindir.
function detectVariant(t: string): string | null {
  if (t.includes("İŞE İADE")) return "ise_iade";
  if (t.includes("NİSPİ") || t.includes("NİSBİ")) return "nisbi";
  return null;
}

// Otomatik şablon türü tespiti — dosya metnindeki başlık/anahtar kelimelere bakar.
function detectTemplateType(text: string): { type: string; auto: boolean } {
  const t = (text || "").toUpperCase();
  const has = (kw: string) => t.includes(kw.toUpperCase());

  // --- Geriye uyumlu (legacy) eşlemeler: davranış birebir korunur ---
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
    if (has("TÜKETİCİ")) return { type: "tuketici_anlasamama", auto: true };
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
  const group = detectGroup(t);
  if (has("BİLGİLENDİRME TUTANAĞI") && !group) return { type: "bilgilendirme_tutanagi", auto: true };

  // --- Genişletilmiş belge tipi seti: {grup}_{belge_tipi} deseni (grup tespit edilemezse "ihtiyari") ---
  const g = group ?? "ihtiyari";
  const variant = detectVariant(t);
  if (has("MÜRACAAT TUTANA")) return { type: buildTemplateType(g, "muracaat_tutanagi", variant), auto: true };
  if (has("ARABULUCU BELİRLEME") || has("ARABULUCU GÖREVLENDİRME") || has("ARABULUCU ATAMA")) {
    return { type: buildTemplateType(g, "arabulucu_belirleme", variant), auto: true };
  }
  if (has("BİLGİLENDİRME")) return { type: buildTemplateType(g, "bilgilendirme", variant), auto: true };
  if (has("SÜRECİN BAŞLA") || has("SÜREÇ BAŞLA") || has("SÜRECE BAŞLA")) {
    return { type: buildTemplateType(g, "surec_baslama", variant), auto: true };
  }
  if (has("İLK OTURUM") || has("İLK TOPLANTI")) return { type: buildTemplateType(g, "ilk_oturum", variant), auto: true };
  if (has("OTURUM ERTELE") || has("TOPLANTI ERTELE")) return { type: buildTemplateType(g, "oturum_erteleme", variant), auto: true };
  if (has("AÇILIŞ KONUŞMA")) return { type: buildTemplateType(g, "acilis_konusmasi", variant), auto: true };
  if (has("ANLAŞMA BELGESİ")) return { type: buildTemplateType(g, "anlasma_belgesi", variant), auto: true };
  if (has("ANLAŞMA SON TUTANA")) return { type: buildTemplateType(g, "anlasma_son_tutanak", variant), auto: true };
  if (has("GÖRÜŞME YAPILMADAN") && has("ANLAŞAMA")) {
    return { type: buildTemplateType(g, "gorusme_yapilmadan_anlasamama", variant), auto: true };
  }
  if (has("ANLAŞAMAMA SON TUTANA") || has("ANLAŞAMAMA")) return { type: buildTemplateType(g, "anlasamama_son_tutanak", variant), auto: true };
  if (has("DAVET MEKTUBU") || has("DAVET")) return { type: buildTemplateType(g, "davet", variant), auto: true };
  if (has("ÜCRET SÖZLEŞMESİ")) return { type: buildTemplateType(g, "ucret_sozlesmesi", variant), auto: true };
  if (has("YETKİ BELGESİ")) return { type: buildTemplateType(g, "yetki_belgesi", variant), auto: true };
  if (has("MAKBUZ") && has("ÜST YAZI")) return { type: buildTemplateType(g, "makbuz_ust_yazisi", variant), auto: true };
  if (has("İCRA ŞERHİ") || has("İCRA ŞERH")) return { type: buildTemplateType(g, "icra_serhi_dilekce", variant), auto: true };

  return { type: "diger", auto: false };
}

// AI (Gemini, Lovable AI Gateway) ile içerik-tabanlı tespit: dosya adı/başlığa değil,
// belgenin gerçek metnine bakar. Anahtar-kelime tespitinin göremediği durumları (başlık
// eksik/farklı ifade edilmiş, özel bir varyant vb.) yakalamak için birincil yöntem olarak denenir.
async function detectTemplateTypeAI(text: string): Promise<{ grup: string; belge_tipi: string; varyant: string | null } | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const excerpt = text.slice(0, 4000);
    const systemPrompt = `Sen bir Türk arabuluculuk şablon sınıflandırma asistanısın. Sana bir arabuluculuk belgesi şablonunun metni verilecek. Metni analiz ederek belgenin ait olduğu uyuşmazlık grubunu, belge tipini ve varsa özel bir varyantını tespit et.

SADECE şu şemaya uyan bir JSON döndür:
{
  "grup": "ihtiyari" | "isci_isveren" | "ticari" | "tuketici" | "kira" | "ortaklik",
  "belge_tipi": "davet" | "muracaat_tutanagi" | "arabulucu_belirleme" | "bilgilendirme" | "surec_baslama" | "ilk_oturum" | "oturum_erteleme" | "acilis_konusmasi" | "anlasma_belgesi" | "anlasma_son_tutanak" | "anlasamama_son_tutanak" | "gorusme_yapilmadan_anlasamama" | "ucret_sozlesmesi" | "yetki_belgesi" | "makbuz_ust_yazisi" | "icra_serhi_dilekce",
  "varyant": string | null
}

KURALLAR:
- "grup": belgenin ilişkili olduğu uyuşmazlık türü. Dava şartı arabuluculukta (işçi-işveren, ticari vb. dışında genel/belirsiz bir durumda) en yakın grubu seç; hiçbiri uymuyorsa "ihtiyari" seç.
- "belge_tipi" açıklamaları: davet=davet mektubu/ilk toplantı daveti, muracaat_tutanagi=başvuru/müracaat tutanağı, arabulucu_belirleme=arabulucu görevlendirme/belirleme yazısı, bilgilendirme=genel bilgilendirme tutanağı, surec_baslama=sürecin başladığına dair belge, ilk_oturum=ilk oturum/toplantı tutanağı, oturum_erteleme=oturumun ertelenmesi, acilis_konusmasi=arabulucunun açılış konuşması metni, anlasma_belgesi=tarafların imzaladığı anlaşma belgesi, anlasma_son_tutanak=anlaşmayla sonuçlanan son tutanak, anlasamama_son_tutanak=anlaşamamayla sonuçlanan son tutanak, gorusme_yapilmadan_anlasamama=görüşme yapılmadan anlaşamama tutanağı, ucret_sozlesmesi=arabulucu ücret sözleşmesi, yetki_belgesi=vekile/temsilciye verilen yetki belgesi, makbuz_ust_yazisi=makbuz üst yazısı, icra_serhi_dilekce=icra şerhi verilmesi talebine ilişkin dilekçe.
- "varyant": belge özel bir alt tür belirtiyorsa kısa bir snake_case etiket (ör. "ise_iade", "nisbi"), yoksa null. "varyant" alanına ASLA "belge_tipi" alanındaki değeri (aynısını ya da onu içeren bir ifadeyi) TEKRAR yazma — varyant sadece gerçek bir alt-tür ayrımı (ör. işe iade davası, nispi ücret) içindir, yoksa null bırak.
- Emin değilsen "grup" için "ihtiyari" seç.
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
    const grup = String(parsed?.grup ?? "").trim();
    const belge_tipi = String(parsed?.belge_tipi ?? "").trim();
    const varyantRaw = parsed?.varyant;
    const varyant = varyantRaw ? String(varyantRaw).trim() : null;
    if (!grup || !belge_tipi) return null;
    return { grup, belge_tipi, varyant: varyant || null };
  } catch {
    return null;
  }
}

// AI'nin (grup, belge_tipi, varyant) çıktısını template_type'a çevirir.
// Eski, sabit katalogla birebir örtüşen kombinasyonlar (davet/ilk_oturum/anlaşma/
// anlaşamama/ücret/bilgilendirme, varyantsız) geriye uyumluluk için aynı legacy
// isimlerle döner. Diğer tüm kombinasyonlar "{grup}_{belge_tipi}" ya da
// "{grup}_{varyant}_{belge_tipi}" deseniyle dinamik üretilir — katalogda önceden
// var olması gerekmez.
function mapAiClassificationToTemplateType(grup: string, belgeTipi: string, varyant: string | null): string | null {
  const group = isTemplateGroup(grup) ? grup : null;

  if (!varyant) {
    switch (belgeTipi) {
      case "davet": {
        let type: string | null = null;
        if (group === "isci_isveren") type = "isci_isveren_davet";
        else if (group === "ticari") type = "ticari_davet";
        else if (group === "tuketici") type = "tuketici_davet";
        else if (group === "ihtiyari" || !group) type = "ihtiyari_davet";
        if (type && LEGACY_TEMPLATE_TYPES.has(type)) return type;
        break;
      }
      case "ilk_oturum": {
        const type = group === "isci_isveren" ? "isci_isveren_ilk_oturum"
          : group === "ticari" ? "ticari_ilk_oturum"
          : "dava_sarti_ilk_oturum";
        if (LEGACY_TEMPLATE_TYPES.has(type)) return type;
        break;
      }
      case "anlasma_son_tutanak": {
        const type = group === "isci_isveren" ? "isci_isveren_anlasma"
          : group === "ticari" ? "ticari_anlasma"
          : group === "tuketici" ? "tuketici_anlasma"
          : group === "kira" ? "kira_anlasma"
          : group === "ortaklik" ? "ortaklik_anlasma"
          : group === "ihtiyari" ? "ihtiyari_anlasma"
          : "dava_sarti_anlasma";
        if (LEGACY_TEMPLATE_TYPES.has(type)) return type;
        break;
      }
      case "anlasamama_son_tutanak": {
        const type = group === "isci_isveren" ? "isci_isveren_anlasamamama"
          : group === "ticari" ? "ticari_anlasamamama"
          : group === "tuketici" ? "tuketici_anlasamama"
          : group === "kira" ? "kira_anlasamamama"
          : group === "ortaklik" ? "ortaklik_anlasamamama"
          : group === "ihtiyari" ? "ihtiyari_anlasamamama"
          : "dava_sarti_anlasamamama"; // genel/belirsiz: katalogda özel tür yok, dava_sarti'ya düşer
        if (LEGACY_TEMPLATE_TYPES.has(type)) return type;
        break;
      }
      case "ucret_sozlesmesi": {
        const type = group === "isci_isveren" ? "isci_isveren_ucret" : group === "ticari" ? "ticari_ucret" : null;
        if (type && LEGACY_TEMPLATE_TYPES.has(type)) return type;
        break;
      }
      case "bilgilendirme": {
        if (!group) return "bilgilendirme_tutanagi";
        break;
      }
    }
  }

  // --- Genişletilmiş desen: legacy eşleşme yoksa dinamik olarak üret ---
  if (!isDocumentType(belgeTipi)) return null;
  return buildTemplateType(group ?? "ihtiyari", belgeTipi, varyant);
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
      const aiType = aiCls ? mapAiClassificationToTemplateType(aiCls.grup, aiCls.belge_tipi, aiCls.varyant) : null;

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

    // Üstüne-yazma koruması: aynı template_type zaten varsa upsert onConflict ile
    // üzerine yazılır (mevcut davranış korunur); bu davranış değiştirilmedi.
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
