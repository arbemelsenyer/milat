// TARAF İLETİŞİM BİLGİSİNİ AÇIK KAYNAKTAN ARAŞTIR (Aşama 1 · §1.8)
//
// Kurucu kararı (10.09.2026, tasks/PILOT-ASAMA-1-DOSYA-KURULUMU.md §1.8):
//   "AI açık kaynaklardan (internet) arar, KAYNAK DOĞRULAYARAK bulur.
//    Sonuç alanın altında küçük italik: 'Bulundu — kaynak: [tıklanabilir kaynak
//    adları]' ya da 'Bulunamadı.' UYDURMA YASAK; kaynak gösterilemeyen bilgi
//    yazılmaz. Arabulucu 'Tamam' derse bulunan bilgi ilgili alana yazılır;
//    demezse yazılmaz."
//
// YAZMA YOK. Bu fonksiyon `case_parties`e HİÇBİR ŞEY yazmaz; bulduğunu döndürür.
// Alana yazma kararı arabulucunundur ve ekrandan yapılır.
//
// KAYNAK DOĞRULAMA — NASIL: Google Generative Language API'nin `google_search`
// aracı kullanılır. Cevabın kaynakları modelin BEYANI değil, servisin döndürdüğü
// `groundingMetadata` kayıtlarıdır: gerçekten getirilmiş sayfaların adresleri.
// groundingMetadata boşsa sonuç "bulunamadı" sayılır — kaynaksız iletişim
// bilgisi ekrana ÇIKMAZ. Bu, ürünün "uydurma yasak" kuralının teknik karşılığıdır.
//
// ARAMA TERİMİ SINIRI (KVKK · constitution m.1): aramaya yalnız tarafın ADI ve
// (varsa) KURUM/ROL bilgisi girer. Uyuşmazlık konusu, dosya numarası, beyanlar,
// TC kimlik ve belge içeriği arama metnine KONMAZ — dosyanın konusu dışarıya
// sızmaz. Loglara da taraf verisi yazılmaz.
//
// GEREKLİ SECRET: GEMINI_API_KEY (zaten tanımlı; case-qa aynı anahtarı kullanır).
// Anahtar yoksa fonksiyon "arama yapılamıyor" der — sessizce kaynaksız cevap
// üretmez.
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

const EPOSTA_DESENI = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFON_DESENI = /^[+\d][\d\s().-]{6,19}$/;

/** Modelin verdiği değeri biçime göre süzer; biçimi tutmayan değer ELENİR. */
function degerGecerliMi(alan: string, deger: string): boolean {
  if (!deger) return false;
  if (alan === "eposta") return EPOSTA_DESENI.test(deger);
  if (alan === "telefon") return TELEFON_DESENI.test(deger);
  return false;
}

