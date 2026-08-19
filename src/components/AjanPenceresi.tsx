/* ====== AJAN PENCERESİ (1. tur — SALT GÖRÜNÜM) ==============================
   Sağ alt köşede duran küçük pencere: ajanın ne yaptığını ve neyi beklediğini
   ekran gezmeden gösterir. Bu turda pencere GÖRÜR ve SÖYLER; içinden cevap
   yazılmaz, hiçbir iş tetiklenmez.

   AKIŞ BAĞLANTISI: bu bir akış adımı DEĞİL, görüntüleme yüzeyidir. Olay yazmaz,
   akis_kurallari'na satır gerektirmez — yalnız başkalarının yaptığını gösterir.
   Beslendiği iki kaynak zaten agentic: agent_states (ajan ne yapıyor) ve
   ajan_gorevleri (ajan ne soruyor). Yeni tetik eklenmedi.

   KÖR VERİ (constitution m.1 — pazarlık dışı):
   · TARAF penceresi: agent_states'te party_id = kendi kimliği VE
     tarafa_gorunur = true; ajan_gorevleri'nde hedef_party_id = kendi kimliği.
     Süzgeç SORGUDADIR — her şey çekilip ekranda gizlenmez.
   · ARABULUCU penceresi: taraf ajanının ÜRETTİĞİ METİN hiçbir koşulda
     görünmez. Ekrana yalnız SABİT CÜMLE KALIPLARI basılır; last_output,
     confidence_score, hallucination_risk gibi içerik alanları bu bileşende
     hiç okunmaz (sorguda bile seçilmez).
   · Taraf panosunda yalnız TARAFA YÖNELİK görev tipleri gösterilir; dosya
     geneli / arabulucuya ait tipler sorgudan dışlanır.
============================================================================ */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, ChevronDown, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

type DurumSatiri = {
  id: string;
  agent_type: string;
  party_id: string | null;
  status: string;
  updated_at: string;
};

type GorevSatiri = {
  id: string;
  gorev_tipi: string;
  hedef_party_id: string | null;
  gerekce: string | null;
  durum: string;
  created_at: string;
};

/* Ajan kollarının DÜZ TÜRKÇE karşılığı. Ekranda teknik terim yoktur: fonksiyon
   adı, tablo adı, "edge function", "upsert" gibi kelimeler buraya girmez.
   {kim} yerine arabulucu görünümünde taraf adı, taraf görünümünde "sizin" gelir. */
