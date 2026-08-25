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
import { Bot, ChevronDown, Loader2, ArrowRight, Send, CheckCircle2, Mic, MicOff, Volume2, VolumeX, Pause, Play, Pencil, ClipboardList } from "lucide-react";

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
  /* Bildirim kaynağı: kolon varsa okunur, yoksa gerekçedeki etiketten. */
  kaynak?: string | null;
  hedef_party_id: string | null;
  gerekce: string | null;
  durum: string;
  sonuc?: string | null;
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
  // Yasa 4. madde: ajanın sorduğu ve cevap bekleyen soru. Nöbetçi bu tipi
  // yürütmez; soru cevaplanana kadar 'bekliyor' kalır ve burada görünür.
  taraf_sorusu: "Ajanınızın size bir sorusu var.",
  arabulucu_sorusu: "Ajanın size bir sorusu var.",
  // 20.08 · bilirkişi seçim akışı: aday sunumu, hatırlatma, atama bilgisi.
  bilirkisi_secimi: "Bilirkişi seçimiyle ilgili bir adım var.",
  // 24.08 · 'onay_bekliyor' satırları sohbete düşmeye başlayınca ortaya çıktı:
  // bu tipin burada karşılığı yoktu, genel yedek cümleye düşüyordu. Ad,
  // Ajan Kontrol Paneli'ndeki adla aynı olsun diye oradan alındı (tek ad kuralı).
  elverislilik_isareti: "Elverişlilik bakımından bakılmayı bekleyen bir işaret var.",
};

/* Taraf sohbetinde YALNIZ bu tipler görünür; arabulucuya ait tipler sorguya
   hiç girmez. */
const TARAFA_ACIK_GOREVLER = [
  "soru_gonder", "taraf_eksik_bilgi", "taraf_musaitlik_iste",
  "teklif_degerlendir", "ilk_temas", "ozel_oturum", "taraf_sorusu",
  // 20.08 · taraf ajanı bilirkişi adaylarını KENDİ sohbetinde sunar.
  "bilirkisi_secimi",
];

/* Cevap yazılabilen tipler: ajanın doğrudan sorduğu sorular. Öteki bekleyen
   satırlar bir ekrana götürür, cevabı orada verilir. */
const CEVAPLANABILIR = ["taraf_sorusu", "arabulucu_sorusu"];

/* TALİMAT VERİLEBİLEN ADIMLAR: metin üreten kollar. Veriden hesaplanan kollar
   (kalem karşılaştırması gibi) talimat almaz — sunucu da reddeder. */
/* B5 — DÜZELTME KAYDI: METİN DEĞİL TÜR.
   Arabulucu bir çıktıyı düzelttiğinde tek soru sorulur: "Neyi düzelttiniz?"
   Yalnız SEÇİLEN TÜR kaydedilir; düzeltmenin METNİ KAYDEDİLMEZ. Soru zorunlu
   değildir, geçilebilir. Bu kayıt öğrenmenin iki meşru kaynağından biridir
   (öteki nesnel sonuçtur); ajan kendi çıktısını puanlamaz. */
const DUZELTME_TURLERI: { kod: string; metin: string }[] = [
  { kod: "eksik_kalem", metin: "eksik kalem" },
  { kod: "yanlis_sure", metin: "yanlış süre" },
  { kod: "fazla_iddia", metin: "fazla iddia" },
  { kod: "usul_adimi_atlandi", metin: "usul adımı atlandı" },
  { kod: "ton_uygunsuz", metin: "ton uygunsuz" },
  { kod: "gereksiz_ayrinti", metin: "gereksiz ayrıntı" },
  { kod: "yanlis_ad_unvan", metin: "yanlış ad/unvan" },
  { kod: "yanlis_tutar", metin: "yanlış tutar" },
  { kod: "diger", metin: "diğer" },
];

const TALIMAT_ADIMLARI: { kod: string; metin: string }[] = [
  { kod: "hazirlik-foyu", metin: "Oturum hazırlık föyü" },
  { kod: "bilirkisi-sorulari", metin: "Bilirkişiye sorulacak sorular" },
  { kod: "taslak-denetim", metin: "Anlaşma taslağı denetimi" },
];

const GOREV_ASAMASI: Record<string, number> = {
  soru_gonder: 2, taraf_eksik_bilgi: 2, analiz_baslat: 2,
  teklif_degerlendir: 3, arabulucu_onayi: 3, akis_onay_bekliyor: 3,
  akis_hatasi: 3, asama_gecisi: 3,
  taraf_musaitlik_iste: 4, randevu_teklifi: 4, taraf_alternatif_saat: 4,
  oturum_hatirlatma: 4, ozel_oturum: 4, foy_teslim_uyarisi: 4,
  taraf_sorusu: 3, arabulucu_sorusu: 3,
  bilirkisi_secimi: 6,
};

const GOREV_SEKMESI: Record<string, string> = {
  taraf_sorusu: "kalemlerim",
  soru_gonder: "discovery",
  taraf_eksik_bilgi: "kalemlerim",
  taraf_musaitlik_iste: "randevu",
  teklif_degerlendir: "braket",
  ilk_temas: "ajanim",
  ozel_oturum: "randevu",
  bilirkisi_secimi: "experts",
};

/* ── SESLİ GİRİŞ (tarayıcının kendi konuşma tanıması) ────────────────────────
   Ses TARAYICIDA yazıya çevrilir. Dış servise İSTEK GİTMEZ, ses kaydı hiçbir
   yere yazılmaz, sunucuya gönderilmez. Çevrilen metin yazı kutusuna düşer;
   GÖNDERME KARARI KULLANICININDIR — kendiliğinden gönderilmez.
   Tarayıcı desteklemiyorsa düğme HİÇ ÇİZİLMEZ (çalışmayan düğme gösterilmez). */
