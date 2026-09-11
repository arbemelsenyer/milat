/* KAYNAK AYRINTISI — H-36 ve H-37'NİN ORTAK GÖRÜNÜMÜ
 *
 * Kurucu (11.09.2026, HAT H-37): *"H-36 ile H-37 AYNI ayrıntı görünümünü
 * kullansın, iki ayrı tasarım yapma."*
 *
 *   · H-36 kitabı ADIYLA açar (yönetici listesinde bir kaynağa tıklanır).
 *   · H-37(b) kaynağı CEVAPTAN açar (AI cevabının altındaki künyeye tıklanır).
 *
 * İkisi de bu dosyadaki `KaynakAyrintisi`yi açar. Fark yalnız KİP'tir:
 * "kitap" mı, "kunye" mi. Görünüm, künye satırı, sayfalama ve arama TEK
 * kopyadır; ikinci bir tasarım yoktur.
 *
 * Bu, `SourceViewerDialog` DEĞİLDİR ve onun yerine geçmez: o, kaynağın PDF
 * SAYFASINI açar; bu, bilgi tabanına KAYITLI PARÇA METNİNİ açar. Kurucunun
 * istediği "ürün hangi metinden cevap verdi" sorusunun karşılığı ikincisidir.
 *
 * UYDURMA YASAK (§2-A): burada model çalışmaz, metin üretilmez. Ne kayıtlıysa
 * o görünür. Bulunamazsa "bulunamadı" yazar; yakın bir şey gösterilmez.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ExternalLink, Loader2, Search } from "lucide-react";

/** Bilgi tabanına kayıtlı tek parça. Kapının döndürdüğü biçimin aynısı. */
export type KaynakParcasi = {
  id: string | null;
  source_title: string;
  source_url: string | null;
  category: string;
  chunk_index: number | null;
  chunk_text: string;
  created_at: string | null;
  /** Yalnız anlam aramasında dolar. */
  benzerlik: number | null;
};

export type KitapKunyesi = {
  source_title: string;
  category: string;
  source_url: string | null;
  parca_sayisi: number;
  yuklenme: string | null;
};

/* Kapının (`kaynak-ara`) döndürdüğü cevap. Tipsiz `any` ile okunursa alan adı
   değiştiğinde ekran sessizce boşalır — burada tam da bunu önlüyoruz. */
type KapiCevabi = {
  durum?: "bulundu" | "bulunamadi" | "arama_yapilamadi";
  sonuclar?: KaynakParcasi[];
  kitap?: KitapKunyesi | null;
  eslesen?: number;
  not?: string | null;
  sebep?: string | null;
  error?: string;
};

const SAYFA_BOYU = 5;

function tarih(v?: string | null): string {
  if (!v) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(v));
}

/* ── VURGU — TAHMİN YOK ──────────────────────────────────────────────────────
   Aranan ifade metinde GEÇİYORSA boyanır; geçmiyorsa hiçbir şey boyanmaz.
   "Yakın" ya da "benzer" bir yer asla vurgulanmaz — `SourceViewerDialog`
   başındaki ilkenin aynısı, aynı sebeple: yanlış yeri boyamak, doğru yeri
   göstermemekten daha kötüdür. */