const KOL_CUMLESI: Record<string, { yapiliyor: string; bitti: string; olmadi: string }> = {
  orchestrator: {
    yapiliyor: "{kim} dosyayı baştan sona inceliyorum.",
    bitti: "{kim} dosyayı baştan sona inceledim.",
    olmadi: "{kim} dosya incelemesini tamamlayamadım.",
  },
  party_analysis: {
    yapiliyor: "{kim} gizli analizi hazırlıyorum.",
    bitti: "{kim} gizli analizi hazırladım.",
    olmadi: "{kim} gizli analizi hazırlayamadım.",
  },
  party_consistency: {
    yapiliyor: "{kim} anlatımı ile belgelerini karşılaştırıyorum.",
    bitti: "{kim} anlatımı ile belgelerini karşılaştırdım.",
    olmadi: "{kim} anlatımı ile belgelerini karşılaştıramadım.",
  },
  party_communication: {
    yapiliyor: "{kim} anlatımından asıl ihtiyacı çıkarıyorum.",
    bitti: "{kim} anlatımından asıl ihtiyacı çıkardım.",
    olmadi: "{kim} anlatımını değerlendiremedim.",
  },
  common_ground: {
    yapiliyor: "Tarafların ortak zeminini arıyorum.",
    bitti: "Tarafların ortak zeminini çıkardım.",
    olmadi: "Ortak zemini çıkaramadım.",
  },
  classify_dispute: {
    yapiliyor: "Uyuşmazlığın türünü belirliyorum.",
    bitti: "Uyuşmazlığın türünü belirledim.",
    olmadi: "Uyuşmazlığın türünü belirleyemedim.",
  },
  deadline_detect: {
    yapiliyor: "Süreleri hesaplıyorum.",
    bitti: "Süreleri hesapladım.",
    olmadi: "Süreleri hesaplayamadım.",
  },
  belge_ozeti: {
    yapiliyor: "{kim} belgelerini özetliyorum.",
    bitti: "{kim} belgelerini özetledim.",
    olmadi: "{kim} belgelerini özetleyemedim.",
  },
  olay_cizelgesi: {
    yapiliyor: "Dosyadaki tarihleri sıraya diziyorum.",
    bitti: "Dosyadaki tarihleri sıraya dizdim.",
    olmadi: "Tarih çizelgesini çıkaramadım.",
  },
  guc_dengesi: {
    yapiliyor: "Taraflar arasındaki dengeyi ölçüyorum.",
    bitti: "Taraflar arasındaki dengeyi ölçtüm.",
    olmadi: "Denge ölçümünü yapamadım.",
  },
  iletisim_degisim: {
    yapiliyor: "{kim} dilinin zaman içindeki değişimine bakıyorum.",
    bitti: "{kim} dilinin zaman içindeki değişimine baktım.",
    olmadi: "{kim} dilindeki değişimi ölçemedim.",
  },
  dosya_ozeti: {
    yapiliyor: "Dosyanın konusu için metin öneriyorum.",
    bitti: "Dosyanın konusu için metin önerdim.",
    olmadi: "Konu metnini öneremedim.",
  },
  elverislilik: {
    yapiliyor: "Dosyanın arabuluculuğa uygunluğunu kontrol ediyorum.",
    bitti: "Dosyanın arabuluculuğa uygunluğunu kontrol ettim.",
    olmadi: "Uygunluk kontrolünü yapamadım.",
  },
  usul_onerisi: {
    yapiliyor: "Sıradaki adım için öneri hazırlıyorum.",
    bitti: "Sıradaki adım için öneri hazırladım.",
    olmadi: "Öneriyi hazırlayamadım.",
  },
  usul_engeli: {
    yapiliyor: "Dosyada eksik kalan usul adımlarına bakıyorum.",
    bitti: "Dosyada eksik kalan usul adımlarına baktım.",
    olmadi: "Usul kontrolünü yapamadım.",
  },
  hazirlik_foyu: {
    yapiliyor: "{kim} oturum hazırlık föyünü hazırlıyorum.",
    bitti: "{kim} oturum hazırlık föyünü hazırladım.",
    olmadi: "{kim} oturum hazırlık föyünü hazırlayamadım.",
  },
  taraf_asistan: {
    yapiliyor: "{kim} sorusuna bakıyorum.",
    bitti: "{kim} sorusuna cevap verdim.",
    olmadi: "{kim} sorusuna cevap veremedim.",
  },
  nobetci: {
    yapiliyor: "Dosyada bekleyen işleri gözden geçiriyorum.",
    bitti: "Dosyada bekleyen işleri gözden geçirdim.",
    olmadi: "Bekleyen işleri gözden geçiremedim.",
  },
  meeting_notes: {
    yapiliyor: "Görüşme notunu okuyorum.",
    bitti: "Görüşme notunu okudum.",
    olmadi: "Görüşme notunu okuyamadım.",
  },
  document_analysis: {
    yapiliyor: "Belgeleri okuyorum.",
    bitti: "Belgeleri okudum.",
    olmadi: "Belgeleri okuyamadım.",
  },
  agreement_generation: {
    yapiliyor: "Belge taslağını hazırlıyorum.",
    bitti: "Belge taslağını hazırladım.",
    olmadi: "Belge taslağını hazırlayamadım.",
  },
};

/* Bekleyen iş satırlarının düz Türkçe başlığı. Bilinmeyen tip için sabit,
   içerik taşımayan yedek cümle kullanılır — ham kod ekrana basılmaz. */
