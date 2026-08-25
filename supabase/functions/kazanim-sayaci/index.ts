// KAZANIM SAYACI — dosya bazında kazanılan saat
// mimari §5.9 · §15.2 · §15.1 (camdan kutu) · HAT H-15/4 (seçim B)
//
// KURUCU KARARI (B — KALEM KALEM): katsayıyı BİZ KOYMAYIZ. Rakam
// **arabulucunun kendi beyanıdır**: kayıt olurken bir kez üç soru sorulur
// (§5.9 baz çizgisi) ve sayaç o beyanı kullanır. Ekranda hesabın kendisi
// görünür — "kendi verdiğiniz 2 saat × 6 belge = 12 saat". §15.1'in camdan
// kutu şartı böyle sağlanır: rakamın kaynağı kullanıcının kendisidir.
//
// TAKVİM SÜRESİ KULLANILMAZ (kurucu kararı): taraf üç hafta cevap vermezse
// takvim farkı sayacı eksiye düşürürdü. Sayaç yalnız ÜRETİLEN ÇIKTIYI sayar.
//
// GİZLİLİK (§14, constitution m.1): sayaç yalnız **süre + işlem tipi** tutar.
// Dosya içeriği, taraf adı, tutar buraya GİRMEZ.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/* §5.9'un üç sorusu → hangi çıktılar sayılır.
   Tablo adları KODDA sabittir; süre arabulucunun beyanından gelir. */
