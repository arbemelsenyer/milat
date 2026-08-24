/* ISLAK İMZA KAPISI — HAT H-2, kurucu kararı A (24.08.2026)

   SORUN: `agreement_documents.signed_by` sütunu hiçbir yüzeyden yazılmıyordu.
   Şema ve tetikleyici hazırdı (`akis_olay_yaz`: signed_by değişince
   `anlasma_belgesi_imzalandi` olayı doğar) ama imza yüzeyi olmadığı için o olay
   HİÇ doğmuyordu; anlaşma belgesinin imzalandığı sistemde hiçbir yerde kayıtlı
   olmuyordu.

   KARAR (A): ıslak imza. Arabulucu, tarafların ıslak imzaladığı belgeyi tarayıp
   yükler; sistem kimin imzaladığını ve tarihi işaretler. Uygulama içi tıklama
   (B) ve nitelikli e-imza (C) reddedildi: B'nin hukuki değeri tartışmalı, C
   pilot sonrası kalemi.

   YETKİ SINIRI (kararın şartı): `signed_by` YALNIZ arabulucunun kendi
   oturumuyla yazılır. Bu kapı burada mimariyle tutulur — yazma, kullanıcının
   kendi JWT'siyle giden istemci sorgusudur ve `agreement_documents` üzerindeki
   "Mediator manages agreement docs" politikası (`is_case_mediator`) süzer.
   Hiçbir edge function / cron yolu bu sütuna dokunmaz; servis rolü RLS'i aşar,
   o yüzden imza akışı bilinçli olarak sunucuya taşınmadı. İmza, ürünün beş
   insan kapısından biridir (constitution m.3 · m.5).

   KÖR VERİ NOTU: imzalı tarama `case-documents` kovasına arabulucunun klasörüne
   yazılır (`<uid>/<case_id>/…`); kovanın okuma politikası gereği taraf onu
   göremez, arabulucu görür. Taraf yalnız `agreement_documents` satırındaki
   "imzalandı" bilgisini görür (m.1). */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, PenLine, CheckCircle2, AlertTriangle, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  caseRow: any;
  /** İmza işlendikten sonra üst ekranın tazelenmesi için. */
  onSigned?: () => void;
}

type Taraf = { id: string; ad: string; rol: string };

type BelgeSatiri = {
  id: string;
  created_at: string;
  file_path: string | null;
  signed_by: string[];
  metadata: any;
};