const GOREV_BASLIGI: Record<string, string> = {
  soru_gonder: "Cevap bekleyen soru var.",
  taraf_eksik_bilgi: "Eksik bilgi ya da belge bekleniyor.",
  taraf_musaitlik_iste: "Uygun saatler bekleniyor.",
  teklif_degerlendir: "Değerlendirilmeyi bekleyen teklif var.",
  ilk_temas: "İlk bilgilendirme bekliyor.",
  ozel_oturum: "Özel görüşme daveti bekliyor.",
  randevu_teklifi: "Randevu teklifi bekliyor.",
  analiz_baslat: "Analiz başlatılmayı bekliyor.",
  asama_gecisi: "Bir sonraki aşamaya geçiş bekliyor.",
  oturum_hatirlatma: "Oturum hatırlatması bekliyor.",
  arabulucu_onayi: "Onayınızı bekleyen bir adım var.",
  akis_onay_bekliyor: "Onayınızı bekleyen bir adım var.",
  akis_hatasi: "Kendiliğinden yapılamayan bir adım var.",
  foy_teslim_uyarisi: "Hazırlık föyünün gönderimi doğrulanamadı.",
  taraf_alternatif_saat: "Taraftan alternatif saat geldi.",
};

/* Taraf penceresinde YALNIZ bu tipler görünür. Dosya geneli ve arabulucuya ait
   tipler (arabulucu_onayi, akis_*, foy_teslim_uyarisi, analiz_baslat …) sorguya
   HİÇ girmez — taraf yüzeyinde arabulucunun işi görünmez. */
const TARAFA_ACIK_GOREVLER = [
  "soru_gonder", "taraf_eksik_bilgi", "taraf_musaitlik_iste",
  "teklif_degerlendir", "ilk_temas", "ozel_oturum",
];

// Arabulucu penceresinde hangi aşamaya götüreceği. pv=2 yeni numaralamayı işaret eder.
const GOREV_ASAMASI: Record<string, number> = {
  soru_gonder: 2,
  taraf_eksik_bilgi: 2,
  analiz_baslat: 2,
  teklif_degerlendir: 3,
  arabulucu_onayi: 3,
  akis_onay_bekliyor: 3,
  akis_hatasi: 3,
  asama_gecisi: 3,
  taraf_musaitlik_iste: 4,
  randevu_teklifi: 4,
  taraf_alternatif_saat: 4,
  oturum_hatirlatma: 4,
  ozel_oturum: 4,
  foy_teslim_uyarisi: 4,
};

// Taraf penceresinde hangi sekmeye götüreceği (CaseRoom taraf sekme kodları).
const GOREV_SEKMESI: Record<string, string> = {
  soru_gonder: "discovery",
  taraf_eksik_bilgi: "documents",
  taraf_musaitlik_iste: "randevu",
  teklif_degerlendir: "braket",
  ilk_temas: "ajanim",
  ozel_oturum: "randevu",
};

function saatMetni(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// Gerekçe satırındaki makine etiketi ("[oto:...]", "[akis:...]") ekrana basılmaz.
function gerekceTemizle(v: string | null): string {
  return String(v ?? "").replace(/^\[[^\]]*\]\s*/, "").trim();
}