const KALEMLER: {
  anahtar: "belge_saat" | "analiz_saat" | "beyan_saat";
  etiket: string;
  soru: string;
  tablolar: string[];
}[] = [
  {
    anahtar: "belge_saat",
    etiket: "Resmî belge üretimi",
    soru: "Anlaşma belgesi / son tutanak hazırlamak elle kaç saat sürüyordu?",
    tablolar: ["agreement_documents"],
  },
  {
    anahtar: "analiz_saat",
    etiket: "Dosya analizi ve takip föyü",
    soru: "Dosya analizi + takip föyü çıkarmak elle kaç saat sürüyordu?",
    tablolar: ["party_analyses", "common_ground_reports", "oturum_hazirlik_foyleri"],
  },
  {
    anahtar: "beyan_saat",
    etiket: "Taraf beyanlarının yapılandırılması",
    soru: "Taraf beyanlarını yapılandırmak / özetlemek elle kaç saat sürüyordu?",
    tablolar: ["belge_ozetleri", "taraf_kalemleri"],
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return json({ error: "Oturum doğrulanamadı" }, 401);

    const govde = await req.json().catch(() => ({}));
    const case_id = govde?.case_id ? String(govde.case_id) : null;

    const admin = createClient(SUPABASE_URL, SERVICE);

    /* BAZ ÇİZGİ — arabulucunun KENDİ beyanı. Yoksa sayaç rakam ÜRETMEZ;
       "baz çizgi alınmamış" der ve üç soruyu geri döndürür ki ekran sorabilsin. */
    const { data: baz, error: bazErr } = await admin.from("arabulucu_baz_cizgi")
      .select("belge_saat, analiz_saat, beyan_saat").eq("user_id", uid).maybeSingle();
    if (bazErr) {
      return json({
        error: `Baz çizgi okunamadı: ${bazErr.message}`,
        ipucu: "Baz çizgi tablosu henüz kurulmamış olabilir (HAT H-15/4).",
      }, 500);
    }
    const b = (baz ?? {}) as Record<string, number | null>;
    if (!baz) {
      return json({
        ok: true,
        yeterli_veri: false,
        sebep: "baz_cizgi_yok",
        mesaj: "Kazanım hesabı için önce 'bu iş elle ne kadar sürüyordu' sorularını yanıtlayın.",
        sorular: KALEMLER.map((k) => ({ anahtar: k.anahtar, soru: k.soru })),
      });
    }

    // Dosya kapsamı: `case_id` verilirse o dosya, yoksa arabulucunun tüm dosyaları.
    let dosyaIdler: string[] | null = null;
    if (case_id) {
      const { data: d } = await admin.from("cases")
        .select("id, assigned_mediator_id, user_id").eq("id", case_id).maybeSingle();
      const dd = d as { assigned_mediator_id?: string | null; user_id?: string | null } | null;
      if (!dd) return json({ error: "Dosya bulunamadı" }, 404);
      if (String(dd.assigned_mediator_id ?? dd.user_id) !== uid) {
        return json({ error: "Bu dosyanın kazanım özeti size ait değil" }, 403);
      }
      dosyaIdler = [case_id];
    } else {
      const { data: liste, error: lErr } = await admin.from("cases")
        .select("id").or(`assigned_mediator_id.eq.${uid},user_id.eq.${uid}`).limit(1000);
      if (lErr) return json({ error: `Dosyalar okunamadı: ${lErr.message}` }, 500);
      dosyaIdler = ((liste ?? []) as { id: string }[]).map((x) => x.id);
      if (dosyaIdler.length === 0) {
        return json({ ok: true, yeterli_veri: true, toplam_saat: 0, kalemler: [] });
      }
    }

    const kalemler: Record<string, unknown>[] = [];
    let toplamSaat = 0;
    let saatliKalem = 0;

    for (const k of KALEMLER) {
      let adet = 0;
      const sayimHatalari: string[] = [];
      for (const t of k.tablolar) {
        const { count, error: sErr } = await admin.from(t)
          .select("id", { count: "exact", head: true }).in("case_id", dosyaIdler);
        if (sErr) { sayimHatalari.push(`${t}: ${sErr.message}`); continue; }
        adet += count ?? 0;
      }

      const saat = b[k.anahtar];
      /* BEYAN YOKSA SAATE ÇEVRİLMEZ. Adet yine gösterilir — arabulucu ajanın ne
         ürettiğini görür — ama uydurma katsayıyla saate çevrilmez. */
      if (saat == null) {
        kalemler.push({
          etiket: k.etiket, adet, beyan_saat: null, soru: k.soru,
          durum: "beyan verilmedi — saate çevrilmedi",
          ...(sayimHatalari.length ? { sayim_hatalari: sayimHatalari } : {}),
        });
        continue;
      }
      saatliKalem++;
      const kalemSaat = adet * Number(saat);
      toplamSaat += kalemSaat;
      kalemler.push({
        etiket: k.etiket, adet, beyan_saat: Number(saat),
        kalem_saat: Math.round(kalemSaat * 10) / 10,
        // Hesabın KENDİSİ görünür (§15.1 camdan kutu).
        hesap: `kendi verdiğiniz ${saat} saat × ${adet} = ${Math.round(kalemSaat * 10) / 10} saat`,
        ...(sayimHatalari.length ? { sayim_hatalari: sayimHatalari } : {}),
      });
    }

    if (saatliKalem === 0) {
      return json({
        ok: true, yeterli_veri: false, sebep: "beyan_yok",
        mesaj: "Üç sorunun hiçbiri yanıtlanmadığı için saat hesaplanmadı.",
        kalemler,
      });
    }

    return json({
      ok: true,
      yeterli_veri: true,
      kapsam: case_id ? "dosya" : "tum_dosyalar",
      toplam_saat: Math.round(toplamSaat * 10) / 10,
      // Rakamın niteliği gizlenmez: arabulucunun KENDİ beyanına dayanır.
      nitelik: "arabulucunun kendi beyanına dayalı hesap",
      kalemler,
    });
  } catch (e) {
    const mesaj = String((e as Error)?.message ?? e);
    console.error("[kazanim-sayaci] genel hata:", mesaj.slice(0, 200));
    return json({ error: mesaj || "Bilinmeyen sistem hatası" }, 500);
  }
});
