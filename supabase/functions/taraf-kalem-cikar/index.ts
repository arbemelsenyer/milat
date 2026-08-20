// TARAF AJANI — TALEP KALEMLERİNİ ÇIKAR (İBA · taraf ajanının ilk gerçek işi)
//
// Tarafın KENDİ belgelerinden talep kalemlerini çıkarır ve her kalemi belgedeki
// BİREBİR alıntıya bağlar. Çıktı yalnız o tarafın odasında kalır.
//
// KÖR VERİ (constitution m.1): sorgular party_id ile sınırlıdır; karşı tarafın
// belgesi, beyanı ve kalemi hiçbir sorguya GİRMEZ. Belge karşı tarafa hiçbir
// zaman geçmez — masaya yalnız kalem ve dayanağı çıkar.
//
// HALÜSİNASYON YASAĞI (constitution m.2): dayanak alıntısı belgede BİREBİR
// bulunmuyorsa sunucuda ELENİR; kalem "dayanaksız" işaretlenir, uydurma alıntı
// yazılmaz. Tutar belgede net okunamıyorsa boş bırakılır — tahmin edilmez.
//
// İNSAN ÜSTÜNLÜĞÜ (constitution m.3): tarafın kendi girdiği satırlara
// (kaynak='taraf') DOKUNULMAZ; ajan yalnız kendi yazdığı satırları günceller.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import {
  anlatimAc, zatenCalisiyorMu, belgedeAra, eksigiSor, SORU_TIPI_TARAF, kolEtiketi,
  alintiOlarakSar, ajanaTalimatMi, bellekVarMi, bellekYaz,
} from "../_shared/anlatim.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
/* agent_states.agent_type bir CHECK kısıtıyla sınırlı ve bu turda SQL yazılmıyor.
   Bu iş TARAFIN KENDİ BELGELERİNİ okumak olduğu için izinli listedeki
   'document_analysis' kullanılır; bu tip zaten taraf kapsamlıdır (yalnız o taraf
   ve arabulucu görebilir — can_view_agent_state). */
const AGENT_TYPE = "document_analysis";
const MAX_GIRDI = 12_000;
const MAX_KALEM = 12;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/* Alıntı DOĞRULAMASI: model ne yazarsa yazsın, alıntı belgede birebir yoksa
   kabul edilmez. Karşılaştırma boşluk ve tırnak farklarına toleranslıdır;
   kelime eklemeye/çıkarmaya değildir. */