export function AjanPenceresi({
  caseId, mod, partyId, onGit,
}: {
  caseId: string;
  mod: "arabulucu" | "taraf";
  /** taraf modunda ZORUNLU: kendi taraf kimliği. Yoksa hiçbir sorgu yapılmaz. */
  partyId?: string | null;
  /** taraf modunda sekme değiştirmek için; arabulucu modunda kullanılmaz. */
  onGit?: (sekme: string) => void;
}) {
  const [acik, setAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [durumlar, setDurumlar] = useState<DurumSatiri[]>([]);
  const [gorevler, setGorevler] = useState<GorevSatiri[]>([]);
  const [adlar, setAdlar] = useState<Record<string, string>>({});

  const tarafModu = mod === "taraf";
  const gecerli = !!caseId && (!tarafModu || !!partyId);

  const yukle = useCallback(async () => {
    if (!gecerli) { setYukleniyor(false); return; }
    setHata(null);

    /* İÇERİK ALANI SEÇİLMEZ: last_output, confidence_score, hallucination_risk
       ve error_message bu bileşende hiç okunmaz. Ekrana yalnız sabit cümle basılır. */
    let durumSorgu = supabase.from("agent_states")
      .select("id, agent_type, party_id, status, updated_at")
      .eq("case_id", caseId)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (tarafModu) {
      // KÖR VERİ: süzgeç sorguda. Kendi satırı VE tarafa açık işaretli olacak.
      durumSorgu = durumSorgu.eq("party_id", partyId!).eq("tarafa_gorunur", true);
    } else {
      /* Tarafın KENDİ asistanıyla yaptığı iş arabulucu penceresine çıkmaz.
         "Sorusuna cevap verdim" satırı olan biten gibi görünse de tarafın kendi
         danışma kanalına işaret eder; şüphede GÖSTERME kuralı uygulandı.
         Süzgeç sorgudadır, ekranda gizleme değildir. */
      durumSorgu = durumSorgu.neq("agent_type", "taraf_asistan");
    }

    let gorevSorgu = supabase.from("ajan_gorevleri")
      .select("id, gorev_tipi, hedef_party_id, gerekce, durum, created_at")
      .eq("case_id", caseId)
      .eq("durum", "bekliyor")
      .order("created_at", { ascending: false })
      .limit(20);
    if (tarafModu) {
      gorevSorgu = gorevSorgu.eq("hedef_party_id", partyId!).in("gorev_tipi", TARAFA_ACIK_GOREVLER);
    }

    const [d, g] = await Promise.all([durumSorgu, gorevSorgu]);
    if (d.error && g.error) setHata("Ajan penceresi şu an okunamıyor.");
    setDurumlar(((d.data ?? []) as any[]) as DurumSatiri[]);
    setGorevler(((g.data ?? []) as any[]) as GorevSatiri[]);

    // Taraf adları YALNIZ arabulucu penceresinde okunur; taraf kendi ekranında
    // hiçbir taraf adı görmez (karşı tarafın adı da hiçbir yerde geçmez).
    if (!tarafModu) {
      const { data: taraflar } = await supabase.from("case_parties")
        .select("id, party_type, first_name, last_name, company_name")
        .eq("case_id", caseId);
      const harita: Record<string, string> = {};
      ((taraflar ?? []) as any[]).forEach((p) => {
        harita[String(p.id)] = p.party_type === "individual"
          ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
          : String(p.company_name ?? "").trim();
      });
      setAdlar(harita);
    }
    setYukleniyor(false);
  }, [caseId, tarafModu, partyId, gecerli]);

  useEffect(() => { yukle(); }, [yukle]);

  // Realtime: AgentControlPanel'deki desenin aynısı (postgres_changes + case_id
  // süzgeci). Bileşen kapanınca kanal MUTLAKA kaldırılır.
  useEffect(() => {
    if (!gecerli) return;
    const kanal = supabase
      .channel(`ajan_penceresi:${mod}:${caseId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "agent_states", filter: `case_id=eq.${caseId}` },
        () => { yukle(); })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "ajan_gorevleri", filter: `case_id=eq.${caseId}` },
        () => { yukle(); })
      .subscribe();
    return () => { supabase.removeChannel(kanal); };
  }, [caseId, mod, gecerli, yukle]);

  /* ajan_gorevleri yayın listesinde (supabase_realtime) DEĞİL — o tabloda anlık
     bildirim gelmez. Bekleyen listesi bu yüzden dakikada bir de tazelenir.
     Yeni tablo/yayın istemez; sayaç bileşen kapanınca temizlenir. */
  useEffect(() => {
    if (!gecerli) return;
    const sayac = setInterval(() => { yukle(); }, 60000);
    return () => clearInterval(sayac);
  }, [gecerli, yukle]);

  const satirlar = useMemo(() => durumlar.map((r) => {
    const kalip = KOL_CUMLESI[r.agent_type];
    const ad = !tarafModu && r.party_id ? (adlar[r.party_id] ?? "") : "";
    const kim = tarafModu ? "" : (ad ? `${ad} için` : "");
    const sablon = r.status === "running" || r.status === "pending"
      ? kalip?.yapiliyor
      : r.status === "failed"
        ? kalip?.olmadi
        : kalip?.bitti;
    // Bilinmeyen kol: içerik taşımayan sabit cümle. Ham kod ekrana yazılmaz.
    const ham = sablon ?? (r.status === "failed"
      ? "Bir adımı tamamlayamadım."
      : r.status === "running" ? "Bir adım üzerinde çalışıyorum." : "Bir adımı tamamladım.");
    const cumle = ham.replace("{kim} ", kim ? `${kim} ` : "").replace("{kim}", kim);
    return {
      id: r.id,
      cumle: tarafModu ? cumle.replace("gizli analizi", "gizli analizinizi") : cumle,
      zaman: saatMetni(r.updated_at),
      hatali: r.status === "failed",
      calisiyor: r.status === "running" || r.status === "pending",
    };
  }), [durumlar, adlar, tarafModu]);

  function gorevTikla(g: GorevSatiri) {
    if (tarafModu) {
      const sekme = GOREV_SEKMESI[g.gorev_tipi];
      if (sekme && onGit) onGit(sekme);
      return;
    }
    const asama = GOREV_ASAMASI[g.gorev_tipi] ?? 3;
    window.location.assign(`/cases/${caseId}?phase=${asama}&pv=2`);
  }

  if (!gecerli) return null;

  const bekleyenSayisi = gorevler.length;

  if (!acik) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          size="sm"
          variant="secondary"
          className="shadow-lg rounded-full h-10 pl-3 pr-4"
          onClick={() => setAcik(true)}
        >
          <Bot className="h-4 w-4 mr-2" />
          Ajan
          {bekleyenSayisi > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">{bekleyenSayisi}</Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-hidden rounded-lg border bg-background shadow-xl flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bot className="h-4 w-4" />
          Ajan
          {bekleyenSayisi > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5">{bekleyenSayisi}</Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setAcik(false)}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-y-auto p-3 space-y-4 text-sm">
        {hata && (
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {hata}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Ajan ne yaptı</div>
          {yukleniyor ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Okunuyor…
            </div>
          ) : satirlar.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ajan şu an bir şey yapmıyor.</p>
          ) : (
            <ul className="space-y-1.5">
              {satirlar.map((s) => (
                <li key={s.id} className="text-xs leading-snug">
                  <span className={s.hatali ? "text-destructive" : ""}>{s.cumle}</span>
                  {s.calisiyor && <Loader2 className="inline h-3 w-3 ml-1 animate-spin align-[-1px]" />}
                  {s.zaman && <span className="block text-[10px] text-muted-foreground">{s.zaman}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground">Bekleyen</div>
          {yukleniyor ? null : gorevler.length === 0 ? (
            <p className="text-xs text-muted-foreground">Bekleyen bir şey yok.</p>
          ) : (
            <ul className="space-y-1.5">
              {gorevler.map((g) => {
                const baslik = GOREV_BASLIGI[g.gorev_tipi] ?? "Bekleyen bir adım var.";
                const gerekce = gerekceTemizle(g.gerekce);
                const gidilebilir = tarafModu ? !!GOREV_SEKMESI[g.gorev_tipi] : true;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      disabled={!gidilebilir}
                      onClick={() => gorevTikla(g)}
                      className="w-full text-left rounded border px-2 py-1.5 hover:bg-muted/60 disabled:opacity-60 disabled:hover:bg-transparent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium leading-snug">{baslik}</span>
                        {gidilebilir && <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />}
                      </div>
                      {gerekce && (
                        <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{gerekce}</div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default AjanPenceresi;
