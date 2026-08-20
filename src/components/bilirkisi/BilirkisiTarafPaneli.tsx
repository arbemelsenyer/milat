/* BİLİRKİŞİ — TARAF PANELİ (beyan · aday işaretleme · dış aday · rapor)
 *
 * Mevcut "Bilirkişi Onayı" sekmesindeki hiçbir kart, düğme ya da bölüm
 * KALDIRILMADI; bu panel o sekmenin ÜSTÜNE eklenir.
 *
 * KÖR PERDE (constitution m.1): taraf karşı tarafın yanıtını görmez. Süzme
 * SUNUCUDA, sorguda yapılır (supabase/functions/bilirkisi-secim · adim="liste").
 * Bu dosya hiçbir şeyi "gizlemez" — zaten gelmeyen veriyi çizemez.
 *
 * UZMAN PROFİLİ NEDEN SUNUCUDAN GELİR: canlı politikada `experts` tablosunu
 * yalnız yönetici ve görevli arabulucu okuyabilir; taraf okuyamaz. Profil
 * kartları bu yüzden edge fonksiyonun döndürdüğü alanlardan çizilir.
 */
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Award, Loader2, ShieldCheck, MapPin, Star, FileText, UserPlus } from "lucide-react";
import { bilirkisiCagir, siraEtiketiCoz, siraEtiketiKur } from "@/lib/bilirkisiCagri";

type Yontem = "taraflar" | "arabulucu" | "sistem_oneri";

const YONTEM_METNI: Record<Yontem, string> = {
  taraflar: "Biz seçelim",
  arabulucu: "Arabulucu seçsin",
  sistem_oneri: "Sistem önersin, arabulucu onaylasın",
};

