// USUL ÖNERİSİ (İBA 2.2).
//
// Dosyanın koşullarına göre sürecin BİÇİMİNE dair gerekçeli öneri sunar.
// KARAR VE KURGU ARABULUCUNUNDUR (constitution m.3): ajan öneri verir, uygulamaz.
//
// KONU SINIRI (bağlayıcı): öneri yalnız sürecin biçimine dair olabilir — oturum
// düzeni (ortak/özel, sıra), süre ve zaman, yüz yüze/çevrimiçi, uzman görüşü,
// vekilsiz tarafa süreç anlatımı için zaman. İŞİN ESASINA dair öneri (kim haklı,
// ne teklif edilmeli, rakam) YASAKTIR ve sunucuda elenir.
//
// DAYANAK KURALI: Koşullar KODDA, dosyadaki kayıtlardan deterministik çıkarılır ve
// numaralanır. Model yalnız bu numaralı koşullara dayanabilir; dayanağı dosya
// verisinde karşılığı olmayan öneri SUNUCUDA ELENİR. En fazla 4 öneri.
//
// Çıktı usul_onerileri tablosuna yazılır; tarafa SELECT politikası YOKTUR, tarafa
// gösterilmez, bildirim gönderilmez. Yalnız arabulucu düğmeye basınca çalışır.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EN_COK_ONERI = 4;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* ── AJAN DURUM YAZIMI (Ajan Kontrol Paneli) ─────────────────────────────────
   Durum yazımı asıl işi ASLA bozmaz: try/catch içinde, hata yutulur ve loglanır.
   Aynı case_id + agent_type için TEK satır güncellenir; tarafa_gorunur alanına
   dokunulmaz (varsayılan false). */
const AGENT_TYPE = "usul_onerisi";
async function durumYaz(admin: any, caseId: string, patch: Record<string, unknown>) {
  if (!admin || !caseId) return;
  try {
    const { data: mevcut } = await admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE).is("party_id", null).maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcut?.id) await admin.from("agent_states").update(govde).eq("id", mevcut.id);
    else await admin.from("agent_states")
      .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: null, ...govde });
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

