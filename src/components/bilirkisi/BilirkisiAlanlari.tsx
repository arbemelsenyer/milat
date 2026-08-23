/* BİLİRKİŞİ — ARABULUCU PANELİ (alan satırları · aday · yanıt · atama · evrak)
 *
 * Mevcut Bilirkişi sekmesindeki ExpertSelector, "Önerilen / Atanan Bilirkişiler"
 * kartı ve denetim izi KALDIRILMADI; bu panel onların ÜSTÜNE eklenir.
 *
 * İNSAN KAPILARI (constitution m.3): ATAMA ve EVRAK KÜMESİ ONAYI buradadır.
 * Ajan aday çıkarır, gerekçe yazar, evrak önerir — kararı arabulucu verir.
 * Sunucu tarafında da aynı sınır vardır: 'ata' ve 'evrak_onayla' adımları
 * yalnız arabulucunun oturumuyla çalışır.
 */
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Award, Loader2, MapPin, Star, FileText, Repeat, AlertTriangle, Mail, ShieldCheck,
} from "lucide-react";
import { bilirkisiCagir, siraEtiketiCoz } from "@/lib/bilirkisiCagri";

const YONTEM_METNI: Record<string, string> = {
  taraflar: "biz seçelim",
  arabulucu: "arabulucu seçsin",
  sistem_oneri: "sistem önersin, arabulucu onaylasın",
};

