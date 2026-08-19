/* ====== AJAN SOHBETİ =========================================================
   Sağ alt köşede duran tek akışlı sohbet. Bölüm, sekme, katlanan başlık yoktur.
   Akışta üç tür mesaj zamana göre sıralı durur:
     · ajan adımları       → agent_states.last_output.adimlar
     · ajan bildirimleri   → ajan_gorevleri (durum='bekliyor'), tıklanabilir
     · kullanıcı yazışması → altta yazı kutusu (Enter gönderir, Shift+Enter alt satır)

   SORU KİME GİDER — OTURUMDAN belirlenir, ekran adına GÜVENİLMEZ:
     · dosyanın görevli arabulucusu (ya da yönetici) → case-qa
     · dosyanın tarafı                              → taraf-asistan
   Taraf dalından case-qa'ya çağrı yolu HİÇ BULUNMAZ; tersi de öyle.

   KÖR VERİ (constitution m.1 — süzgeç SORGUDA, ekranda gizleme değil):
   · TARAF: agent_states'te party_id = kendi kimliği VE tarafa_gorunur = true;
     ajan_gorevleri'nde hedef_party_id = kendi kimliği ve yalnız tarafa yönelik
     görev tipleri. Karşı tarafın hiçbir satırı, adı, belgesi görünmez.
   · ARABULUCU: taraf ajanı satırlarının METİN ALANLARI (last_output dahil)
     SORGUYA GİRMEZ — o satırlar ayrı bir sorguyla yalnız durum alanlarıyla
     okunur ve ekrana sabit "olan biten" cümlesi basılır.

   DİL: ekranda teknik terim yoktur. Ham hata, fonksiyon adı ve kod ekrana çıkmaz;
   hata halinde tek sakin cümle görünür.
============================================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Bot, ChevronDown, Loader2, ArrowRight, Send, CheckCircle2 } from "lucide-react";

type Rol = "arabulucu" | "taraf";

type DurumSatiri = {
  id: string;
  agent_type: string;
  party_id: string | null;
  status: string;
  updated_at: string;
  last_output?: any;
};

type GorevSatiri = {
  id: string;
  gorev_tipi: string;
  hedef_party_id: string | null;
  gerekce: string | null;
  durum: string;
  created_at: string;
};

type Mesaj = {
  id: string;
  zaman: number;
  tip: "adim" | "bildirim" | "ben" | "ajan" | "asama";
  metin: string;
  calisiyor?: boolean;
  hatali?: boolean;
  gorev?: GorevSatiri;
};

/* Adım yazamayan eski satırlar için sabit cümleler. Bilinmeyen kolda da içerik
   taşımayan yedek cümle kullanılır; ham kod ekrana yazılmaz. */
