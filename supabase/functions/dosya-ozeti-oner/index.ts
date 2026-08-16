// Uyuşmazlık konusu ÖNERİSİ (yalnız öneri — hiçbir yere yazmaz).
//
// Neden var: cases.issue_description'ı bugün hiçbir ajan doldurmuyor; boş kalınca
// orchestrator-run classify adımını atlıyor (orchestrator-run/index.ts:226-229) ve
// Aşama 1 > Uyuşmazlık konusu "Girilmemiş." görünüyor.
//
// KAYNAK SINIRI (bağlayıcı — kör veri): metin YALNIZCA cases.title, başvuru/talep
// alanları ve case_documents'ın DOSYA ADI + TÜRÜ bilgisinden üretilir.
// KULLANILMAZ: party_analyses · common_ground_reports · case_documents.analysis_result ·
// case_documents.extracted_text · taraf beyanları · gizli kanal verisi.
// Sebep: issue_description taraf ekranında da görünür (CaseRoom.tsx:453).
//
// YAZMA YOK: bu fonksiyon hiçbir tabloya yazmaz. Öneriyi döndürür; kaydetme kararı
// arabulucunundur (manuel her zaman kazanır — constitution m.3).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Dosya adından tür etiketi — içerik OKUNMAZ, yalnız uzantı/MIME.
function belgeTuru(fileName: string, mime: string): string {
  const ext = String(fileName).split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || String(mime).includes("pdf")) return "PDF";
  if (ext === "doc" || ext === "docx" || String(mime).includes("word")) return "Word";
  if (ext === "txt" || String(mime).includes("text/plain")) return "metin";
  return ext ? ext.toUpperCase() : "bilinmeyen tür";
}

/* ── AJAN DURUM YAZIMI (Ajan Kontrol Paneli) ─────────────────────────────────
   Panel bu satırlardan beslenir. KRİTİK: durum yazımı asıl işi ASLA bozmaz —
   her yazma try/catch içindedir, hata yutulur ve yalnız konsola loglanır.
   Aynı case_id + agent_type (+ party_id) için TEK satır güncellenir; her koşumda
   yeni satır birikmez. tarafa_gorunur alanına DOKUNULMAZ (varsayılan false). */