export function BilirkisiAlanlari({ caseId }: { caseId: string }) {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [durum, setDurum] = useState<string | null>(null);
  const [isleniyor, setIsleniyor] = useState<string | null>(null);

  const [beyanlar, setBeyanlar] = useState<any[]>([]);
  const [oneriler, setOneriler] = useState<any[]>([]);
  const [yanitlar, setYanitlar] = useState<any[]>([]);
  const [atamalar, setAtamalar] = useState<any[]>([]);
  const [evrak, setEvrak] = useState<any[]>([]);
  const [raporlar, setRaporlar] = useState<any[]>([]);

  const [yeniAlan, setYeniAlan] = useState("");
  const [onerilenler, setOnerilenler] = useState<{ alan: string; liste: any[] } | null>(null);
  const [secilenEvrak, setSecilenEvrak] = useState<Record<string, boolean>>({});

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const [b, l, e, r] = await Promise.all([
      bilirkisiCagir("bilirkisi-secim", { case_id: caseId, adim: "beyanlar" }),
      bilirkisiCagir("bilirkisi-secim", { case_id: caseId, adim: "liste" }),
      bilirkisiCagir("bilirkisi-secim", { case_id: caseId, adim: "evrak_listesi" }),
      bilirkisiCagir("bilirkisi-secim", { case_id: caseId, adim: "raporlar" }),
    ]);
    const ilkHata = b.hata ?? l.hata ?? e.hata ?? r.hata;
    if (ilkHata) setDurum(ilkHata);
    setBeyanlar(b.veri?.taraflar ?? []);
    setOneriler(l.veri?.oneriler ?? []);
    setYanitlar(l.veri?.yanitlar ?? []);
    setAtamalar(l.veri?.atamalar ?? []);
    setEvrak(e.veri?.kume ?? []);
    setRaporlar(r.veri?.raporlar ?? []);
    setYukleniyor(false);
  }, [caseId]);

  useEffect(() => { yukle(); }, [yukle]);

  const cagir = async (govde: Record<string, unknown>, anahtar: string, basariMetni: string) => {
    setIsleniyor(anahtar);
    setDurum(null);
    const { veri, hata } = await bilirkisiCagir("bilirkisi-secim", { case_id: caseId, ...govde });
    setIsleniyor(null);
    if (hata) { setDurum(hata); return null; }
    setDurum(basariMetni);
    await yukle();
    return veri;
  };

  const adayCikar = async (alan: string, ikinciTur = false) => {
    if (!alan.trim()) { setDurum("Önce alan adı yazın (ör. hesap, tıbbi, sigorta/rücu)."); return; }
    const veri = await cagir(
      { adim: ikinciTur ? "ikinci_tur" : "aday_cikar", alan: alan.trim() },
      `aday-${alan}`,
      ikinciTur ? "Yeniden öneri hazırlandı." : "Adaylar çıkarıldı.",
    );
    if (veri?.bulunamadi) {
      setDurum(veri?.sebep
        ?? `"${alan}" alanında uygun aday bulunamadı — uydurma isim üretilmedi.`);
    }
    setYeniAlan("");
  };

  const adayOner = async (alan: string) => {
    if (!alan.trim()) { setDurum("Önce alan adı yazın."); return; }
    setIsleniyor(`oner-${alan}`);
    setDurum(null);
    const { veri, hata } = await bilirkisiCagir("bilirkisi-secim", {
      case_id: caseId, adim: "aday_oner", alan: alan.trim(),
    });
    setIsleniyor(null);
    if (hata) { setDurum(hata); return; }
    setOnerilenler({ alan: alan.trim(), liste: veri?.adaylar ?? [] });
    if (!veri?.adaylar?.length) setDurum(`"${alan}" alanında örtüşen uzman bulamadım.`);
  };

  const daveteGonder = async (expertId: string, alan: string) => {
    setIsleniyor(`davet-${expertId}`);
    setDurum(null);
    const { veri, hata } = await bilirkisiCagir("bilirkisi-davet", {
      case_id: caseId, expert_id: expertId, alan, app_url: window.location.origin,
    });
    setIsleniyor(null);
    if (hata) { setDurum(hata); return; }
    setDurum(`Davet işlendi — e-posta: ${veri?.eposta_durumu ?? "?"} · bağlantı: ${veri?.davet_adresi ?? "?"}`);
  };

  const alanlar = Array.from(new Set(oneriler.map((o) => String(o.alan ?? "")))).sort();
  const alanYanitlari = (alan: string, expertId: string) =>
    yanitlar.filter((y) => String(y.expert_id) === String(expertId)
      && (!y.alan || String(y.alan) === alan));
  const atanmis = (expertId: string) => atamalar.some((a) => String(a.expert_id) === String(expertId));

  const bekleyenEvrak = evrak.filter((k) => !k.onaylandi);
  const acikEvrak = evrak.filter((k) => k.onaylandi);

  /* Yalnız usul satırı + alan gider; sunucu tarafında da böyle yazılır. */
  const disUzmanGundemi = async (alan: string) => {
    if (!alan.trim()) { setDurum("Önce alan adı yazın."); return; }
    setIsleniyor(`dis-${alan}`);
    const { hata } = await bilirkisiCagir("bilirkisi-secim", {
      case_id: caseId, adim: "dis_uzman_gundem", alan,
    });
    setIsleniyor(null);
    if (hata) { setDurum(hata); return; }
    setDurum("Taraf ajanlarına yalnız usul bilgisi ve uzmanlık alanı iletildi.");
  };

  if (yukleniyor) {
    return (
      <Card className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Bilirkişi akışı yükleniyor...
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {durum && <Card className="p-3"><p className="text-sm">{durum}</p></Card>}

      {/* ── §1 BEYAN DÖKÜMÜ (yalnız arabulucuda) ── */}
      <Card className="p-5 space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Tarafların seçim beyanı
        </h3>
        {beyanlar.length === 0 ? (
          <p className="text-sm text-muted-foreground">Taraf kaydı okunamadı.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {beyanlar.map((t) => (
              <li key={t.party_id} className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">Taraf {t.party_role ?? ""}:</span>
                {t.beyan ? (
                  <>
                    <Badge variant="secondary" className="text-[10px]">
                      {YONTEM_METNI[t.beyan.secim_yontemi] ?? t.beyan.secim_yontemi}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      tıkanmada arabulucu: {t.beyan.tikanma_halinde_arabulucu ? "evet" : "hayır"} ·
                      masraf kabulü: {t.beyan.masraf_kabul ? "evet" : "hayır"}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">beyan henüz verilmedi</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── §2 ALAN SATIRI AÇMA ── */}
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Alan satırı ekle
        </h3>
        <p className="text-xs text-muted-foreground">
          İhtiyaç duyduğunuz her alan için ayrı satır açın (ör. hesap, tıbbi, sigorta/rücu).
          Her satırın kendi adayları, kendi yanıtları ve kendi ataması olur.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Input
            className="max-w-xs"
            placeholder="Alan adı"
            value={yeniAlan}
            onChange={(e) => setYeniAlan(e.target.value)}
          />
          <Button size="sm" onClick={() => adayCikar(yeniAlan)} disabled={!!isleniyor}>
            {isleniyor === `aday-${yeniAlan}` && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Aday çıkar ve satırı aç
          </Button>
          <Button size="sm" variant="outline" onClick={() => adayOner(yeniAlan)} disabled={!!isleniyor}>
            {isleniyor === `oner-${yeniAlan}` && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Önce bana öner (yazmadan)
          </Button>
          {/* DIŞARIDAN UZMAN GÜNDEMİ (21.08): karşı tarafın ajanına YALNIZ tek satır
              usul bilgisi ve uzmanlık ALANI gider. Kişi adı, yazdığınız metin ve
              dosya içeriği geçmez. Seçim ortak iradeye bağlıdır. */}
          <Button size="sm" variant="outline" onClick={() => disUzmanGundemi(yeniAlan)} disabled={!!isleniyor}>
            {isleniyor === `dis-${yeniAlan}` && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Dışarıdan uzman gündeme gelsin
          </Button>
        </div>

        {onerilenler && (
          <div className="space-y-2 border rounded p-3">
            <div className="text-sm font-medium">"{onerilenler.alan}" için öneriler</div>
            {onerilenler.liste.length === 0 ? (
              <p className="text-xs text-muted-foreground">Örtüşen uzman bulunamadı.</p>
            ) : onerilenler.liste.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-2 border-b pb-2">
                <div className="text-sm">
                  <div className="font-medium">{a.full_name}</div>
                  <div className="text-xs text-muted-foreground">{a.eslesme_gerekcesi}</div>
                </div>
                <Button
                  size="sm" variant="outline"
                  disabled={!!isleniyor}
                  onClick={() => cagir(
                    { adim: "arabulucu_ekle", alan: onerilenler.alan, expert_id: a.id },
                    `ekle-${a.id}`, "Aday alan satırına eklendi (arabulucunun önerisi).",
                  )}
                >
                  Alan satırına ekle
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── §2/§3/§4 ALAN SATIRLARI ── */}
      {alanlar.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">Henüz alan satırı açılmadı.</Card>
      ) : alanlar.map((alan) => (
        <Card key={alan} className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold">Alan: {alan || "belirtilmedi"}</h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm" variant="outline" disabled={!!isleniyor}
                onClick={() => cagir({ adim: "ilerlet", alan }, `sun-${alan}`, "Taraflara sunuldu.")}
              >
                Taraflara sun
              </Button>
              {/* 23.08 kurucu kararı: aynı işi yapan metin üründe TEKtir.
                  Eski ad "İkinci tur" idi; çağrılan adım (ikinci_tur) DEĞİŞMEDİ. */}
              <Button size="sm" variant="outline" disabled={!!isleniyor} onClick={() => adayCikar(alan, true)}>
                <Repeat className="h-3 w-3 mr-1" /> Yeniden öner
              </Button>
              <Button
                size="sm" variant="outline" disabled={!!isleniyor}
                onClick={() => cagir({ adim: "tikanma", alan }, `tik-${alan}`, "Tıkanma bildirildi.")}
              >
                <AlertTriangle className="h-3 w-3 mr-1" /> Tıkandı
              </Button>
            </div>
          </div>

          {oneriler.filter((o) => String(o.alan ?? "") === alan).map((o) => {
            const p = o.profil ?? {};
            const cevaplar = alanYanitlari(alan, o.expert_id);
            return (
              <div key={o.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-medium">{p.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.title ?? ""}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Badge variant="outline" className="text-[10px]">{o.durum}</Badge>
                    {o.arabulucu_secimi && <Badge variant="secondary" className="text-[10px]">arabulucunun önerisi</Badge>}
                    {o.oneren === "taraf_ajani" && <Badge variant="outline" className="text-[10px]">taraf önerisi</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{p.specialization ?? "—"}</Badge>
                  <span className="text-muted-foreground">alt alan: {p.niche_area ?? "—"}</span>
                  <span className="text-muted-foreground">{p.years_experience ?? "—"} yıl</span>
                  {p.city && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{p.city}</span>}
                  {p.rating != null && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500 fill-amber-500" />{p.rating}</span>}
                  {p.hourly_rate != null && (
                    <span className="ml-auto font-medium">{Number(p.hourly_rate).toLocaleString("tr-TR")} ₺/saat</span>
                  )}
                </div>
                {o.eslesme_gerekcesi && <p className="text-xs bg-muted rounded p-2">{o.eslesme_gerekcesi}</p>}

                {/* Taraf yanıtları — kararı verecek olan arabulucu görür. */}
                <div className="text-xs space-y-1">
                  {cevaplar.length === 0 ? (
                    <span className="text-muted-foreground">Taraflardan yanıt gelmedi.</span>
                  ) : cevaplar.map((c) => {
                    const cozulmus = siraEtiketiCoz(c.not_metni);
                    return (
                      <div key={c.id} className="flex items-start gap-2 flex-wrap">
                        <Badge
                          variant={c.yanit === "kabul" ? "default" : c.yanit === "ret" ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          {c.yanit}
                        </Badge>
                        {cozulmus.sira != null && <span className="text-muted-foreground">tercih sırası {cozulmus.sira}</span>}
                        {cozulmus.metin && <span className="text-muted-foreground">"{cozulmus.metin}"</span>}
                        {c.gosterim_izni && <span className="text-muted-foreground">· karşı tarafa gösterime izinli</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 flex-wrap pt-1">
                  {/* İNSAN KAPISI: atamayı arabulucu yapar. */}
                  <Button
                    size="sm"
                    disabled={!!isleniyor || o.durum === "atandi" || atanmis(o.expert_id)}
                    onClick={() => cagir(
                      { adim: "ata", alan, expert_id: o.expert_id },
                      `ata-${o.id}`, "Atama yazıldı; bilirkişinin kabulü bekleniyor.",
                    )}
                  >
                    {isleniyor === `ata-${o.id}` && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    {o.durum === "atandi" || atanmis(o.expert_id) ? "Atandı" : "Ata"}
                  </Button>
                  {(o.durum === "atandi" || atanmis(o.expert_id)) && (
                    <>
                      <Button
                        size="sm" variant="outline" disabled={!!isleniyor}
                        onClick={() => daveteGonder(o.expert_id, alan)}
                      >
                        <Mail className="h-3 w-3 mr-1" /> Daveti gönder
                      </Button>
                      <Button
                        size="sm" variant="outline" disabled={!!isleniyor}
                        onClick={() => cagir(
                          { adim: "evrak_oner", alan, expert_id: o.expert_id },
                          `evrak-${o.id}`, "Evrak kümesi önerisi hazırlandı; onayınızı bekliyor.",
                        )}
                      >
                        <FileText className="h-3 w-3 mr-1" /> Evrak kümesi hazırla
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      ))}

      {/* ── §6 EVRAK KÜMESİ ONAYI — İNSAN KAPISI ── */}
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" /> Bilirkişiye açılacak belgeler
        </h3>
        <p className="text-xs text-muted-foreground">
          Siz onaylamadan hiçbir belge açılmaz. Tarafların verisi dosya dışına çıktığı için
          bu bir insan kapısıdır.
        </p>
        {bekleyenEvrak.length === 0 ? (
          <p className="text-sm text-muted-foreground">Onay bekleyen belge yok.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {bekleyenEvrak.map((k) => (
                <li key={k.id} className="flex items-start gap-2 border rounded p-2">
                  <Checkbox
                    checked={!!secilenEvrak[k.id]}
                    onCheckedChange={(v) => setSecilenEvrak((e) => ({ ...e, [k.id]: v === true }))}
                  />
                  <div className="text-sm">
                    <div className="font-medium">{k.belge?.file_name ?? "belge adı okunamadı"}</div>
                    <div className="text-xs text-muted-foreground">{k.gerekce}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              disabled={!!isleniyor || Object.values(secilenEvrak).every((v) => !v)}
              onClick={() => cagir(
                { adim: "evrak_onayla", ids: Object.keys(secilenEvrak).filter((id) => secilenEvrak[id]) },
                "evrak-onay", "Seçtiğiniz belgeler bilirkişiye açıldı; taraflara bilgi düştü.",
              )}
            >
              {isleniyor === "evrak-onay" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Seçilenleri onayla ve aç
            </Button>
          </>
        )}
        {acikEvrak.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Açık belgeler: {acikEvrak.map((k) => k.belge?.file_name ?? "—").join(" · ")}
          </div>
        )}
      </Card>

      {/* ── §7 RAPORLAR ── */}
      {raporlar.length > 0 && (
        <Card className="p-5 space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Teslim edilen raporlar
          </h3>
          {raporlar.map((r) => (
            <div key={r.id} className="border rounded p-3 space-y-1">
              <div className="text-sm font-medium">
                {r.uzman?.full_name ?? "Bilirkişi"} {r.alan ? `· ${r.alan}` : ""}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Teslim: {r.teslim_zamani ? new Date(r.teslim_zamani).toLocaleString("tr-TR") : "—"}
              </div>
              {r.rapor_metni && <p className="text-sm whitespace-pre-wrap">{r.rapor_metni}</p>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
