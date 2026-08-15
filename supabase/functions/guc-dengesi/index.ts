// GÜÇ DENGESİ İŞARETİ (İBA 2.4 · todo B16).
//
// Dosyadaki MEVCUT kayıtlardan taraflar arasındaki dengesizlik göstergelerini çıkarır
// ve arabulucuya işaret eder. Yeni bağımsız zincir kurulmaz: veriler case_parties,
// case_documents (mevcut çıkarma hattı) ve randevu_teklifleri kayıtlarından okunur.
//
// BAĞLAYICI KURALLAR:
// · Bu bir DURUM TESPİTİDİR. Zekâ, eğitim, psikoloji, karakter, "güçlü/zayıf taraf"
//   gibi etiket YASAKTIR (constitution m.2 teşhis dili yasağı, mimari §11).
// · Her göstergenin DAYANAĞI zorunludur; dayanaksız gösterge yazılmaz.
// · Ajan çözüm dayatmaz; yalnız "şu dengesizlik var" der.
// · Dengesizlik yoksa "belirgin bir dengesizlik göstergesi bulunmadı" yazılır.
// · Çıktı guc_dengesi tablosuna yazılır; tarafa SELECT politikası YOKTUR.
//
// Yapısal göstergeler (vekil · nitelik · belge · katılım) KOD tarafından deterministik
// üretilir — sayım ve kayıt karşılaştırması modele bırakılmaz. Yalnız "anlatım farkı"
// göstergesi tek bir model çağrısıyla, süreç bilgisi düzeyiyle sınırlı üretilir.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BEYAN = 4_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Kişilik/nitelik etiketi yasağı — çıktıda geçerse gösterge elenir.
const YASAK_ETIKET = [
  "zeka", "zekâ", "eğitimsiz", "egitimsiz", "eğitim düzeyi", "egitim duzeyi",
  "cahil", "bilgisiz", "naif", "saf ", "kişilik", "kisilik", "karakter",
  "psikoloj", "ruhsal", "duygusal olarak", "zayıf taraf", "zayif taraf",
  "güçlü taraf", "guclu taraf", "mağdur", "magdur", "haklı taraf", "hakli taraf",
];
function yasakEtiket(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return YASAK_ETIKET.find((x) => k.includes(x)) ?? null;
}

function tarafAdi(p: any): string {
  return temiz(p?.company_name)
    || `${temiz(p?.first_name)} ${temiz(p?.last_name)}`.trim()
    || temiz(p?.full_name)
    || "Taraf";
}