// Karşılaştırma için sadeleştirme (Türkçe harfler katlanır). YALNIZ eşleştirme
// içindir; kaydedilen metin modelin verdiği orijinal hâlidir.
function sade(metin: string): string {
  return temiz(metin)
    .toLocaleLowerCase("tr-TR")
    .replace(/[şŞ]/g, "s").replace(/[ıİiI]/g, "i").replace(/[ğĞ]/g, "g")
    .replace(/[çÇ]/g, "c").replace(/[öÖ]/g, "o").replace(/[üÜ]/g, "u")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// KONU SINIRI — sunucu karşılığı. Öneri sürecin BİÇİMİNE bağlanmalı.
const BICIM_BAGLANTISI = [
  "oturum", "toplanti", "gorusme", "ozel oturum", "ortak oturum", "sira",
  "sure", "saat", "zaman", "aksam", "yuz yuze", "cevrimici", "online",
  "uzman", "bilirkisi gorusu", "anlatim", "bilgilendirme", "hazirlik", "takvim",
  "gundem", "ara verme", "ayri gorusme",
];
// İşin esasına ait öneriler bu kartın konusu değildir.
const ESAS_ISARETLERI = [
  "teklif edil", "rakam", "tutar", "odeme yapil", "kabul edilmeli", "reddedilmeli",
  "haklidir", "kusur", "tazminat", "indirim yapil", "anlasma sarti", "kim hakli",
];

function icerirSade(metin: string, liste: string[]): string | null {
  const k = sade(metin);
  return liste.find((x) => k.includes(sade(x))) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Hata dalında da durum yazılabilmesi için asıl iş içinde doldurulur.
  let durumAdmin: any = null;
  let durumCaseId = "";

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const case_id = temiz((body as any)?.case_id);
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, title, issue_description, dispute_type, dispute_subtype, mediation_type")
      .eq("id", case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf çağıramaz.
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    const yetkili = (caseRow as any).assigned_mediator_id === userId
      || (caseRow as any).user_id === userId
      || !!roleRow;
    if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);

    durumAdmin = admin;
    durumCaseId = case_id;
    await durumYaz(durumAdmin, durumCaseId, { status: "running", error_message: null });

    if (!apiKey) return json({ error: "LOVABLE_API_KEY tanımlı değil" }, 500);

    /* ── KOŞULLAR: dosyadaki kayıtlardan DETERMİNİSTİK çıkarılır ─────────────
       Her koşul numaralıdır ve kendi anahtar sözcüklerini taşır; modelin verdiği
       dayanak bu anahtarlardan en az birini içermezse öneri elenir. Böylece
       model dosya verisi uyduramaz. */
    type Kosul = { no: number; metin: string; anahtarlar: string[] };
    const kosullar: Kosul[] = [];
    const ekle = (metin: string, anahtarlar: string[]) => {
      kosullar.push({ no: kosullar.length + 1, metin, anahtarlar });
    };

    const { data: taraflar } = await admin.from("case_parties")
      .select("id, party_role, party_type, vekil_ad_soyad, statement, katilim_durumu")
      .eq("case_id", case_id).limit(20);
    const tarafListesi = (taraflar ?? []) as any[];
    const vekilli = tarafListesi.filter((t) => temiz(t.vekil_ad_soyad)).length;
    const vekilsiz = tarafListesi.length - vekilli;
    if (tarafListesi.length > 0) {
      ekle(
        `Dosyada ${tarafListesi.length} taraf var; ${vekilli} tarafın vekili kayıtlı, ${vekilsiz} tarafın vekili kayıtlı değil.`,
        ["vekil", "taraf"],
      );
    }
    const kurumsal = tarafListesi.filter((t) => temiz(t.party_type) === "corporate").length;
    if (kurumsal > 0 && kurumsal < tarafListesi.length) {
      ekle(`Taraflardan ${kurumsal} tanesi tüzel kişi, ${tarafListesi.length - kurumsal} tanesi gerçek kişi.`,
        ["tuzel", "gercek kisi", "taraf nitelig"]);
    }

    const partyIds = tarafListesi.map((t) => t.id);
    if (partyIds.length > 0) {
      const { data: musaitlik } = await admin.from("taraf_musaitlik")
        .select("party_id, gun, baslangic, bitis").in("party_id", partyIds).limit(60);
      const satirlar = (musaitlik ?? []) as any[];
      const bildiren = new Set(satirlar.map((m) => String(m.party_id))).size;
      if (satirlar.length > 0) {
        const ornek = satirlar.slice(0, 3)
          .map((m) => `${temiz(m.gun)} ${temiz(m.baslangic)}-${temiz(m.bitis)}`).join(", ");
        ekle(`${bildiren} taraf müsait gün/saat bildirdi (${satirlar.length} aralık; örnek: ${ornek}).`,
          ["musait", "saat", "gun", "takvim", "zaman"]);
      } else {
        ekle("Hiçbir taraf müsait gün/saat bildirmedi.", ["musait", "saat", "gun", "takvim", "zaman"]);
      }
    }

    const { data: mesajlar } = await admin.from("messages")
      .select("content").eq("case_id", case_id).limit(200);
    const mesajSatirlari = (mesajlar ?? []) as any[];
    if (mesajSatirlari.length > 0) {
      const toplamUzunluk = mesajSatirlari.reduce((t, m) => t + temiz(m.content).length, 0);
      ekle(`Dosya içi yazışmada ${mesajSatirlari.length} mesaj var, toplam ${toplamUzunluk} karakter.`,
        ["mesaj", "yazisma", "iletisim"]);
    }

    // Tıkanma işaretleri — ayrı tablo yok, mevcut kayıtlardan sayılır.
    const { data: teklifler } = await admin.from("randevu_teklifleri")
      .select("durum, created_at").eq("case_id", case_id).limit(50);
    const bekleyen = ((teklifler ?? []) as any[]).filter((t) => temiz(t.durum) === "beklemede").length;
    if (bekleyen > 0) ekle(`${bekleyen} randevu teklifi cevapsız bekliyor.`, ["randevu", "teklif", "cevapsiz", "oturum"]);

    const { data: oturumlar } = await admin.from("case_sessions")
      .select("status, scheduled_at").eq("case_id", case_id).limit(50);
    const iptal = ((oturumlar ?? []) as any[]).filter((o) => temiz(o.status) === "cancelled").length;
    if (iptal > 0) ekle(`${iptal} oturum iptal kaydı var.`, ["oturum", "iptal", "takvim"]);

    const { data: bantSorulari } = await admin.from("braket_bant_sorulari")
      .select("durum").eq("case_id", case_id).limit(50);
    const retler = ((bantSorulari ?? []) as any[]).filter((b) => temiz(b.durum) === "ret").length;
    if (retler > 0) ekle(`Kör teklif bant sorusu ${retler} kez reddedildi.`, ["teklif", "bant", "tikanma", "muzakere"]);

    const turMetni = [temiz((caseRow as any).dispute_type), temiz((caseRow as any).dispute_subtype)]
      .filter(Boolean).join(" / ");
    if (turMetni) {
      ekle(`Uyuşmazlık türü: ${turMetni}. Süreç türü: ${temiz((caseRow as any).mediation_type) || "belirtilmemiş"}.`,
        ["tur", "uyusmazlik", "uzmanlik", "teknik", "surec"]);
    }

    const { data: guc } = await admin.from("guc_dengesi")
      .select("gosterge_tipi, baslik").eq("case_id", case_id).limit(10);
    const gucSatirlari = ((guc ?? []) as any[]).filter((g) => temiz(g.gosterge_tipi) !== "yok");
    if (gucSatirlari.length > 0) {
      ekle(`Güç dengesi kaydında ${gucSatirlari.length} gösterge var: ${gucSatirlari.map((g) => temiz(g.baslik)).join(" · ")}.`,
        ["denge", "gosterge", "vekil", "taraf"]);
    }

    if (kosullar.length === 0) {
      const bos = { case_id, durum: "oneri_yok", oneriler: [], updated_at: new Date().toISOString() };
      const { error: bErr } = await admin.from("usul_onerileri").upsert(bos, { onConflict: "case_id" });
      if (bErr) return json({ error: `Kayıt yazılamadı: ${bErr.message}` }, 500);
      await durumYaz(durumAdmin, durumCaseId, {
        status: "completed", error_message: null, last_output: { sonuc: "oneri_yok", sebep: "koşul yok" },
      });
      return json({ durum: "oneri_yok", sebep: "Dosyada öneriye esas alınacak koşul kaydı bulunamadı." });
    }

    const systemPrompt = `Sen bir arabuluculuk dosyasında SÜRECİN BİÇİMİNE dair öneri hazırlayan tarafsız bir asistansın. Karar ve kurgu ARABULUCUNUNDUR; sen yalnız seçenek sunarsın.

KONU SINIRI: Öneri YALNIZ sürecin biçimine dair olabilir: oturum düzeni (ortak/özel oturum, sıra), oturum süresi ve zamanı, yüz yüze/çevrimiçi tercihi, uzman görüşü alınması, vekilsiz tarafa süreç anlatımına zaman ayrılması. İŞİN ESASINA dair öneri (kim haklı, ne teklif edilmeli, rakam, tutar) YASAK.

DAYANAK KURALI: Yalnız sana verilen numaralı KOŞULLARA dayan. Koşullarda karşılığı olmayan hiçbir öneri yazma; dosya verisi uydurma. Her öneride hangi koşuldan çıktığını kosul_no ile belirt ve dayanak cümlesinde o koşulun somut bilgisini (sayı, ifade) tekrarla.

DİL: Hüküm kurma, buyurma. "Yapılmalıdır" yerine "…düşünülebilir", "…için zaman ayrılabilir" kalıbını kullan. Her satırda "karar arabulucuya aittir" yazma — bu cümle ekranda bir kez gösterilir.

Her öneri için:
· oneri: tek cümle, sürecin biçimine dair somut seçenek.
· kosul_no: dayandığın koşulun numarası (yalnız verilen numaralardan biri).
· dayanak: o koşulun dosyadaki somut karşılığı — koşul metnindeki sayıyı/ifadeyi içerir.
· gerekce: bu koşulda bu biçimin neden düşünülebileceği — olgu dili, tek cümle.

EN FAZLA 4 öneri. Uygun öneri yoksa {"oneriler":[]} döndür; zorlama üretme.

Çıktı YALNIZCA JSON: {"oneriler":[{"oneri":"","kosul_no":0,"dayanak":"","gerekce":""}]}`;

    const kosulBlogu = kosullar.map((k) => `${k.no}. ${k.metin}`).join("\n");
    const userPrompt = `[DOSYA]\nBaşlık: ${temiz((caseRow as any).title) || "—"}\n`
      + `Uyuşmazlık konusu: ${temiz((caseRow as any).issue_description) || "—"}\n\n`
      + `[KOŞULLAR]\n${kosulBlogu}`;

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
      console.error(`[usul-onerisi] HTTP ${aiRes.status}: ${t.slice(0, 300)}`);
      await durumYaz(durumAdmin, durumCaseId, {
        status: "failed", error_message: `Model çağrısı başarısız (HTTP ${aiRes.status})`,
      });
      return json({ error: `Model çağrısı başarısız (HTTP ${aiRes.status})` }, 502);
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }
    const ham = Array.isArray(parsed?.oneriler) ? parsed.oneriler : [];

    /* ── SUNUCU ELEMESİ ─────────────────────────────────────────────────────
       1) Alanı eksik öneri elenir.
       2) Koşul numarası geçersizse elenir (uydurma dayanak kapısı).
       3) Dayanak, o koşulun anahtar sözcüklerinden hiçbirini taşımıyorsa elenir.
       4) Sürecin biçimine bağlanmayan ya da işin esasına giren öneri elenir.
       5) Aynı koşuldan birden çok öneri gelirse yalnız ilki kalır; en fazla 4. */
    const oneriler: any[] = [];
    const elenen: string[] = [];
    const kullanilanKosul = new Set<number>();

    for (const o of ham) {
      const oneri = temiz(o?.oneri);
      const dayanak = temiz(o?.dayanak);
      const gerekce = temiz(o?.gerekce);
      const kosulNo = Number(o?.kosul_no);

      if (!oneri || dayanak.length < 10 || gerekce.length < 10) {
        elenen.push(`${oneri || "başlıksız"}: eksik alan`);
        continue;
      }
      const kosul = kosullar.find((k) => k.no === kosulNo);
      if (!kosul) {
        elenen.push(`${oneri}: geçersiz koşul numarası (dayanak dosyada doğrulanamadı)`);
        continue;
      }
      const capa = kosul.anahtarlar.find((a) => sade(dayanak).includes(sade(a)));
      if (!capa) {
        elenen.push(`${oneri}: dayanak koşul kaydıyla eşleşmedi`);
        continue;
      }
      const esas = icerirSade(`${oneri} ${gerekce}`, ESAS_ISARETLERI);
      if (esas) {
        elenen.push(`${oneri}: işin esasına ilişkin ("${esas}") — bu kartın konusu değil`);
        continue;
      }
      const bicim = icerirSade(`${oneri} ${gerekce}`, BICIM_BAGLANTISI);
      if (!bicim) {
        elenen.push(`${oneri}: sürecin biçimine bağlanmamış`);
        continue;
      }
      if (kullanilanKosul.has(kosul.no)) {
        elenen.push(`${oneri}: aynı koşuldan ikinci öneri`);
        continue;
      }
      kullanilanKosul.add(kosul.no);
      oneriler.push({
        oneri: oneri.slice(0, 300),
        dayanak: dayanak.slice(0, 300),
        gerekce: gerekce.slice(0, 400),
        kosul_no: kosul.no,
      });
      if (oneriler.length >= EN_COK_ONERI) break;
    }

    const durum = oneriler.length > 0 ? "oneri_var" : "oneri_yok";
    const satir = { case_id, durum, oneriler, updated_at: new Date().toISOString() };
    const { error: yErr } = await admin.from("usul_onerileri").upsert(satir, { onConflict: "case_id" });
    if (yErr) {
      await durumYaz(durumAdmin, durumCaseId, { status: "failed", error_message: yErr.message });
      return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);
    }

    await durumYaz(durumAdmin, durumCaseId, {
      status: "completed", error_message: null,
      last_output: { sonuc: durum, oneri: oneriler.length, elenen: elenen.slice(0, 5) },
    });
    return json({ durum, oneri: oneriler.length, elenen: elenen.slice(0, 5) });
  } catch (e: any) {
    console.error("[usul-onerisi] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, {
      status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500),
    });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