function metinNormalize(v: string): string {
  return String(v ?? "")
    .replace(/[""''`´]/g, '"')
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR")
    .trim();
}

function alintiBelgedeVarMi(belgeMetni: string, alinti: string): boolean {
  const a = metinNormalize(alinti);
  if (a.length < 12) return false;
  return metinNormalize(belgeMetni).includes(a);
}

/* DAYANAK ÖLÇÜSÜ (19.08 kurucu kararı) — dayanak, kalemi DOĞRULAYAN BELGEYE
   atıftır: fatura, makbuz, dekont, rapor, sözleşme, bordro, ekstre, tutanak…
   Talebin KENDİ CÜMLESİ dayanak değildir: "talep edilmektedir",
   "değerlendirilmektedir" gibi ifadeler kalemi doğrulamaz, yalnız tekrar eder. */
const KANIT_BELGE_SOZCUKLERI = [
  "fatura", "makbuz", "dekont", "rapor", "sözleşme", "sozlesme", "bordro",
  "ekstre", "tutanak", "irsaliye", "hesap özeti", "banka", "ödeme", "teslim",
  "protokol", "kira kontratı", "senet", "epikriz", "reçete",
];
const TALEP_KALIPLARI = [
  "talep edil", "talep ediyor", "talep olunur", "talebimiz", "değerlendirilmekte",
  "degerlendirilmekte", "istenmekte", "talep edilmiştir", "ödenmesi gerek",
];
/* Niteliği gereği belgeye bağlanmayan kalemler: bu bir KUSUR DEĞİL, bilgi
   notudur. Tarafa suçlayıcı dille sorulmaz, sorulacaklar listesine girmez. */
const BELGEYE_BAGLANMAYAN = ["manevi tazminat", "manevi zarar"];

function talepCumlesiMi(alinti: string): boolean {
  const a = metinNormalize(alinti);
  return TALEP_KALIPLARI.some((k) => a.includes(metinNormalize(k)));
}

function kanitBelgesiMi(metin: string): boolean {
  const a = metinNormalize(metin);
  return KANIT_BELGE_SOZCUKLERI.some((k) => a.includes(metinNormalize(k)));
}

/* ÖLÇÜ (19.08 kurucu kararı): belgede KARŞI TARAFA ait diye anılan talep
   listeye yazılmaz. Model kuralı atlarsa sunucu eler: dayanak alıntısı karşı
   tarafa atıf kalıbı taşıyorsa kalem hiç yazılmaz. Kimin talebi olduğu
   belirsizse yazılmaz — uydurma yerine boş bırakılır (constitution m.2). */
const KARSI_TARAF_KALIPLARI = [
  "karşı taraf", "karsi taraf", "davalı", "davali", "davacı taraf",
  "muhatap", "işveren tarafı", "isveren tarafi", "diğer taraf", "diger taraf",
];

function karsiTarafaAtfediliyorMu(metin: string): boolean {
  const a = metinNormalize(metin);
  return KARSI_TARAF_KALIPLARI.some((k) => a.includes(metinNormalize(k)));
}

function niteligiGeregiBelgesiz(kalemAdi: string): boolean {
  const a = metinNormalize(kalemAdi);
  return BELGEYE_BAGLANMAYAN.some((k) => a.includes(metinNormalize(k)));
}

/* Alıntı, kalemi doğrulayan bir belgeye atıf sayılıyor mu: talep cümlesi
   olmayacak VE ya kaynak belge bir kanıt belgesi olacak ya da alıntı bir belge
   sözcüğü taşıyacak. */
function dayanakSayilirMi(alinti: string, belgeAdi: string): boolean {
  if (!alinti) return false;
  if (talepCumlesiMi(alinti)) return false;
  return kanitBelgesiMi(belgeAdi) || kanitBelgesiMi(alinti);
}

// Tutar: belgede net okunan sayı. Tahmin YOK — okunamıyorsa null döner.
function tutarOku(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const t = temiz(v);
  if (!t) return null;
  const sade = t.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const sayi = Number(sade);
  return Number.isFinite(sayi) && sayi > 0 ? sayi : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let anlatim: ReturnType<typeof anlatimAc> | null = null;

  try {
    // KAPI: ajan-nobetci deseni — x-cron-secret VEYA admin JWT, yoksa 401.
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;
    if (!isCron) {
      if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const { data: userRes } = await admin.auth.getUser(token);
      if (!userRes?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admin gereklidir" }, 403);
    }

    const govde = await req.json().catch(() => ({}));
    const case_id = temiz((govde as any)?.case_id);
    const party_id = temiz((govde as any)?.party_id);
    const document_id = temiz((govde as any)?.document_id) || null;
    if (!case_id || !party_id) return json({ error: "case_id ve party_id gerekli" }, 400);

    const sahip = { case_id, agent_type: AGENT_TYPE, party_id, tarafaGorunur: true };

    // EŞZAMANLILIK: aynı iş ikinci kez başlatılmaz, sıraya da alınmaz.
    const kilit = await zatenCalisiyorMu(admin, sahip);
    if (kilit.calisiyor) return json({ atlandi: true, sebep: kilit.sebep });

    anlatim = anlatimAc(admin, sahip);
    await anlatim.baslat("Belgelerinizi okumaya başladım.");

    // Taraf bu dosyaya ait mi — kör veri kapısı.
    const { data: taraf } = await admin.from("case_parties")
      .select("id, case_id").eq("id", party_id).maybeSingle();
    if (!taraf || String((taraf as any).case_id) !== case_id) {
      await anlatim.hata("Taraf kaydı bu dosyaya ait değil.");
      return json({ error: "Taraf bu dosyaya ait değil" }, 400);
    }

    // YALNIZ bu tarafın belgeleri. Karşı tarafın belgesi sorguya hiç girmez.
    let bq = admin.from("case_documents")
      .select("id, file_name, extracted_text")
      .eq("case_id", case_id).eq("party_id", party_id)
      .not("extracted_text", "is", null)
      .order("created_at", { ascending: false }).limit(5);
    if (document_id) bq = bq.eq("id", document_id);
    const { data: belgeler } = await bq;

    const okunabilir = ((belgeler ?? []) as any[]).filter((d) => temiz(d.extracted_text).length > 80);
    if (okunabilir.length === 0) {
      await anlatim.bitti({
        yapildi: "Okunabilir belge bulamadığım için kalem çıkaramadım.",
        eksik: "Talep kalemlerinizi çıkarabilmem için okunabilir bir belge gerekiyor.",
      });
      return json({ kalem: 0, sebep: "okunabilir belge yok" });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      await anlatim.hata("Şu an belgeleri okuyamıyorum, sonra tekrar deneyeceğim.");
      return json({ error: "Model anahtarı tanımlı değil" }, 500);
    }

    const yazilan: any[] = [];
    const eksikler: string[] = [];

    // BÖLÜM 2 — hangi belgelerin atlandığı sohbete tek satırla yazılır.
    const atlananBelge: string[] = [];

    for (const belge of okunabilir) {
      const belgeMetni = String(belge.extracted_text ?? "");

      /* MÜKERRER KOŞUM KAPISI (20.08 canlı bulgusu): aynı belgeden ikinci kez
         kalem yazılmaz. Kalemler 6'dan 23'e bu yüzden çıkmıştı. İşaret belge
         kimliğiyle tutulur; başka bir belge gelirse iş normal sürer. */
      const belgeAnahtari = `kalem_cikarildi:${belge.id}`;
      if (await bellekVarMi(admin, case_id, party_id, belgeAnahtari)) {
        atlananBelge.push(temiz(belge.file_name).slice(0, 60));
        continue;
      }
      await anlatim.adim(`"${temiz(belge.file_name).slice(0, 60)}" belgesini okuyorum.`);

      /* Belgede ajana yönelik talimat görülürse UYGULANMAZ ve arabulucuya
         bildirilir. Sessiz geçilmez. */
      if (ajanaTalimatMi(belgeMetni) || ajanaTalimatMi(belge.file_name)) {
        await eksigiSor(admin, {
          case_id, hedef: "arabulucu", gorev_tipi: "arabulucu_onayi",
          etiket: `talimat-sizintisi:${belge.id}`,
          mesaj: "Bir belgede ajana yönelik talimat cümlesi görüldü; uygulanmadı.",
        });
      }

      const sistem = `Sen bir arabuluculuk dosyasında TEK BİR TARAFIN kendi belgesini okuyan tarafsız bir asistansın.
Görevin: bu belgeden TALEP KALEMLERİNİ çıkarmak.

MUTLAK KURALLAR:
1. Yalnızca sana verilen belge metnini kullan. Başka belge, dosya bilgisi veya genel bilgi ekleme.
2. Her kalem için "dayanak_alinti" alanına belgeden BİREBİR KOPYALANMIŞ tek bir cümle yaz.
   Cümleyi düzeltme, kısaltma, kelime ekleme. Birebir bulunmayan alıntı ELENİR.
3. Tutar belgede AÇIKÇA yazmıyorsa "tutar" alanını boş bırak. Tahmin etme, hesaplama yapma.
4. Hukuki niteleme yapma ("haksızdır", "hukuka aykırıdır" gibi hüküm cümlesi kurma).
5. Kişilik, niyet, duygu veya teşhis etiketi kullanma.
6. Kalem adı KISA bir isim öbeği olsun ("kira farkı", "gecikme faizi"); soru cümlesi olamaz.
7. Belgede talep kalemi yoksa boş liste döndür. Kalem UYDURMA.
8. YALNIZ BU BELGENİN SAHİBİNİN KENDİ talebini/teklifini yaz. Belgede KARŞI
   TARAFA ait olduğu söylenen talepler ("karşı taraf ... talep etmektedir",
   "davalı ... istemektedir", "işveren ... ileri sürmektedir") LİSTEYE GİRMEZ.
   Kimin talebi olduğu belirsizse o kalemi yazma.

Çıktı YALNIZCA JSON: {"kalemler":[{"kalem_adi":"...","tutar":"...","dayanak_alinti":"..."}]}`;

      let ham: any = {};
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: sistem },
              /* PROMPT INJECTION SAVUNMASI: belge icerigi TALIMAT DEGIL ALINTI
                 olarak tasinir; sistem yonergesi ile taraf metni ayri mesajlardadir
                 ve belgedeki ajana yonelik cumleler ayiklanir. */
              {
                role: "user",
                content: `BELGE ADI: ${temiz(belge.file_name)}

${alintiOlarakSar(belgeMetni.slice(0, MAX_GIRDI), "BELGE")}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!res.ok) {
          console.error(`[taraf-kalem-cikar] model HTTP ${res.status}`);
          await anlatim.adim(`"${temiz(belge.file_name).slice(0, 60)}" belgesini şu an okuyamadım.`);
          continue;
        }
        const j = await res.json();
        ham = JSON.parse(j?.choices?.[0]?.message?.content ?? "{}");
      } catch (e: any) {
        console.error("[taraf-kalem-cikar] model okunamadı", String(e?.message ?? e).slice(0, 120));
        continue;
      }

      const adaylar = Array.isArray(ham?.kalemler) ? ham.kalemler.slice(0, MAX_KALEM) : [];
      if (adaylar.length === 0) {
        await anlatim.adim(`"${temiz(belge.file_name).slice(0, 60)}" belgesinde talep kalemi bulamadım.`);
        continue;
      }
      await anlatim.adim(`${adaylar.length} talep kalemi buldum.`);

      let dayanaksizSayisi = 0;

      for (const aday of adaylar) {
        const kalemAdi = temiz(aday?.kalem_adi).slice(0, 120);
        if (!kalemAdi || kalemAdi.includes("?")) continue;
        // ÖLÇÜ: karşı tarafa atfedilen talep bu tarafın listesine yazılmaz.
        if (karsiTarafaAtfediliyorMu(kalemAdi) || karsiTarafaAtfediliyorMu(temiz(aday?.dayanak_alinti))) {
          continue;
        }

        // SUNUCU ELEMESİ: alıntı belgede birebir yoksa kabul edilmez.
        let alinti = temiz(aday?.dayanak_alinti).slice(0, 300);
        let dayanakBelgeId: string | null = belge.id;
        // (1) Belgede birebir var mı — uydurma alıntı sunucuda elenir.
        if (alinti && !alintiBelgedeVarMi(belgeMetni, alinti)) alinti = "";
        // (2) Belgeye atıf mı, yoksa talebin kendi cümlesi mi.
        if (alinti && !dayanakSayilirMi(alinti, String(belge.file_name ?? ""))) {
          alinti = "";
        }

        /* EKSİĞİ ÖNCE KENDİ TAMAMLA: dayanak çıkmadıysa aynı tarafın BAŞKA
           belgesinde karşılığı aranır. Bulunamazsa "tamamladım" DENMEZ. */
        let tamamlamaNotu = "";
        if (!alinti) {
          const bulgu = await belgedeAra(admin, {
            case_id, party_id, anahtarlar: kalemAdi.split(/\s+/).filter((x) => x.length > 3),
            haricBelgeId: belge.id,
          });
          if (bulgu?.alinti) {
            alinti = bulgu.alinti;
            dayanakBelgeId = bulgu.belge_id ?? null;
            tamamlamaNotu = `dayanağı ${bulgu.nerede} içinden tamamlandı`;
            await anlatim.adim(`"${kalemAdi}" kaleminin dayanağını ${bulgu.nerede} içinden tamamladım.`);
          }
        }

        const tutar = tutarOku(aday?.tutar);
        const belgesizKalem = niteligiGeregiBelgesiz(kalemAdi);
        const notlar: string[] = [];
        if (tamamlamaNotu) notlar.push(tamamlamaNotu);
        if (belgesizKalem) notlar.push("niteliği gereği belgeye bağlanmaz");
        if (tutar === null) notlar.push("tutar belgede net okunamadı");
        if (!alinti && !belgesizKalem) notlar.push("kalemi doğrulayan belge bulunamadı");

        /* RAKAM YAZILI OLMASI DAYANAK DEĞİLDİR: belgeye atıf yoksa kalem
           'dayanaksiz' kalır. Niteliği gereği belgeye bağlanmayan kalem de
           'dayanaksiz' işaretlenir ama bu bir kusur değil, bilgi notudur. */
        const durum = (!alinti || tutar === null) ? "dayanaksiz" : "taslak";
        if (durum === "dayanaksiz" && !belgesizKalem) dayanaksizSayisi++;

        // MÜKERRER YAZMA: aynı dosya + taraf + kalem adı bir kez yazılır.
        // Tarafın kendi girdiği satıra (kaynak='taraf') DOKUNULMAZ.
        const { data: varOlan } = await admin.from("taraf_kalemleri")
          .select("id, kaynak").eq("case_id", case_id).eq("party_id", party_id)
          .eq("kalem_adi", kalemAdi).maybeSingle();
        if (varOlan) {
          if (String((varOlan as any).kaynak) === "taraf") continue;   // insan üstündür
          await admin.from("taraf_kalemleri").update({
            tutar, dayanak_belge_id: dayanakBelgeId, dayanak_alinti: alinti || null,
            ajan_notu: notlar.join(" · ") || null, durum,
          }).eq("id", (varOlan as any).id);
        } else {
          await admin.from("taraf_kalemleri").insert({
            case_id, party_id, kalem_adi: kalemAdi, tutar,
            para_birimi: "TRY",
            dayanak_belge_id: dayanakBelgeId,
            dayanak_alinti: alinti || null,
            ajan_notu: notlar.join(" · ") || null,
            durum, kaynak: "ajan",
          });
        }
        yazilan.push({ kalem_adi: kalemAdi, durum, belgesiz: belgesizKalem });
      }

      if (dayanaksizSayisi > 0) {
        await anlatim.adim(`${dayanaksizSayisi} kalemin belgedeki karşılığını bulamadım.`);
      }

      /* Bu belge işlendi: işaret yazılır ki ikinci koşumda aynı belgeden
         yeniden kalem üretilmesin. Yazılamazsa sebep defter notuna girer. */
      const bellekNotu = await bellekYaz(admin, case_id, party_id, belgeAnahtari, {
        zaman: new Date().toISOString(),
      });
      if (bellekNotu) console.error(`[defter] bellekYaz yazılamadı: ${bellekNotu}`);
    }

    if (atlananBelge.length > 0) {
      await anlatim.adim(
        `${atlananBelge.length} belgeden kalem daha önce çıkarılmıştı, yeniden çıkarmadım.`,
      );
    }

    /* Niteliği gereği belgeye bağlanmayan kalemler SORULACAKLAR listesine
       girmez — onlarda eksik yoktur, bilgi notu vardır. */
    if (yazilan.length === 0 && atlananBelge.length > 0) {
      await anlatim.bitti({
        yapildi: "Bu belgelerden kalem daha önce çıkarılmıştı; yeniden çıkarmadım.",
      });
      return json({ kalem: 0, sebep: "belgelerden daha önce kalem çıkarıldı" });
    }

    const dayanaksiz = yazilan.filter((k) => k.durum === "dayanaksiz" && !k.belgesiz);
    if (dayanaksiz.length > 0) {
      /* TAMAMLAYAMADI → DOĞRU KİŞİYE SOR. Eksik BELGE/tarafın bilgisi olduğu için
         soru O TARAFA gider. Dil tamamlayıcıdır; suçlayıcı sözcük kullanılmaz. */
      const adlar = dayanaksiz.slice(0, 3).map((k) => `"${k.kalem_adi}"`).join(", ");
      /* SORU TİPİ (19.08 canlı kusuru): 'taraf_eksik_bilgi' tipini nöbetçinin
         başka bir kolu yürütüyor ve taraf belge yüklemişse "atlandı" yazıp
         soruyu kapatıyordu; soru tarafın sohbetinden düşüyordu. Bu yüzden
         nöbetçinin YÜRÜTMEDİĞİ 'taraf_sorusu' tipi kullanılır: soru cevap
         gelene kadar 'bekliyor' kalır ve sohbette görünür. */
      const r = await eksigiSor(admin, {
        case_id, hedef: "taraf", party_id, gorev_tipi: SORU_TIPI_TARAF,
        etiket: `kalem-dayanak:${dayanaksiz.length}`,
        mesaj: `${kolEtiketi("taraf-kalem-cikar")} ${adlar} kalemlerini doğrulayan belgeyi bulamadım — varsa ekler misiniz?`,
      });
      eksikler.push(`${dayanaksiz.length} kalemin belgedeki dayanağı bulunamadı${r.yazildi ? " — size sordum" : ""}.`);
    }

    await anlatim.bitti({
      yapildi: `${yazilan.length} talep kalemini belgelerinizden çıkardım.`,
      eksik: eksikler,
    });

    return json({
      kalem: yazilan.length, dayanaksiz: dayanaksiz.length,
      // BÖLÜM 1 — defter yazımı düştüyse sebebi çağırana taşınır, yutulmaz.
      ...(anlatim.defter_notu ? { defter_notu: anlatim.defter_notu } : {}),
    });
  } catch (e: any) {
    const msg = String(e?.message ?? "Bilinmeyen sistem hatası");
    console.error("[taraf-kalem-cikar] Genel hata:", msg.slice(0, 200));
    if (anlatim) await anlatim.hata("Belgelerinizi okurken bir sorun çıktı, sonra tekrar deneyeceğim.");
    return json({ error: msg }, 500);
  }
});
