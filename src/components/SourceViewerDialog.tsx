// Uygulama içi kaynak görüntüleyici: storage://case-documents/... sözde-URL'i ile gelen
// bilgi tabanı kaynağını Dialog içinde açar, atıf yapılan sayfayı render eder ve atıf
// yapılan pasajı sarı vurgular.
//
// TEMEL İLKE — TAHMİN YOK: pasaj metni sayfa metninde birebir (boşluk normalizasyonu
// dışında) bulunamazsa HİÇBİR ŞEY boyanmaz. Belge vurgusuz ama doğru sayfada görünür;
// "yakın/benzer" bir yer asla vurgulanmaz.
import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ViewerSource = {
  title?: string | null;
  url?: string | null;
  page?: number | null;
  excerpt?: string | null;
};

const STORAGE_SOURCE_PREFIX = "storage://case-documents/";
// Bakanlık kitapları CORS başlığı göndermediği için pdf.js'e doğrudan verilemez;
// knowledge-pdf-proxy edge function'ı üzerinden çekilir (proxy'de de aynı sabit izin
// listesi var).
export const ADB_SOURCE_PREFIX = "https://adb.adalet.gov.tr/";

// DocumentUploader.tsx:14-15 ile AYNI kalıp: pdf.js npm paketi olarak eklenmiyor, CDN'den
// dinamik import ediliyor (Vite worker kurulumu gerekmiyor). Modül bir kez yüklenip
// paylaşılıyor.
const PDFJS_URL = "https://esm.sh/pdfjs-dist@4.5.136/build/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.min.mjs";

let pdfjsPromise: Promise<any> | null = null;
function loadPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // @ts-ignore — CDN modülünün tip bildirimi yok
      const pdfjs: any = await import(/* @vite-ignore */ PDFJS_URL);
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

// backfill-knowledge-pages/index.ts:43-46 ile AYNI normalizasyon — hem sayfa metnine hem
// aranan pasaja aynısı uygulanır ki indexOf karşılaştırması tutarlı olsun.
function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

type LoadTarget = { url: string; isBlob: boolean; httpHeaders?: Record<string, string>; ranged?: boolean };

// adb kitapları: proxy edge function'ı üzerinden. Anahtar koda gömülmez — oturum
// token'ı ve apikey istemcideki mevcut supabase oturumundan/ortam değişkeninden alınır.
async function getProxyTarget(sourceUrl: string): Promise<LoadTarget> {
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const apikey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");
  if (!base) throw new Error("Supabase adresi yapılandırılmamış.");

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Oturum bulunamadı.");

  const httpHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (apikey) httpHeaders.apikey = apikey;

  return {
    url: `${base}/functions/v1/knowledge-pdf-proxy?url=${encodeURIComponent(sourceUrl)}`,
    isBlob: false,
    httpHeaders,
  };
}

// openStorageSource'taki iki yollu mantığın aynısı (imzalı URL → blob yedeği). Oradaki
// fonksiyona dokunulmadı; bu, görüntüleyicinin kendi kopyası.
async function getSourceUrl(sourceUrl: string): Promise<LoadTarget> {
  if (sourceUrl.startsWith(ADB_SOURCE_PREFIX)) return await getProxyTarget(sourceUrl);
  const path = sourceUrl.replace(STORAGE_SOURCE_PREFIX, "");
  try {
    const { data: signed, error: signErr } = await supabase.storage
      .from("case-documents")
      .createSignedUrl(path, 300);
    // ranged: imzalı storage URL'i Range isteklerini destekliyor — pdf.js yalnız
    // gereken sayfa dilimlerini çeker (tüm PDF'i indirmez).
    if (!signErr && signed?.signedUrl) return { url: signed.signedUrl, isBlob: false, ranged: true };
  } catch { /* imzalı URL alınamadı — blob yedeğine düş */ }

  const { data, error } = await supabase.storage.from("case-documents").download(path);
  if (error || !data) throw error ?? new Error("Dosya indirilemedi.");
  return { url: URL.createObjectURL(data), isBlob: true };
}

