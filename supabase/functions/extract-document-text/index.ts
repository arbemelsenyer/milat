// Belge metni çıkarma: case_documents.extracted_text / extraction_status'ü doldurur.
// PDF çözücü (unpdf) ve DOCX çözücü (mammoth) admin-upload-knowledge ile aynı
// kütüphane/import kalıbı — bilgi bankası yükleme hattında zaten çalışan kod.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import mammoth from "npm:mammoth@1.8.0";
import { olayYaz } from "../_shared/olay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Belge başına en fazla 20.000 karakter — kalanı kırpılır.
const MAX_CHARS_PER_DOC = 20_000;

type DocRow = {
  id: string; file_name: string; file_path: string; mime_type: string | null;
  case_id: string; party_id: string | null;
};

class UnsupportedFormatError extends Error {}

async function extractFromBlob(blob: Blob, fileName: string, mimeType: string | null): Promise<string> {
  const name = fileName.toLowerCase();
  const mime = mimeType ?? "";

  if (mime.startsWith("text/") || name.endsWith(".txt")) {
    return await blob.text();
  }

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }

  if (name.endsWith(".docx") || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer: bytes as any });
      return result.value ?? "";
    } catch (e: any) {
      throw new UnsupportedFormatError(`docx çıkarma başarısız: ${e?.message ?? String(e)}`);
    }
  }

  throw new UnsupportedFormatError("desteklenmeyen dosya formatı");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Belge özeti iç çağrısı için (yoksa özet tetiklenmez, çıkarma aynen sürer).
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const document_id: string | undefined = body.document_id;
    const case_id: string | undefined = body.case_id;
    if (!document_id && !case_id) {
      return new Response(JSON.stringify({ error: "document_id or case_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Yetkilendirme: case_documents üzerindeki RLS'e (parti kendi yüklediğini, arabulucu
    // hepsini görür) uyan userClient ile yapılıyor — service role sadece storage indirme
    // ve DB yazımı için, altta.
    let targets: DocRow[] = [];
    if (document_id) {
      const { data: doc } = await userClient.from("case_documents")
        .select("id, file_name, file_path, mime_type, case_id, party_id")
        .eq("id", document_id).maybeSingle();
      if (!doc) {
        return new Response(JSON.stringify({ error: "Document not found or forbidden" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targets = [doc as DocRow];
    } else {
      const { data: docs } = await userClient.from("case_documents")
        .select("id, file_name, file_path, mime_type, case_id, party_id")
        .eq("case_id", case_id).eq("extraction_status", "bekliyor");
      targets = (docs ?? []) as DocRow[];
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const results: { id: string; status: string }[] = [];

    for (const doc of targets) {
      /* AKIŞ OLAYI (best-effort): belge yüklendi. Çıkarmanın SONUCUNDAN bağımsız
         yazılır — desteklenmeyen formatta da belge dosyaya girmiştir. Yükleme anı
         ön yüzdedir; bu fonksiyon her yükleme yolundan hemen sonra çağrıldığı için
         bugünkü en yakın sunucu noktasıdır (bkz. akis-kurallari-onerisi.md). */
      await olayYaz(admin, {
        case_id: String((doc as any).case_id ?? ""),
        party_id: (doc as any).party_id ?? null,
        olay_kodu: "belge_yuklendi",
        veri: { document_id: doc.id },
      });
      try {
        const { data: blob, error: dlErr } = await admin.storage.from("case-documents").download(doc.file_path);
        if (dlErr || !blob) throw new Error(dlErr?.message ?? "Belge storage'dan indirilemedi");

        let text: string;
        try {
          text = await extractFromBlob(blob, doc.file_name, doc.mime_type);
        } catch (e: any) {
          if (e instanceof UnsupportedFormatError) {
            await admin.from("case_documents").update({ extraction_status: "desteklenmeyen_format" }).eq("id", doc.id);
            results.push({ id: doc.id, status: "desteklenmeyen_format" });
            continue;
          }
          throw e;
        }

        const trimmed = text.trim();
        if (!trimmed) {
          await admin.from("case_documents").update({ extraction_status: "hata" }).eq("id", doc.id);
          results.push({ id: doc.id, status: "hata" });
          continue;
        }

        await admin.from("case_documents").update({
          extracted_text: trimmed.slice(0, MAX_CHARS_PER_DOC),
          extraction_status: "tamam",
        }).eq("id", doc.id);
        // Belge özeti (İBA 1.2): metin yazıldıktan sonra iç kapıdan tetiklenir.
        // BEKLEMESİZ ve try/catch içinde — bu çağrının hatası çıkarma hattını
        // hiçbir koşulda etkilemez, sonuç yine "tamam" döner.
        try {
          if (CRON_SECRET) {
            fetch(`${supabaseUrl}/functions/v1/belge-ozeti`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-cron-secret": CRON_SECRET,
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ document_id: doc.id }),
            }).catch((e) => console.error(`[extract-document-text] belge-ozeti tetiklenemedi (${doc.id}): ${e?.message ?? e}`));
          }
        } catch (e: any) {
          console.error(`[extract-document-text] belge-ozeti çağrısı kurulamadı: ${e?.message ?? e}`);
        }
        results.push({ id: doc.id, status: "tamam" });
      } catch (e: any) {
        console.error(`[extract-document-text] belge ${doc.id} başarısız: ${e?.message ?? String(e)}`);
        try {
          await admin.from("case_documents").update({ extraction_status: "hata" }).eq("id", doc.id);
        } catch { /* best-effort */ }
        results.push({ id: doc.id, status: "hata" });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