/** Taraf adı: ürünün başka yerlerindeki sırayla aynı. */
function tarafAdi(row: any): string {
  const ad = [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim();
  return (
    row?.full_name ||
    (ad.length > 0 ? ad : "") ||
    row?.company_name ||
    row?.email ||
    "İsimsiz taraf"
  );
}

export function AnlasmaImzaPaneli({ caseRow, onSigned }: Props) {
  const [belge, setBelge] = useState<BelgeSatiri | null>(null);
  const [taraflar, setTaraflar] = useState<Taraf[]>([]);
  const [secili, setSecili] = useState<Record<string, boolean>>({});
  const [dosya, setDosya] = useState<File | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [okuyor, setOkuyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const imzali = (belge?.signed_by?.length ?? 0) > 0;

  async function yukle() {
    if (!caseRow?.id) return;
    setOkuyor(true);
    setHata(null);
    try {
      const [{ data: belgeler }, { data: partiler }] = await Promise.all([
        supabase
          .from("agreement_documents")
          .select("id, created_at, file_path, signed_by, metadata")
          .eq("case_id", caseRow.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("case_parties")
          .select("id, full_name, first_name, last_name, company_name, email, party_role, role")
          .eq("case_id", caseRow.id)
          .order("created_at", { ascending: true }),
      ]);

      // Anlaşma belgesi türü metadata.kind'te durur (belge üretim hattının kaydı).
      const anlasma = ((belgeler ?? []) as any[]).find((r) => {
        const meta = r?.metadata && typeof r.metadata === "object" ? r.metadata : {};
        return String(meta.kind ?? "") === "anlasma_belgesi";
      });
      setBelge(anlasma ? (anlasma as BelgeSatiri) : null);

      const liste: Taraf[] = ((partiler ?? []) as any[]).map((p) => ({
        id: p.id,
        ad: tarafAdi(p),
        rol: String(p.party_role ?? p.role ?? ""),
      }));
      setTaraflar(liste);

      // Daha önce imzalanmışsa kutular o kayıttan gelir; uydurma yok.
      const oncekiler: string[] = Array.isArray(anlasma?.signed_by) ? anlasma.signed_by : [];
      const isaret: Record<string, boolean> = {};
      for (const t of liste) isaret[t.id] = oncekiler.includes(t.id);
      setSecili(isaret);
    } catch (e: any) {
      setHata(e?.message || "Belge ve taraflar okunamadı");
    } finally {
      setOkuyor(false);
    }
  }

  useEffect(() => {
    void yukle();
  }, [caseRow?.id]);

  const seciliIdler = useMemo(
    () => taraflar.filter((t) => secili[t.id]).map((t) => t.id),
    [taraflar, secili],
  );

  async function imzayiIsle() {
    if (!belge) {
      setHata("Önce anlaşma belgesi üretilmeli. İmza, üretilmiş belgeye işlenir.");
      return;
    }
    if (seciliIdler.length === 0) {
      setHata("En az bir imzalayan taraf seçin. İmzalayan uydurulmaz.");
      return;
    }
    setYukleniyor(true);
    setHata(null);
    try {
      const { data: oturum } = await supabase.auth.getUser();
      const uid = oturum?.user?.id;
      if (!uid) throw new Error("Oturum bulunamadı; imza yalnız arabulucunun kendi oturumuyla işlenir.");

      // 1) Tarama varsa kovaya yaz. Yol düzeni kovanın politikasıyla aynı:
      //    <auth.uid()>/<case_id>/<dosya>. Başka düzen yazılırsa politika reddeder.
      let yol: string | null = belge.file_path ?? null;
      if (dosya) {
        const uzanti = (dosya.name.split(".").pop() || "pdf").toLowerCase();
        const damga = new Date().toISOString().replace(/[:.]/g, "-");
        const hedef = `${uid}/${caseRow.id}/imzali-anlasma-${damga}.${uzanti}`;
        const { error: upErr } = await supabase.storage
          .from("case-documents")
          .upload(hedef, dosya, { upsert: false, contentType: dosya.type || undefined });
        if (upErr) throw new Error(`Tarama yüklenemedi: ${upErr.message}`);
        yol = hedef;
      }

      // 2) İmza kaydı. signed_by = imzalayan TARAF satırlarının id'leri
      //    (case_parties.id). user_id değil: davet kabul etmemiş tarafın
      //    user_id'si yoktur, o yüzden taraf kimliği tek istikrarlı anahtardır.
      const oncekiMeta = belge.metadata && typeof belge.metadata === "object" ? belge.metadata : {};
      const imzaZamani = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("agreement_documents")
        .update({
          signed_by: seciliIdler,
          file_path: yol,
          metadata: {
            ...oncekiMeta,
            imza_turu: "islak",
            imzalandi_at: imzaZamani,
            imzayi_isleyen: uid,
            imzali_tarama: yol,
            imzalayanlar: taraflar
              .filter((t) => secili[t.id])
              .map((t) => ({ party_id: t.id, ad: t.ad, rol: t.rol })),
          },
        })
        .eq("id", belge.id);
      if (updErr) throw new Error(updErr.message);

      toast({
        title: "Anlaşma belgesi imzalı olarak işaretlendi",
        description: `${seciliIdler.length} imzalayan · ${dosya ? "tarama yüklendi" : "tarama eklenmedi"}`,
      });
      setDosya(null);
      await yukle();
      onSigned?.();
    } catch (e: any) {
      setHata(e?.message || "İmza işlenemedi");
    } finally {
      setYukleniyor(false);
    }
  }

  if (okuyor) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> İmza durumu okunuyor…
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h4 className="font-semibold flex items-center gap-2">
            <PenLine className="h-4 w-4" /> Anlaşma Belgesi — Islak İmza
          </h4>
          <p className="text-sm text-muted-foreground">
            Tarafların imzaladığı belgeyi tarayıp yükleyin ve imzalayanları işaretleyin.
            İmza kaydı yalnız sizin oturumunuzla yazılır.
          </p>
        </div>
        {imzali && (
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            İmzalandı
            {belge?.metadata?.imzalandi_at
              ? ` · ${new Date(belge.metadata.imzalandi_at).toLocaleDateString("tr-TR")}`
              : ""}
          </span>
        )}
      </div>

      {!belge && (
        <div className="p-3 rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Bu dosyada henüz <strong>anlaşma belgesi üretilmemiş</strong>. İmza, üretilmiş
            belgeye işlenir — önce yukarıdan Anlaşma Belgesi (m.18) üretin.
          </div>
        </div>
      )}

      {belge && (
        <>
          <div className="space-y-2">
            <Label className="text-sm">İmzalayan taraflar</Label>
            {taraflar.length === 0 && (
              <div className="text-sm text-muted-foreground">Dosyada kayıtlı taraf yok.</div>
            )}
            {taraflar.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={!!secili[t.id]}
                  onCheckedChange={(v) => setSecili((s) => ({ ...s, [t.id]: v === true }))}
                />
                <span>
                  {t.ad}
                  {t.rol ? <span className="text-muted-foreground"> · {t.rol}</span> : null}
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <Label className="text-sm">İmzalı belge taraması (PDF veya görüntü)</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
            />
            {belge.file_path && !dosya && (
              <div className="text-xs text-muted-foreground">
                Kayıtlı tarama: <code>{belge.file_path}</code>
              </div>
            )}
          </div>

          {hata && (
            <div className="p-2 rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>{hata}</div>
            </div>
          )}

          <Button type="button" onClick={imzayiIsle} disabled={yukleniyor}>
            {yukleniyor ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {imzali ? "İmza kaydını güncelle" : "İmzalandı olarak kaydet"}
          </Button>
        </>
      )}
    </Card>
  );
}
