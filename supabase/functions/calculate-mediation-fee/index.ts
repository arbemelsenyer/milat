// Deterministic mediation fee calculator per Arabuluculuk Asgari Ücret Tarifesi
// (bracket percentages are fixed by regulation, unchanged across yearly updates).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AAÜT İkinci Kısım — anlaşılan miktara göre kademeli yüzde tarifesi
// (1 arabulucu / birden fazla arabulucu)
const BRACKETS: Array<{ upto: number; single: number; multi: number }> = [
  { upto:    30_000, single: 0.060, multi: 0.090 },
  { upto:    40_000, single: 0.050, multi: 0.075 },
  { upto:    80_000, single: 0.040, multi: 0.060 },
  { upto:   250_000, single: 0.030, multi: 0.045 },
  { upto:   600_000, single: 0.020, multi: 0.030 },
  { upto:   750_000, single: 0.015, multi: 0.025 },
  { upto: 1_250_000, single: 0.010, multi: 0.015 },
  { upto: Infinity,  single: 0.005, multi: 0.010 },
];

// 2026 Yılı Arabuluculuk Asgari Ücret Tarifesi — Birinci Kısım (saatlik maktu)
// Anlaşamama & ihtiyari için taban ücretler (TL / saat, taraf başına)
const HOURLY_2026: Record<string, { first3h: number; extra: number }> = {
  aile:            { first3h: 785,  extra: 585 },
  ticari:          { first3h: 1560, extra: 1170 },
  isci_isveren:    { first3h: 785,  extra: 585 },
  "işçi_işveren":  { first3h: 785,  extra: 585 },
  tuketici:        { first3h: 785,  extra: 585 },
  "tüketici":      { first3h: 785,  extra: 585 },
  kira:            { first3h: 975,  extra: 715 },
  insaat:          { first3h: 975,  extra: 715 },
  "inşaat":        { first3h: 975,  extra: 715 },
  saglik:          { first3h: 975,  extra: 715 },
  "sağlık":        { first3h: 975,  extra: 715 },
  sigorta:         { first3h: 975,  extra: 715 },
  bankacilik:      { first3h: 1560, extra: 1170 },
  "bankacılık":    { first3h: 1560, extra: 1170 },
  fikri_mulkiyet:  { first3h: 975,  extra: 715 },
  "fikri_mülkiyet":{ first3h: 975,  extra: 715 },
  enerji_maden:    { first3h: 975,  extra: 715 },
  spor:            { first3h: 975,  extra: 715 },
  diger:           { first3h: 975,  extra: 715 },
};

function hourlyRate(disputeType: string) {
  const key = (disputeType || "diger").toLowerCase().trim();
  return HOURLY_2026[key] ?? HOURLY_2026.diger;
}

function calcAnlasma(disputeValue: number, arabulucuSayisi: 1 | 2 = 1) {
  let remaining = disputeValue;
  let cumulative = 0;
  let total = 0;
  const breakdown: Array<{ dilim: string; oran: string; tutar: number }> = [];
  const rateKey = arabulucuSayisi >= 2 ? "multi" : "single";

  for (const b of BRACKETS) {
    if (remaining <= 0) break;
    const dilimBase = Math.min(remaining, b.upto);
    const oran = (b as any)[rateKey] as number;
    const tutar = dilimBase * oran;
    total += tutar;
    breakdown.push({
      dilim: `${(cumulative).toLocaleString("tr-TR")}–${(cumulative + dilimBase).toLocaleString("tr-TR")} TL`,
      oran: `%${(oran * 100).toFixed(1)}`,
      tutar: Math.round(tutar * 100) / 100,
    });
    cumulative += dilimBase;
    remaining -= dilimBase;
  }
  return { total: Math.round(total * 100) / 100, breakdown };
}

function calcSaatlik(disputeType: string, sessionCount: number, hoursPerSession = 2) {
  const rate = hourlyRate(disputeType);
  const totalHours = Math.max(1, sessionCount) * hoursPerSession;
  const first3 = Math.min(totalHours, 3) * rate.first3h;
  const extra = Math.max(0, totalHours - 3) * rate.extra;
  const total = first3 + extra;
  return {
    total: Math.round(total * 100) / 100,
    breakdown: [
      { dilim: `İlk ${Math.min(totalHours, 3)} saat`, oran: `${rate.first3h} TL/saat`, tutar: first3 },
      ...(totalHours > 3
        ? [{ dilim: `Sonraki ${totalHours - 3} saat`, oran: `${rate.extra} TL/saat`, tutar: extra }]
        : []),
    ],
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
    const fee_type = String(body.fee_type ?? "anlasma");
    const dispute_type = String(body.dispute_type ?? "diger");
    const arabulucu_sayisi = (Number(body.arabulucu_sayisi ?? 1) >= 2 ? 2 : 1) as 1 | 2;

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

    if (fee_type === "anlasma" && dispute_value > 0) {
      const r = calcAnlasma(dispute_value, arabulucu_sayisi);
      baz_ucret = r.total;
      breakdown = r.breakdown;
      tarife_maddesi = "2026 AAÜT İkinci Kısım — Anlaşılan miktara göre kademeli yüzde";
      aciklama = `Anlaşma sağlanmıştır. ${dispute_value.toLocaleString("tr-TR")} TL üzerinden kademeli oranlarla hesaplanmıştır (${arabulucu_sayisi} arabulucu).`;
    } else {
      // anlasamama veya ihtiyari (para değerlendirilemeyen) — saatlik
      const r = calcSaatlik(dispute_type, session_count, 2);
      baz_ucret = r.total;
      breakdown = r.breakdown;
      tarife_maddesi =
        fee_type === "anlasamama"
          ? "2026 AAÜT m.7/3 — Anlaşamama halinde Birinci Kısım saatlik ücret"
          : "2026 AAÜT Birinci Kısım — İhtiyari arabuluculuk saatlik ücret";
      aciklama = `${session_count} oturum × 2 saat = ${session_count * 2} saat üzerinden ${dispute_type} uyuşmazlığı için saatlik tarife uygulanmıştır.`;
    }

    const kdv = Math.round(baz_ucret * 0.20 * 100) / 100;
    const genel_toplam = Math.round((baz_ucret + kdv) * 100) / 100;

    return json({
      baz_ucret,
      ek_oturum_ucreti: 0,
      toplam_ucret: baz_ucret,
      kdv,
      genel_toplam,
      tarife_maddesi,
      aciklama,
      breakdown,
      inputs: { dispute_value, session_count, fee_type, dispute_type, arabulucu_sayisi },
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
