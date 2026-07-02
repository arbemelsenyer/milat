// 2026 Arabuluculuk Asgari Ücret Tarifesi — deterministik hesaplayıcı
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- İKİNCİ KISIM: Anlaşma + para olan uyuşmazlık (kademeli %) ----
// width = bu dilimin genişliği (TL). Kümülatif üst sınırlar: 600k, 1.56M, 3.12M, 6.24M, 15.6M, 28.08M, 53.04M, üstü.
const BRACKETS: Array<{ width: number; single: number; multi: number }> = [
  { width:    600_000, single: 0.060, multi: 0.090 },
  { width:    960_000, single: 0.050, multi: 0.075 },
  { width:  1_560_000, single: 0.040, multi: 0.060 },
  { width:  3_120_000, single: 0.030, multi: 0.045 },
  { width:  9_360_000, single: 0.020, multi: 0.030 },
  { width: 12_480_000, single: 0.015, multi: 0.025 },
  { width: 24_960_000, single: 0.010, multi: 0.015 },
  { width:   Infinity, single: 0.005, multi: 0.010 },
];

// ---- BİRİNCİ KISIM: Saatlik ücretler (2026) ----
// 2 taraf → taraf başına saatlik. 3+ taraf → oturum başı sabit saatlik.
type HourlyTiers = { two: number; t3_5: number; t6_10: number; t11: number };
const HOURLY: Record<string, HourlyTiers> = {
  aile:            { two: 1000, t3_5: 2200, t6_10: 2300, t11: 2400 },
  ticari:          { two: 1500, t3_5: 3200, t6_10: 3300, t11: 3400 },
  isci_isveren:    { two: 1130, t3_5: 2460, t6_10: 2560, t11: 2660 },
  tuketici:        { two: 1000, t3_5: 2200, t6_10: 2300, t11: 2400 },
  kira:            { two: 1170, t3_5: 2540, t6_10: 2640, t11: 2740 },
  komsu:           { two: 1170, t3_5: 2540, t6_10: 2640, t11: 2740 },
  kat_mulkiyeti:   { two: 1170, t3_5: 2540, t6_10: 2640, t11: 2740 },
  ortaklik_giderilmesi: { two: 1170, t3_5: 2540, t6_10: 2640, t11: 2740 },
  diger:           { two: 1000, t3_5: 2200, t6_10: 2300, t11: 2400 },
};

const DISPUTE_ALIAS: Record<string, string> = {
  "aile": "aile",
  "ticari": "ticari",
  "isci-isveren": "isci_isveren", "işçi-işveren": "isci_isveren", "isci_isveren": "isci_isveren", "işçi_işveren": "isci_isveren",
  "tuketici": "tuketici", "tüketici": "tuketici",
  "kira": "kira",
  "komsu": "komsu", "komşu": "komsu", "komsu_hakki": "komsu", "komşu_hakkı": "komsu",
  "kat_mulkiyeti": "kat_mulkiyeti", "kat mülkiyeti": "kat_mulkiyeti", "kat_mülkiyeti": "kat_mulkiyeti",
  "ortaklik_giderilmesi": "ortaklik_giderilmesi", "ortaklık giderilmesi": "ortaklik_giderilmesi", "ortaklığın_giderilmesi": "ortaklik_giderilmesi",
  "diger": "diger", "diğer": "diger",
};

function normalizeDispute(t: string): string {
  const raw = (t || "diger").toLowerCase().trim().replace(/\s+/g, "_");
  return DISPUTE_ALIAS[t?.toLowerCase()?.trim() ?? ""] ?? DISPUTE_ALIAS[raw] ?? "diger";
}

function tierFor(partyCount: number): keyof HourlyTiers {
  if (partyCount <= 2) return "two";
  if (partyCount <= 5) return "t3_5";
  if (partyCount <= 10) return "t6_10";
  return "t11";
}