function kacir(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Vurgula({ metin, vurgu }: { metin: string; vurgu?: string | null }) {
  const arananIfade = String(vurgu ?? "").trim();
  if (!arananIfade || arananIfade.length < 2) return <>{metin}</>;
  let parcalar: string[];
  try {
    parcalar = metin.split(new RegExp(`(${kacir(arananIfade)})`, "gi"));
  } catch {
    return <>{metin}</>;
  }
  if (parcalar.length === 1) return <>{metin}</>;
  const kucuk = arananIfade.toLocaleLowerCase("tr-TR");
  return (
    <>
      {parcalar.map((p, i) =>
        p.toLocaleLowerCase("tr-TR") === kucuk
          ? <mark key={i} className="bg-amber-200 dark:bg-amber-500/40 rounded-sm px-0.5">{p}</mark>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}

/* ── PARÇA KARTI ─────────────────────────────────────────────────────────────
   Bir parçanın ekrandaki tek biçimi. Hem sınama tezgâhının sonuç listesi
   (H-37a) hem kitabın içi (H-36) bunu kullanır — kurucunun "iki ayrı tasarım
   yapma" maddesi buraya da geçer. */
export function ParcaKarti({
  parca, vurgu, kitapAdiGoster = true, onKitabiAc,
}: {
  parca: KaynakParcasi;
  vurgu?: string | null;
  /** Kitabın içindeyken başlığı her satırda tekrarlamaya gerek yok. */
  kitapAdiGoster?: boolean;
  /** Verilirse "Kitabı aç" düğmesi çıkar (tezgâh sonucundan kitaba geçiş). */
  onKitabiAc?: (baslik: string) => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {kitapAdiGoster && (
          <span className="font-medium break-words">{parca.source_title}</span>
        )}
        <Badge variant="outline" className="text-[10px]">{parca.category}</Badge>
        <span className="text-muted-foreground">
          {parca.chunk_index == null ? "parça sırası yok" : `${parca.chunk_index}. parça`}
        </span>
        {parca.benzerlik != null && (
          <span className="text-muted-foreground">
            · benzerlik %{Math.round(parca.benzerlik * 100)}
          </span>
        )}
      </div>

      {/* PARÇANIN METNİ — kurucunun asıl istediği şey budur. */}
      <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
        <Vurgula metin={parca.chunk_text} vurgu={vurgu} />
      </p>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {parca.source_url ? (
          <a
            href={parca.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 inline-flex items-center gap-0.5 break-all"
          >
            Kaynak adresi <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </a>
        ) : (
          <span className="italic text-muted-foreground">Kaynak adresi yok</span>
        )}
        {onKitabiAc && (
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
            onClick={() => onKitabiAc(parca.source_title)}>
            Kitabı aç
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── ORTAK AYRINTI PENCERESİ ─────────────────────────────────────────────────
   Kip "kitap": kitabın adıyla açılır, parçalar sırayla sayfalanır, metinde
   arama yapılır (H-36).
   Kip "kunye": AI cevabının künyesiyle açılır, cevabın dayandığı parça
   gösterilir (H-37b). */
export function KaynakAyrintisi({
  acik, onKapat, sourceTitle, kip = "kitap", yer, vurgu,
}: {
  acik: boolean;
  onKapat: () => void;
  /** "kitap" kipinde kitabın adı; "kunye" kipinde künyedeki kaynak adı. */
  sourceTitle: string;
  kip?: "kitap" | "kunye";
  /** "kunye" kipinde madde/bölüm ("m. 73"); metinde aranır ve vurgulanır. */
  yer?: string | null;
  /** Metinde boyanacak ifade. Verilmezse `yer` kullanılır. */
  vurgu?: string | null;
}) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [not, setNot] = useState<string | null>(null);
  const [kunye, setKunye] = useState<KitapKunyesi | null>(null);
  const [parcalar, setParcalar] = useState<KaynakParcasi[]>([]);
  const [eslesen, setEslesen] = useState(0);
  const [sayfa, setSayfa] = useState(0);
  const [aramaTaslak, setAramaTaslak] = useState("");
  const [arama, setArama] = useState("");

  const boyanacak = String(vurgu ?? arama ?? "").trim() || String(yer ?? "").trim();

  const oku = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    setNot(null);
    try {
      const govde = kip === "kunye"
        ? { mod: "kunye", ad: sourceTitle, yer: yer ?? null }
        : { mod: "kitap", source_title: sourceTitle, sayfa, sayfaBoyu: SAYFA_BOYU, arama };
      const { data, error } = await supabase.functions.invoke("kaynak-ara", { body: govde });
      if (error) throw new Error(error.message || "Kaynak kapısına ulaşılamadı.");
      const d = (data ?? {}) as KapiCevabi;
      if (d.error) throw new Error(d.error);

      const liste = Array.isArray(d.sonuclar) ? d.sonuclar : [];
      setParcalar(liste);
      setKunye(d.kitap ?? null);
      setEslesen(Number(d.eslesen ?? liste.length));
      /* "Madde metinde geçmiyor" ile "kaynak yok" AYRI şeydir; kapı hangisi
         olduğunu söylüyor, ekran da onu yazıyor. */
      setNot(d.not ?? (d.durum === "bulunamadi" ? (d.sebep ?? null) : null));
    } catch (e) {
      /* SESSİZ DÜŞME YOK: sebep ekranda, gerçek haliyle. */
      console.error("[KaynakAyrintisi] okunamadı", e);
      setHata(e instanceof Error ? e.message : "Kaynak okunamadı; sebep bildirilmedi.");
      setParcalar([]);
    } finally {
      setYukleniyor(false);
    }
  }, [kip, sourceTitle, yer, sayfa, arama]);

  useEffect(() => { if (acik) oku(); }, [acik, oku]);
  // Pencere her açılışta baştan başlar; önceki kitabın sayfası yapışıp kalmaz.
  useEffect(() => {
    if (!acik) return;
    setSayfa(0);
    setArama("");
    setAramaTaslak("");
  }, [acik, sourceTitle]);

  const sonSayfa = Math.max(0, Math.ceil(eslesen / SAYFA_BOYU) - 1);

  return (
    <Dialog open={acik} onOpenChange={(a) => { if (!a) onKapat(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base break-words">{sourceTitle}</DialogTitle>
        </DialogHeader>

        {/* KÜNYE: ad · kategori · adres · parça sayısı · yükleme tarihi */}
        {kunye && (
          <div className="grid gap-2 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Kategori</div>
              <div className="font-medium">{kunye.category}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Parça sayısı</div>
              <div className="font-medium">{kunye.parca_sayisi.toLocaleString("tr-TR")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Yüklenme</div>
              <div className="font-medium">{tarih(kunye.yuklenme)}</div>
            </div>
            <div className="min-w-0">
              <div className="text-muted-foreground">Kaynak adresi</div>
              {kunye.source_url ? (
                <a href={kunye.source_url} target="_blank" rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 break-all inline-flex items-center gap-0.5">
                  {kunye.source_url}
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                </a>
              ) : (
                <div className="font-medium italic text-muted-foreground">yok</div>
              )}
            </div>
          </div>
        )}

        {/* PARÇA METNİNDE ARAMA — yalnız kitap kipinde anlamlı. */}
        {kip === "kitap" && (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => { e.preventDefault(); setSayfa(0); setArama(aramaTaslak.trim()); }}
          >
            <Input
              value={aramaTaslak}
              onChange={(e) => setAramaTaslak(e.target.value)}
              placeholder="Parça metninde ara…"
              className="h-8 text-xs flex-1 min-w-[180px]"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
              <Search className="h-3.5 w-3.5 mr-1" /> Ara
            </Button>
            {arama && (
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs"
                onClick={() => { setAramaTaslak(""); setArama(""); setSayfa(0); }}>
                Aramayı temizle
              </Button>
            )}
          </form>
        )}

        {hata && (
          <div className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="break-words">{hata}</span>
          </div>
        )}
        {not && !hata && (
          <p className="text-xs italic text-muted-foreground leading-snug">{not}</p>
        )}

        {yukleniyor ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Kaynak okunuyor…
          </p>
        ) : parcalar.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {hata
              ? "Parçalar okunamadığı için gösterilemiyor; sebebi yukarıda yazılı."
              : arama
                ? `"${arama}" bu kaynağın parçalarında geçmiyor.`
                : "Bu kaynakta gösterilecek parça bulunamadı."}
          </p>
        ) : (
          <div className="space-y-2">
            {kip === "kitap" && (
              <div className="text-xs text-muted-foreground">
                {arama
                  ? `${eslesen.toLocaleString("tr-TR")} parçada geçiyor`
                  : `${eslesen.toLocaleString("tr-TR")} parça`}
                {sonSayfa > 0 && ` · sayfa ${sayfa + 1}/${sonSayfa + 1}`}
              </div>
            )}
            {parcalar.map((p, i) => (
              <ParcaKarti key={p.id ?? `${p.chunk_index}-${i}`} parca={p} vurgu={boyanacak} kitapAdiGoster={false} />
            ))}
            {kip === "kitap" && sonSayfa > 0 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  disabled={sayfa === 0 || yukleniyor}
                  onClick={() => setSayfa((s) => Math.max(0, s - 1))}>
                  ← Önceki
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  disabled={sayfa >= sonSayfa || yukleniyor}
                  onClick={() => setSayfa((s) => Math.min(sonSayfa, s + 1))}>
                  Sonraki →
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
