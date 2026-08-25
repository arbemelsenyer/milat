// BİLİRKİŞİ EKRANI — SUNUCU TARAFI (iki kademe)
//
// Bilirkişinin gördüğü HER ŞEY bu kapıdan geçer. Sebebi kayıtlıdır: canlı
// politikada `experts` tablosunu yalnız yönetici ve görevli arabulucu okuyabilir
// (supabase/migrations/20260630074226_…sql), bilirkişinin kendisi okuyamaz.
// Bu yüzden süzme EKRANDA değil BURADA, sorguda yapılır (constitution m.1).
//
// ═══ İKİ KADEME (komut §5) ═══════════════════════════════════════════════════
// KABULDEN ÖNCE yalnız: dosya numarası · alan · görevlendirme tarihi · kapsamın
// tek cümlelik özeti · kendi ücreti. Taraf adları, belgeler, kalemler, sohbet ve
// analizler HİÇBİR ALANDA DÖNMEZ.
// KABULDEN SONRA: yalnız kendisine AÇILAN belgeler (bilirkisi_evrak_kumesi'nde
// onaylandi=true) ve kendi raporu.
//
// ═══ KAPANIŞ ════════════════════════════════════════════════════════════════
// Dosya kapandıysa bilirkişinin erişimi KESİLİR; hiçbir adım veri döndürmez.
//
// ═══ YENİ GİRİŞ SİSTEMİ KURULMADI ════════════════════════════════════════════
// Bilirkişi ürünün kendi oturumuyla girer. 'eslestir' adımı, DOĞRULANMIŞ oturum
// e-postası ile experts.email kaydını karşılaştırıp experts.user_id alanını bir
// kez doldurur. Başkasının kaydına bağlanma yolu yoktur: user_id dolu ve farklı
// bir kullanıcıya aitse eşleşme reddedilir.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Arşiv ekranındaki liste ile aynı (src/pages/Archive.tsx:29) — tek doğruluk.
const KAPALI_DURUMLAR = ["completed", "resolved", "closed", "archived"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function metin(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** Kapsamın TEK CÜMLELİK özeti. Taraf adı, tutar ve beyan GEÇMEZ. */
function kapsamOzeti(dosya: any, alan: string): string {
  const konu = metin(dosya?.dispute_type) || "konusu kayıtlı olmayan";
  const alt = metin(dosya?.dispute_subtype);
  return `"${konu}${alt ? ` / ${alt}` : ""}" uyuşmazlığında `
    + `${alan ? `"${alan}" alanında` : "belirtilen alanda"} teknik görüş.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
    const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const kullanici = userRes?.user;
    if (!kullanici) return json({ error: "Oturum doğrulanamadı" }, 401);

    const govde = await req.json().catch(() => ({}));
    const adim = metin((govde as any)?.adim) || "dosyalarim";
    const case_id = metin((govde as any)?.case_id);
    const alan = metin((govde as any)?.alan);

    // ── EŞLEŞTİRME: doğrulanmış oturum e-postası ↔ experts.email ──
    if (adim === "eslestir") {
      const eposta = metin(kullanici.email).toLocaleLowerCase("tr-TR");
      if (!eposta) return json({ ok: false, sebep: "Oturumda e-posta yok" });
      const { data: kayitlar } = await admin.from("experts")
        .select("id, email, user_id, full_name, active").limit(1000);
      const eslesen = ((kayitlar ?? []) as any[])
        .find((u) => metin(u.email).toLocaleLowerCase("tr-TR") === eposta);
      if (!eslesen) return json({ ok: false, sebep: "Bu e-posta ile kayıtlı bilirkişi bulunamadı" });
      if (eslesen.user_id && eslesen.user_id !== kullanici.id) {
        return json({ ok: false, sebep: "Bu bilirkişi kaydı başka bir hesaba bağlı" }, 403);
      }
      if (!eslesen.user_id) {
        const { error } = await admin.from("experts")
          .update({ user_id: kullanici.id }).eq("id", eslesen.id);
        if (error) return json({ ok: false, sebep: `Bağlanamadı: ${error.message}` }, 500);
      }
      return json({ ok: true, expert_id: eslesen.id, full_name: eslesen.full_name });
    }

    // ── Bundan sonraki her adım bilirkişinin KENDİ kaydını ister ──
    const { data: ben } = await admin.from("experts")
      .select("id, full_name, title, specialization, niche_area, hourly_rate, active")
      .eq("user_id", kullanici.id).maybeSingle();
    if (!ben) return json({ error: "Bilirkişi kaydınız bulunamadı", eslesme_gerekli: true }, 403);
    const expertId = String((ben as any).id);

    // ── Görevlendirme satırları: yalnız KENDİ satırları ──
    const { data: gorevler } = await admin.from("bilirkisi_onerileri")
      .select("id, case_id, alan, durum, arabulucu_onay_zamani, created_at")
      .eq("expert_id", expertId).in("durum", ["atandi", "kabul", "ret"]).limit(200);
    const caseIdler = Array.from(new Set(((gorevler ?? []) as any[]).map((r) => String(r.case_id))));
    const { data: dosyalar } = caseIdler.length
      ? await admin.from("cases")
        .select("id, application_no, dispute_type, dispute_subtype, status, closed_at").in("id", caseIdler)
      : { data: [] as any[] };
    const dosyaHaritasi = new Map<string, any>();
    for (const d of (dosyalar ?? []) as any[]) dosyaHaritasi.set(String(d.id), d);

    const kapaliMi = (d: any) => !!d?.closed_at || KAPALI_DURUMLAR.includes(String(d?.status ?? ""));

    if (adim === "dosyalarim") {
      /* KABULDEN ÖNCEKİ KADEME: yalnız beş alan döner. Taraf adı, belge,
         kalem, sohbet ve analiz bu yanıtta HİÇ YOKTUR. */
      const liste = ((gorevler ?? []) as any[])
        .map((g) => {
          const d = dosyaHaritasi.get(String(g.case_id));
          if (!d || kapaliMi(d)) return null; // dosya kapandıysa erişim kesilir
          return {
            oneri_id: g.id,
            case_id: g.case_id,
            dosya_no: d.application_no ?? null,
            alan: g.alan ?? null,
            gorevlendirme_tarihi: g.arabulucu_onay_zamani ?? g.created_at,
            kapsam: kapsamOzeti(d, metin(g.alan)),
            saatlik_ucret: (ben as any).hourly_rate ?? null,
            durum: g.durum,
          };
        })
        .filter(Boolean);
      return json({ ok: true, ben: { id: expertId, full_name: (ben as any).full_name }, gorevler: liste });
    }

    if (!case_id) return json({ error: "case_id gerekli" }, 400);
    const gorev = ((gorevler ?? []) as any[])
      .find((g) => String(g.case_id) === case_id && (!alan || metin(g.alan) === alan));
    if (!gorev) return json({ error: "Bu dosyada görevlendirmeniz yok" }, 403);
    const dosya = dosyaHaritasi.get(case_id);
    if (!dosya || kapaliMi(dosya)) {
      return json({ error: "Dosya kapandı; erişiminiz sona erdi" }, 403);
    }

    if (adim === "ozet") {
      return json({
        ok: true,
        dosya_no: dosya.application_no ?? null,
        alan: gorev.alan ?? null,
        gorevlendirme_tarihi: gorev.arabulucu_onay_zamani ?? gorev.created_at,
        kapsam: kapsamOzeti(dosya, metin(gorev.alan)),
        saatlik_ucret: (ben as any).hourly_rate ?? null,
        durum: gorev.durum,
      });
    }

    // ── KABUL / RET: bilirkişinin kendi kararı (insan kapısı) ──
    if (adim === "kabul" || adim === "ret") {
      const yeniDurum = adim === "kabul" ? "kabul" : "ret";
      const { error } = await admin.from("bilirkisi_onerileri")
        .update({ durum: yeniDurum }).eq("id", gorev.id);
      if (error) return json({ error: `Kaydedilemedi: ${error.message}` }, 500);

      /* 25.08.2026 — bilirkişinin kararı (insan kapısı) `bilirkisi_onerileri`ne
         yazıldı ve o yazım denetleniyor. Ardından gelen DÖRT yazımın sonucu
         okunmuyordu ve kayıtsız şartsız `ok: true` dönülüyordu. Her birinin ayrı
         bir sessiz sonucu var, en ağırı ikincisi:
           - `case_expert_assignments`: yazılamazsa arabulucunun ekranı hâlâ
             "Onay Bekliyor" gösterir; bilirkişi kabul etmiş sayılmaz.
           - `expert_assignment_logs` (`expert_accepted`): `ajan-nobetci` rapor
             gecikmesini TAM BU KAYITTAN okur ("kabul tarihi kaydı yok, gecikme
             sayılmadı"). Yazılamazsa 14/21 günlük rapor nöbeti o bilirkişi için
             KALICI OLARAK devre dışı kalır.
           - `akis_olaylari`: ret hâlinde ajan sıradaki adaya bu olayla geçer;
             yazılamazsa akış durur.
           - `ajan_gorevleri`: arabulucu iş panosuna bildirim düşmez.
         Karar zaten kaydedildiği için çağrı başarısız SAYILMAZ (yeniden deneme
         mükerrer satır üretir); eksikler `uyarilar` ile açıkça bildirilir. */
      const uyarilar: string[] = [];
      const { error: atamaErr } = await admin.from("case_expert_assignments")
        .update({ status: adim === "kabul" ? "approved" : "rejected" })
        .eq("case_id", case_id).eq("expert_id", expertId);
      if (atamaErr) uyarilar.push(`atama durumu güncellenemedi (arabulucu ekranı eski durumu gösterir): ${atamaErr.message}`);

      const { error: izErr } = await admin.from("expert_assignment_logs").insert({
        case_id, expert_id: expertId, actor_id: kullanici.id, actor_role: "expert",
        action: adim === "kabul" ? "expert_accepted" : "expert_rejected",
        details: { note: `Bilirkişi görevi ${adim === "kabul" ? "kabul etti" : "reddetti"}` },
      });
      if (izErr) uyarilar.push(`kabul/ret izi yazılamadı (rapor gecikme nöbeti bu kayda dayanır): ${izErr.message}`);

      // Akış olayı: ret hâlinde ajan sıradaki adaya geçer, akış sürer.
      const { error: olayErr } = await admin.from("akis_olaylari").insert({
        case_id, party_id: null, olay_kodu: "bilirkisi_durumu_degisti",
        veri: { adim: yeniDurum, alan: gorev.alan ?? null }, islendi: false,
      });
      if (olayErr) uyarilar.push(`akış olayı yazılamadı (ret hâlinde sıradaki adaya geçilmez): ${olayErr.message}`);

      const { error: gorevErr } = await admin.from("ajan_gorevleri").insert({
        case_id, gorev_tipi: "arabulucu_sorusu", durum: "bekliyor", hedef_party_id: null,
        gerekce: `[kaynak:sistem] [bilirkisi:${yeniDurum}] Bilirkişi görevi `
          + `${adim === "kabul" ? "kabul etti" : "reddetti"}.`
          + `${adim === "ret" ? " Sıradaki adaya geçebilirim." : " Evrak kümesini onaya alabilirsiniz."}`,
      });
      if (gorevErr) uyarilar.push(`arabulucu iş panosuna bildirim yazılamadı: ${gorevErr.message}`);

      if (uyarilar.length > 0) {
        console.error("[bilirkisi-ekranim] karar sonrası eksikler", { case_id, expertId, uyarilar });
      }
      return json({ ok: true, durum: yeniDurum, uyarilar });
    }

    /* ── KABUL KAPISI: kabul edilmeden HİÇBİR belge açılmaz ── */
    if (gorev.durum !== "kabul") {
      return json({ error: "Görevi kabul etmeden belgeler açılmaz", durum: gorev.durum }, 403);
    }

    if (adim === "belgelerim") {
      // SÜZME SORGUDA: yalnız onaylandi=true satırlar okunur.
      const { data: kume } = await admin.from("bilirkisi_evrak_kumesi")
        .select("document_id, gerekce, onay_zamani")
        .eq("case_id", case_id).eq("expert_id", expertId).eq("onaylandi", true).limit(300);
      const idler = Array.from(new Set(((kume ?? []) as any[]).map((r) => String(r.document_id))));
      const { data: belgeler } = idler.length
        ? await admin.from("case_documents").select("id, file_name, mime_type, created_at").in("id", idler)
        : { data: [] as any[] };
      const bilgi = new Map<string, any>();
      for (const b of (belgeler ?? []) as any[]) bilgi.set(String(b.id), b);
      return json({
        ok: true,
        belgeler: ((kume ?? []) as any[]).map((r) => ({
          document_id: r.document_id,
          gerekce: r.gerekce,
          acilma_zamani: r.onay_zamani,
          belge: bilgi.get(String(r.document_id)) ?? null,
        })),
      });
    }

    if (adim === "raporum") {
      const { data } = await admin.from("bilirkisi_raporlari")
        .select("id, alan, rapor_metni, dosya_yolu, durum, teslim_zamani, created_at")
        .eq("case_id", case_id).eq("expert_id", expertId).limit(20);
      return json({ ok: true, raporlar: data ?? [] });
    }

    if (adim === "rapor_kaydet") {
      const rapor_metni = metin((govde as any)?.rapor_metni);
      const dosya_yolu = metin((govde as any)?.dosya_yolu) || null;
      const durum = metin((govde as any)?.durum) === "teslim" ? "teslim" : "taslak";
      if (!rapor_metni && !dosya_yolu) {
        return json({ error: "Rapor metni ya da dosya yolu gerekli" }, 400);
      }
      const satir: Record<string, unknown> = {
        case_id, expert_id: expertId, alan: metin(gorev.alan) || null,
        rapor_metni: rapor_metni || null, dosya_yolu, durum,
        teslim_zamani: durum === "teslim" ? new Date().toISOString() : null,
      };
      const { data: mevcut } = await admin.from("bilirkisi_raporlari")
        .select("id").eq("case_id", case_id).eq("expert_id", expertId)
        .eq("durum", "taslak").limit(1).maybeSingle();
      const { error } = mevcut
        ? await admin.from("bilirkisi_raporlari").update(satir).eq("id", (mevcut as any).id)
        : await admin.from("bilirkisi_raporlari").insert(satir);
      if (error) return json({ error: `Rapor yazılamadı: ${error.message}` }, 500);

      if (durum === "teslim") {
        /* AKIŞ SÜRER: rapor gelince ajan devreye girer — arabulucunun sohbetine
           bildirilir, taraf ajanları raporu kendi taraflarına sunar. */
        await admin.from("akis_olaylari").insert({
          case_id, party_id: null, olay_kodu: "bilirkisi_durumu_degisti",
          veri: { adim: "rapor_teslim", alan: metin(gorev.alan) || null }, islendi: false,
        });
        await admin.from("ajan_gorevleri").insert({
          case_id, gorev_tipi: "arabulucu_sorusu", durum: "bekliyor", hedef_party_id: null,
          gerekce: `[kaynak:sistem] [bilirkisi:rapor] Bilirkişi raporunu teslim etti`
            + `${gorev.alan ? ` ("${gorev.alan}" alanı)` : ""}. Taraflara sunulmak üzere hazır.`,
        });
        const { data: taraflar } = await admin.from("case_parties")
          .select("id").eq("case_id", case_id).limit(50);
        for (const t of (taraflar ?? []) as any[]) {
          await admin.from("ajan_gorevleri").insert({
            case_id, gorev_tipi: "bilirkisi_secimi", durum: "bekliyor", hedef_party_id: t.id,
            gerekce: `[kaynak:taraf_ajani] [bilirkisi:rapor-sunum] Bilirkişi raporu dosyaya girdi. `
              + `Bilirkişi bölümünden okuyabilir, diyeceğinizi yazabilirsiniz.`,
          });
        }
      }
      return json({ ok: true, durum });
    }

    return json({ error: `Tanınmayan adım: ${adim}` }, 400);
  } catch (e: any) {
    const mesaj = String(e?.message ?? e).slice(0, 300);
    console.error("[bilirkisi-ekranim] hata", mesaj);
    return json({ error: mesaj }, 500);
  }
});