const ROL_ETIKET: Record<string, string> = {
  basvuran: "başvuran", karsi: "karşı taraf", karsi_taraf: "karşı taraf",
};
function rolEtiketi(p: any): string {
  const r = temiz(p?.party_role);
  return ROL_ETIKET[r] ?? (r || "taraf");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

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
    const case_id = temiz((body as any)?.case_id);
    const yenile = (body as any)?.yenile === true;
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id").eq("id", case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf çağıramaz.
    if (!isCron) {
      const { data: roleRow } = await admin.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      const yetkili = (caseRow as any).assigned_mediator_id === userId
        || (caseRow as any).user_id === userId
        || !!roleRow;
      if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);
    }

    const { count: mevcut } = await admin.from("guc_dengesi")
      .select("id", { count: "exact", head: true }).eq("case_id", case_id);
    if ((mevcut ?? 0) > 0 && !yenile) {
      return json({ atlandi: true, sebep: "Bu dosyanın güç dengesi işareti zaten var", satir: mevcut });
    }

    const { data: partiesRaw, error: pErr } = await admin.from("case_parties")
      .select("id, party_type, party_role, first_name, last_name, company_name, full_name, statement, katilim_durumu, vekil_ad_soyad, vekil_baro, vekil_sicil_no")
      .eq("case_id", case_id).order("created_at").limit(20);
    if (pErr) return json({ error: pErr.message }, 500);
    const taraflar = (partiesRaw ?? []) as any[];
    if (taraflar.length < 2) {
      return json({ atlandi: true, sebep: "Karşılaştırma için en az iki taraf gerekir" });
    }

    const { data: docsRaw } = await admin.from("case_documents")
      .select("id, party_id, file_name").eq("case_id", case_id).limit(200);
    const docs = (docsRaw ?? []) as any[];

    const { data: tekliflerRaw } = await admin.from("randevu_teklifleri")
      .select("party_id, durum, cevap_zamani").eq("case_id", case_id).limit(200);
    const teklifler = (tekliflerRaw ?? []) as any[];

    const gosterge: { gosterge_tipi: string; baslik: string; aciklama: string; dayanak: string }[] = [];
    const ad = (p: any) => `${tarafAdi(p)} (${rolEtiketi(p)})`;

    // ── 1) VEKİL DURUMU ─────────────────────────────────────────────────────
    const vekilli = taraflar.filter((p) => temiz(p.vekil_ad_soyad));
    const vekilsiz = taraflar.filter((p) => !temiz(p.vekil_ad_soyad));
    if (vekilli.length > 0 && vekilsiz.length > 0) {
      gosterge.push({
        gosterge_tipi: "vekil",
        baslik: "Vekil durumu farklı",
        aciklama: `${vekilli.map(ad).join(", ")} vekille temsil ediliyor; ${vekilsiz.map(ad).join(", ")} için dosyada vekil kaydı yok.`,
        dayanak: `Taraf kaydı: vekil alanı — ${vekilli.map((p) => `${tarafAdi(p)}: ${temiz(p.vekil_ad_soyad)}${temiz(p.vekil_baro) ? ` (${temiz(p.vekil_baro)})` : ""}`).join(" · ")}`,
      });
    }

    // ── 2) TARAF NİTELİĞİ (tüzel kişi ↔ birey) ──────────────────────────────
    const kurumsal = taraflar.filter((p) => temiz(p.party_type) !== "individual");
    const bireysel = taraflar.filter((p) => temiz(p.party_type) === "individual");
    if (kurumsal.length > 0 && bireysel.length > 0) {
      gosterge.push({
        gosterge_tipi: "nitelik",
        baslik: "Taraf niteliği farklı",
        aciklama: `${kurumsal.map(ad).join(", ")} tüzel kişi olarak, ${bireysel.map(ad).join(", ")} gerçek kişi olarak kayıtlı.`,
        dayanak: `Taraf kaydı: taraf türü alanı — ${taraflar.map((p) => `${tarafAdi(p)}: ${temiz(p.party_type) === "individual" ? "gerçek kişi" : "tüzel kişi"}`).join(" · ")}`,
      });
    }

    // ── 3) BELGE GÜCÜ (yalnız SAYI farkı; içerik yorumlanmaz) ───────────────
    const belgeSayisi = new Map<string, number>();
    for (const p of taraflar) belgeSayisi.set(String(p.id), 0);
    let tarafsizBelge = 0;
    for (const d of docs) {
      const pid = d.party_id ? String(d.party_id) : "";
      if (pid && belgeSayisi.has(pid)) belgeSayisi.set(pid, (belgeSayisi.get(pid) ?? 0) + 1);
      else tarafsizBelge++;
    }
    const sayilar = taraflar.map((p) => ({ p, n: belgeSayisi.get(String(p.id)) ?? 0 }));
    const enCok = Math.max(...sayilar.map((x) => x.n));
    const enAz = Math.min(...sayilar.map((x) => x.n));
    // Belirgin fark eşiği: ya bir taraf hiç belge sunmamış ya da fark 3'ten fazla.
    if (docs.length > 0 && (enCok - enAz >= 3 || (enCok > 0 && enAz === 0))) {
      gosterge.push({
        gosterge_tipi: "belge",
        baslik: "Dosyaya sunulan belge sayısı belirgin farklı",
        aciklama: `${sayilar.map((x) => `${ad(x.p)}: ${x.n} belge`).join("; ")}.${tarafsizBelge > 0 ? ` Ayrıca ${tarafsizBelge} belge taraf seçilmeden dosya geneline yüklenmiş.` : ""}`,
        dayanak: `Dosya belge kayıtları (toplam ${docs.length} belge); sayım taraf eşleştirmesine göre yapıldı.`,
      });
    }

    // ── 4) SÜREÇTEKİ KATILIM ────────────────────────────────────────────────
    const katilimSatir: string[] = [];
    let katilimFarki = false;
    for (const p of taraflar) {
      const durum = temiz(p.katilim_durumu) || "beklemede";
      const beyanVar = temiz(p.statement).length >= 40;
      const kendiTeklif = teklifler.filter((t) => String(t.party_id) === String(p.id));
      const cevaplanan = kendiTeklif.filter((t) => temiz(t.cevap_zamani)).length;
      katilimSatir.push(
        `${ad(p)}: katılım "${durum}", beyan ${beyanVar ? "var" : "yok"}, randevu teklifi ${kendiTeklif.length}/cevaplanan ${cevaplanan}`,
      );
      if (durum !== "katiliyor" || !beyanVar) katilimFarki = true;
    }
    const durumlar = new Set(taraflar.map((p) => temiz(p.katilim_durumu) || "beklemede"));
    const beyanlar = new Set(taraflar.map((p) => temiz(p.statement).length >= 40));
    if (durumlar.size > 1 || beyanlar.size > 1) {
      gosterge.push({
        gosterge_tipi: "katilim",
        baslik: "Sürece katılım düzeyi farklı",
        aciklama: `Tarafların süreçteki katılımı aynı düzeyde değil. ${katilimSatir.join(" | ")}.`,
        dayanak: "Taraf kaydı: katılım durumu ve beyan alanı; randevu teklifi cevap kayıtları.",
      });
    } else if (katilimFarki) {
      // Fark yok ama ikisi de eksik — dengesizlik değildir, gösterge yazılmaz.
    }

    // ── 5) ANLATIM FARKI (yalnız SÜREÇ BİLGİSİ düzeyi; tek model çağrısı) ───
    const beyanBloklari = taraflar
      .map((p) => ({ p, s: temiz(p.statement) }))
      .filter((x) => x.s.length >= 120);
    if (beyanBloklari.length >= 2 && apiKey) {
      const systemPrompt = `Sen bir arabuluculuk dosyasında TARAFLARIN ANLATIM BİÇİMİNİ karşılaştıran tarafsız bir asistansın.
Sana iki (veya daha çok) tarafın kendi beyan metni verilir.

TEK SORU: Bu metinler arasında SÜREÇ BİLGİSİ DÜZEYİNDE belirgin bir fark var mı?
Örnek: bir metin hukuki terim ve madde atıflarıyla yazılmışken diğeri gündelik dille yazılmış olabilir.

MUTLAK YASAKLAR:
1. Zekâ, eğitim düzeyi, kültür, psikoloji, karakter, kişilik hakkında TEK KELİME yazma.
2. "Güçlü taraf", "zayıf taraf", "mağdur", "haklı" gibi etiket kullanma.
3. Kimin haklı olduğuna, ne yapılması gerektiğine değinme. Çözüm önerme.
4. Metinlerin İÇERİĞİNİ (iddiaları) değerlendirme; yalnız ANLATIM BİÇİMİNİ karşılaştır.
5. Belirgin bir fark yoksa var=false döndür. Zorlama üretme.

var=true ise:
· aciklama: tek cümle, nötr durum tespiti (ör. "Bir tarafın beyanı hukuki terim ve madde
  atıflarıyla yazılmışken diğer tarafın beyanı gündelik dille yazılmış.").
· dayanak: hangi metinden ne gözlemlediğini kısaca yaz (taraf adı + gözlem).

Çıktı YALNIZCA JSON: {"var":true veya false,"aciklama":"","dayanak":""}`;
      const userPrompt = beyanBloklari
        .map((x) => `[BEYAN — ${tarafAdi(x.p)} (${rolEtiketi(x.p)})]\n${x.s.slice(0, MAX_BEYAN)}`)
        .join("\n\n");
      try {
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
        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          let parsed: any = {};
          try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }
          const varMi = parsed?.var === true;
          const aciklama = temiz(parsed?.aciklama);
          const dayanak = temiz(parsed?.dayanak);
          // Dayanaksız gösterge GÖSTERİLMEZ; yasaklı etiket taşıyan gösterge elenir.
          const etiket = yasakEtiket(`${aciklama} ${dayanak}`);
          if (varMi && aciklama.length >= 20 && dayanak && !etiket) {
            gosterge.push({
              gosterge_tipi: "anlatim",
              baslik: "Anlatım biçimi farklı (süreç bilgisi düzeyi)",
              aciklama: aciklama.slice(0, 600),
              dayanak: `Taraf beyanları — ${dayanak.slice(0, 400)}`,
            });
          } else if (varMi && etiket) {
            console.error(`[guc-dengesi] anlatım göstergesi elendi — yasaklı etiket: ${etiket}`);
          }
        } else {
          console.error(`[guc-dengesi] anlatım çağrısı HTTP ${aiRes.status}`);
        }
      } catch (e: any) {
        console.error(`[guc-dengesi] anlatım çağrısı başarısız: ${e?.message ?? e}`);
      }
    }

    // Dengesizlik yoksa zorlama üretilmez — durum açıkça yazılır.
    const satirlar = gosterge.length > 0
      ? gosterge.map((g, i) => ({ case_id, ...g, sira: i }))
      : [{
          case_id,
          gosterge_tipi: "yok",
          baslik: "Belirgin bir dengesizlik göstergesi bulunmadı",
          aciklama: "Dosyadaki kayıtlarda taraflar arasında belirgin bir dengesizlik göstergesi görülmedi.",
          dayanak: "Taraf kayıtları, belge kayıtları ve randevu cevap kayıtları tarandı.",
          sira: 0,
        }];

    const { error: sErr } = await admin.from("guc_dengesi").delete().eq("case_id", case_id);
    if (sErr) return json({ error: `Eski kayıt silinemedi: ${sErr.message}` }, 500);
    const { error: yErr } = await admin.from("guc_dengesi").insert(satirlar);
    if (yErr) return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);

    return json({ satir: satirlar.length, gosterge: gosterge.length });
  } catch (e: any) {
    console.error("[guc-dengesi] hata", e?.message ?? e);
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