function konusmaTanimaVarMi(): boolean {
  if (typeof window === "undefined") return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

function seslendirmeVarMi(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

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
  let t = String(v ?? "");
  // Baştaki bütün makine etiketleri ("[eksik:…] [kol:…]") ayıklanır.
  while (/^\[[^\]]*\]\s*/.test(t)) t = t.replace(/^\[[^\]]*\]\s*/, "");
  return t.trim();
}

/* BİLİRKİŞİ ADAY BİLDİRİMİ (23.08): gerekçedeki "[bilirkisi:<ne>:<alan>]"
   etiketinden uzmanlık ALANINI çıkarır. Yalnız aday masadayken geçerli olan üç
   işaret sayılır; atama, erteleme, evrak ve davet satırlarında yeniden öneri
   istenmez (o satırlarda üçüncü parça alan değildir). */
const BILIRKISI_ADAY_ISARETLERI = ["arabulucu-secsin", "tikanma", "aday-yok"];

function bilirkisiAlani(g?: GorevSatiri | null): string | null {
  const m = /\[bilirkisi:([a-z-]+):([^\]]+)\]/.exec(String(g?.gerekce ?? ""));
  if (!m || !BILIRKISI_ADAY_ISARETLERI.includes(m[1])) return null;
  return m[2].trim() || null;
}

/* TEK ANA AJAN: bildirimin muhatabı her zaman ana ajandır; hangi KOLUN ürettiği
   yalnız kaynak etiketiyle gösterilir. Kolon henüz yoksa gerekçedeki
   "[kaynak:…]" etiketinden okunur. Yeni ekran/kart açılmadı. */
const KAYNAK_ETIKETI: Record<string, string> = {
  nobetci: "gözcü kolu",
  kosucu: "yürütücü kolu",
  taraf_ajani: "taraf ajanı",
  sistem: "sistem",
};

function kaynakOku(g: { kaynak?: string | null; gerekce: string | null }): string {
  const kolon = String(g?.kaynak ?? "").trim();
  if (kolon) return KAYNAK_ETIKETI[kolon] ?? kolon;
  const m = /\[kaynak:([a-z_]+)\]/i.exec(String(g?.gerekce ?? ""));
  return m ? (KAYNAK_ETIKETI[m[1]] ?? m[1]) : "";
}