// Vurgulanacak pasajın tam metnini bulur. Kaynak nesnesi chunk_id taşımadığı için
// (source_title + metadata.page) ile tek anlık sorgu yapılır; dönen 1-3 satır, elimizdeki
// excerpt'in ilk 80 karakteriyle tekilleştirilir. Tekil bir satır seçilemezse excerpt'in
// kendisi kullanılır — o da chunk_text'in birebir ilk 400 karakteri olduğu için tahmin
// değil, kesin bir alt dizgidir.
async function fetchPassageText(s: ViewerSource): Promise<string | null> {
  const excerpt = normalizeWs(String(s.excerpt ?? ""));
  const probe = excerpt.slice(0, 80);

  if (s.title && Number.isFinite(s.page) && (s.page as number) > 0) {
    try {
      const { data, error } = await supabase
        .from("knowledge_base_chunks")
        .select("chunk_text")
        .eq("source_title", s.title)
        .eq("metadata->>page", String(s.page));
      if (!error && Array.isArray(data) && data.length > 0) {
        const rows = data.map((r: any) => normalizeWs(String(r.chunk_text ?? ""))).filter(Boolean);
        if (rows.length === 1 && !probe) return rows[0];
        if (probe) {
          const hits = rows.filter((t) => t.startsWith(probe));
          if (hits.length === 1) return hits[0];
        }
      }
    } catch { /* sorgu başarısız — excerpt yedeğine düş */ }
  }

  // Yedek: excerpt de chunk_text'in birebir ön ekidir. Çok kısaysa güvenilir değil, boş dön.
  return excerpt.length >= 40 ? excerpt : null;
}

// Chunk metni çoğu zaman sayfa üst bilgisiyle başlıyor ("1.08.2026 12:06",
// "Mevzuat Bilgi Sistemi"). Bu ön ek arama anahtarı olarak kullanılırsa vurgu
// pasajın kendisine değil sayfa başlığına düşüyor — bu yüzden baştan atılır.
function stripHeaderNoise(s: string): string {
  const patterns = [
    /^\d{1,2}[./]\d{1,2}[./]\d{2,4}(?:\s+\d{1,2}[:.]\d{2}(?::\d{2})?)?\s*/,
    /^Mevzuat\s+Bilgi\s+Sistemi\s*/i,
    /^[-–—|·:]+\s*/,
  ];
  let out = s.trim();
  let prev = "";
  while (out !== prev) {
    prev = out;
    for (const re of patterns) out = out.replace(re, "").trim();
  }
  return out;
}

// Arama anahtarı: temizlik sonrası metnin ilk ANLAMLI 80 karakteri (en az 5 kelime).
// Cümle yeterince anlamlı değilse bir sonraki cümleden denenir; hiçbiri uymuyorsa
// boş döner ve çağıran taraf boyama yapmaz.
function pickProbe(cleaned: string): string {
  const starts: number[] = [0];
  const re = /[.!?:]\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) starts.push(m.index + m[0].length);
  for (const start of starts) {
    const candidate = cleaned.slice(start, start + 80).trim();
    if (candidate.split(/\s+/).filter(Boolean).length >= 5) return candidate;
  }
  return "";
}

type SpanBox = { left: number; top: number; width: number; height: number; text: string; hit: boolean };

