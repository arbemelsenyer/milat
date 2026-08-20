/* BİLİRKİŞİ EKRANI — İKİ KADEME (komut §5)
 *
 * KADEME 1 (kabulden önce): yalnız dosya numarası · alan · görevlendirme tarihi ·
 * kapsamın tek cümlelik özeti · kendi ücreti. Taraf adları, belgeler, kalemler,
 * sohbet ve analizler GÖRÜNMEZ — çünkü sunucu onları HİÇ GÖNDERMEZ.
 * KADEME 2 (kabulden sonra): yalnız kendisine AÇILAN belgeler ve kendi raporu.
 *
 * SÜZME SORGUDA: bu ekran hiçbir şeyi gizlemez; gelmeyen veriyi çizemez.
 * Bütün okuma supabase/functions/bilirkisi-ekranim üzerinden yapılır (canlı
 * politikada `experts` tablosunu bilirkişinin kendisi okuyamaz).
 *
 * YENİ GİRİŞ SİSTEMİ KURULMADI: bilirkişi ürünün kendi giriş ekranından girer;
 * hesabı doğrulanmış e-postasıyla bilirkişi kaydına bağlanır.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, FileText, Check, X, Download, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { bilirkisiCagir } from "@/lib/bilirkisiCagri";

type Gorev = {
  oneri_id: string;
  case_id: string;
  dosya_no: string | null;
  alan: string | null;
  gorevlendirme_tarihi: string | null;
  kapsam: string;
  saatlik_ucret: number | null;
  durum: string;
};

export default function BilirkisiEkrani() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [yukleniyor, setYukleniyor] = useState(true);
  const [durum, setDurum] = useState<string | null>(null);
  const [benAd, setBenAd] = useState<string>("");
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const [acik, setAcik] = useState<Gorev | null>(null);
  const [belgeler, setBelgeler] = useState<any[]>([]);
  const [rapor, setRapor] = useState("");
  const [isleniyor, setIsleniyor] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setDurum(null);
    // Önce eşleştirme: doğrulanmış oturum e-postası ↔ bilirkişi kaydı.
    const e = await bilirkisiCagir("bilirkisi-ekranim", { adim: "eslestir" });
    if (e.hata) { setDurum(e.hata); setYukleniyor(false); return; }
    if (!e.veri?.ok) {
      setDurum(e.veri?.sebep ?? "Bu hesap bir bilirkişi kaydına bağlı değil.");
      setYukleniyor(false);
      return;
    }
    setBenAd(String(e.veri.full_name ?? ""));

    const d = await bilirkisiCagir("bilirkisi-ekranim", { adim: "dosyalarim" });
    if (d.hata) { setDurum(d.hata); setYukleniyor(false); return; }
    setGorevler((d.veri?.gorevler ?? []) as Gorev[]);
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate("/auth"); return; }
    yukle();
  }, [isLoading, user, navigate, yukle]);

  const belgeleriGetir = async (g: Gorev) => {
    setIsleniyor("belge");
    const { veri, hata } = await bilirkisiCagir("bilirkisi-ekranim", {
      adim: "belgelerim", case_id: g.case_id, alan: g.alan ?? "",
    });
    setIsleniyor(null);
    if (hata) { setDurum(hata); return; }
    setBelgeler(veri?.belgeler ?? []);
  };

  const raporuGetir = async (g: Gorev) => {
    const { veri } = await bilirkisiCagir("bilirkisi-ekranim", {
      adim: "raporum", case_id: g.case_id, alan: g.alan ?? "",
    });
    const taslak = (veri?.raporlar ?? []).find((r: any) => r.durum === "taslak");
    setRapor(taslak?.rapor_metni ?? "");
  };

  const gorevAc = async (g: Gorev) => {
    setAcik(g);
    setBelgeler([]);
    setRapor("");
    if (g.durum === "kabul") { await belgeleriGetir(g); await raporuGetir(g); }
  };

  const kararVer = async (g: Gorev, karar: "kabul" | "ret") => {
    setIsleniyor(karar);
    setDurum(null);
    const { hata } = await bilirkisiCagir("bilirkisi-ekranim", {
      adim: karar, case_id: g.case_id, alan: g.alan ?? "",
    });
    setIsleniyor(null);
    if (hata) { setDurum(hata); return; }
    setDurum(karar === "kabul"
      ? "Görevi kabul ettiniz. Size açılan belgeler aşağıda görünür."
      : "Görevi reddettiniz. Dosyaya erişiminiz açılmadı.");
    setAcik(null);
    yukle();
  };

  const belgeAc = async (documentId: string) => {
    setIsleniyor(`belge-${documentId}`);
    setDurum(null);
    const { veri, hata } = await bilirkisiCagir("bilirkisi-belge-baglantisi", { document_id: documentId });
    setIsleniyor(null);
    if (hata) { setDurum(hata); return; }
    if (veri?.url) window.open(veri.url as string, "_blank", "noopener,noreferrer");
    else setDurum("Bağlantı üretilemedi.");
  };

  const raporKaydet = async (g: Gorev, teslim: boolean) => {
    if (!rapor.trim()) { setDurum("Rapor metni boş olamaz."); return; }
    setIsleniyor("rapor");
    setDurum(null);
    const { hata } = await bilirkisiCagir("bilirkisi-ekranim", {
      adim: "rapor_kaydet", case_id: g.case_id, alan: g.alan ?? "",
      rapor_metni: rapor, durum: teslim ? "teslim" : "taslak",
    });
    setIsleniyor(null);
    if (hata) { setDurum(hata); return; }
    setDurum(teslim ? "Raporunuz teslim edildi." : "Taslak kaydedildi.");
    if (teslim) yukle();
  };

  if (isLoading || yukleniyor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container max-w-3xl py-4 px-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Bilirkişi Ekranı</h1>
            {benAd && <p className="text-xs text-muted-foreground">{benAd}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/auth"))}>
            <LogOut className="h-4 w-4 mr-1" /> Çıkış
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl py-6 px-4 space-y-4">
        {durum && <Card className="p-3"><p className="text-sm">{durum}</p></Card>}

        <Card className="p-3 bg-muted/40">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0" />
            Görevi kabul etmeden hiçbir belge açılmaz. Kabulden sonra yalnız size açılan
            belgeleri görürsünüz; tarafların diğer verilerine erişiminiz olmaz. Dosya
            kapandığında erişiminiz sona erer.
          </p>
        </Card>

        {gorevler.length === 0 && (
          <Card className="p-5 text-sm text-muted-foreground">
            Size açık bir görevlendirme yok. Hesabınız bir bilirkişi kaydına bağlı değilse
            arabulucunuzla iletişime geçin.
          </Card>
        )}

        {!acik && gorevler.map((g) => (
          <Card key={g.oneri_id} className="p-5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-medium">Dosya {g.dosya_no ?? "—"}</div>
              <Badge variant={g.durum === "kabul" ? "default" : g.durum === "ret" ? "destructive" : "outline"}>
                {g.durum === "kabul" ? "kabul edildi" : g.durum === "ret" ? "reddedildi" : "kararınız bekleniyor"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">Alan: {g.alan ?? "—"}</div>
            <Button size="sm" variant="outline" onClick={() => gorevAc(g)}>Aç</Button>
          </Card>
        ))}

        {acik && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setAcik(null)}>← Görev listesine dön</Button>

            {/* ── KADEME 1: kabulden önce yalnız beş alan ── */}
            <Card className="p-5 space-y-2">
              <h2 className="font-semibold">Görevlendirme</h2>
              <dl className="text-sm space-y-1">
                <div className="flex gap-2"><dt className="text-muted-foreground w-44">Dosya numarası</dt><dd>{acik.dosya_no ?? "—"}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-44">Alan</dt><dd>{acik.alan ?? "—"}</dd></div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-44">Görevlendirme tarihi</dt>
                  <dd>{acik.gorevlendirme_tarihi ? new Date(acik.gorevlendirme_tarihi).toLocaleDateString("tr-TR") : "—"}</dd>
                </div>
                <div className="flex gap-2"><dt className="text-muted-foreground w-44">Kapsam</dt><dd>{acik.kapsam}</dd></div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-44">Ücretiniz</dt>
                  <dd>{acik.saatlik_ucret != null ? `${Number(acik.saatlik_ucret).toLocaleString("tr-TR")} ₺/saat` : "—"}</dd>
                </div>
              </dl>

              {acik.durum === "atandi" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => kararVer(acik, "kabul")} disabled={!!isleniyor}>
                    {isleniyor === "kabul" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    <Check className="h-3 w-3 mr-1" /> Kabul
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => kararVer(acik, "ret")} disabled={!!isleniyor}>
                    {isleniyor === "ret" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    <X className="h-3 w-3 mr-1" /> Ret
                  </Button>
                </div>
              )}
            </Card>

            {/* ── KADEME 2: yalnız açılan belgeler ve kendi raporu ── */}
            {acik.durum === "kabul" && (
              <>
                <Card className="p-5 space-y-3">
                  <h2 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Size açılan belgeler
                  </h2>
                  {belgeler.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Henüz belge açılmadı. Belgeleri arabulucu onaylayınca burada görünür.
                    </p>
                  ) : belgeler.map((b) => (
                    <div key={b.document_id} className="border rounded p-3 flex items-start justify-between gap-2">
                      <div className="text-sm">
                        <div className="font-medium">{b.belge?.file_name ?? "belge"}</div>
                        {b.gerekce && <div className="text-xs text-muted-foreground">{b.gerekce}</div>}
                      </div>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => belgeAc(b.document_id)}
                        disabled={isleniyor === `belge-${b.document_id}`}
                      >
                        {isleniyor === `belge-${b.document_id}`
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Download className="h-3 w-3" />}
                        <span className="ml-1">Aç</span>
                      </Button>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">
                    Belge bağlantıları kısa ömürlüdür; süresi dolarsa "Aç" düğmesine yeniden basın.
                  </p>
                </Card>

                <Card className="p-5 space-y-3">
                  <h2 className="font-semibold">Raporunuz</h2>
                  <Label className="text-xs text-muted-foreground">
                    Raporu siz yazarsınız; sistem sizin adınıza rapor üretmez.
                  </Label>
                  <Textarea rows={10} value={rapor} onChange={(e) => setRapor(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => raporKaydet(acik, false)} disabled={!!isleniyor}>
                      Taslağı kaydet
                    </Button>
                    <Button size="sm" onClick={() => raporKaydet(acik, true)} disabled={!!isleniyor}>
                      {isleniyor === "rapor" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Raporu teslim et
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