const KOL_CUMLESI: Record<string, { yapiliyor: string; bitti: string; olmadi: string }> = {
  orchestrator: { yapiliyor: "Dosyayı baştan sona inceliyorum.", bitti: "Dosyayı baştan sona inceledim.", olmadi: "Dosya incelemesini tamamlayamadım." },
  party_analysis: { yapiliyor: "Gizli analizi hazırlıyorum.", bitti: "Gizli analizi hazırladım.", olmadi: "Gizli analizi hazırlayamadım." },
  party_consistency: { yapiliyor: "Anlatım ile belgeleri karşılaştırıyorum.", bitti: "Anlatım ile belgeleri karşılaştırdım.", olmadi: "Karşılaştırmayı yapamadım." },
  party_communication: { yapiliyor: "Anlatımdan asıl ihtiyacı çıkarıyorum.", bitti: "Anlatımdan asıl ihtiyacı çıkardım.", olmadi: "Anlatımı değerlendiremedim." },
  common_ground: { yapiliyor: "Ortak zemini arıyorum.", bitti: "Ortak zemini çıkardım.", olmadi: "Ortak zemini çıkaramadım." },
  classify_dispute: { yapiliyor: "Uyuşmazlığın türünü belirliyorum.", bitti: "Uyuşmazlığın türünü belirledim.", olmadi: "Türü belirleyemedim." },
  deadline_detect: { yapiliyor: "Süreleri hesaplıyorum.", bitti: "Süreleri hesapladım.", olmadi: "Süreleri hesaplayamadım." },
  belge_ozeti: { yapiliyor: "Belgeleri özetliyorum.", bitti: "Belgeleri özetledim.", olmadi: "Belgeleri özetleyemedim." },
  document_analysis: { yapiliyor: "Belgeleri okuyorum.", bitti: "Belgeleri okudum.", olmadi: "Belgeleri okuyamadım." },
  olay_cizelgesi: { yapiliyor: "Tarihleri sıraya diziyorum.", bitti: "Tarihleri sıraya dizdim.", olmadi: "Çizelgeyi çıkaramadım." },
  guc_dengesi: { yapiliyor: "Dengeye bakıyorum.", bitti: "Denge işaretlerini çıkardım.", olmadi: "Denge ölçümünü yapamadım." },
  iletisim_degisim: { yapiliyor: "Dildeki değişime bakıyorum.", bitti: "Dildeki değişimi çıkardım.", olmadi: "Değişimi ölçemedim." },
  dosya_ozeti: { yapiliyor: "Konu metnini hazırlıyorum.", bitti: "Konu metnini önerdim.", olmadi: "Konu metnini öneremedim." },
  elverislilik: { yapiliyor: "Uygunluğa bakıyorum.", bitti: "Uygunluk kontrolünü yaptım.", olmadi: "Uygunluk kontrolünü yapamadım." },
  usul_onerisi: { yapiliyor: "Öneri hazırlıyorum.", bitti: "Sıradaki adım için öneri hazırladım.", olmadi: "Öneriyi hazırlayamadım." },
  usul_engeli: { yapiliyor: "Usul eksiklerine bakıyorum.", bitti: "Usul eksiklerini çıkardım.", olmadi: "Usul kontrolünü yapamadım." },
  hazirlik_foyu: { yapiliyor: "Oturum hazırlık föyünü hazırlıyorum.", bitti: "Oturum hazırlık föyünü hazırladım.", olmadi: "Föyü hazırlayamadım." },
  meeting_notes: { yapiliyor: "Görüşme notunu okuyorum.", bitti: "Görüşme notunu okudum.", olmadi: "Görüşme notunu okuyamadım." },
  agreement_generation: { yapiliyor: "Belge taslağını hazırlıyorum.", bitti: "Belge taslağını hazırladım.", olmadi: "Taslağı hazırlayamadım." },
  nobetci: { yapiliyor: "Bekleyen işleri gözden geçiriyorum.", bitti: "Bekleyen işleri gözden geçirdim.", olmadi: "Gözden geçiremedim." },
  mediator: { yapiliyor: "Masadaki seçenekleri hazırlıyorum.", bitti: "Masadaki seçenekleri hazırladım.", olmadi: "Seçenekleri hazırlayamadım." },
  party_a: { yapiliyor: "Masadaki konumları çalışıyorum.", bitti: "Masadaki konumları çıkardım.", olmadi: "Konumları çıkaramadım." },
  party_b: { yapiliyor: "Masadaki konumları çalışıyorum.", bitti: "Masadaki konumları çıkardım.", olmadi: "Konumları çıkaramadım." },
  validator: { yapiliyor: "Çıkanları denetliyorum.", bitti: "Çıkanları denetledim.", olmadi: "Denetimi tamamlayamadım." },
};

