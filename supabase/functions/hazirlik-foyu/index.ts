// TARAFA OTURUM HAZIRLIK FÖYÜ (İBA 3.1) — 1. TUR: yalnız üretim.
//
// Bu fonksiyon TARAFA HİÇBİR ŞEY GÖNDERMEZ. Föyü 'taslak' olarak yazar; arabulucu
// kokpitte düzenleyip onaylar. Gönderim ayrı bir turda açılacaktır.
//
// KÖR VERİ (constitution m.1 — en sıkı kural): Föy TEK BİR TARAF için kurulur ve
// yalnız O TARAFIN verisi kullanılır — kendi beyanı, kendi belgeleri ve özetleri,
// kendi cevaplanmamış keşif soruları, dosyanın genel konusu ve oturum bilgisi.
// Karşı tarafın beyanı, belgesi, analizi, teklifi, kabul aralığı ve gizli notu
// girdiye HİÇBİR KOŞULDA girmez.
//
// DİL SINIRI: sade Türkçe; hukuki tavsiye, sonuç tahmini, "kabul edin/etmeyin",
// rakam önerisi, karşı taraf hakkında yorum ve duygu/kişilik/niyet etiketi YASAK.
// Dosyada karşılığı olmayan madde sunucuda ELENİR.
//
// ONAYLI FÖYE DOKUNULMAZ: durumu 'onaylandi' ya da 'gonderildi' olan satır
// yeniden üretilmez (arabulucunun onayladığı metni ajan değiştiremez).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KAPANIS_CUMLESI = "Bu föy hazırlık amaçlıdır; arabulucunuz tarafından gözden geçirilmiştir.";
const MAX_METIN = 4_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* ── AJAN DURUM YAZIMI ───────────────────────────────────────────────────────
   Durum yazımı asıl işi ASLA bozmaz: try/catch içinde, hata yutulur ve loglanır. */
const AGENT_TYPE = "hazirlik_foyu";
async function durumYaz(admin: any, caseId: string, partyId: string | null, patch: Record<string, unknown>) {
  if (!admin || !caseId) return;
  try {
    let sorgu = admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE);
    sorgu = partyId ? sorgu.eq("party_id", partyId) : sorgu.is("party_id", null);
    const { data: mevcut } = await sorgu.maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcut?.id) await admin.from("agent_states").update(govde).eq("id", mevcut.id);
    else await admin.from("agent_states")
      .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: partyId, ...govde });
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