// "son hatırlatma: <ISO> (n. hatırlatma)" satırını okunur hâle getirir.
function hatirlatmaMetni(sonuc: string | null): string {
  const m = /son hatırlatma: (\S+) \((\d+)\. hatırlatma\)/.exec(String(sonuc ?? ""));
  if (!m) return "";
  const d = new Date(m[1]);
  if (isNaN(d.getTime())) return "";
  return `${m[2]}. kez hatırlatıldı — ${d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
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
  const [cevaplanan, setCevaplanan] = useState<GorevSatiri | null>(null);
  // Sesli giriş/okuma: ikisi de tarayıcıda çalışır, varsayılan KAPALI.
  const [dinliyor, setDinliyor] = useState(false);
  const [sesliOkuma, setSesliOkuma] = useState(false);
  const tanimaRef = useRef<any>(null);
  /* ARABULUCU FRENİ — yalnız arabulucu yüzeyinde. Taraf sohbetine hiçbir iz
     düşmez (sorgular da yalnız arabulucu dalında çalışır). */
  const [duraklatma, setDuraklatma] = useState<any | null>(null);
  const [frenKipi, setFrenKipi] = useState<null | "durdur" | "degistir">(null);
  const [kosanAdimlar, setKosanAdimlar] = useState<string[]>([]);
  const [secilenAdim, setSecilenAdim] = useState("");
  /* TALİMAT — yalnız arabulucu yüzeyinde: "şunu şöyle yap, onaya sun". */
  const [talimatKipi, setTalimatKipi] = useState(false);
  const [talimatAdimi, setTalimatAdimi] = useState("");
  const [bekleyenTalimat, setBekleyenTalimat] = useState<any | null>(null);
  /* ÖNERİLER — iki yüzeyde de var. Ajan önerir, insan seçer: hiçbir öneri
     akışı durdurmaz, hiçbir işi bekletmez, zorunluluk doğurmaz. */
  const [oneriler, setOneriler] = useState<any[]>([]);
  // B5 — düzeltme sorusu: hangi adım için sorulduğu; null ise soru yok.
  const [duzeltmeAdimi, setDuzeltmeAdimi] = useState<string | null>(null);
  const sesVar = konusmaTanimaVarMi();
  const okumaVar = seslendirmeVarMi();
  const altRef = useRef<HTMLDivElement | null>(null);
  // Kendiliğinden açılma YALNIZ BİR KEZ olur; kullanıcı kapatırsa tekrar açılmaz.
  const kendiAcildiRef = useRef(false);

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
          .select("id, gorev_tipi, hedef_party_id, gerekce, durum, sonuc, created_at")
          .eq("case_id", caseId).eq("durum", "bekliyor")
          .eq("hedef_party_id", partyId!).in("gorev_tipi", TARAFA_ACIK_GOREVLER)
          .order("created_at", { ascending: false }).limit(20),
      ]);
      /* KÖR VERİ: taraf yalnız KENDİ party_id'sindeki hedef='taraf' önerilerini
         görür. Süzgeç sorgudadır, ekranda gizleme yoktur. */
      const { data: oneri } = await (supabase.from("ajan_onerileri" as any) as any)
        .select("id, baslik, gerekce, eylem_turu, eylem_adim, hedef, party_id, durum, created_at")
        .eq("case_id", caseId).eq("durum", "acik")
        .eq("hedef", "taraf").eq("party_id", partyId!)
        .order("created_at", { ascending: false }).limit(3);
      setOneriler(((oneri ?? []) as any[]));

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
        /* AÇIK GÖREV İKİ DURUMDUR. 'onay_bekliyor' satırları ZORUNLU İNSAN
           NOKTASIDIR (ajan-nobetci/index.ts:135) — yani tam da arabulucunun
           yapması gereken iş. Sorgu yalnız 'bekliyor' okuduğu için
           `bilirkisi-secim`in tıkanma · evrak_oner · dis_aday bildirimleri
           sohbete HİÇ düşmüyordu; ekranda onları işleyen kod (gorevTikla →
           'arabulucu_onayi') zaten vardı, satır hiç gelmiyordu.
           Taraf dalı DEĞİŞMEDİ: 'onay_bekliyor' arabulucuya aittir. */
        supabase.from("ajan_gorevleri")
          .select("id, gorev_tipi, hedef_party_id, gerekce, durum, sonuc, created_at")
          .eq("case_id", caseId).in("durum", ["bekliyor", "onay_bekliyor"])
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("ajan_gorevleri")
          .select("id, gorev_tipi, hedef_party_id, gerekce, durum, sonuc, created_at")
          .eq("case_id", caseId).eq("gorev_tipi", "asama_gecisi").eq("durum", "yapildi")
          .order("created_at", { ascending: false }).limit(5),
      ]);
      /* Aktif duraklatma ve koşmuş adımlar — YALNIZ arabulucu dalında okunur. */
      const [dur, kosan] = await Promise.all([
        (supabase.from("akis_duraklatma" as any) as any)
          .select("id, kapsam, hedef_adim, sebep, aktif")
          .eq("case_id", caseId).eq("aktif", true)
          .order("created_at", { ascending: false }).limit(1),
        supabase.from("ajan_gorevleri")
          .select("gerekce").eq("case_id", caseId).eq("gorev_tipi", "akis_kosuldu").limit(100),
      ]);
      setDuraklatma(((dur.data ?? []) as any[])[0] ?? null);
      // "[akis:<olay>:<kural>] …" gerekçesinden kural kodları çıkarılır.
      const kodlar = new Set<string>();
      for (const r of ((kosan.data ?? []) as any[])) {
        // Çapa kaldırıldı: aynı sınıf (bkz. yukarıdaki `[gecis:…]` notu).
        const m = /\[akis:[^:]+:([^\]]+)\]/.exec(String(r?.gerekce ?? ""));
        if (m) kodlar.add(m[1]);
      }
      setKosanAdimlar(Array.from(kodlar));

      // Bekleyen talimat — yalnız arabulucu görür.
      const { data: tal } = await (supabase.from("arabulucu_talimatlari" as any) as any)
        .select("id, hedef_adim, talimat, durum, created_at")
        .eq("case_id", caseId).eq("durum", "bekliyor")
        .order("created_at", { ascending: false }).limit(1);
      setBekleyenTalimat(((tal ?? []) as any[])[0] ?? null);

      // Arabulucu önerileri: hedef='arabulucu' satırları (taraf satırları girmez).
      const { data: oneri } = await (supabase.from("ajan_onerileri" as any) as any)
        .select("id, baslik, gerekce, eylem_turu, eylem_adim, hedef, party_id, durum, created_at")
        .eq("case_id", caseId).eq("durum", "acik").eq("hedef", "arabulucu")
        .order("created_at", { ascending: false }).limit(3);
      setOneriler(((oneri ?? []) as any[]));

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
      /* ÇAPA KALDIRILDI (24.08.2026). Desen satır başına çapalıydı; oysa
         nöbetçinin açtığı aşama görevleri `anaAjanaBildir` geçidinden geçiyor
         ve geçit gerekçenin BAŞINA `[kaynak:…]` koyuyor (21.08 11:06'dan beri
         yazılan 421 görevin hepsinde var). Çapa yüzünden o geçişler zaman
         çizelgesinde SESSİZCE görünmüyordu (`if (!m) continue`). */
      const m = /\[gecis:(\d+)->(\d+)\]\s*(.*)$/.exec(String(a.gerekce ?? ""));
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

  /* TARAF GİRİNCE: bekleyen isteği varsa sohbet kendiliğinden açılır ve istek
     en üstte gösterilir. Bekleyen yoksa açılmaz; kullanıcı kapatırsa bir daha
     kendiliğinden açılmaz. */
  useEffect(() => {
    if (yukleniyor || kendiAcildiRef.current) return;
    if (bekleyenIstek) { kendiAcildiRef.current = true; setAcik(true); }
  }, [yukleniyor, gorevler]);

  /* En üstte gösterilecek istek: ajanın doğrudan sorduğu, cevap bekleyen soru. */
  const bekleyenIstek = useMemo(
    () => gorevler.find((g) => CEVAPLANABILIR.includes(g.gorev_tipi)) ?? null,
    [gorevler],
  );

  /* Mikrofon: tarayıcının tanıması açılır, çıkan metin kutuya EKLENİR.
     Gönderilmez. Kapanışta tanıma durdurulur; kayıt tutulmaz. */
  function mikrofon() {
    if (!sesVar) return;
    if (dinliyor) {
      try { tanimaRef.current?.stop(); } catch { /* zaten durmuş */ }
      setDinliyor(false);
      return;
    }
    try {
      const Tanima = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const t = new Tanima();
      t.lang = "tr-TR";
      t.interimResults = false;
      t.continuous = false;
      t.onresult = (e: any) => {
        const parca = String(e?.results?.[0]?.[0]?.transcript ?? "").trim();
        if (parca) setSoru((o) => (o ? `${o} ${parca}` : parca));
      };
      t.onend = () => setDinliyor(false);
      t.onerror = () => setDinliyor(false);
      tanimaRef.current = t;
      t.start();
      setDinliyor(true);
    } catch {
      setDinliyor(false);
    }
  }

  // Bileşen kapanırken dinleme ve okuma durdurulur.
  useEffect(() => () => {
    try { tanimaRef.current?.stop(); } catch { /* zaten durmuş */ }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  /* Sesli okuma yalnız AÇIKKEN ve yalnız ajanın SON cevabını okur. Varsayılan
     kapalıdır; kapalıyken hiçbir şey seslendirilmez. */
  const sonAjanCevabi = yazisma.filter((m) => m.tip === "ajan").slice(-1)[0]?.metin ?? "";
  useEffect(() => {
    if (!sesliOkuma || !okumaVar || !sonAjanCevabi) return;
    try {
      window.speechSynthesis.cancel();
      const s = new SpeechSynthesisUtterance(sonAjanCevabi);
      s.lang = "tr-TR";
      window.speechSynthesis.speak(s);
    } catch { /* seslendirme yoksa sessizce geçilir */ }
  }, [sonAjanCevabi, sesliOkuma, okumaVar]);

  /* DUR / DEVAM / DEĞİŞTİR — yazım doğrudan sohbetten yapılır; tablo
     politikası arabulucuya açık olduğu için yeni edge fonksiyon gerekmez.
     Ajan durdurmayı kendiliğinden kaldıramaz; kaldırma buradan yapılır. */
  async function durdur(sebep: string, kapsam: "dosya" | "adim", hedefAdim?: string) {
    const { data: oturum } = await supabase.auth.getUser();
    const { error } = await (supabase.from("akis_duraklatma" as any) as any).insert({
      case_id: caseId, aktif: true, kapsam,
      hedef_adim: kapsam === "adim" ? (hedefAdim ?? null) : null,
      sebep: sebep.trim() || null,
      duraklatan: oturum?.user?.id ?? null,
    });
    if (error) {
      setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
        metin: "Akışı şu an durduramadım. Birazdan tekrar deneyin." }]);
      return;
    }
    setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
      metin: kapsam === "dosya" ? "Akışı durdurdum." : "Bu adımı durdurdum, ötekiler sürüyor." }]);
    await yukle();
  }

  async function devamEt() {
    if (!duraklatma?.id) return;
    const { data: oturum } = await supabase.auth.getUser();
    const { error } = await (supabase.from("akis_duraklatma" as any) as any).update({
      aktif: false,
      kaldirma_zamani: new Date().toISOString(),
      kaldiran: oturum?.user?.id ?? null,
    }).eq("id", duraklatma.id);
    if (error) {
      setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
        metin: "Akışı şu an sürdüremedim. Birazdan tekrar deneyin." }]);
      return;
    }
    setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
      metin: "Kaldığım yerden devam ediyorum." }]);
    await yukle();
  }

  /* TALİMAT YAZ: kayıt doğrudan sohbetten tabloya yazılır; tablo politikası
     arabulucuya açık olduğu için yeni edge fonksiyon gerekmez. Koşucu bekleyen
     talimatı bir sonraki turunda alır, uygular ve ONAYA SUNAR. */
  async function talimatYaz(adim: string, metin: string) {
    const { data: oturum } = await supabase.auth.getUser();
    const { error } = await (supabase.from("arabulucu_talimatlari" as any) as any).insert({
      case_id: caseId, hedef_adim: adim, talimat: metin.trim(),
      durum: "bekliyor", veren: oturum?.user?.id ?? null,
    });
    if (error) {
      setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
        metin: "Talimatınızı şu an kaydedemedim. Birazdan tekrar deneyin." }]);
      return;
    }
    setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
      metin: "Talimatınızı aldım, sıradaki turda uygulayıp onayınıza sunacağım." }]);
    setDuzeltmeAdimi(adim);   // B5 — tek soru: neyi düzelttiniz?
    await yukle();
  }

  /* "Talimatı reddet": verilen talimat reddedilir ve yeni talimat yazılabilir.
     21.08 kararı — gerekçe SORULMAZ; sohbet anket ekranı değildir. red_sebebi
     kolonu YERİNDE DURUR, yalnız boş geçilir.
     23.08 kararı — bu işlev KALDIRILMADI, yalnız adı ayrıldı: "Yeniden öner"
     artık bilirkişi aday taramasının adıdır (bkz. bilirkisiYenidenOner). */
  async function talimatReddet(g: GorevSatiri, sebep: string) {
    // supabase-js hata FIRLATMAZ: sonuc okunmazsa yazim basarisiz olsa bile
    // asagida "Talimati reddettim" denirdi. Reddin gerceklestigi yer
    // `ajan_gorevleri` satiridir; o yazilamadiysa red OLMAMISTIR ve bunu
    // arabulucuya soylemek yanlis olur. (Ajanin yetkisi/karar siniri
    // degismiyor — yalnizca basarisizlik artik gorunur oluyor.)
    const m = /\[talimat:([0-9a-f-]{6,})\]/i.exec(String(g.gerekce ?? ""));
    let izNotu = "";
    if (m) {
      const { error: talimatErr } = await (supabase.from("arabulucu_talimatlari" as any) as any).update({
        durum: "reddedildi", red_sebebi: sebep.trim() || null,
        karar_zamani: new Date().toISOString(),
      }).eq("id", m[1]);
      if (talimatErr) izNotu = " (talimat kaydina islenemedi)";
    }
    const { error: gorevErr } = await supabase.from("ajan_gorevleri")
      .update({ durum: "atlandi", sonuc: "arabulucu talimatı reddetti" }).eq("id", g.id);
    if (gorevErr) {
      setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
        metin: `Talimatı reddedemedim — kayıt yazılamadı: ${gorevErr.message}. Lütfen tekrar deneyin.` }]);
      await yukle();
      return;
    }
    setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
      metin: `Talimatı reddettim${izNotu}. Yeni talimatınızı yazabilirsiniz.` }]);
    setDuzeltmeAdimi("talimat");   // B5 — tek soru: neyi düzelttiniz?
    setTalimatKipi(true);
    await yukle();
  }

  /* "YENİDEN ÖNER" (23.08 kurucu kararı): bilirkişi aday bildiriminde bu düğme
     ARTIK bilirkişi koluna bağlıdır — `ikinci_tur` adımını çağırır ve o alan
     için yeni aday tarar. Tur sınırı, tükenme cümlesi ve erteleme kararı
     SUNUCUDA verilir; burada yalnız sonuç yazılır. Ekran sekmesi değişmez,
     hiçbir satır silinmez. */
  async function bilirkisiYenidenOner(alan: string) {
    if (bekliyor) return;
    setBekliyor(true);
    try {
      const { data, error } = await supabase.functions.invoke("bilirkisi-secim", {
        body: { case_id: caseId, adim: "ikinci_tur", alan },
      });
      if (error || (data as any)?.error) throw new Error("taranamadi");
      const d = data as any;
      const cevapMetni = d?.ertelendi
        ? String(d?.mesaj ?? "Bilirkişi seçilmedi — bu aşama ertelendi.")
        : d?.bulunamadi
          ? String(d?.sebep ?? "Bu alanda kayıtlı başka uzman yok.")
          : `"${alan}" alanı için ${Number(d?.adaylar?.length ?? 0)} yeni aday çıkardım; `
            + `Bilirkişi sekmesinde onayınıza sundum.`;
      setYazisma((o) => [...o, {
        id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan", metin: cevapMetni,
      }]);
      await yukle();
    } catch {
      setYazisma((o) => [...o, {
        id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
        metin: "Yeni aday taramasını şu an yapamadım. Birazdan tekrar deneyin.",
      }]);
    } finally {
      setBekliyor(false);
    }
  }

  /* ÖNERİYİ UYGULA: 'talimat' ise mevcut talimat düzenine satır yazılır,
     'adim' ise ilgili ekrana götürür, 'bilgi' ise yalnız kapanır.
     KAPAT sonuçsuzdur: kapatılan öneri o dosyada yeniden açılmaz. */
  async function oneriUygula(o: any) {
    const tur = String(o?.eylem_turu ?? "bilgi");
    if (tur === "talimat" && !tarafModu) {
      await talimatYaz(String(o.eylem_adim ?? ""), String(o.baslik ?? ""));
    } else if (tur === "adim") {
      const hedef = String(o.eylem_adim ?? "");
      if (hedef.startsWith("kural:")) {
        /* B6 — kural ONAYI: kural ancak burada etkinleşir. Ajan hiçbir kuralı
           kendiliğinden açamaz; metni değiştirilmez, değişiklik yeni sürümdür. */
        const { data: oturum } = await supabase.auth.getUser();
        const { error } = await (supabase.from("kural_kutuphanesi" as any) as any).update({
          etkin: true, onaylayan: oturum?.user?.id ?? null,
          onay_zamani: new Date().toISOString(),
        }).eq("kod", hedef.slice(6));
        setYazisma((x) => [...x, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
          metin: error ? "Kuralı şu an açamadım." : "Kuralı açtım; bundan sonra o adımda uygulayacağım." }]);
      } else if (hedef.startsWith("tercih:")) {
        // B7 — alışkanlık önerisi kabul edildi: tercihe YAZILIR, kendiliğinden değil.
        const adim = hedef.slice(7);
        const { data: oturum } = await supabase.auth.getUser();
        const uid = oturum?.user?.id ?? null;
        const { data: mevcut } = await (supabase.from("arabulucu_kontrol_tercihleri" as any) as any)
          .select("onay_isteyen_adimlar").eq("case_id", caseId).eq("mediator_id", uid).maybeSingle();
        const liste = Array.isArray((mevcut as any)?.onay_isteyen_adimlar)
          ? (mevcut as any).onay_isteyen_adimlar.map((x: any) => String(x)) : [];
        if (!liste.includes(adim)) liste.push(adim);
        // Tercih yazilamazsa "once size soracagim" sozu tutulamaz; sessizce
        // verilmis bir soz, verilmemis bir sozden daha kotudur.
        const { error: tercihErr } = await (supabase.from("arabulucu_kontrol_tercihleri" as any) as any).upsert({
          case_id: caseId, mediator_id: uid, onay_isteyen_adimlar: liste,
          guncelleme_zamani: new Date().toISOString(),
        }, { onConflict: "case_id,mediator_id" });
        setYazisma((x) => [...x, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
          metin: tercihErr
            ? `Tercihi kaydedemedim: ${tercihErr.message}. Bu adımda otomatik akış sürer — lütfen tekrar deneyin.`
            : "Bu dosyada o adımda önce size soracağım." }]);
      } else if (tarafModu) { if (hedef && onGit) onGit(hedef); }
      else if (hedef) { setCockpitHedef(hedef); }
    }
    await oneriKapat(o, "kabul");
  }

  async function oneriKapat(o: any, durum: "kabul" | "kapatildi") {
    const { error } = await (supabase.from("ajan_onerileri" as any) as any).update({
      durum, karar_zamani: new Date().toISOString(),
    }).eq("id", o.id);
    if (error) {
      setYazisma((x) => [...x, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
        metin: "Bu öneriyi şu an kapatamadım. Birazdan tekrar deneyin." }]);
      return;
    }
    setOneriler((x) => x.filter((y) => y.id !== o.id));
  }

  // Arabulucu yüzeyinde kokpitteki bölüme götürme: mevcut adres deseni.
  function setCockpitHedef(bolumId: string) {
    window.location.assign(`/cases/${caseId}?phase=3&pv=2#${bolumId}`);
  }

  /* B5 — düzeltme TÜRÜ kaydedilir; metin kaydedilmez. Geçilebilir. */
  async function duzeltmeKaydet(tur: string) {
    const adim = duzeltmeAdimi;
    setDuzeltmeAdimi(null);
    if (!adim) return;
    const { data: oturum } = await supabase.auth.getUser();
    await (supabase.from("duzeltme_kayitlari" as any) as any).insert({
      case_id: caseId, mediator_id: oturum?.user?.id ?? null,
      adim, duzeltme_turu: tur,
    });
  }

  function gorevTikla(g?: GorevSatiri) {
    if (!g) return;
    if (tarafModu) {
      const sekme = GOREV_SEKMESI[g.gorev_tipi];
      if (sekme && onGit) onGit(sekme);
      return;
    }
    // Akış onayı ve talimat onayı: tıklanınca ekrana götürmek yerine onay verilir.
    if (g.gorev_tipi === "akis_onay_bekliyor" || g.gorev_tipi === "arabulucu_onayi") {
      onayVer(g); return;
    }
    const asama = GOREV_ASAMASI[g.gorev_tipi] ?? 3;
    window.location.assign(`/cases/${caseId}?phase=${asama}&pv=2`);
  }

  /* Arabulucu, kendi seçtiği bir adım için istenen onayı sohbetten verir.
     Onay kapısını ürün değil arabulucu koymuştu; kaldıran da odur. */
  async function onayVer(g: GorevSatiri) {
    try {
      const { data, error } = await supabase.functions.invoke("akis-onayla", {
        body: { gorev_id: g.id },
      });
      const yanit = (data ?? {}) as { error?: string; onaylandi?: boolean; sebep?: string };
      if (error || yanit.error) throw new Error("olmadi");
      /* SUNUCU "ONAYLAMADIM" DİYEBİLİR ve bunu 200 ile döner (hata değil, karar).
         Eskiden bu dal kontrol edilmiyordu: sunucu onayı reddetse bile ekranda
         "Onayınızı aldım" yazıyordu. Ekran, olmayan bir işi olmuş göstermez. */
      if (yanit.onaylandi === false) {
        setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
          metin: yanit.sebep ?? "Bu onayı şimdi işleyemedim." }]);
        await yukle();
        return;
      }
      setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
        metin: "Onayınızı aldım, adımı şimdi yapıyorum." }]);
      await yukle();
    } catch {
      setYazisma((o) => [...o, { id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
        metin: "Onayı şu an kaydedemedim. Birazdan tekrar deneyin." }]);
    }
  }

  async function gonder() {
    const metin = soru.trim();
    if (!metin || bekliyor || !rol) return;
    setSoru("");
    setBekliyor(true);
    const simdi = Date.now();
    setYazisma((o) => [...o, { id: `ben-${simdi}`, zaman: simdi, tip: "ben", metin }]);

    /* CEVAP KİPİ: bekleyen bir soruya cevap yazılıyorsa metin asistana değil,
       sorunun kendisine gider; görev 'yapildi' olur ve ajan kaldığı yerden
       devam eder. Yetki sunucuda doğrulanır. */
    if (cevaplanan) {
      const hedef = cevaplanan;
      setCevaplanan(null);

      /* BİLİRKİŞİ TÜKENME AKIŞI (21.08): ajan "bu alanda kayıtlı başka uzman yok"
         dediyse, arabulucunun yazdığı metin bir CEVAP değil YENİ UZMANLIK ALANIDIR.
         O metin bilirkişi koluna gider ve sistem o alanla yeniden taranır; tur
         sınırı ve erteleme kararı SUNUCUDA verilir. Pencere kapanmaz. */
      const adayYok = /\[bilirkisi:aday-yok:([^\]]+)\]/.exec(String(hedef.gerekce ?? ""));
      if (adayYok) {
        try {
          const { data, error } = await supabase.functions.invoke("bilirkisi-secim", {
            body: { case_id: caseId, adim: "alan_tara", alan: metin, gorev_id: hedef.id },
          });
          if (error || (data as any)?.error) throw new Error("taranamadi");
          const d = data as any;
          const cevapMetni = d?.ertelendi
            ? String(d?.mesaj ?? "Bilirkişi seçilmedi — bu aşama ertelendi.")
            : d?.bulunamadi
              ? String(d?.sebep ?? "Bu alanda kayıtlı uzman yok.")
              : `"${metin}" alanı için ${Number(d?.adaylar?.length ?? 0)} aday çıkardım; `
                + `Bilirkişi sekmesinde onayınıza sundum.`;
          setYazisma((o) => [...o, {
            id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan", metin: cevapMetni,
          }]);
          await yukle();
        } catch {
          setYazisma((o) => [...o, {
            id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
            metin: "Bu alanı şu an tarayamadım. Birazdan tekrar deneyin.",
          }]);
        } finally {
          setBekliyor(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("taraf-cevap", {
          body: { gorev_id: hedef.id, cevap: metin },
        });
        /* SUNUCUNUN SÖYLEDİĞİNİ SÖYLE (23.08): burada üç ayrı sonuç tek bir
           "birazdan tekrar deneyin" cümlesine düşüyordu. İkisi tekrar denemekle
           ÇÖZÜLMEZ:
           · 200 + yazildi:false → soru bu arada kapanmış. Bekleyen soru listesi
             anlık yayında değil, dakikada bir tazeleniyor (bkz. satır 428);
             kapanmış bir kart ekranda durabiliyor ve ona yazılan her cevap
             "tekrar deneyin" alıyor — ama hiçbir tekrar tutmuyor.
           · 403 → cevap yazma yetkisi yok. Bu da tekrar denemekle değişmez.
           Yalnız üçüncüsü (taşıma/500 hatası) gerçekten tekrar denenebilir.
           supabase.functions.invoke 2xx dışında `data` vermez; sunucunun gerekçesi
           `error.context` gövdesindedir, oradan okunuyor. */
        type CevapSonucu = { yazildi?: boolean; sebep?: string; error?: string };
        const sonuc = (data ?? null) as CevapSonucu | null;
        let sunucuMesaji = "";
        if (error) {
          const govde = await (error as { context?: { json?: () => Promise<CevapSonucu> } })
            ?.context?.json?.().catch(() => null) ?? null;
          sunucuMesaji = String(govde?.error ?? "").trim();
          if (!sunucuMesaji) throw new Error("yazilamadi");
        } else if (sonuc?.error) {
          sunucuMesaji = String(sonuc.error).trim();
        } else if (!sonuc?.yazildi) {
          sunucuMesaji = String(sonuc?.sebep ?? "Bu soru zaten kapanmış.").trim();
        }

        setYazisma((o) => [...o, {
          id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
          metin: sunucuMesaji || "Cevabınızı aldım, kaldığım yerden devam ediyorum.",
        }]);
        // Kapanmış soru listeden düşsün; kart ekranda kalmasın.
        await yukle();
      } catch {
        setYazisma((o) => [...o, {
          id: `aj-${Date.now()}`, zaman: Date.now(), tip: "ajan",
          metin: "Cevabınızı şu an kaydedemedim. Birazdan tekrar deneyin.",
        }]);
      } finally {
        setBekliyor(false);
      }
      return;
    }

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

      {/* ARABULUCU FRENİ — yalnız arabulucu yüzeyinde. Durdurulmuş dosyada
          sakin tek satır; altında Durdur / Devam / Değiştir. */}
      {!tarafModu && (
        <div className="border-b px-3 py-2 shrink-0 space-y-1.5">
          {duraklatma && (
            <p className="text-xs">
              Akış durduruldu{duraklatma.sebep ? ` — ${String(duraklatma.sebep)}` : ""}. Devam etmek için Devam'a basın.
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {!duraklatma && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                onClick={async () => { setFrenKipi(null); await durdur("", "dosya"); }}>
                <Pause className="h-3 w-3 mr-1" /> Durdur
              </Button>
            )}
            {duraklatma && (
              <Button size="sm" variant="secondary" className="h-6 px-2 text-[11px]" onClick={devamEt}>
                <Play className="h-3 w-3 mr-1" /> Devam
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
              onClick={() => { setFrenKipi(frenKipi === "degistir" ? null : "degistir"); }}>
              <Pencil className="h-3 w-3 mr-1" /> Değiştir
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
              onClick={() => { setTalimatKipi((o) => !o); setFrenKipi(null); }}>
              <ClipboardList className="h-3 w-3 mr-1" /> Talimat ver
            </Button>
          </div>

          {bekleyenTalimat && (
            <p className="text-[11px] text-muted-foreground">
              Talimatınız sırada: {TALIMAT_ADIMLARI.find((a) => a.kod === String(bekleyenTalimat.hedef_adim))?.metin
                ?? String(bekleyenTalimat.hedef_adim ?? "")} — {String(bekleyenTalimat.talimat ?? "").split(/(?<=[.!?])\s/)[0]}
            </p>
          )}

          {talimatKipi && (
            <div className="space-y-1.5">
              <select
                className="w-full h-7 text-xs border rounded bg-background px-1"
                value={talimatAdimi}
                onChange={(e) => setTalimatAdimi(e.target.value)}
              >
                <option value="">hangi adım?</option>
                {TALIMAT_ADIMLARI.map((a) => <option key={a.kod} value={a.kod}>{a.metin}</option>)}
              </select>
              <Textarea rows={3} value={soru} placeholder="Şunu şöyle yap…"
                className="text-xs resize-none" onChange={(e) => setSoru(e.target.value)} />
              <Button size="sm" className="h-6 px-2 text-[11px]"
                disabled={!talimatAdimi || !soru.trim()}
                onClick={async () => {
                  const a = talimatAdimi; const t = soru;
                  setSoru(""); setTalimatAdimi(""); setTalimatKipi(false);
                  await talimatYaz(a, t);
                }}>
                Talimatı gönder
              </Button>
            </div>
          )}

          {frenKipi === "degistir" && (
            <div className="space-y-1.5">
              {kosanAdimlar.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Henüz koşmuş bir adım bulamadım.</p>
              ) : (
                <select
                  className="w-full h-7 text-xs border rounded bg-background px-1"
                  value={secilenAdim}
                  onChange={(e) => setSecilenAdim(e.target.value)}
                >
                  <option value="">adım seçin</option>
                  {kosanAdimlar.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              )}
              <Textarea rows={2} value={soru} placeholder="Neyin düzeltilmesini istiyorsunuz?"
                className="text-xs resize-none" onChange={(e) => setSoru(e.target.value)} />
              <Button size="sm" className="h-6 px-2 text-[11px]" disabled={!secilenAdim}
                onClick={async () => {
                  const t = soru; const a = secilenAdim;
                  setSoru(""); setSecilenAdim(""); setFrenKipi(null);
                  await durdur(t, "adim", a);
                }}>
                Bu adımı durdur
              </Button>
            </div>
          )}
        </div>
      )}

      {/* İSTEK ŞERİDİ: bekleyen soru daima EN ÜSTTE durur. */}
      {bekleyenIstek && (
        <div className="border-b bg-muted/40 px-3 py-2 shrink-0">
          <div className="text-xs leading-snug">
            {GOREV_BASLIGI[bekleyenIstek.gorev_tipi] ?? "Bekleyen bir soru var."}{" "}
            {gerekceTemizle(bekleyenIstek.gerekce)}
          </div>
          {hatirlatmaMetni(bekleyenIstek.sonuc ?? null) && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {hatirlatmaMetni(bekleyenIstek.sonuc ?? null)}
            </div>
          )}
          {cevaplanan?.id !== bekleyenIstek.id && (
            <Button size="sm" variant="secondary" className="h-6 px-2 text-[11px] mt-1.5"
              onClick={() => setCevaplanan(bekleyenIstek)}>
              Cevap yaz
            </Button>
          )}
        </div>
      )}

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
              const onayMi = m.gorev?.gorev_tipi === "arabulucu_onayi"
                || m.gorev?.gorev_tipi === "akis_onay_bekliyor";
              /* 23.08: bildirim bir bilirkişi aday satırıysa "Yeniden öner"
                 bilirkişi koluna gider; değilse eski talimat reddi kalır. */
              const bilAlan = bilirkisiAlani(m.gorev);
              return (
                <div key={m.id} className="rounded-lg border px-2.5 py-1.5">
                  <button type="button" onClick={() => gorevTikla(m.gorev)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs leading-snug">
                        {m.metin}
                        {m.gorev && kaynakOku(m.gorev) && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({kaynakOku(m.gorev)})
                          </span>
                        )}
                      </span>
                      {!onayMi && <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />}
                    </div>
                  </button>
                  {(onayMi || bilAlan) && !tarafModu && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {onayMi && (
                        <Button size="sm" className="h-6 px-2 text-[11px]"
                          onClick={() => m.gorev && onayVer(m.gorev)}>Onayla</Button>
                      )}
                      {bilAlan ? (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                          disabled={bekliyor}
                          onClick={() => bilirkisiYenidenOner(bilAlan)}>
                          Yeniden öner
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                          onClick={() => m.gorev && talimatReddet(m.gorev, "")}>
                          Talimatı reddet
                        </Button>
                      )}
                    </div>
                  )}
                </div>
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

      {/* B5 — DÜZELTME SORUSU: tek soru, tek tıkla cevap, geçilebilir.
          Yalnız TÜR kaydedilir; düzeltmenin metni hiçbir yere yazılmaz. */}
      {duzeltmeAdimi && !tarafModu && (
        <div className="border-t px-3 py-2 shrink-0 space-y-1.5">
          <div className="text-xs">Neyi düzelttiniz?</div>
          <div className="flex flex-wrap gap-1">
            {DUZELTME_TURLERI.map((t) => (
              <Button key={t.kod} size="sm" variant="outline" className="h-5 px-2 text-[11px]"
                onClick={() => duzeltmeKaydet(t.kod)}>{t.metin}</Button>
            ))}
            <Button size="sm" variant="ghost" className="h-5 px-2 text-[11px]"
              onClick={() => setDuzeltmeAdimi(null)}>geç</Button>
          </div>
        </div>
      )}

      {/* ÖNERİLER — sohbetin altında, en fazla üç satır. Uyarı değildir:
          renk taşımaz, akışı durdurmaz, zorunluluk doğurmaz. */}
      {oneriler.length > 0 && (
        <div className="border-t px-3 py-2 shrink-0 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Öneriler</div>
          {oneriler.slice(0, 3).map((o) => (
            <div key={o.id} className="space-y-0.5">
              <div className="text-xs leading-snug">{String(o.baslik ?? "")}</div>
              {o.gerekce && (
                <div className="text-[11px] text-muted-foreground leading-snug">{String(o.gerekce)}</div>
              )}
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="secondary" className="h-5 px-2 text-[11px]"
                  onClick={() => oneriUygula(o)}>Uygula</Button>
                <Button size="sm" variant="ghost" className="h-5 px-2 text-[11px]"
                  onClick={() => oneriKapat(o, "kapatildi")}>Kapat</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t p-2 shrink-0">
        {cevaplanan && (
          <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">Bu soruya cevap yazıyorsunuz.</span>
            <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[11px]"
              onClick={() => setCevaplanan(null)}>Vazgeç</Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={soru}
            placeholder={cevaplanan ? "Cevabınızı yazın…" : "Ajana yazın…"}
            className="min-h-[36px] max-h-24 text-xs resize-none"
            onChange={(e) => setSoru(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); gonder(); }
            }}
          />
          {/* Mikrofon: destekleyen tarayıcıda görünür. Ses yazıya çevrilir,
              kutuya düşer; gönderme kararı kullanıcınındır. */}
          {sesVar && (
            <Button size="sm" variant={dinliyor ? "secondary" : "ghost"} className="h-9 px-2"
              title={dinliyor ? "Dinlemeyi durdur" : "Konuşarak yaz"} onClick={mikrofon}>
              {dinliyor ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          {/* Sesli okuma — varsayılan KAPALI. */}
          {okumaVar && (
            <Button size="sm" variant="ghost" className="h-9 px-2"
              title={sesliOkuma ? "Sesli okumayı kapat" : "Cevapları sesli oku"}
              onClick={() => {
                if (sesliOkuma) { try { window.speechSynthesis.cancel(); } catch { /* yok */ } }
                setSesliOkuma((o) => !o);
              }}>
              {sesliOkuma ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-60" />}
            </Button>
          )}
          <Button size="sm" className="h-9 px-2.5" disabled={bekliyor || !soru.trim()} onClick={gonder}>
            {bekliyor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AjanPenceresi;
