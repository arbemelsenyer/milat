// 2026+ Arabuluculuk Asgari Ücret Tarifesi — DB'den JSON okuyup deterministik hesap
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Bracket = { ust_sinir: number | null; tek_arabulucu: number; birden_fazla: number };
type HourlyTier = { iki_taraf: number; uc_bes_taraf: number; alti_on_taraf: number; onbir_ust: number };
type Tariff = {
  yil: number;
  ikinci_kisim: { dilimler: Bracket[]; minimum_ucret: number; minimum_ticari_ortaklik: number };
  birinci_kisim: { turler: Record<string, HourlyTier> };
  seri_uyusmazlik: { minimum_dosya_sayisi: number; ticari: number; diger: number };
  kdv_orani: number;
  stopaj_orani: number;
};

const DISPUTE_ALIAS: Record<string, string> = {
  aile: "aile",
  ticari: "ticari",
  "isci-isveren": "isci_isveren", "işçi-işveren": "isci_isveren", isci_isveren: "isci_isveren",
  tuketici: "tuketici", "tüketici": "tuketici",
  kira: "kira_komsuluk_kat", komsu: "kira_komsuluk_kat", kat_mulkiyeti: "kira_komsuluk_kat",
  ortaklik_giderilmesi: "ortaklik_giderimi", ortaklik_giderimi: "ortaklik_giderimi",
  diger: "diger", "diğer": "diger",
};
function normalizeDispute(t: string): string {
  const raw = (t || "diger").toLowerCase().trim().replace(/\s+/g, "_");
  return DISPUTE_ALIAS[t?.toLowerCase()?.trim() ?? ""] ?? DISPUTE_ALIAS[raw] ?? "diger";
}
function tierKey(partyCount: number): keyof HourlyTier {
  if (partyCount <= 2) return "iki_taraf";
  if (partyCount <= 5) return "uc_bes_taraf";
  if (partyCount <= 10) return "alti_on_taraf";
  return "onbir_ust";
}
function calcAnlasma(matrah: number, arabulucuSayisi: 1 | 2, dilimler: Bracket[]) {
  let remaining = matrah, cumulative = 0, total = 0;
  const breakdown: any[] = [];
  for (const b of dilimler) {
    if (remaining <= 0) break;
    const cap = b.ust_sinir ?? Infinity;
    const width = Math.max(0, cap - cumulative);
    const w = Math.min(remaining, width);
    if (w <= 0 && cap !== Infinity) continue;
    const pct = (arabulucuSayisi >= 2 ? b.birden_fazla : b.tek_arabulucu) / 100;
    const tutar = w * pct;
    total += tutar;
    breakdown.push({
      dilim: `${cumulative.toLocaleString("tr-TR")} – ${(cumulative + w).toLocaleString("tr-TR")} TL`,
      oran: `%${(pct * 100).toString().replace(".", ",")}`,
      tutar: Math.round(tutar * 100) / 100,
    });
    cumulative += w; remaining -= w;
    if (cap === Infinity) break;
  }
  return { total: Math.round(total * 100) / 100, breakdown };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized", message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized", message: "Geçersiz oturum." }, 401);

    // Load active tariff (highest year)
    const { data: tariffRow, error: tErr } = await userClient
      .from("fee_tariffs").select("yil, tariff_data")
      .eq("is_active", true).order("yil", { ascending: false }).limit(1).maybeSingle();
    if (tErr) return json({ error: "tariff_load_failed", message: "Tarife yüklenemedi: " + tErr.message }, 500);
    if (!tariffRow) return json({ error: "no_tariff", message: "Aktif bir ücret tarifesi tanımlanmamış. Lütfen admin ile iletişime geçin." }, 422);

    const tariff = tariffRow.tariff_data as Tariff;

    const body = await req.json().catch(() => ({}));
    const fee_type = String(body.fee_type ?? "anlasma"); // anlasma|anlasamama|ihtiyari
    if (!["anlasma", "anlasamama", "ihtiyari"].includes(fee_type)) {
      return json({ error: "bad_input", message: "Geçersiz ücret türü." }, 422);
    }
    const dispute_value = Number(body.dispute_value ?? 0);
    const session_count = Math.max(1, Number(body.session_count ?? 1));
    const hours_per_session = Math.max(1, Number(body.hours_per_session ?? 2));
    const arabulucu_sayisi = (Number(body.arabulucu_sayisi ?? 1) >= 2 ? 2 : 1) as 1 | 2;
    const party_count = Math.max(2, Number(body.party_count ?? 2));
    const dispute_type = normalizeDispute(String(body.dispute_type ?? "diger"));
    const is_para_olan = body.is_para_olan !== undefined ? Boolean(body.is_para_olan) : dispute_value > 0;
    const special = String(body.ozel_durum ?? "").toLowerCase().trim();
    const is_seri = Boolean(body.is_seri);
    const seri_dosya_sayisi = Math.max(1, Number(body.seri_dosya_sayisi ?? 0));

    if (!Number.isFinite(dispute_value) || dispute_value < 0) {
      return json({ error: "bad_input", message: "Geçersiz uyuşmazlık değeri." }, 422);
    }

    let baz_ucret = 0;
    let breakdown: any[] = [];
    let tarife_maddesi = "";
    let aciklama = "";
    let hesaplama_turu: "1.KISIM" | "2.KISIM" | "SERI" = "1.KISIM";
    let minimum_uygulandi = false;
    let minimum_tutar = 0;

    // A) Seri
    if (is_seri) {
      if (seri_dosya_sayisi < tariff.seri_uyusmazlik.minimum_dosya_sayisi) {
        return json({ error: "bad_input", message: `Seri uyuşmazlık için en az ${tariff.seri_uyusmazlik.minimum_dosya_sayisi} dosya gereklidir.` }, 422);
      }
      const sabit = dispute_type === "ticari" ? tariff.seri_uyusmazlik.ticari : tariff.seri_uyusmazlik.diger;
      baz_ucret = sabit * seri_dosya_sayisi;
      hesaplama_turu = "SERI";
      tarife_maddesi = `${tariff.yil} AAÜT — Seri uyuşmazlık sabit ücret`;
      aciklama = `Seri uyuşmazlık: ${seri_dosya_sayisi} dosya × ${sabit.toLocaleString("tr-TR")} TL = ${baz_ucret.toLocaleString("tr-TR")} TL (${dispute_type === "ticari" ? "ticari" : "diğer"}).`;
      breakdown = [{ dilim: `${seri_dosya_sayisi} dosya × ${sabit.toLocaleString("tr-TR")} TL`, oran: "-", tutar: baz_ucret }];
    }
    // B) Anlaşma + para olan (veya özel matrah)
    else if (fee_type === "anlasma" && (is_para_olan || special === "kira_tespiti" || special === "tahliye")) {
      let matrah = dispute_value;
      let matrahAciklama = "";
      if (special === "kira_tespiti") { matrah = dispute_value * 12; matrahAciklama = ` (Kira tespiti: farkın 1 yıllık tutarı)`; }
      else if (special === "tahliye") { matrah = (dispute_value * 12) / 2; matrahAciklama = ` (Tahliye: 1 yıllık kiranın yarısı)`; }
      const r = calcAnlasma(matrah, arabulucu_sayisi, tariff.ikinci_kisim.dilimler);
      baz_ucret = r.total; breakdown = r.breakdown; hesaplama_turu = "2.KISIM";
      const isTicariOrtaklik = dispute_type === "ticari" || dispute_type === "ortaklik_giderimi";
      minimum_tutar = isTicariOrtaklik ? tariff.ikinci_kisim.minimum_ticari_ortaklik : tariff.ikinci_kisim.minimum_ucret;
      if (baz_ucret < minimum_tutar) {
        minimum_uygulandi = true; baz_ucret = minimum_tutar;
        breakdown.push({ dilim: `Minimum ücret uygulandı (${isTicariOrtaklik ? "Ticari/Ortaklık" : "Genel"})`, oran: "-", tutar: minimum_tutar });
      }
      tarife_maddesi = `${tariff.yil} AAÜT İkinci Kısım — Kademeli yüzde`;
      aciklama = `Anlaşma sağlanmıştır. Matrah ${matrah.toLocaleString("tr-TR")} TL${matrahAciklama} üzerinden ${arabulucu_sayisi === 2 ? "birden fazla" : "tek"} arabulucu oranlarıyla hesaplanmıştır.${minimum_uygulandi ? ` Minimum ${minimum_tutar.toLocaleString("tr-TR")} TL uygulanmıştır.` : ""}`;
    }
    // C) Anlaşamama / para olmayan / ihtiyari — saatlik
    else {
      const turler = tariff.birinci_kisim.turler;
      const key = turler[dispute_type] ? dispute_type : "diger";
      const t = turler[key];
      const tk = tierKey(party_count);
      const rate = t[tk];
      const hours = session_count * hours_per_session;
      if (tk === "iki_taraf") {
        baz_ucret = rate * party_count * hours;
        breakdown = [{ dilim: `${rate.toLocaleString("tr-TR")} TL/saat × ${party_count} taraf × ${hours} saat`, oran: "-", tutar: baz_ucret }];
      } else {
        baz_ucret = rate * hours;
        breakdown = [{ dilim: `${rate.toLocaleString("tr-TR")} TL/saat × ${hours} saat (${party_count} taraf sabit)`, oran: "-", tutar: baz_ucret }];
      }
      hesaplama_turu = "1.KISIM";
      tarife_maddesi = fee_type === "anlasamama"
        ? `${tariff.yil} AAÜT m.7/3 — Anlaşamama saatlik`
        : `${tariff.yil} AAÜT Birinci Kısım — Saatlik ücret`;
      aciklama = `${key} uyuşmazlığı için ${session_count} oturum × ${hours_per_session} saat = ${hours} saat üzerinden ${party_count} taraflı saatlik tarife.`;
    }

    baz_ucret = Math.round(baz_ucret * 100) / 100;
    const kdvOran = (tariff.kdv_orani ?? 20) / 100;
    const stopajOran = (tariff.stopaj_orani ?? 20) / 100;
    const kdv = Math.round(baz_ucret * kdvOran * 100) / 100;
    const gv_stopaj = Math.round(baz_ucret * stopajOran * 100) / 100;
    const net_ucret = Math.round((baz_ucret - gv_stopaj) * 100) / 100;
    const kdv_tevkifati = 0;
    const tahsil_edilen_kdv = Math.round((kdv - kdv_tevkifati) * 100) / 100;
    const net_tahsilat = Math.round((net_ucret + tahsil_edilen_kdv) * 100) / 100;
    const genel_toplam = Math.round((baz_ucret + kdv) * 100) / 100;

    return json({
      hesaplama_turu,
      tarife_yili: tariff.yil,
      brut_ucret: baz_ucret,
      baz_ucret,
      toplam_ucret: baz_ucret,
      ek_oturum_ucreti: 0,
      kdv, kdv_orani: kdvOran,
      gv_stopaj, stopaj_orani: stopajOran,
      net_ucret,
      kdv_tevkifati,
      tahsil_edilen_kdv,
      net_tahsilat,
      genel_toplam,
      tarife_maddesi, aciklama, breakdown,
      minimum_uygulandi, minimum_tutar,
      inputs: { dispute_value, session_count, hours_per_session, fee_type, dispute_type, arabulucu_sayisi, party_count, is_para_olan, ozel_durum: special || null, is_seri, seri_dosya_sayisi: is_seri ? seri_dosya_sayisi : null },
    });
  } catch (e: any) {
    return json({ error: "server_error", message: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