// Karşılaştırma için sadeleştirme (Türkçe harfler katlanır). Yalnız eşleştirme içindir.
function sade(metin: string): string {
  return temiz(metin)
    .toLocaleLowerCase("tr-TR")
    .replace(/[şŞ]/g, "s").replace(/[ıİiI]/g, "i").replace(/[ğĞ]/g, "g")
    .replace(/[çÇ]/g, "c").replace(/[öÖ]/g, "o").replace(/[üÜ]/g, "u")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* YASAK DİL — madde bu ifadelerden birini taşıyorsa elenir. Tavsiye, tahmin,
   rakam önerisi, karşı taraf yorumu ve kişilik/duygu etiketi föye giremez. */
const YASAK_IFADELER = [
  "kabul edin", "kabul etmeyin", "reddedin", "kabul etmelisiniz", "reddetmelisiniz",
  "tavsiye ederiz", "tavsiye ederim", "öneririz size", "hukuki tavsiye",
  "kazanırsınız", "kaybedersiniz", "mahkeme", "dava açarsanız", "haklısınız",
  "haksızsınız", "karşı taraf haksız", "karşı taraf haklı", "kötü niyet", "oyalıyor",
  "sinirli", "kaygılı", "agresif", "kişilik", "psikoloj", "niyeti",
  "şu tutarı", "şu rakamı", "teklif edin", "tl teklif",
];
function yasakIfade(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return YASAK_IFADELER.find((x) => k.includes(x)) ?? null;
}

/* DOSYA KARŞILIĞI: maddede geçen anlamlı bir sözcük (≥5 harf) tarafın kendi
   metinlerinde geçmiyorsa madde ELENİR — model dosyada olmayan madde uyduramaz. */
function dosyadaKarsiligiVar(madde: string, korpus: string): boolean {
  const sadeKorpus = sade(korpus);
  const kelimeler = sade(madde).split(" ").filter((k) => k.length >= 5);
  if (kelimeler.length === 0) return false;
  return kelimeler.some((k) => sadeKorpus.includes(k));
}

function trTarihSaat(iso: string): { tarih: string; saat: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { tarih: "—", saat: "—" };
  return {
    tarih: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    saat: d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let durumAdmin: any = null;
  let durumCaseId = "";
  let durumPartyId: string | null = null;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

    // İç çağrı kapısı: nöbetçi ajan bu fonksiyonu x-cron-secret ile çağırabilir;
    // dışarıdan gelen isteklerde kullanıcı yetkisi aranır. Anahtar tanımsız ya da
    // boşsa kapı KAPALIDIR. Kalıp elverislilik/usul-onerisi ile aynıdır.
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
    const session_id = temiz((body as any)?.session_id);
    const party_id = temiz((body as any)?.party_id);
    if (!case_id || !session_id || !party_id) {
      return json({ error: "case_id, session_id ve party_id gerekli" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, title, issue_description")
      .eq("id", case_id).maybeSingle();
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

    durumAdmin = admin;
    durumCaseId = case_id;
    durumPartyId = party_id;
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "running", error_message: null });

    // ONAYLI / GÖNDERİLMİŞ FÖYE DOKUNULMAZ.
    const { data: mevcutFoy } = await admin.from("oturum_hazirlik_foyleri")
      .select("id, durum").eq("session_id", session_id).eq("party_id", party_id).maybeSingle();
    if (mevcutFoy && ["onaylandi", "gonderildi"].includes(String((mevcutFoy as any).durum))) {
      await durumYaz(durumAdmin, durumCaseId, durumPartyId, {
        status: "completed", error_message: null,
        last_output: { sonuc: "atlandi", sebep: "föy onaylanmış/gönderilmiş" },
      });
      return json({ atlandi: true, sebep: "Föy onaylanmış ya da gönderilmiş; üzerine yazılmaz." });
    }

    const { data: taraf, error: pErr } = await admin.from("case_parties")
      .select("id, case_id, party_role, party_type, first_name, last_name, company_name, full_name, statement")
      .eq("id", party_id).maybeSingle();
    if (pErr) return json({ error: pErr.message }, 500);
    if (!taraf || String((taraf as any).case_id) !== String(case_id)) {
      return json({ error: "Taraf bu dosyaya ait değil" }, 400);
    }

    const { data: oturum, error: sErr } = await admin.from("case_sessions")
      .select("id, case_id, scheduled_at, status, session_type, meeting_type, video_link")
      .eq("id", session_id).maybeSingle();
    if (sErr) return json({ error: sErr.message }, 500);
    if (!oturum || String((oturum as any).case_id) !== String(case_id)) {
      return json({ error: "Oturum bu dosyaya ait değil" }, 400);
    }

    // ── YALNIZ BU TARAFIN VERİSİ ────────────────────────────────────────────
    const { data: belgeler } = await admin.from("case_documents")
      .select("id, file_name").eq("case_id", case_id).eq("party_id", party_id).limit(50);
    const belgeIdleri = ((belgeler ?? []) as any[]).map((d) => d.id);
    const { data: ozetler } = belgeIdleri.length
      ? await admin.from("belge_ozetleri")
        .select("document_id, ozet, kaniti, durum").in("document_id", belgeIdleri).limit(50)
      : { data: [] as any[] };
    const ozetBlogu = ((ozetler ?? []) as any[])
      .filter((o) => temiz(o.durum) === "uretildi")
      .map((o) => `${temiz(o.ozet)} ${temiz(o.kaniti)}`.trim())
      .join("\n");

    const { data: sorular } = await admin.from("case_discovery_questions")
      .select("question_text, answer_text").eq("case_id", case_id).eq("party_id", party_id).limit(30);
    const cevapsizSorular = ((sorular ?? []) as any[])
      .filter((q) => !temiz(q.answer_text))
      .map((q) => temiz(q.question_text))
      .filter(Boolean);

    const beyan = temiz((taraf as any).statement);
    const konu = temiz((caseRow as any).issue_description);
    const korpus = [konu, beyan, ozetBlogu, ((belgeler ?? []) as any[]).map((d) => temiz(d.file_name)).join(" ")]
      .filter(Boolean).join("\n");

    type Bolum = { baslik: string; maddeler: string[] };
    const bolumler: Bolum[] = [];
    const elenen: string[] = [];

    // ── (a) ve (b): model üretir, sunucu eler ───────────────────────────────
    if (apiKey && korpus.trim().length > 40) {
      const systemPrompt = `Sen bir arabuluculuk dosyasında TARAFA VERİLECEK HAZIRLIK FÖYÜNÜ yazan yardımcısın. Föyü okuyacak kişi hukukçu değildir.

MUTLAK SINIRLAR:
1. Yalnız sana verilen DOSYA METİNLERİNE dayan. Karşılığı olmayan hiçbir madde yazma.
2. Hukuki tavsiye verme, sonuç tahmin etme, "kabul edin/etmeyin" deme, rakam önerme.
3. Karşı taraf hakkında yorum yapma; karşı tarafın verisi sana zaten verilmedi.
4. Duygu, kişilik ve niyet değerlendirmesi yapma.
5. Sade Türkçe yaz, hukuk jargonu kullanma. Her madde tek cümle olsun.

İki bölüm üret:
· "Oturumda konuşulacak başlıklar": dosyanın konusundan ve bu tarafın kendi anlatımından çıkan, oturumda ele alınması beklenen başlıklar (en çok 6 madde).
· "Yanınızda bulundurmanız iyi olur": bu tarafın anlatımında ya da belgelerinde geçen, oturumda işine yarayacak belgeler (en çok 5 madde). Böyle bir belge görünmüyorsa listeyi BOŞ bırak.

Çıktı YALNIZCA JSON: {"basliklar":[""],"belgeler":[""]}`;

      const userPrompt = `[DOSYA KONUSU]\n${konu || "—"}\n\n`
        + `[TARAFIN KENDİ ANLATIMI]\n${beyan.slice(0, MAX_METIN) || "—"}\n\n`
        + `[TARAFIN KENDİ BELGELERİ]\n${((belgeler ?? []) as any[]).map((d) => temiz(d.file_name)).join(" · ") || "—"}\n\n`
        + `[TARAFIN BELGE ÖZETLERİ]\n${ozetBlogu.slice(0, MAX_METIN) || "—"}`;

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

          const suz = (liste: unknown, etiket: string): string[] => {
            const ham = Array.isArray(liste) ? liste : [];
            const kalan: string[] = [];
            for (const m of ham) {
              const madde = temiz(m);
              if (madde.length < 10) continue;
              const yasak = yasakIfade(madde);
              if (yasak) { elenen.push(`${etiket}: yasak dil ("${yasak}")`); continue; }
              if (!dosyadaKarsiligiVar(madde, korpus)) {
                elenen.push(`${etiket}: dosyada karşılığı bulunamadı`);
                continue;
              }
              kalan.push(madde.slice(0, 300));
            }
            return kalan;
          };

          const basliklar = suz(parsed?.basliklar, "başlık").slice(0, 6);
          const belgeMaddeleri = suz(parsed?.belgeler, "belge").slice(0, 5);
          if (basliklar.length > 0) bolumler.push({ baslik: "Oturumda konuşulacak başlıklar", maddeler: basliklar });
          if (belgeMaddeleri.length > 0) bolumler.push({ baslik: "Yanınızda bulundurmanız iyi olur", maddeler: belgeMaddeleri });
        } else {
          console.error(`[hazirlik-foyu] HTTP ${aiRes.status}`);
        }
      } catch (e: any) {
        console.error(`[hazirlik-foyu] model çağrısı başarısız: ${e?.message ?? e}`);
      }
    }

    // ── (c) Cevaplanmamış keşif soruları — KODDAN, birebir ─────────────────
    if (cevapsizSorular.length > 0) {
      bolumler.push({
        baslik: "Cevabını hazırlamanız iyi olur",
        maddeler: cevapsizSorular.slice(0, 8).map((q) => q.slice(0, 300)),
      });
    }

    // ── (d) Oturum bilgileri — KODDAN, kayıttan ────────────────────────────
    const oturumMaddeleri: string[] = [];
    const zaman = temiz((oturum as any).scheduled_at);
    if (zaman) {
      const { tarih, saat } = trTarihSaat(zaman);
      oturumMaddeleri.push(`Tarih: ${tarih}`);
      oturumMaddeleri.push(`Saat: ${saat}`);
    }
    const bicim = temiz((oturum as any).meeting_type);
    if (bicim) {
      oturumMaddeleri.push(`Katılım biçimi: ${bicim === "online" || bicim === "cevrimici" ? "çevrimiçi" : bicim === "ozel" ? "özel görüşme" : bicim}`);
    }
    if (temiz((oturum as any).video_link)) {
      oturumMaddeleri.push("Görüşme bağlantısı oturum davetinde paylaşılır.");
    }
    if (oturumMaddeleri.length > 0) {
      bolumler.push({ baslik: "Oturum bilgileri", maddeler: oturumMaddeleri });
    }

    // Kapanış cümlesi her föyde sabittir.
    bolumler.push({ baslik: "", maddeler: [KAPANIS_CUMLESI] });

    const dolu = bolumler.filter((b) => b.baslik && b.maddeler.length > 0).length > 0;
    const satir = {
      case_id, session_id, party_id,
      bolumler,
      durum: "taslak",
      updated_at: new Date().toISOString(),
    };
    const { error: yErr } = await admin.from("oturum_hazirlik_foyleri")
      .upsert(satir, { onConflict: "session_id,party_id" });
    if (yErr) {
      await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "failed", error_message: yErr.message });
      return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);
    }

    await durumYaz(durumAdmin, durumCaseId, durumPartyId, {
      status: "completed", error_message: null,
      last_output: { sonuc: dolu ? "taslak_hazir" : "bos_taslak", bolum: bolumler.length, elenen: elenen.slice(0, 5) },
    });
    return json({
      durum: "taslak",
      bolum: bolumler.length,
      bos: !dolu,
      elenen: elenen.slice(0, 5),
    });
  } catch (e: any) {
    console.error("[hazirlik-foyu] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, {
      status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500),
    });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