// ---- İkinci Kısım hesaplama ----
function calcAnlasma(disputeValue: number, arabulucuSayisi: 1 | 2) {
  let remaining = disputeValue;
  let cumulative = 0;
  let total = 0;
  const breakdown: Array<{ dilim: string; oran: string; tutar: number }> = [];
  const key = arabulucuSayisi >= 2 ? "multi" : "single";

  for (const b of BRACKETS) {
    if (remaining <= 0) break;
    const w = Math.min(remaining, b.width);
    const oran = (b as any)[key] as number;
    const tutar = w * oran;
    total += tutar;
    breakdown.push({
      dilim: `${cumulative.toLocaleString("tr-TR")} – ${(cumulative + w).toLocaleString("tr-TR")} TL`,
      oran: `%${(oran * 100).toString().replace(".", ",")}`,
      tutar: Math.round(tutar * 100) / 100,
    });
    cumulative += w;
    remaining -= w;
  }
  return { total: Math.round(total * 100) / 100, breakdown };
}

// ---- Birinci Kısım hesaplama ----
function calcSaatlik(disputeType: string, partyCount: number, totalHours: number) {
  const key = normalizeDispute(disputeType);
  const table = HOURLY[key] ?? HOURLY.diger;
  const tier = tierFor(partyCount);
  const rate = table[tier];
  const hours = Math.max(1, totalHours);

  let total: number;
  let detay: string;
  if (tier === "two") {
    // Taraf başına
    total = rate * partyCount * hours;
    detay = `${rate.toLocaleString("tr-TR")} TL/saat × ${partyCount} taraf × ${hours} saat`;
  } else {
    total = rate * hours;
    detay = `${rate.toLocaleString("tr-TR")} TL/saat × ${hours} saat (${partyCount} taraf sabit tarife)`;
  }

  return {
    total: Math.round(total * 100) / 100,
    rate,
    tier,
    breakdown: [{ dilim: detay, oran: `${rate.toLocaleString("tr-TR")} TL/saat`, tutar: Math.round(total * 100) / 100 }],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => ({}));
    const dispute_value = Number(body.dispute_value ?? 0);
    const session_count = Math.max(1, Number(body.session_count ?? 1));
    const hours_per_session = Math.max(1, Number(body.hours_per_session ?? 2));
    const fee_type = String(body.fee_type ?? "anlasma"); // anlasma | anlasamama | ihtiyari
    const dispute_type = String(body.dispute_type ?? "diger");
    const arabulucu_sayisi = (Number(body.arabulucu_sayisi ?? 1) >= 2 ? 2 : 1) as 1 | 2;
    const party_count = Math.max(2, Number(body.party_count ?? 2));
    const is_para_olan = body.is_para_olan !== undefined ? Boolean(body.is_para_olan) : (dispute_value > 0);
    const special = String(body.ozel_durum ?? "").toLowerCase().trim(); // "" | "kira_tespiti" | "tahliye" | "seri"

    if (!["anlasma", "anlasamama", "ihtiyari"].includes(fee_type)) {
      return json({ error: "Geçersiz ücret türü" }, 400);
    }
    if (!Number.isFinite(dispute_value) || dispute_value < 0) {
      return json({ error: "Geçersiz uyuşmazlık değeri" }, 400);
    }

    let baz_ucret = 0;
    let breakdown: any[] = [];
    let tarife_maddesi = "";
    let aciklama = "";
    let hesaplama_turu: "1.KISIM" | "2.KISIM" = "1.KISIM";
    let minimum_uygulandi = false;
    let minimum_tutar = 0;

    // ---- Seri uyuşmazlık sabit ücret ----
    if (fee_type === "anlasma" && special === "seri") {
      const dt = normalizeDispute(dispute_type);
      const sabit = dt === "ticari" ? 7500 : 6000;
      baz_ucret = sabit;
      hesaplama_turu = "2.KISIM";
      tarife_maddesi = "2026 AAÜT — Seri uyuşmazlıklarda anlaşma halinde sabit ücret";
      aciklama = `Seri uyuşmazlık anlaşma sabit ücreti (${dt === "ticari" ? "ticari" : "diğer"}) uygulanmıştır.`;
      breakdown = [{ dilim: "Sabit", oran: "-", tutar: sabit }];
    }
    // ---- Anlaşma + para olan (veya kira tespiti/tahliye) — İkinci Kısım ----
    else if (fee_type === "anlasma" && (is_para_olan || special === "kira_tespiti" || special === "tahliye")) {
      // Özel matrah dönüşümleri
      let matrah = dispute_value;
      let matrahAciklama = "";
      if (special === "kira_tespiti") {
        // Kira farkı × 12 (yıllık)
        matrah = dispute_value * 12;
        matrahAciklama = ` Kira tespitinde farkın 1 yıllık tutarı esas alınmıştır (${matrah.toLocaleString("tr-TR")} TL).`;
      } else if (special === "tahliye") {
        // 1 yıllık kira × 1/2
        matrah = (dispute_value * 12) / 2;
        matrahAciklama = ` Tahliyede 1 yıllık kira bedelinin yarısı esas alınmıştır (${matrah.toLocaleString("tr-TR")} TL).`;
      }

      const r = calcAnlasma(matrah, arabulucu_sayisi);
      baz_ucret = r.total;
      breakdown = r.breakdown;
      hesaplama_turu = "2.KISIM";

      // Minimum ücret kontrolü
      const dt = normalizeDispute(dispute_type);
      const isTicariOrtaklik = dt === "ticari" || dt === "ortaklik_giderilmesi";
      minimum_tutar = isTicariOrtaklik ? 13_000 : 9_000;
      if (baz_ucret < minimum_tutar) {
        minimum_uygulandi = true;
        baz_ucret = minimum_tutar;
        breakdown.push({
          dilim: `Minimum ücret uygulandı (${isTicariOrtaklik ? "Madde 7/6 — Ticari/Ortaklık Giderilmesi" : "Madde 7/7 — Anlaşma"})`,
          oran: "-",
          tutar: minimum_tutar,
        });
      }
      tarife_maddesi = "2026 AAÜT İkinci Kısım — Anlaşılan miktara göre kademeli yüzde";
      aciklama = `Anlaşma sağlanmıştır. ${matrah.toLocaleString("tr-TR")} TL üzerinden kademeli oranlarla hesaplanmıştır (${arabulucu_sayisi} arabulucu).${matrahAciklama}${minimum_uygulandi ? ` Hesaplanan tutar minimum ücretin altında kaldığı için ${minimum_tutar.toLocaleString("tr-TR")} TL minimum uygulanmıştır.` : ""}`;
    }
    // ---- Anlaşamama / Para olmayan / İhtiyari — Birinci Kısım ----
    else {
      const totalHours = session_count * hours_per_session;
      const r = calcSaatlik(dispute_type, party_count, totalHours);
      baz_ucret = r.total;
      breakdown = r.breakdown;
      hesaplama_turu = "1.KISIM";
      tarife_maddesi =
        fee_type === "anlasamama"
          ? "2026 AAÜT m.7/3 — Anlaşamama halinde Birinci Kısım saatlik ücret"
          : fee_type === "ihtiyari"
          ? "2026 AAÜT Birinci Kısım — İhtiyari arabuluculuk saatlik ücret"
          : "2026 AAÜT Birinci Kısım — Para değerlendirilemeyen uyuşmazlık saatlik ücret";
      aciklama = `${normalizeDispute(dispute_type)} uyuşmazlığı için ${session_count} oturum × ${hours_per_session} saat = ${totalHours} saat üzerinden ${party_count} taraflı saatlik tarife uygulanmıştır.`;
    }

    const kdv = Math.round(baz_ucret * 0.20 * 100) / 100;
    const genel_toplam = Math.round((baz_ucret + kdv) * 100) / 100;

    return json({
      hesaplama_turu,
      baz_ucret,
      toplam_ucret: baz_ucret,
      ek_oturum_ucreti: 0,
      kdv,
      kdv_orani: 0.20,
      genel_toplam,
      tarife_maddesi,
      aciklama,
      breakdown,
      minimum_uygulandi,
      minimum_tutar,
      inputs: { dispute_value, session_count, hours_per_session, fee_type, dispute_type, arabulucu_sayisi, party_count, is_para_olan, ozel_durum: special || null },
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
