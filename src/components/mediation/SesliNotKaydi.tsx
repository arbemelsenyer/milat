/* SESLİ NOT KAYDI — HAT H-14 kararı: B (25.08.2026)
 *
 * TEKNİK KISIT (kurucu kararı, söz değil kısıt):
 *   Ses YALNIZCA `navigator.mediaDevices.getUserMedia({ audio: true })` ile,
 *   yani CİHAZIN KENDİ MİKROFONUNDAN alınır. Bu bileşen hiçbir uzak ses
 *   akışına erişmez: WebRTC eş bağlantısı, uzak iz (`ontrack`, `getReceivers`),
 *   video sağlayıcı SDK'sı ve sekme/ekran sesi yakalama
 *   (`getDisplayMedia`) BURADA GEÇMEZ. Taraf sesinin bu yoldan kaydedilmesi
 *   teknik olarak mümkün değildir; `tests/sesli-not.test.ts` bunu denetler.
 *
 * ŞART 1: ses metne çevrildiği an sunucuda silinir (`sesli-not-dokum`).
 * ŞART 3: arabulucu, kaydı ilk kez açmadan önce tek seferlik bir onay görür.
 */
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Mic, Square } from "lucide-react";
import { KVKK_SESLI_NOT } from "@/lib/kvkk-metinleri";

/* Tek seferlik onayın izi. Cihaz başına tutulur: kaybolursa onay YENİDEN
   gösterilir — güvenli yön budur (az değil, fazla göstermek). */
const ONAY_ANAHTARI = "medipact.sesliNot.aydinlatmaOnayi.v1";

function onayVarMi(): boolean {
  try { return localStorage.getItem(ONAY_ANAHTARI) === "1"; } catch { return false; }
}
function onayYaz() {
  try { localStorage.setItem(ONAY_ANAHTARI, "1"); } catch { /* yazılamazsa yine sorulur */ }
}

export function SesliNotKaydi({
  caseId, sessionId, onMetin,
}: {
  caseId: string;
  sessionId: string | null;
  /** Çıkan metni çağırana verir; arabulucu düzeltip KENDİ onayıyla kaydeder. */
  onMetin: (metin: string) => void;
}) {
  const [onayAcik, setOnayAcik] = useState(false);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [isleniyor, setIsleniyor] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const parcalarRef = useRef<Blob[]>([]);
  const akisRef = useRef<MediaStream | null>(null);

  function mikrofonuKapat() {
    akisRef.current?.getTracks().forEach((t) => t.stop());
    akisRef.current = null;
  }

  async function kaydaBasla() {
    if (!onayVarMi()) { setOnayAcik(true); return; }
    try {
      // YALNIZ KENDİ MİKROFONU. `video: false` açıkça yazılır; ekran/sekme sesi yok.
      const akis = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      akisRef.current = akis;
      parcalarRef.current = [];
      const rec = new MediaRecorder(akis);
      rec.ondataavailable = (e) => { if (e.data.size > 0) parcalarRef.current.push(e.data); };
      rec.onstop = () => { void yukleVeDok(); };
      recorderRef.current = rec;
      rec.start();
      setKaydediyor(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Mikrofona erişilemedi",
        description: "Tarayıcı mikrofon iznini reddetti ya da cihazda mikrofon yok.",
      });
      mikrofonuKapat();
    }
  }

  function kaydiBitir() {
    recorderRef.current?.stop();
    setKaydediyor(false);
    mikrofonuKapat();
  }

  async function yukleVeDok() {
    const blob = new Blob(parcalarRef.current, { type: "audio/webm" });
    parcalarRef.current = [];
    if (blob.size === 0) return;
    setIsleniyor(true);
    try {
      const { data: kullanici } = await supabase.auth.getUser();
      const uid = kullanici?.user?.id;
      if (!uid) throw new Error("Oturum bulunamadı");

      /* Yol düzeni: <arabulucu_id>/<dosya_id>/<zaman>.webm
         Sunucu bu öneki doğruluyor; HAT H-4'ün beklediği düzen budur. */
      const yol = `${uid}/${caseId}/${Date.now()}.webm`;
      const { error: yukErr } = await supabase.storage
        .from("oturum-kayitlari").upload(yol, blob, { contentType: "audio/webm" });
      if (yukErr) throw new Error(`Ses yüklenemedi: ${yukErr.message}`);

      const { data, error } = await supabase.functions.invoke("sesli-not-dokum", {
        body: { case_id: caseId, session_id: sessionId, ses_dosya_yolu: yol },
      });
      // `invoke` işlev hatasında REDDETMEZ; `{error}` okunur (25.08 dersi).
      if (error) throw new Error(error.message);
      const d = data as { ok?: boolean; metin?: string; error?: string; uyari?: string } | null;
      if (!d?.ok) throw new Error(d?.error ?? "Sesli not metne dökülemedi");

      if (d.uyari) console.error("[SesliNotKaydi]", d.uyari);
      onMetin(String(d.metin ?? ""));
      toast({ title: "Sesli not metne döküldü", description: "Metni düzeltip kaydedebilirsiniz." });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Sesli not işlenemedi",
        description: String((e as Error)?.message ?? e).slice(0, 200),
      });
    } finally {
      setIsleniyor(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={kaydediyor ? "destructive" : "outline"}
        size="sm"
        disabled={isleniyor}
        onClick={() => (kaydediyor ? kaydiBitir() : void kaydaBasla())}
      >
        {isleniyor
          ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Metne dökülüyor…</>
          : kaydediyor
            ? <><Square className="h-4 w-4 mr-1" /> Kaydı bitir</>
            : <><Mic className="h-4 w-4 mr-1" /> Sesli not</>}
      </Button>

      {/* ŞART 3 — tek seferlik onay. Metin tek kaynaktan okunur. */}
      <Dialog open={onayAcik} onOpenChange={setOnayAcik}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{KVKK_SESLI_NOT.baslik}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-foreground/80 pt-2">
              {KVKK_SESLI_NOT.govde}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOnayAcik(false)}>Vazgeç</Button>
            <Button onClick={() => { onayYaz(); setOnayAcik(false); void kaydaBasla(); }}>
              Anladım, kaydı başlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