const GOREV_BASLIGI: Record<string, string> = {
  soru_gonder: "Cevap bekleyen soru var.",
  taraf_eksik_bilgi: "Tamamlanmayı bekleyen bir konu var.",
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

/* Taraf sohbetinde YALNIZ bu tipler görünür; arabulucuya ait tipler sorguya
   hiç girmez. */
const TARAFA_ACIK_GOREVLER = [
  "soru_gonder", "taraf_eksik_bilgi", "taraf_musaitlik_iste",
  "teklif_degerlendir", "ilk_temas", "ozel_oturum",
];

const GOREV_ASAMASI: Record<string, number> = {
  soru_gonder: 2, taraf_eksik_bilgi: 2, analiz_baslat: 2,
  teklif_degerlendir: 3, arabulucu_onayi: 3, akis_onay_bekliyor: 3,
  akis_hatasi: 3, asama_gecisi: 3,
  taraf_musaitlik_iste: 4, randevu_teklifi: 4, taraf_alternatif_saat: 4,
  oturum_hatirlatma: 4, ozel_oturum: 4, foy_teslim_uyarisi: 4,
};

const GOREV_SEKMESI: Record<string, string> = {
  soru_gonder: "discovery",
  taraf_eksik_bilgi: "kalemlerim",
  taraf_musaitlik_iste: "randevu",
  teklif_degerlendir: "braket",
  ilk_temas: "ajanim",
  ozel_oturum: "randevu",
};

function saatMetni(zaman: number): string {
  const d = new Date(zaman);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// Gerekçedeki makine etiketi ("[oto:…]", "[akis:…]", "[eksik:…]") ekrana basılmaz.
function gerekceTemizle(v: string | null): string {
  return String(v ?? "").replace(/^\[[^\]]*\]\s*/, "").trim();
}

export function AjanPenceresi({
  caseId, mod, partyId, onGit,
}: {
  caseId: string;
  /** Yalnız yerleşim ipucu; gerçek rol OTURUMDAN doğrulanır. */
  mod: "arabulucu" | "taraf";
  partyId?: string | null;
  onGit?: (sekme: string) => void;
}) {
  const [acik, setAcik] = useState(false);
  const [rol, setRol] = useState<Rol | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [durumlar, setDurumlar] = useState<DurumSatiri[]>([]);
  const [olanBiten, setOlanBiten] = useState<DurumSatiri[]>([]);
  const [gorevler, setGorevler] = useState<GorevSatiri[]>([]);
  const [asamalar, setAsamalar] = useState<GorevSatiri[]>([]);
  const [yazisma, setYazisma] = useState<Mesaj[]>([]);
  const [soru, setSoru] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const altRef = useRef<HTMLDivElement | null>(null);

  /* ROL OTURUMDAN: ekrandan gelen `mod` yalnız yerleşim ipucudur. Görevli
     arabulucu ya da yönetici → arabulucu; dosyanın tarafı → taraf; ikisi de
     değilse pencere hiç çizilmez. */
  useEffect(() => {
    let iptal = false;
    (async () => {
      const { data: oturum } = await supabase.auth.getUser();
      const uid = oturum?.user?.id;
      if (!uid || !caseId) { if (!iptal) { setRol(null); setYukleniyor(false); } return; }
      const [{ data: dosya }, { data: taraf }, { data: yonetici }] = await Promise.all([
        supabase.from("cases").select("assigned_mediator_id").eq("id", caseId).maybeSingle(),
        supabase.from("case_parties").select("id").eq("case_id", caseId).eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
      ]);
      if (iptal) return;
      if ((dosya as any)?.assigned_mediator_id === uid || yonetici) setRol("arabulucu");
      else if (taraf) setRol("taraf");
      else { setRol(null); setYukleniyor(false); }
    })();
    return () => { iptal = true; };
  }, [caseId]);

  const tarafModu = rol === "taraf";
  const gecerli = !!caseId && !!rol && (!tarafModu || !!partyId);

  const yukle = useCallback(async () => {
    if (!gecerli) { setYukleniyor(false); return; }
    setHata(null);

    if (tarafModu) {
      // KÖR VERİ: kendi satırı VE tarafa açık işaretli olanlar.
      const [d, g] = await Promise.all([
        (supabase.from("agent_states") as any)
          .select("id, agent_type, party_id, status, updated_at, last_output")
          .eq("case_id", caseId).eq("party_id", partyId!).eq("tarafa_gorunur", true)
          .order("updated_at", { ascending: false }).limit(10),
        supabase.from("ajan_gorevleri")
          .select("id, gorev_tipi, hedef_party_id, gerekce, durum, created_at")
          .eq("case_id", caseId).eq("durum", "bekliyor")
          .eq("hedef_party_id", partyId!).in("gorev_tipi", TARAFA_ACIK_GOREVLER)
          .order("created_at", { ascending: false }).limit(20),
      ]);
      if (d.error && g.error) setHata("Şu an ajanla bağlantı kurulamıyor.");
      setDurumlar(((d.data ?? []) as any[]) as DurumSatiri[]);
      setOlanBiten([]);
      setGorevler(((g.data ?? []) as any[]) as GorevSatiri[]);
      setAsamalar([]);
    } else {
      /* ARABULUCU — iki AYRI sorgu:
         (1) masa ajanı satırları: anlatım metniyle birlikte okunur.
         (2) taraf ajanı satırları: last_output SORGUYA GİRMEZ; yalnız olan biten. */
      const [d1, d2, g, a] = await Promise.all([
        (supabase.from("agent_states") as any)
          .select("id, agent_type, party_id, status, updated_at, last_output")
          .eq("case_id", caseId).eq("tarafa_gorunur", false)
          .neq("agent_type", "taraf_asistan")
          .order("updated_at", { ascending: false }).limit(20),
        (supabase.from("agent_states") as any)
          .select("id, agent_type, party_id, status, updated_at")
          .eq("case_id", caseId).eq("tarafa_gorunur", true)
          .order("updated_at", { ascending: false }).limit(10),
        supabase.from("ajan_gorevleri")
          .select("id, gorev_tipi, hedef_party_id, gerekce, durum, created_at")
          .eq("case_id", caseId).eq("durum", "bekliyor")
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("ajan_gorevleri")
          .select("id, gorev_tipi, hedef_party_id, gerekce, durum, created_at")
          .eq("case_id", caseId).eq("gorev_tipi", "asama_gecisi").eq("durum", "yapildi")
          .order("created_at", { ascending: false }).limit(5),
      ]);
      if (d1.error && g.error) setHata("Şu an ajanla bağlantı kurulamıyor.");
      setDurumlar(((d1.data ?? []) as any[]) as DurumSatiri[]);
      setOlanBiten(((d2.data ?? []) as any[]) as DurumSatiri[]);
      setGorevler(((g.data ?? []) as any[]) as GorevSatiri[]);
      setAsamalar(((a.data ?? []) as any[]) as GorevSatiri[]);
    }
    setYukleniyor(false);
  }, [caseId, tarafModu, partyId, gecerli]);

  useEffect(() => { yukle(); }, [yukle]);

  // Realtime: mevcut desen (postgres_changes + case_id süzgeci). Kanal kapanışta kalkar.
  useEffect(() => {
    if (!gecerli) return;
    const kanal = supabase
      .channel(`ajan_sohbeti:${rol}:${caseId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "agent_states", filter: `case_id=eq.${caseId}` },
        () => { yukle(); })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "ajan_gorevleri", filter: `case_id=eq.${caseId}` },
        () => { yukle(); })
      .subscribe();
    return () => { supabase.removeChannel(kanal); };
  }, [caseId, rol, gecerli, yukle]);

  // ajan_gorevleri anlık yayın listesinde değil; bekleyenler dakikada bir tazelenir.
  useEffect(() => {
    if (!gecerli) return;
    const sayac = setInterval(() => { yukle(); }, 60000);
    return () => clearInterval(sayac);
  }, [gecerli, yukle]);

  const mesajlar = useMemo<Mesaj[]>(() => {
    const liste: Mesaj[] = [];

    // (1) Ajan adımları — anlatım dizisi varsa satır satır, yoksa tek sabit cümle.
    for (const r of durumlar) {
      const kalip = KOL_CUMLESI[r.agent_type];
      const cikti = r.last_output && typeof r.last_output === "object" ? r.last_output : {};
      const adimlar = Array.isArray((cikti as any).adimlar) ? (cikti as any).adimlar : [];
      const calisiyor = r.status === "running" || r.status === "pending";
      if (adimlar.length > 0) {
        adimlar.forEach((a: any, i: number) => {
          const zaman = new Date(String(a?.zaman ?? r.updated_at)).getTime();
          liste.push({
            id: `${r.id}-${i}`,
            zaman: isNaN(zaman) ? new Date(r.updated_at).getTime() : zaman,
            tip: "adim",
            metin: String(a?.metin ?? "").trim(),
            calisiyor: calisiyor && i === adimlar.length - 1,
            hatali: r.status === "failed" && i === adimlar.length - 1,
          });
        });
      } else {
        const metin = calisiyor
          ? (kalip?.yapiliyor ?? "Bir adım üzerinde çalışıyorum.")
          : r.status === "failed"
            ? (kalip?.olmadi ?? "Bir adımı tamamlayamadım.")
            : (kalip?.bitti ?? "Bir adımı tamamladım.");
        liste.push({
          id: r.id, zaman: new Date(r.updated_at).getTime(), tip: "adim",
          metin, calisiyor, hatali: r.status === "failed",
        });
      }
    }

    /* (2) Taraf ajanı satırları — arabulucuda YALNIZ olan biten. Metin alanı
       sorguya hiç girmediği için burada da yazılamaz. */
    for (const r of olanBiten) {
      const calisiyor = r.status === "running" || r.status === "pending";
      liste.push({
        id: `ob-${r.id}`, zaman: new Date(r.updated_at).getTime(), tip: "adim",
        metin: calisiyor
          ? "Taraf ajanı kendi belgeleri üzerinde çalışıyor."
          : r.status === "failed"
            ? "Taraf ajanı bir adımı tamamlayamadı."
            : "Taraf ajanı kendi işini tamamladı.",
        calisiyor,
      });
    }

    // (3) Aşama ilerlemeleri — tek satır, sebebiyle.
    for (const a of asamalar) {
      const m = /^\[gecis:(\d+)->(\d+)\]\s*(.*)$/.exec(String(a.gerekce ?? ""));
      if (!m) continue;
      liste.push({
        id: `as-${a.id}`, zaman: new Date(a.created_at).getTime(), tip: "asama",
        metin: `Dosya Aşama ${m[2]}'e geçti — sebebi: ${m[3] || "koşullar sağlandı"}`,
      });
    }

    // (4) Bekleyen bildirimler — tıklanabilir.
    for (const g of gorevler) {
      const baslik = GOREV_BASLIGI[g.gorev_tipi] ?? "Bekleyen bir adım var.";
      const gerekce = gerekceTemizle(g.gerekce);
      liste.push({
        id: `g-${g.id}`, zaman: new Date(g.created_at).getTime(), tip: "bildirim",
        metin: gerekce ? `${baslik} ${gerekce}` : baslik,
        gorev: g,
      });
    }

    liste.sort((a, b) => a.zaman - b.zaman);
    return [...liste.filter((m) => m.metin), ...yazisma];
  }, [durumlar, olanBiten, gorevler, asamalar, yazisma]);

  useEffect(() => {
    if (acik) altRef.current?.scrollIntoView({ block: "end" });
  }, [acik, mesajlar.length]);

  function gorevTikla(g?: GorevSatiri) {
    if (!g) return;
    if (tarafModu) {
      const sekme = GOREV_SEKMESI[g.gorev_tipi];
      if (sekme && onGit) onGit(sekme);
      return;
    }
    const asama = GOREV_ASAMASI[g.gorev_tipi] ?? 3;
    window.location.assign(`/cases/${caseId}?phase=${asama}&pv=2`);
  }

  async function gonder() {
    const metin = soru.trim();
    if (!metin || bekliyor || !rol) return;
    setSoru("");
    setBekliyor(true);
    const simdi = Date.now();
    setYazisma((o) => [...o, { id: `ben-${simdi}`, zaman: simdi, tip: "ben", metin }]);
    try {
      /* Soru YALNIZ oturumdan doğrulanan role göre yönlenir. Taraf dalında
         case-qa'ya, arabulucu dalında taraf-asistan'a çağrı YOKTUR. */
      let cevap = "";
      if (rol === "taraf") {
        const gecmis = yazisma.slice(-6).map((m) => ({
          role: m.tip === "ben" ? "user" : "assistant", content: m.metin,
        }));
        const { data, error } = await supabase.functions.invoke("taraf-asistan", {
          body: { case_id: caseId, soru: metin, mesaj: metin, gecmis },
        });
        if (error || (data as any)?.error) throw new Error("cevap yok");
        cevap = String((data as any)?.cevap ?? "").trim();
      } else {
        const { data, error } = await supabase.functions.invoke("case-qa", {
          body: { case_id: caseId, question: metin },
        });
        if (error || (data as any)?.error) throw new Error("cevap yok");
        cevap = String((data as any)?.answer ?? "").trim();
      }
      if (!cevap) throw new Error("boş");
      setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan", metin: cevap }]);
    } catch {
      // Ham hata, fonksiyon adı ve kod ekrana çıkmaz — tek sakin cümle.
      setYazisma((o) => [...o, {
        id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
        metin: "Şu an cevap veremiyorum. Birazdan tekrar deneyin.",
      }]);
    } finally {
      setBekliyor(false);
    }
  }

  if (!gecerli) return null;

  const bekleyenSayisi = gorevler.length;

  if (!acik) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button size="sm" variant="secondary" className="shadow-lg rounded-full h-10 pl-3 pr-4"
          onClick={() => setAcik(true)}>
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
    <div className="fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] max-h-[75vh] overflow-hidden rounded-lg border bg-background shadow-xl flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2 shrink-0">
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

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {hata && <p className="text-xs text-muted-foreground">{hata}</p>}

        {yukleniyor ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Okunuyor…
          </div>
        ) : mesajlar.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ajan şu an bir şey yapmıyor.</p>
        ) : (
          mesajlar.map((m) => {
            if (m.tip === "ben") {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs leading-snug">
                    {m.metin}
                  </div>
                </div>
              );
            }
            if (m.tip === "bildirim") {
              return (
                <button key={m.id} type="button" onClick={() => gorevTikla(m.gorev)}
                  className="w-full text-left rounded-lg border px-2.5 py-1.5 hover:bg-muted/60">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs leading-snug">{m.metin}</span>
                    <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              );
            }
            if (m.tip === "asama") {
              return (
                <div key={m.id} className="text-[11px] text-muted-foreground border-l-2 border-l-accent pl-2 py-0.5">
                  {m.metin}
                </div>
              );
            }
            return (
              <div key={m.id} className="text-xs leading-snug">
                <span className={m.hatali ? "text-destructive" : m.tip === "ajan" ? "" : "text-muted-foreground"}>
                  {m.metin}
                </span>
                {m.calisiyor
                  ? <Loader2 className="inline h-3 w-3 ml-1 animate-spin align-[-1px]" />
                  : m.tip === "adim" && !m.hatali
                    ? <CheckCircle2 className="inline h-3 w-3 ml-1 text-emerald-600 align-[-1px]" />
                    : null}
                <span className="block text-[10px] text-muted-foreground">{saatMetni(m.zaman)}</span>
              </div>
            );
          })
        )}
        <div ref={altRef} />
      </div>

      <div className="border-t p-2 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={soru}
            placeholder="Ajana yazın…"
            className="min-h-[36px] max-h-24 text-xs resize-none"
            onChange={(e) => setSoru(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); gonder(); }
            }}
          />
          <Button size="sm" className="h-9 px-2.5" disabled={bekliyor || !soru.trim()} onClick={gonder}>
            {bekliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AjanPenceresi;