// Sayfanın text layer öğelerini birleşik normalize metne çevirip pasajı arar.
// Dönen: hangi öğelerin vurgulanacağı (hiçbiri güvenilir değilse boş küme).
function matchPassage(
  items: { str: string }[],
  passage: string,
): Set<number> {
  const empty = new Set<number>();
  // Aranan metin, sayfa üst bilgisi ayıklandıktan sonraki hâlidir; temizlenen kısım
  // yalnızca baştan atıldığı için kalan metin hâlâ chunk'ın birebir bir parçasıdır.
  const target = stripHeaderNoise(normalizeWs(passage));
  if (target.length < 40) return empty;

  // Öğeleri normalize edip " " ile birleştir — backfill'deki join(" ") + normalizeWs ile
  // aynı sonucu verir; ek olarak her öğenin birleşik metindeki aralığı kaydedilir.
  let joined = "";
  const ranges: { idx: number; start: number; end: number }[] = [];
  items.forEach((it, idx) => {
    const piece = normalizeWs(String(it?.str ?? ""));
    if (!piece) return;
    if (joined) joined += " ";
    const start = joined.length;
    joined += piece;
    ranges.push({ idx, start, end: joined.length });
  });
  if (!joined) return empty;

  let matchStart = joined.indexOf(target);
  let matchEnd = matchStart >= 0 ? matchStart + target.length : -1;

  if (matchStart < 0) {
    // Pasaj sayfa sınırını aşıyor olabilir: anlamlı 80 karakterlik prob ile başlangıcı
    // bul, sonra birebir uyuşan en uzun ön eki al. Uyuşmayan ilk karakterde dururuz —
    // tahmin yok. Prob anlamlı bir cümle parçası değilse hiç boyama yapılmaz.
    const probe = pickProbe(target);
    if (probe.length < 20) return empty;
    const first = joined.indexOf(probe);
    if (first < 0) return empty;
    // Aynı prob sayfada birden fazla yerde geçiyorsa hangisi olduğu bilinemez — boyama.
    if (joined.indexOf(probe, first + 1) !== -1) return empty;
    // Prob, target'ın başından değil ilk anlamlı cümlesinden başlayabilir; uzatma
    // karşılaştırması bu yüzden target içindeki prob konumundan yürütülür.
    const probeOffset = Math.max(0, target.indexOf(probe));
    let k = 0;
    while (
      probeOffset + k < target.length &&
      first + k < joined.length &&
      joined[first + k] === target[probeOffset + k]
    ) k++;
    if (k < 40) return empty;
    matchStart = first;
    matchEnd = first + k;
  } else if (joined.indexOf(target, matchStart + 1) !== -1) {
    // Tam pasaj sayfada iki kez geçiyor — hangisinin atıf olduğu bilinemez.
    return empty;
  }

  const hits = new Set<number>();
  for (const r of ranges) {
    if (r.start < matchEnd && r.end > matchStart) hits.add(r.idx);
  }
  return hits;
}