/** groundingMetadata → tıklanabilir kaynak listesi. Model beyanı DEĞİL. */
function kaynaklariCikar(aday: any): { tur: "internet"; ad: string; baglanti: string }[] {
  const g = aday?.groundingMetadata;
  const parcalar = Array.isArray(g?.groundingChunks) ? g.groundingChunks : [];
  const liste: { tur: "internet"; ad: string; baglanti: string }[] = [];
  const gorulen = new Set<string>();
  for (const p of parcalar) {
    const uri = temiz(p?.web?.uri);
    if (!uri || gorulen.has(uri)) continue;
    gorulen.add(uri);
    liste.push({ tur: "internet", ad: temiz(p?.web?.title) || uri, baglanti: uri });
    if (liste.length >= 6) break;
  }
  return liste;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
    const kullaniciId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const party_id = temiz((body as any)?.party_id);
    const alan = temiz((body as any)?.alan);   // "eposta" | "telefon"
    if (!party_id) return json({ error: "party_id gerekli" }, 400);
    if (alan !== "eposta" && alan !== "telefon") {
      return json({ error: "alan yalnız 'eposta' ya da 'telefon' olabilir" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: taraf, error: tErr } = await admin.from("case_parties")
      .select("id, case_id, party_type, first_name, last_name, full_name, company_name, authorized_person, party_role")
      .eq("id", party_id).maybeSingle();
    if (tErr) return json({ error: tErr.message }, 500);
    if (!taraf) return json({ error: "Taraf bulunamadı" }, 404);

    const { data: caseRow } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id").eq("id", (taraf as any).case_id).maybeSingle();
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    /* YÜZEY SINIRI: yalnız arabulucu / dosya sahibi / yönetici. Taraf kendi
       hakkında bile bu aramayı yaptıramaz — arama arabulucunun eylemidir. */
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", kullaniciId).eq("role", "admin").maybeSingle();
    const yetkili = (caseRow as any).assigned_mediator_id === kullaniciId
      || (caseRow as any).user_id === kullaniciId
      || !!roleRow;
    if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);

    if (!geminiKey) {
      /* SESSİZ DÜŞME YOK: anahtar yoksa "bulunamadı" demeyiz — arama HİÇ
         yapılamadı, bu ayrı bir durumdur ve ekranda öyle görünür. */
      return json({
        durum: "arama_yapilamadi",
        sebep: "Açık kaynak araması için GEMINI_API_KEY tanımlı değil.",
      });
    }

    const kurumsal = String((taraf as any).party_type) === "corporate";
    const ad = kurumsal
      ? temiz((taraf as any).company_name)
      : (temiz((taraf as any).full_name)
        || `${temiz((taraf as any).first_name)} ${temiz((taraf as any).last_name)}`.trim());
    if (!ad) {
      return json({ durum: "bulunamadi", sebep: "Tarafın adı boş — aranacak bir şey yok." });
    }

    const yetkiliKisi = temiz((taraf as any).authorized_person);
    const alanAdi = alan === "eposta" ? "e-posta adresi" : "telefon numarası";

    /* ARAMA METNİ — yalnız ad ve kurum bilgisi. Uyuşmazlık konusu, dosya no,
       beyan, belge içeriği GİRMEZ (KVKK · kör veri). */
    const systemPrompt = `Sen açık kaynak (internet) araması yapan bir bilgi doğrulama asistanısın.
Görevin: verilen ${kurumsal ? "kurumun" : "kişinin"} KAMUYA AÇIK ${alanAdi} bilgisini bulmak.

MUTLAK KURALLAR:
1. UYDURMA YASAK. Aramada gerçekten bulduğun, sayfada YAZAN bir değeri ver. Tahmin etme,
   kalıptan üretme ("ad.soyad@kurum.com" gibi), benzeterek doldurma.
2. Bulamadıysan bulamadım de. Emin değilsen bulamadım de.
3. Yalnız KAMUYA AÇIK kurumsal/mesleki iletişim bilgisi ver (kurum web sitesi, ticaret sicil ilanı,
   baro levhası, resmî kurum sayfası gibi). Kişinin özel/gizli bilgisini arama, verme.
4. Birden çok aday varsa en resmî kaynaktakini seç ve yalnız BİR değer ver.
5. Yanıtın YALNIZCA geçerli JSON olsun:
   {"bulundu": true|false, "deger": "", "aciklama": "tek cümle, hangi tür sayfada bulunduğu"}`;

    const userPrompt = [
      `${kurumsal ? "KURUM" : "KİŞİ"}: ${ad}`,
      yetkiliKisi ? `YETKİLİ KİŞİ: ${yetkiliKisi}` : "",
      `ARANAN: kamuya açık ${alanAdi}`,
    ].filter(Boolean).join("\n");

    const redact = (s: string) => s.split(geminiKey).join("***");
    const MODELLER = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let aday: any = null;
    let sonHata = "";

    for (const model of MODELLER) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              /* Arama aracı AÇIK: kaynaklar buradan gelir. `responseMimeType`
                 arama aracıyla birlikte kullanılamadığı için JSON'u metinden
                 ayrıştırırız. */
              tools: [{ google_search: {} }],
              generationConfig: { temperature: 0 },
            }),
          },
        );
        if (res.ok) {
          const j = await res.json();
          const c = j?.candidates?.[0];
          if (c) { aday = c; break; }
          sonHata = `${model}: boş yanıt`;
          continue;
        }
        const govde = redact(await res.text());
        let kisa = govde.replace(/\s+/g, " ").trim().slice(0, 140);
        try { kisa = String(JSON.parse(govde)?.error?.message ?? kisa).slice(0, 140); } catch { /* düz metin */ }
        sonHata = `${model}: HTTP ${res.status} ${kisa}`;
        console.error("[taraf-iletisim-arastir] model hatası:", sonHata);
        if (res.status === 404 || res.status === 400) continue;
        break;
      } catch (e: any) {
        sonHata = `${model}: ${redact(String(e?.message ?? e)).slice(0, 140)}`;
        console.error("[taraf-iletisim-arastir] çağrı başarısız:", sonHata);
        break;
      }
    }

    if (!aday) {
      return json({ durum: "arama_yapilamadi", sebep: `Açık kaynak araması yapılamadı — ${sonHata || "bilinmeyen hata"}` });
    }

    const metin = (Array.isArray(aday?.content?.parts) ? aday.content.parts : [])
      .map((p: any) => temiz(p?.text)).filter(Boolean).join("\n");
    let parsed: any = {};
    try {
      const m = /\{[\s\S]*\}/.exec(metin);
      parsed = m ? JSON.parse(m[0]) : {};
    } catch { parsed = {}; }

    const kaynaklar = kaynaklariCikar(aday);
    const deger = temiz(parsed?.deger);

    /* ÜÇ KAPI — üçü de geçilmeden değer ekrana çıkmaz:
         1. Model "buldum" demeli,
         2. değer alanın biçimine uymalı (uydurulmuş serbest metin elenir),
         3. servis GERÇEKTEN getirilmiş bir kaynak göstermeli.
       Üçüncüsü en önemlisi: kaynaksız iletişim bilgisi "bulunamadı"dır. */
    if (parsed?.bulundu !== true || !degerGecerliMi(alan, deger)) {
      return json({ durum: "bulunamadi", kaynaklar });
    }
    if (kaynaklar.length === 0) {
      return json({
        durum: "bulunamadi",
        sebep: "Bir değer önerildi ama doğrulanabilir bir kaynak gösterilemedi; yazılmadı.",
      });
    }

    return json({
      durum: "bulundu",
      alan,
      deger,
      aciklama: temiz(parsed?.aciklama).slice(0, 200),
      kaynaklar,
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 300);
    console.error("[taraf-iletisim-arastir] hata:", msg);
    return json({ error: msg }, 500);
  }
});