const AGENT_TYPE = "dosya_ozeti";
async function durumYaz(
  admin: any, caseId: string, partyId: string | null, patch: Record<string, unknown>,
) {
  if (!admin || !caseId) return;
  try {
    let sorgu = admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE);
    sorgu = partyId ? sorgu.eq("party_id", partyId) : sorgu.is("party_id", null);
    const { data: mevcutSatir } = await sorgu.maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcutSatir?.id) {
      await admin.from("agent_states").update(govde).eq("id", mevcutSatir.id);
    } else {
      await admin.from("agent_states")
        .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: partyId, ...govde });
    }
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Hata dalında da durum yazılabilmesi için asıl iş içinde doldurulur.
  let durumAdmin: any = null;
  let durumCaseId = "";
  let durumPartyId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY tanımlı değil" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);

    const body = await req.json().catch(() => ({}));
    const case_id = temiz((body as any)?.case_id);
    // yenile=true: alan doluyken de öneri üretilir. Yazma yine YOK — metin ancak
    // arabulucu "Onayla ve kaydet" derse mevcut metnin yerine geçer.
    const yenile = (body as any)?.yenile === true;
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select([
        "id", "user_id", "assigned_mediator_id", "issue_description", "title", "category",
        "dispute_type_other", "your_role", "other_party_role", "relationship",
        "desired_outcome", "attempted_resolution", "timeline", "additional_notes",
      ].join(", "))
      .eq("id", case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf ÇAĞIRAMAZ —
    // öneri metni arabulucunun onayından geçmeden hiçbir tarafa gitmez.
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    const yetkili = (caseRow as any).assigned_mediator_id === userData.user.id
      || (caseRow as any).user_id === userData.user.id
      || !!roleRow;
    if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);

    durumAdmin = admin;
    durumCaseId = case_id;
    await durumYaz(durumAdmin, durumCaseId, null, { status: "running", error_message: null });

    // Mevcut metin ASLA ezilmez: bu fonksiyon hiçbir koşulda yazmaz. Alan doluyken
    // öneri yalnız açık istek üzerine (yenile:true) üretilir; kaydetme kararı
    // arabulucunundur. Mevcut metin AI'a girdi olarak da VERİLMEZ — kaynak sınırı
    // yalnız başlık, başvuru/talep alanları ve belge adı+türüdür.
    if (temiz((caseRow as any).issue_description) && !yenile) {
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "atlandi", sebep: "konu zaten girilmiş" } });
      return json({ atlandi: true, sebep: "Uyuşmazlık konusu zaten girilmiş — öneri üretilmedi" });
    }

    // Belge ADI + TÜRÜ. İçerik (extracted_text / analysis_result) OKUNMAZ.
    const { data: docs } = await admin.from("case_documents")
      .select("file_name, mime_type").eq("case_id", case_id).limit(50);
    const belgeler = ((docs ?? []) as any[])
      .map((d) => `- ${temiz(d.file_name)} (${belgeTuru(temiz(d.file_name), temiz(d.mime_type))})`);

    // Girdi bloğu — yalnız izinli alanlar.
    const alanlar: string[] = [];
    const ekle = (etiket: string, deger: unknown) => {
      const v = temiz(deger);
      if (v) alanlar.push(`${etiket}: ${v}`);
    };
    ekle("Dosya başlığı", (caseRow as any).title);
    ekle("Başvuru kategorisi", (caseRow as any).category);
    ekle("Kategori açıklaması", (caseRow as any).dispute_type_other);
    ekle("Başvuranın rolü", (caseRow as any).your_role);
    ekle("Karşı tarafın rolü", (caseRow as any).other_party_role);
    ekle("Taraflar arasındaki ilişki", (caseRow as any).relationship);
    ekle("Başvuruda belirtilen talep", (caseRow as any).desired_outcome);
    ekle("Daha önce denenen çözüm", (caseRow as any).attempted_resolution);
    ekle("Süreç/zaman bilgisi", (caseRow as any).timeline);
    ekle("Başvurudaki ek not", (caseRow as any).additional_notes);

    // Dayanaksız öneri üretilmez (constitution m.2): hiç kaynak yoksa dur.
    if (alanlar.length === 0 && belgeler.length === 0) {
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "atlandi", sebep: "yeterli veri yok" } });
      return json({
        atlandi: true,
        sebep: "Yeterli veri yok: dosya başlığı, başvuru alanları ve yüklü belge bulunamadı",
      });
    }

    const systemPrompt = `Sen bir Türk arabuluculuk sürecinde dosya künyesi yazan tarafsız bir yazım asistanısın.
Görevin: verilen SINIRLI bilgilerden 2-4 cümlelik TARAFSIZ bir "uyuşmazlık konusu" metni yazmak.

MUTLAK KURALLAR:
1. Yalnızca sana verilen bilgileri kullan. Verilmeyen hiçbir olay, tarih, rakam veya belge içeriği ekleme.
2. RAKAM YAZMA. Tutar, oran, gün/ay sayısı, yüzde yazma — sana açıkça verilmiş olsa bile metne rakam koyma.
3. HUKUKİ NİTELEME YAPMA. "haksız", "hukuka aykırı", "ihlal", "tazminat hakkı doğar", kanun/madde adı yazma.
4. KUSUR ATFETME. Hiçbir tarafı haklı/haksız gösterme, kimseye suç veya ihmal yükleme.
5. TARAF İDDİASINI TESPİT GİBİ YAZMA. Başvurudan gelen her şey beyandır: "…olduğu beyan ediliyor",
   "…talep edildiği belirtiliyor" dilini kullan. "…olmuştur", "…yapılmıştır" yazma.
6. Belge listesinden yalnız SAYI ve TÜR söylenebilir ("dosyaya PDF ve Word biçiminde belgeler sunulmuştur").
   Belgenin içeriği hakkında hiçbir çıkarım yapma; dosya adından olay/iddia türetme.
7. Bilgi yetersizse cümle uydurma; kısa tut. Hiç yazacak şey yoksa ozet alanını boş bırak.
8. Metin iki tarafa da gösterilecektir; her iki tarafın da okuyacağı nötr bir dil kur.

Çıktı YALNIZCA JSON:
{"ozet":"2-4 cümlelik tarafsız metin","dayanak":["kullandığın her bilgi için hangi alandan geldiği, örn. 'Başvuruda belirtilen talep'"]}
dayanak dizisi BOŞ OLAMAZ; boşsa ozet de boş olmalıdır.`;

    const userPrompt = `KULLANILABİLİR BİLGİLER:
${alanlar.length ? alanlar.join("\n") : "(başvuru alanı boş)"}

YÜKLENEN BELGELER (yalnız ad ve tür — içerik verilmedi) (${belgeler.length}):
${belgeler.length ? belgeler.join("\n") : "(belge yok)"}

Bu bilgilerden 2-4 cümlelik tarafsız uyuşmazlık konusu metni üret.`;

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
      return json({ error: "Öneri üretilemedi", detay: t.slice(0, 300) }, aiRes.status);
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    let ozet = temiz(parsed?.ozet);
    const dayanak = Array.isArray(parsed?.dayanak)
      ? parsed.dayanak.map((x: any) => temiz(x)).filter(Boolean).slice(0, 10)
      : [];

    // ── SUNUCU TARAFI ELEME (constitution m.12: prompt'a güvenme, çıktıyı ele) ──
    const elenme: string[] = [];
    if (dayanak.length === 0) elenme.push("dayanak alanı boş");
    if (ozet.length < 40) elenme.push("metin çok kısa");
    if (ozet.length > 900) ozet = ozet.slice(0, 900);
    // Rakam yasağı: metinde basamak varsa öneri elenir (madde/tutar sızıntısı riski).
    if (/\d/.test(ozet)) elenme.push("metinde rakam var");
    // Hukuki niteleme / kusur atfı süzgeci.
    const yasakli = [
      "haksız", "hukuka aykırı", "ihlal", "kusur", "suç", "tazminat hakkı",
      "kanun", "madde", "yasa", "mahkeme kararı", "borçludur", "yükümlüdür",
    ];
    const kucuk = ozet.toLocaleLowerCase("tr-TR");
    const bulunan = yasakli.filter((k) => kucuk.includes(k));
    if (bulunan.length) elenme.push(`yasaklı ifade: ${bulunan.join(", ")}`);

    if (elenme.length) {
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "elendi", sebep: "öneri sunucuda elendi" } });
      return json({
        atlandi: true,
        sebep: `Öneri sunucu tarafında elendi (${elenme.join(" · ")}) — metni elle yazın`,
      });
    }

    await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "oneri_uretildi" } });
    return json({ ozet, dayanak });
  } catch (e: any) {
    console.error("[dosya-ozeti-oner] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500) });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
