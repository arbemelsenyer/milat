// SESLİ NOT → METİN (HAT H-14 kararı: B · 25.08.2026)
//
// KAPSAM — TEKNİK KISIT: bu işlev YALNIZ arabulucunun kendi sesli notunu işler.
// Taraf sesi hiçbir koşulda buraya gelmez: kayıt istemcide yalnız cihazın kendi
// mikrofonundan (`getUserMedia`) alınır, uzak ses akışına dokunulmaz.
// Bu işlev de kimliği doğrulanmış kullanıcının DOSYANIN ARABULUCUSU olduğunu
// denetler; taraf oturumuyla çağrılırsa 403 döner.
//
// ŞART 1 (kurucu, H-14): ses dosyası metne çevrildiği AN silinir. Saklanan tek
// şey metindir. Silme başarısız olursa metin yine döner ama `ses_dosya_yolu`
// TEMİZLENMEZ — böylece `ajan-nobetci`nin 24 saatlik imha kolu dosyayı bulup
// silebilir; ayrıca çağırana uyarı gider. Sessiz kalmaz (25.08 dersi).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const KOVA = "oturum-kayitlari";
// Ses dosyası sınırı: uzun kayıt hem maliyet hem gecikme demek; sesli NOT kısadır.
const AZAMI_BAYT = 20 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return json({ error: "Oturum doğrulanamadı" }, 401);

    const govde = await req.json().catch(() => ({}));
    const case_id = String(govde?.case_id ?? "").trim();
    const session_id = govde?.session_id ? String(govde.session_id) : null;
    const ses_yolu = String(govde?.ses_dosya_yolu ?? "").trim();
    if (!case_id || !ses_yolu) return json({ error: "case_id ve ses_dosya_yolu gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    /* YETKİ: yalnız dosyanın arabulucusu. Sesli not arabulucunun kendi notudur;
       taraf bu işlevi çağıramaz (teknik kısıtın sunucu tarafı). */
    const { data: dosya, error: dosyaErr } = await admin.from("cases")
      .select("id, assigned_mediator_id, user_id").eq("id", case_id).maybeSingle();
    if (dosyaErr) return json({ error: `Dosya okunamadı: ${dosyaErr.message}` }, 500);
    if (!dosya) return json({ error: "Dosya bulunamadı" }, 404);
    const dosyaSatir = dosya as { assigned_mediator_id?: string | null; user_id?: string | null };
    const arabulucu = dosyaSatir.assigned_mediator_id ?? dosyaSatir.user_id;
    if (String(arabulucu) !== uid) {
      return json({ error: "Sesli not yalnız dosyanın arabulucusuna aittir" }, 403);
    }

    /* YOL KİLİDİ: çağıran ancak KENDİ klasörüne yazdığı dosyayı işletebilir.
       Yol düzeni: <mediator_id>/<case_id>/<zaman>.webm — HAT H-4'ün beklediği
       düzen budur; kovaya dar okuma politikası bu düzene göre yazılabilir. */
    const beklenenOnek = `${uid}/${case_id}/`;
    if (!ses_yolu.startsWith(beklenenOnek)) {
      return json({ error: "Ses dosyası yolu bu dosyaya ait değil" }, 403);
    }

    if (!API_KEY) return json({ error: "Model anahtarı tanımlı değil" }, 500);

    // ── Sesi indir ────────────────────────────────────────────────────────────
    const { data: sesBlob, error: indirErr } = await admin.storage.from(KOVA).download(ses_yolu);
    if (indirErr || !sesBlob) {
      return json({ error: `Ses dosyası okunamadı: ${indirErr?.message ?? "bulunamadı"}` }, 404);
    }
    const bayt = new Uint8Array(await sesBlob.arrayBuffer());
    if (bayt.byteLength > AZAMI_BAYT) {
      // Sınırı aşan dosya işlenmez ama DEPODA DA BIRAKILMAZ.
      const { error: buyukSilErr } = await admin.storage.from(KOVA).remove([ses_yolu]);
      if (buyukSilErr) {
        console.error(`[sesli-not-dokum] büyük ses silinemedi (${case_id}): ${buyukSilErr.message}`);
      }
      return json({
        error: "Ses dosyası çok büyük; daha kısa bir not alın.",
        ses_silindi: !buyukSilErr,
      }, 413);
    }

    let b64 = "";
    {
      // Büyük diziyi parça parça çevir: tek seferde `String.fromCharCode` yığını taşırır.
      let ham = "";
      const PARCA = 0x8000;
      for (let i = 0; i < bayt.length; i += PARCA) {
        ham += String.fromCharCode(...bayt.subarray(i, i + PARCA));
      }
      b64 = btoa(ham);
    }
    const mime = sesBlob.type || "audio/webm";

    /* ── Metne dök ────────────────────────────────────────────────────────────
       İKİ BİÇİM DENENİR. Geçit OpenAI uyumlu bir uçtur ama arkasında Gemini
       çalışır; ses için iki ayrı gösterim yaygındır:
         · OpenAI biçimi  → `input_audio: { data, format }`
         · Gemini biçimi  → `inline_data: { mime_type, data }`
       Hangisinin kabul edildiğini Code canlıda sınayamıyor (mikrofon + gizli
       anahtar gerekir, anahtar §12 gereği okunmaz). Tahmin etmek yerine ikisi
       de sırayla denenir: biri 4xx dönerse öbürü koşulur. Böylece hat, geçidin
       hangi gösterimi desteklediğine bakmaksızın çalışır. */
    const SISTEM =
      "Sana bir arabulucunun kendi sesli notu veriliyor. Görevin YALNIZCA "
      + "konuşulanı Türkçe metne dökmektir. Yorum ekleme, özetleme, düzeltme "
      + "yapma, başlık atma. Duyulmayan yeri [anlaşılmadı] yaz. "
      + "Çıktı yalnız düz metin olsun.";
    const bicimler: { ad: string; parca: Record<string, unknown> }[] = [
      {
        ad: "input_audio",
        parca: { type: "input_audio", input_audio: { data: b64, format: mime.includes("mp4") ? "mp4" : "webm" } },
      },
      {
        ad: "inline_data",
        parca: { type: "input_audio", inline_data: { mime_type: mime, data: b64 } },
      },
    ];

    let metin = "";
    let dokumHatasi = "";
    for (const bicim of bicimler) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SISTEM },
              {
                role: "user",
                content: [{ type: "text", text: "Bu sesli notu metne dök:" }, bicim.parca],
              },
            ],
          }),
        });
        if (!res.ok) {
          dokumHatasi = `[${bicim.ad}] model HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`;
          // 4xx: bu gösterim kabul edilmedi — öbürünü dene. 5xx: geçit arızası,
          // öbür gösterim de kurtarmaz ama denemenin maliyeti düşük.
          continue;
        }
        const j = await res.json();
        metin = String(j?.choices?.[0]?.message?.content ?? "").trim();
        if (metin) { dokumHatasi = ""; break; }
        dokumHatasi = `[${bicim.ad}] model boş metin döndürdü`;
      } catch (e) {
        dokumHatasi = `[${bicim.ad}] model çağrılamadı: ${String((e as Error)?.message ?? e).slice(0, 160)}`;
      }
    }

    /* ── ŞART 1: SES METNE ÇEVRİLDİĞİ AN SİLİNİR ──────────────────────────────
       Döküm başarılı da olsa başarısız da olsa ses SİLİNİR: dosyanın depoda
       kalması için hiçbir sebep yok. `storage.remove` hata FIRLATMAZ, `{error}`
       döndürür — okunmazsa ses sessizce kovada kalır (25.08 dersi). */
    const { error: silErr } = await admin.storage.from(KOVA).remove([ses_yolu]);
    const sesSilindi = !silErr;
    if (silErr) {
      console.error(`[sesli-not-dokum] ses silinemedi (${case_id}): ${silErr.message}`);
    }

    if (dokumHatasi) {
      return json({
        ok: false,
        ses_silindi: sesSilindi,
        error: `Sesli not metne dökülemedi: ${dokumHatasi}`,
        ...(sesSilindi ? {} : { uyari: "Ses dosyası silinemedi; imha kolu tarafından temizlenecek." }),
      }, 502);
    }

    /* Kayıt satırı: saklanan tek şey METİNDİR. `ses_dosya_yolu` yalnız silme
       BAŞARISIZ olduğunda doldurulur — o zaman `ajan-nobetci`nin imha kolu
       dosyayı bulup silebilsin diye. Başarılıysa yol boş, `ses_silindi_at` dolu. */
    const simdi = new Date().toISOString();
    const { error: yazErr } = await admin.from("oturum_kayitlari").insert({
      case_id,
      session_id,
      ses_dosya_yolu: sesSilindi ? null : ses_yolu,
      dokum_metni: metin,
      ses_silindi_at: sesSilindi ? simdi : null,
      ses_silme_notu: sesSilindi
        ? "metne dökülür dökülmez silindi (H-14 şart 1)"
        : `silinemedi: ${silErr?.message ?? ""}`.slice(0, 300),
    });
    if (yazErr) {
      // Metin yazılamadıysa çağırana bildir: metin ekranda duruyor, kaybolmasın.
      console.error(`[sesli-not-dokum] döküm yazılamadı (${case_id}): ${yazErr.message}`);
      return json({
        ok: true, metin, ses_silindi: sesSilindi,
        uyari: `Metin çıkarıldı ama kayda yazılamadı: ${yazErr.message}`,
      });
    }

    return json({
      ok: true,
      metin,
      ses_silindi: sesSilindi,
      ...(sesSilindi ? {} : { uyari: "Ses dosyası silinemedi; imha kolu temizleyecek." }),
    });
  } catch (e) {
    const mesaj = String((e as Error)?.message ?? e);
    console.error("[sesli-not-dokum] genel hata:", mesaj.slice(0, 200));
    return json({ error: mesaj || "Bilinmeyen sistem hatası" }, 500);
  }
});