export function BilirkisiTarafPaneli({ caseId }: { caseId: string }) {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [durumSatiri, setDurumSatiri] = useState<string | null>(null);

  // §1 — beyan
  const [beyan, setBeyan] = useState<any>(null);
  const [yontem, setYontem] = useState<Yontem>("taraflar");
  const [tikanma, setTikanma] = useState(true);
  const [masraf, setMasraf] = useState(false);
  const [beyanIsleniyor, setBeyanIsleniyor] = useState(false);

  // §3 — adaylar ve kendi yanıtlarım
  const [oneriler, setOneriler] = useState<any[]>([]);
  const [yanitlar, setYanitlar] = useState<any[]>([]);
  const [karsiTarafGorunur, setKarsiTarafGorunur] = useState(false);
  const [benimPartyId, setBenimPartyId] = useState<string | null>(null);
  const [taslak, setTaslak] = useState<Record<string, { yanit: string; not: string; sira: string; izin: boolean }>>({});
  const [isleniyor, setIsleniyor] = useState<string | null>(null);

  // §6 — dış aday
  const [disAlan, setDisAlan] = useState("");
  const [disAd, setDisAd] = useState("");
  const [disIletisim, setDisIletisim] = useState("");

  // §7 — raporlar
  const [raporlar, setRaporlar] = useState<any[]>([]);
  const [yorum, setYorum] = useState("");

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);

    const b = await bilirkisiCagir("bilirkisi-secim", { case_id: caseId, adim: "beyanim" });
    if (b.hata) setHata(b.hata);
    else if (b.veri?.beyan) {
      setBeyan(b.veri.beyan);
      setYontem(b.veri.beyan.secim_yontemi as Yontem);
      setTikanma(!!b.veri.beyan.tikanma_halinde_arabulucu);
      setMasraf(!!b.veri.beyan.masraf_kabul);
    } else setBeyan(null);

    const l = await bilirkisiCagir("bilirkisi-secim", { case_id: caseId, adim: "liste" });
    if (l.hata) setHata((h) => h ?? l.hata);
    else {
      setOneriler(l.veri?.oneriler ?? []);
      setYanitlar(l.veri?.yanitlar ?? []);
      setKarsiTarafGorunur(!!l.veri?.karsi_taraf_gorunur);
      setBenimPartyId(l.veri?.party_id ?? null);
    }

    const r = await bilirkisiCagir("bilirkisi-secim", { case_id: caseId, adim: "raporlar" });
    if (!r.hata) setRaporlar(r.veri?.raporlar ?? []);

    setYukleniyor(false);
  }, [caseId]);

  useEffect(() => { yukle(); }, [yukle]);

  const beyaniKaydet = async () => {
    setBeyanIsleniyor(true);
    setDurumSatiri(null);
    const { hata: h } = await bilirkisiCagir("bilirkisi-secim", {
      case_id: caseId, adim: "beyan_yaz",
      secim_yontemi: yontem, tikanma_halinde_arabulucu: tikanma, masraf_kabul: masraf,
    });
    setBeyanIsleniyor(false);
    if (h) { setDurumSatiri(h); return; }
    setDurumSatiri("Beyanınız kaydedildi.");
    yukle();
  };

  const yanitKaydet = async (oneri: any) => {
    const t = taslak[oneri.id];
    if (!t?.yanit) { setDurumSatiri("Önce kabul / çekimser / ret işaretleyin."); return; }
    setIsleniyor(oneri.id);
    setDurumSatiri(null);
    const siraSayi = t.sira ? Number(t.sira) : null;
    const { hata: h } = await bilirkisiCagir("bilirkisi-secim", {
      case_id: caseId, adim: "yanit_yaz",
      expert_id: oneri.expert_id, alan: oneri.alan ?? "",
      yanit: t.yanit,
      not_metni: siraEtiketiKur(Number.isFinite(siraSayi as number) ? siraSayi : null, t.not ?? ""),
      gosterim_izni: !!t.izin,
    });
    setIsleniyor(null);
    if (h) { setDurumSatiri(h); return; }
    setDurumSatiri("İşaretlemeniz kaydedildi.");
    yukle();
  };

  const disAdayGonder = async () => {
    if (!disAd.trim()) { setDurumSatiri("Ad soyad yazmadan gönderilemez."); return; }
    setIsleniyor("dis");
    const { hata: h } = await bilirkisiCagir("bilirkisi-secim", {
      case_id: caseId, adim: "dis_aday",
      alan: disAlan, ad_soyad: disAd, iletisim: disIletisim,
    });
    setIsleniyor(null);
    if (h) { setDurumSatiri(h); return; }
    setDurumSatiri("Öneriniz arabulucuya iletildi. Listeye eklenmesi arabulucunun onayına bağlıdır.");
    setDisAd(""); setDisIletisim(""); setDisAlan("");
  };

  const yorumGonder = async () => {
    if (!yorum.trim()) { setDurumSatiri("Yazacak bir şeyiniz yoksa boş bırakabilirsiniz."); return; }
    setIsleniyor("yorum");
    const { hata: h } = await bilirkisiCagir("bilirkisi-secim", {
      case_id: caseId, adim: "rapor_yorumu", yorum,
    });
    setIsleniyor(null);
    if (h) { setDurumSatiri(h); return; }
    setDurumSatiri("Görüşünüz dosyaya işlendi.");
    setYorum("");
  };

  const alanlar = Array.from(new Set(oneriler.map((o) => String(o.alan ?? "")))).sort();
  const kendiYaniti = (expertId: string) =>
    yanitlar.find((y) => String(y.expert_id) === String(expertId) && String(y.party_id) === String(benimPartyId));

  if (yukleniyor) {
    return (
      <Card className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Bilirkişi bölümü yükleniyor...
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sonuç TOAST'a bırakılmaz: kalıcı durum satırı (lessons.md · 13.08). */}
      {hata && (
        <Card className="p-3 border-destructive/50">
          <p className="text-sm text-destructive">{hata}</p>
        </Card>
      )}
      {durumSatiri && (
        <Card className="p-3">
          <p className="text-sm">{durumSatiri}</p>
        </Card>
      )}

      {/* ─────────────────────────── §1 BEYAN ─────────────────────────── */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Bilirkişi gerekirse seçimi kim yapsın?
        </h3>
        {/* Komutun istediği tek satır açıklama — aynen. */}
        <p className="text-xs text-muted-foreground">
          Karşı taraf kendisi seçmek isterse liste size de gelir; dilerseniz seçimi
          arabulucuya bırakabilirsiniz.
        </p>

        <RadioGroup value={yontem} onValueChange={(v) => setYontem(v as Yontem)} className="space-y-2">
          {(Object.keys(YONTEM_METNI) as Yontem[]).map((y) => (
            <div key={y} className="flex items-center gap-2">
              <RadioGroupItem value={y} id={`yontem-${y}`} />
              <Label htmlFor={`yontem-${y}`} className="text-sm font-normal cursor-pointer">
                {YONTEM_METNI[y]}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="tikanma" className="text-sm font-normal">
            Kendiniz seçip anlaşamazsanız arabulucu belirlesin mi?
          </Label>
          <Switch id="tikanma" checked={tikanma} onCheckedChange={setTikanma} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="masraf" className="text-sm font-normal">
            Bilirkişi ücretinin taraflara ait olduğunu kabul ediyor musunuz?
          </Label>
          <Switch id="masraf" checked={masraf} onCheckedChange={setMasraf} />
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={beyaniKaydet} disabled={beyanIsleniyor}>
            {beyanIsleniyor && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {beyan ? "Beyanımı güncelle" : "Beyanımı kaydet"}
          </Button>
          {beyan && (
            <span className="text-xs text-muted-foreground">
              Kayıtlı beyanınız: {YONTEM_METNI[beyan.secim_yontemi as Yontem] ?? beyan.secim_yontemi}
            </span>
          )}
        </div>
      </Card>

      {/* ───────────────────── §3 ADAYLAR VE İŞARETLEME ───────────────────── */}
      {alanlar.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">
          Henüz size sunulmuş aday listesi yok.
        </Card>
      ) : (
        alanlar.map((alan) => (
          <Card key={alan} className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold">Alan: {alan || "belirtilmedi"}</h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                {karsiTarafGorunur
                  ? "İki taraf da izin verdiği için karşılıklı işaretlemeler görünüyor."
                  : "Karşı tarafın işaretlemesini göremezsiniz; sizinki de izin vermedikçe ona açılmaz."}
              </span>
            </div>

            {oneriler.filter((o) => String(o.alan ?? "") === alan).map((o) => {
              const p = o.profil ?? {};
              const mevcut = kendiYaniti(o.expert_id);
              const cozulmus = siraEtiketiCoz(mevcut?.not_metni);
              const t = taslak[o.id] ?? {
                yanit: mevcut?.yanit ?? "",
                not: cozulmus.metin,
                sira: cozulmus.sira ? String(cozulmus.sira) : "",
                izin: !!mevcut?.gosterim_izni,
              };
              const guncelle = (yeni: Partial<typeof t>) =>
                setTaslak((eski) => ({ ...eski, [o.id]: { ...t, ...yeni } }));

              return (
                <div key={o.id} className="border rounded-lg p-4 space-y-3">
                  {/* PROFİL KARTI */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-medium">{p.full_name ?? "Uzman kaydı okunamadı"}</div>
                      <div className="text-xs text-muted-foreground">{p.title ?? ""}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {o.arabulucu_secimi && <Badge variant="secondary" className="text-[10px]">arabulucunun önerisi</Badge>}
                      {o.oneren === "taraf_ajani" && !o.arabulucu_secimi && (
                        <Badge variant="outline" className="text-[10px]">taraf önerisi</Badge>
                      )}
                      {mevcut && <Badge className="text-[10px]">işaretlediniz: {mevcut.yanit}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{p.specialization ?? "—"}</Badge>
                    <span className="text-muted-foreground">alt alan: {p.niche_area ?? "—"}</span>
                    <span className="text-muted-foreground">{p.years_experience ?? "—"} yıl</span>
                    {p.city && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {p.city}
                      </span>
                    )}
                    {p.rating != null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {p.rating}
                      </span>
                    )}
                    {p.hourly_rate != null && (
                      <span className="ml-auto font-medium">
                        {Number(p.hourly_rate).toLocaleString("tr-TR")} ₺/saat
                      </span>
                    )}
                  </div>
                  {p.bio && <p className="text-sm text-muted-foreground">{p.bio}</p>}
                  {o.eslesme_gerekcesi && (
                    <p className="text-xs bg-muted rounded p-2">{o.eslesme_gerekcesi}</p>
                  )}

                  {/* İŞARETLEME */}
                  <div className="flex flex-wrap items-center gap-2">
                    {["kabul", "cekimser", "ret"].map((y) => (
                      <Button
                        key={y}
                        size="sm"
                        variant={t.yanit === y ? "default" : "outline"}
                        onClick={() => guncelle({ yanit: y })}
                      >
                        {y === "kabul" ? "Kabul" : y === "ret" ? "Ret" : "Çekimser"}
                      </Button>
                    ))}
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">Tercih sıram</Label>
                      <Input
                        className="w-16 h-8"
                        inputMode="numeric"
                        value={t.sira}
                        onChange={(e) => guncelle({ sira: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                      />
                    </div>
                  </div>
                  <Textarea
                    className="text-sm"
                    rows={2}
                    placeholder="Eklemek istediğiniz not (isteğe bağlı)"
                    value={t.not}
                    onChange={(e) => guncelle({ not: e.target.value })}
                  />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`izin-${o.id}`}
                        checked={t.izin}
                        onCheckedChange={(v) => guncelle({ izin: v })}
                      />
                      <Label htmlFor={`izin-${o.id}`} className="text-xs font-normal">
                        Seçimim karşı tarafa gösterilsin
                      </Label>
                    </div>
                    <Button size="sm" onClick={() => yanitKaydet(o)} disabled={isleniyor === o.id}>
                      {isleniyor === o.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Kaydet
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        ))
      )}

      {/* ─────────────────────────── §6 DIŞ ADAY ─────────────────────────── */}
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Dışarıdan bir isim önermek isterseniz
        </h3>
        <p className="text-xs text-muted-foreground">
          Bu alanda kayıtlı uzman yoksa ad-soyad ve iletişim yazabilirsiniz; iletişimi biz
          kurarız. Önerdiğiniz kişi arabulucunun onayı olmadan listeye eklenmez.
        </p>
        <Input placeholder="Alan (ör. hesap, tıbbi)" value={disAlan} onChange={(e) => setDisAlan(e.target.value)} />
        <Input placeholder="Ad soyad" value={disAd} onChange={(e) => setDisAd(e.target.value)} />
        <Input placeholder="İletişim (telefon veya e-posta)" value={disIletisim} onChange={(e) => setDisIletisim(e.target.value)} />
        <Button size="sm" variant="outline" onClick={disAdayGonder} disabled={isleniyor === "dis"}>
          {isleniyor === "dis" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Arabulucuya ilet
        </Button>
      </Card>

      {/* ───────────────────────── §7 RAPOR VE GÖRÜŞÜM ───────────────────── */}
      {raporlar.length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Bilirkişi raporu
          </h3>
          {raporlar.map((r) => (
            <div key={r.id} className="border rounded p-3 space-y-1">
              <div className="text-sm font-medium">
                {r.uzman?.full_name ?? "Bilirkişi"} {r.alan ? `· ${r.alan}` : ""}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Teslim: {r.teslim_zamani ? new Date(r.teslim_zamani).toLocaleString("tr-TR") : "—"}
              </div>
              {r.rapor_metni
                ? <p className="text-sm whitespace-pre-wrap">{r.rapor_metni}</p>
                : <p className="text-sm text-muted-foreground">Rapor dosya olarak yüklendi.</p>}
            </div>
          ))}
          <Label className="text-sm">Rapor hakkında diyeceğiniz var mı?</Label>
          <Textarea rows={3} value={yorum} onChange={(e) => setYorum(e.target.value)} />
          <Button size="sm" onClick={yorumGonder} disabled={isleniyor === "yorum"}>
            {isleniyor === "yorum" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Görüşümü dosyaya işle
          </Button>
        </Card>
      )}
    </div>
  );
}
