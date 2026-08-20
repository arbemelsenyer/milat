// AJAN — BİLİRKİŞİYE SORULACAK SORULARI HAZIRLA
//
// Bilirkişi önerildiğinde, ajan DOSYADAKİ verilerden bilirkişiye sorulacak
// soruları çıkarır ve arabulucunun sohbetine sunar. Eksik taraf onayı varsa
// o tarafın kendi sohbetinden ister.
//
// ATAMA KARARI İNSANDADIR (constitution m.3, dört insan kapısından biri):
// bu fonksiyon bilirkişi ATAMAZ, atama kaydına dokunmaz, kimseye e-posta
// göndermez. Yalnız soruları hazırlar ve onay eksikse tamamlayıcı dille sorar.
//
// HALÜSİNASYON YASAĞI (constitution m.2): sorular dosyada KAYITLI verilerden
// türer — uyuşmazlık konusu, tarafların kendi kalem başlıkları, oturum notu
// başlıkları. Dosyada karşılığı olmayan soru üretilmez; hiç veri yoksa
// "bulamadım" denir. Mevzuat atfı KODA YAZILMAZ; ürün kayıtlarında yoksa boş
// bırakılır.
//
// KÖR VERİ (constitution m.1): sorular arabulucuya gider. Kalem başlıkları
// taraf ayrımı yapılmadan, yalnız KONU olarak kullanılır; hiçbir tarafın
// belgesi, beyanı ve analizi okunmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import {
  anlatimAc, zatenCalisiyorMu, eksigiSor, SORU_TIPI_TARAF, kolEtiketi, etkinKurallar,
} from "../_shared/anlatim.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
// İzinli agent_type listesinden: bu iş masanın (arabulucunun) işidir.
const AGENT_TYPE = "mediator";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let anlatim: ReturnType<typeof anlatimAc> | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;
    if (!isCron) {
      if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userRes?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admin gereklidir" }, 403);
    }

    const govde = await req.json().catch(() => ({}));
    const case_id = temiz((govde as any)?.case_id);
    const talimat = temiz((govde as any)?.talimat);
    const talimatModu = (govde as any)?.talimat_modu === true;
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const sahip = { case_id, agent_type: AGENT_TYPE, party_id: null };
    const kilit = await zatenCalisiyorMu(admin, sahip);
    if (kilit.calisiyor) return json({ atlandi: true, sebep: kilit.sebep });

    /* ARABULUCU TALİMATI (varsa): adımın KENDİ yönergesine EK yönergedir,
       yerine geçmez. Anayasa üstündür — yasak isteyen talimat koşucuda elenir;
       burada yalnız uygun talimat işlenir. Talimat kipinde tarafa yazan hiçbir
       şey yapılmaz; iş önce arabulucunun onayına sunulur. */
    anlatim = anlatimAc(admin, sahip);
    await anlatim.baslat("Bilirkişiye sorulacak soruları dosyadan çıkarıyorum.");
    if (talimat) {
      await anlatim.adim(`Arabulucunun talimatı uygulandı: ${talimat.slice(0, 160)}`);
    }

    // B6 — bu adım için açık kurallar ek yönerge olarak uygulanır.
    const acikKurallar = await etkinKurallar(admin, "bilirkisi-sorulari");
    if (acikKurallar.length > 0) {
      await anlatim.adim(`Açık kurallar uygulandı: ${acikKurallar.map((k) => k.baslik).join(" · ")}`);
    }

    // Atama kaydı: onay durumunu okumak için. Karar burada VERİLMEZ.
    const { data: atamalar } = await admin.from("case_expert_assignments")
      .select("id, status, approvals, note").eq("case_id", case_id).limit(5);
    const atama = ((atamalar ?? []) as any[])[0] ?? null;

    const { data: dosya } = await admin.from("cases")
      .select("issue_description, title").eq("id", case_id).maybeSingle();
    const konu = temiz((dosya as any)?.issue_description) || temiz((dosya as any)?.title);

    /* Konu başlıkları: tarafların kalem ADLARI (tutar ve dayanak okunmaz),
       taraf ayrımı yapılmadan tekilleştirilir — kim istemiş bilgisi soruya
       girmez, yalnız NEYİN incelenmesi gerektiği kalır. */
    const { data: kalemler } = await admin.from("taraf_kalemleri")
      .select("kalem_adi").eq("case_id", case_id).limit(100);
    const basliklar = Array.from(new Set(
      ((kalemler ?? []) as any[]).map((k) => temiz(k.kalem_adi)).filter(Boolean),
    )).slice(0, 12);

    if (!konu && basliklar.length === 0) {
      await anlatim.bitti({
        yapildi: "Bilirkişi sorusu çıkaramadım.",
        eksik: "Dosyada soruların dayanacağı bir konu kaydı ya da talep başlığı bulamadım.",
      });
      return json({ soru: 0, sebep: "dosyada veri yok" });
    }

    /* Sorular dosyadaki kayıtlardan KURULUR; hüküm kurmaz, tavsiye vermez,
       "haklı/haksız" demez. Her soru bir inceleme konusudur. */
    const sorular: string[] = [];
    if (konu) {
      sorular.push(`Dosyanın konusu bakımından teknik inceleme neyi kapsamalıdır?`);
    }
    for (const b of basliklar) {
      sorular.push(`"${b}" kalemi için hesaplama ve teknik değerlendirme nasıl yapılmalıdır?`);
    }
    const kesin = sorular.slice(0, 12);
    await anlatim.adim(`${kesin.length} soru başlığı çıkardım.`);

    /* EKSİK TARAF ONAYI: atama kaydında onay veren taraf sayısı, dosyadaki
       taraf sayısından azsa onay eksiktir. Onayı, o tarafın KENDİ sohbetinden
       tamamlayıcı dille isteriz — suçlayıcı sözcük kullanılmaz. */
    const eksikler: string[] = [];
    if (atama && talimatModu) {
      // Talimat kipi: onay gelmeden taraf yüzeyine çıkılmaz, taraftan bir şey istenmez.
      eksikler.push("Talimat kipinde tarafa soru gönderilmedi; onayınızdan sonra istenecek.");
    } else if (atama) {
      const onaylar = (atama as any)?.approvals;
      const onaylayanlar = onaylar && typeof onaylar === "object" && !Array.isArray(onaylar)
        ? Object.keys(onaylar).filter((k) => !!(onaylar as any)[k])
        : [];
      const { data: taraflar } = await admin.from("case_parties")
        .select("id").eq("case_id", case_id).limit(10);
      const hepsi = ((taraflar ?? []) as any[]).map((t) => String(t.id));
      const eksikOnay = hepsi.filter((pid) => !onaylayanlar.includes(pid));
      for (const pid of eksikOnay) {
        await eksigiSor(admin, {
          case_id, hedef: "taraf", party_id: pid, gorev_tipi: SORU_TIPI_TARAF,
          etiket: `bilirkisi-onay:${(atama as any).id}`,
          mesaj: `${kolEtiketi("bilirkisi-sorulari")} Dosyada teknik inceleme gündemde — bilirkişi görevlendirmesine onay veriyor musunuz?`,
        });
      }
      if (eksikOnay.length > 0) {
        eksikler.push(`${eksikOnay.length} tarafın bilirkişi onayı bekleniyor — kendilerine sordum.`);
      }
    }
    // ATAMA KARARI İNSANDA: bu satır hiçbir atama kaydını değiştirmez.
    eksikler.push("Bilirkişi görevlendirme kararı sizde — ajan atama yapmaz.");

    await anlatim.bitti({
      yapildi: `Bilirkişiye sorulacak ${kesin.length} soru başlığı hazırladım: ${kesin.slice(0, 3).join(" · ")}${kesin.length > 3 ? " …" : ""}`,
      eksik: eksikler,
    });

    return json({ soru: kesin.length, sorular: kesin });
  } catch (e: any) {
    const msg = String(e?.message ?? "Bilinmeyen sistem hatası");
    console.error("[bilirkisi-sorulari] Genel hata:", msg.slice(0, 200));
    if (anlatim) await anlatim.hata("Soruları hazırlayamadım, sonra tekrar deneyeceğim.");
    return json({ error: msg }, 500);
  }
});
