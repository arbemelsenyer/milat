// BELGE ÖZETİ (İBA 1.2 kararı — todo.md A1).
// Her belge için tek paragraf özet (en çok 3 cümle) + "Neyi kanıtlıyor" tek cümle.
//
// KAYNAK SINIRI (bağlayıcı): YALNIZCA o belgenin kendi metni (case_documents.extracted_text,
// mevcut extract-document-text hattının çıktısı) ve dosya adı kullanılır. Başka belge,
// taraf analizi, ortak zemin raporu veya dosya verisi girdiye GİRMEZ.
//
// GİZLİLİK: Çıktı belge_ozetleri tablosuna yazılır; o tabloda tarafa hiçbir SELECT
// politikası yoktur — özet yalnız arabulucu/yönetici tarafından okunabilir.
//
// HALÜSİNASYON KAPISI: metin yoksa özet ÜRETİLMEZ, durum='metin_yok' yazılır
// ("belge metni okunamadı"). Şema dışı/eksik çıktı sunucu tarafında elenir (durum='elendi').
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Özet için belgeden okunacak en fazla karakter.
const MAX_GIRDI = 12_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY tanımlı değil" }, 500);

    // İç çağrı kapısı: extract-document-text metni yazdıktan sonra buraya bu başlıkla
    // gelir (kullanıcı oturumu olmadan). Aksi hâlde JWT + yetki yolu işler.
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    const authHeader = req.headers.get("Authorization");
    if (!isCron && !authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    let userId = "";
    if (!isCron) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      userId = userData.user.id;
    }

    const body = await req.json().catch(() => ({}));
    const document_id = temiz((body as any)?.document_id);
    if (!document_id) return json({ error: "document_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: doc, error: dErr } = await admin.from("case_documents")
      .select("id, case_id, file_name, mime_type, extracted_text, extraction_status")
      .eq("id", document_id).maybeSingle();
    if (dErr) return json({ error: dErr.message }, 500);
    if (!doc) return json({ error: "Belge bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf çağıramaz —
    // belge özeti taraf yüzeyine hiçbir koşulda çıkmaz.
    if (!isCron) {
      const { data: caseRow } = await admin.from("cases")
        .select("user_id, assigned_mediator_id").eq("id", (doc as any).case_id).maybeSingle();
      const { data: roleRow } = await admin.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      const yetkili = (caseRow as any)?.assigned_mediator_id === userId
        || (caseRow as any)?.user_id === userId
        || !!roleRow;
      if (!yetkili) return json({ error: "Bu belge için yetkiniz yok" }, 403);
    }

    // Zaten özeti olan belge için TEKRAR ÜRETİLMEZ.
    const { data: varOlan } = await admin.from("belge_ozetleri")
      .select("id, durum").eq("document_id", document_id).maybeSingle();
    if (varOlan?.id) {
      return json({ atlandi: true, sebep: "Bu belgenin özeti zaten var", durum: (varOlan as any).durum });
    }

    const metin = temiz((doc as any).extracted_text);
    const dosyaAdi = temiz((doc as any).file_name);

    // Metin yoksa özet UYDURULMAZ.
    if (metin.length < 60) {
      const durumSebep = String((doc as any).extraction_status ?? "") === "desteklenmeyen_format"
        ? "belge metni okunamadı (desteklenmeyen format)"
        : "belge metni okunamadı";
      const { error: iErr } = await admin.from("belge_ozetleri").insert({
        case_id: (doc as any).case_id, document_id, ozet: null, kaniti: null,
        durum: "metin_yok", sebep: durumSebep,
      });
      if (iErr) return json({ error: `Kayıt yazılamadı: ${iErr.message}` }, 500);
      return json({ durum: "metin_yok", sebep: durumSebep });
    }

    const systemPrompt = `Sen bir arabuluculuk dosyasındaki belgeleri künyeleyen tarafsız bir özet asistanısın.
Sana TEK BİR belgenin metni verilir. Görevin o belgeyi özetlemek.

MUTLAK KURALLAR:
1. Yalnızca sana verilen belge metnini kullan. Başka belge, dosya bilgisi veya genel bilgi ekleme.
2. Belgede AÇIKÇA yazmayan hiçbir tarih, rakam, taraf adı veya olay ekleme. Emin değilsen yazma.
3. HUKUKİ NİTELEME YAPMA: "haksız", "hukuka aykırı", "ihlal", "geçersiz", kanun/madde adı yazma.
4. KUSUR ATFETME: kimseyi haklı/haksız gösterme, ihmal veya suç yükleme.
5. İDDİAYI TESPİT GİBİ YAZMA: "belgede ... belirtiliyor", "belgede ... yer alıyor" biçimini kullan.
   "...olmuştur", "...yapılmıştır", "...haklıdır" yazma.
6. ozet en çok 3 CÜMLE, tek paragraf. kaniti TEK CÜMLE.
7. kaniti alanı "bu belge neyi kanıtlıyor" sorusunun cevabıdır ve yine belgeye dayanır;
   belge bir şey kanıtlamıyorsa "Belge tek başına bir hususu kanıtlamıyor; içerik bilgisi taşıyor" yaz.
8. Belge metni anlamsız veya okunamaz durumdaysa ozet alanını BOŞ bırak.

Çıktı YALNIZCA JSON: {"ozet":"en çok 3 cümlelik tarafsız özet","kaniti":"tek cümle"}`;

    const userPrompt = `BELGE ADI: ${dosyaAdi}

BELGE METNİ (kısmi olabilir):
${metin.slice(0, MAX_GIRDI)}

Bu belgeyi yukarıdaki kurallara göre özetle.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: "Özet üretilemedi", detay: t.slice(0, 300) }, aiRes.status);
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    let ozet = temiz(parsed?.ozet);
    let kaniti = temiz(parsed?.kaniti);

    // ── SUNUCU TARAFI ELEME (constitution m.12) ──
    const elenme: string[] = [];
    if (ozet.length < 40) elenme.push("özet çok kısa veya boş");
    if (!kaniti) elenme.push("'neyi kanıtlıyor' alanı boş");
    if (ozet.length > 900) ozet = ozet.slice(0, 900);
    if (kaniti.length > 400) kaniti = kaniti.slice(0, 400);
    const yasakli = ["haksız", "hukuka aykırı", "ihlal", "kusur", "suç ", "geçersizdir", "borçludur"];
    const kucuk = ozet.toLocaleLowerCase("tr-TR");
    const bulunan = yasakli.filter((k) => kucuk.includes(k));
    if (bulunan.length) elenme.push(`yasaklı ifade: ${bulunan.join(", ")}`);

    if (elenme.length) {
      const sebep = `Özet sunucu tarafında elendi (${elenme.join(" · ")})`;
      const { error: eErr } = await admin.from("belge_ozetleri").insert({
        case_id: (doc as any).case_id, document_id, ozet: null, kaniti: null,
        durum: "elendi", sebep,
      });
      if (eErr) return json({ error: `Kayıt yazılamadı: ${eErr.message}` }, 500);
      return json({ durum: "elendi", sebep });
    }

    const { error: yErr } = await admin.from("belge_ozetleri").insert({
      case_id: (doc as any).case_id, document_id, ozet, kaniti, durum: "uretildi", sebep: null,
    });
    if (yErr) return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);

    return json({ durum: "uretildi", ozet, kaniti });
  } catch (e: any) {
    console.error("[belge-ozeti] hata", e?.message ?? e);
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