export function SourceViewerDialog({
  source,
  onOpenChange,
  onOpenExternal,
}: {
  source: ViewerSource | null;
  onOpenChange: (open: boolean) => void;
  onOpenExternal: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spans, setSpans] = useState<SpanBox[]>([]);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [pageInfo, setPageInfo] = useState<{ page: number; total: number } | null>(null);
  const [highlighted, setHighlighted] = useState<boolean | null>(null);

  const open = !!source;

  useEffect(() => {
    if (!source?.url) return;
    let cancelled = false;
    let blobUrl: string | null = null;
    let renderTask: any = null;
    let pdf: any = null;

    setLoading(true);
    setError(null);
    setSpans([]);
    setSize(null);
    setPageInfo(null);
    setHighlighted(null);

    (async () => {
      try {
        const [pdfjs, resolved, passage] = await Promise.all([
          loadPdfjs(),
          getSourceUrl(String(source.url)),
          fetchPassageText(source),
        ]);
        if (cancelled) {
          if (resolved.isBlob) URL.revokeObjectURL(resolved.url);
          return;
        }
        if (resolved.isBlob) blobUrl = resolved.url;

        // Range çalışırsa pdf.js kendisi kullanır (proxy Range'i hedefe aynen iletiyor);
        // çalışmazsa tam indirmeye düşer — ikisi de kabul.
        // ranged=true (imzalı storage URL'i): aralıklı indirme açıkça istenir —
        // disableAutoFetch ile PDF'in tamamı ardıl olarak çekilmez, yalnız açılan
        // sayfanın dilimleri indirilir. Kitap/proxy yolunda bu ayarlar canlıda
        // doğrulanmadığı için mevcut davranış AYNEN bırakıldı.
        pdf = await pdfjs.getDocument({
          url: resolved.url,
          httpHeaders: resolved.httpHeaders,
          withCredentials: false,
          ...(resolved.ranged
            ? { disableAutoFetch: true, disableStream: false, rangeChunkSize: 65536 }
            : {}),
        }).promise;
        if (cancelled) return;

        const total: number = pdf.numPages;
        const wanted = Number.isFinite(source.page) && (source.page as number) > 0 ? (source.page as number) : 1;
        const pageNum = Math.min(Math.max(wanted, 1), total);
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const available = (containerRef.current?.clientWidth ?? 800) - 8;
        const scale = Math.max(0.5, Math.min(2, available / base.width));
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        await renderTask.promise;
        if (cancelled) return;

        const tc = await page.getTextContent();
        if (cancelled) return;
        const items: any[] = (tc.items ?? []).filter((it: any) => "str" in it);

        const hits = passage ? matchPassage(items, passage) : new Set<number>();

        // Öğe kutuları: pdf.js'in standart text-layer dönüşümü. Vurgu dikdörtgeni yazı
        // ölçümünden değil bu dönüşümden geldiği için kaymaz.
        const boxes: SpanBox[] = items.map((it: any, idx: number) => {
          const tx = pdfjs.Util.transform(viewport.transform, it.transform);
          const h = Math.hypot(tx[2], tx[3]);
          return {
            left: tx[4],
            top: tx[5] - h,
            width: (it.width ?? 0) * scale,
            height: h,
            text: String(it.str ?? ""),
            hit: hits.has(idx),
          };
        });

        setSize({ w: Math.floor(viewport.width), h: Math.floor(viewport.height) });
        setPageInfo({ page: pageNum, total });
        setSpans(boxes);
        setHighlighted(hits.size > 0);
      } catch (e: any) {
        // Proxy hataları (401/403/502) burada UnexpectedResponseError olarak gelir; ekran
        // hiçbir koşulda boş/kilitli kalmaz, "Yeni sekmede aç" yedeği footer'da durur.
        if (!cancelled) {
          const st = Number(e?.status);
          const msg =
            st === 401 || st === 403 ? "Belgeye erişim yetkisi doğrulanamadı."
            : st === 502 ? "Kaynak sunucuya ulaşılamadı."
            : e?.message || "Belge açılamadı.";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try { renderTask?.cancel?.(); } catch { /* render zaten bitmiş olabilir */ }
      try { pdf?.destroy?.(); } catch { /* yoksay */ }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [source]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base pr-6">
            {source?.title || "Kaynak"}
            {pageInfo && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                sayfa {pageInfo.page} / {pageInfo.total}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div ref={containerRef} className="flex-1 overflow-auto rounded border bg-muted/30 p-1">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Belge açılıyor…
            </div>
          )}
          {error && !loading && (
            <div className="flex items-start gap-2 p-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error} Belgeyi yeni sekmede açmayı deneyebilirsiniz.</span>
            </div>
          )}
          <div className="relative mx-auto" style={size ? { width: size.w, height: size.h } : undefined}>
            <canvas ref={canvasRef} className={loading || error ? "hidden" : "block"} />
            {!loading && !error && spans.map((sp, i) => (
              <span
                key={i}
                className={`absolute pointer-events-none ${sp.hit ? "bg-yellow-300/60 rounded-[2px]" : ""}`}
                style={{
                  left: sp.left,
                  top: sp.top,
                  width: sp.width || undefined,
                  height: sp.height,
                  fontSize: sp.height,
                  lineHeight: 1,
                  color: "transparent",
                  whiteSpace: "pre",
                  overflow: "hidden",
                }}
              >
                {sp.text}
              </span>
            ))}
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <p className="text-[11px] text-muted-foreground self-center">
            {highlighted === true && "Atıf yapılan pasaj sarı ile vurgulandı."}
            {highlighted === false && "Pasaj bu sayfada birebir eşleşmedi — vurgu yapılmadı, sayfa olduğu gibi gösteriliyor."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onOpenExternal}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Yeni sekmede aç
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
