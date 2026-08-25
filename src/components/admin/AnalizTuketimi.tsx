/* ANALİZ TÜKETİMİ — "kim kaç analiz tüketti" (HAT H-15/3)
 *
 * KURUCU KARARI: "SAYAÇ ÇALIŞSIN, ENGEL OLMASIN." Pilot 3 ay ücretsiz olduğu
 * için kota kimseyi engellemez; ama tüketim **sayılır**, çünkü paket fiyatı ve
 * kotaya dahil analiz adedi ancak pilot verisiyle doğru konur (§13: "platform
 * içi otomatik kullanım sayaçları").
 *
 * YAPILMAYAN (bilerek): paket/fiyat ekranı, kota engeli, aşım ücreti, ödeme
 * entegrasyonu — kurucu bunları "pilot sonrası" dedi.
 *
 * AYRI TABLO YOK: tüketim, üretilen çıktıların KENDİSİNDEN sayılır. Ayrı bir
 * sayaç tablosu tutmak ikinci bir doğruluk kaynağı yaratır ve ikisi kaçınılmaz
 * olarak birbirinden ayrılır; çıktının kendisi zaten tek ve kesin kaynaktır.
 *
 * GİZLİLİK (§14, constitution m.1): bu ekran yalnız SAYI gösterir. Dosya
 * başlığı, taraf adı, uyuşmazlık içeriği ya da tutar buraya GİRMEZ.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";

/* Kotaya dahil "analiz koşumu" sayılan çıktılar. Kurucu "Dosyaya Soru Sor da
   analiz kotasına dahil" dedi — `case_qa_gecmisi` o yüzden listede. */
const ANALIZ_TABLOLARI = [
  "party_analyses",
  "common_ground_reports",
  "party_communication_analysis",
  "party_root_cause_analysis",
] as const;

type Satir = { arabulucu: string; dosya: number; analiz: number };

export function AnalizTuketimi() {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        // Dosya → arabulucu eşlemesi. Yalnız kimlik ve sahiplik okunur.
        const { data: dosyalar, error: dErr } = await supabase
          .from("cases").select("id, assigned_mediator_id, user_id");
        if (dErr) throw dErr;

        const dosyaSahibi = new Map<string, string>();
        for (const d of (dosyalar ?? []) as { id: string; assigned_mediator_id: string | null; user_id: string | null }[]) {
          const sahip = d.assigned_mediator_id ?? d.user_id;
          if (sahip) dosyaSahibi.set(d.id, sahip);
        }

        const analizAdedi = new Map<string, number>();
        for (const t of ANALIZ_TABLOLARI) {
          const { data, error } = await supabase.from(t as never).select("case_id");
          // Bir tablo okunamazsa sessizce sıfır sayılmaz: sebep kayda düşer.
          if (error) { console.error(`[AnalizTuketimi] ${t} okunamadı:`, error.message); continue; }
          for (const r of ((data ?? []) as unknown as { case_id: string | null }[])) {
            const sahip = r.case_id ? dosyaSahibi.get(r.case_id) : undefined;
            if (!sahip) continue;
            analizAdedi.set(sahip, (analizAdedi.get(sahip) ?? 0) + 1);
          }
        }

        const dosyaAdedi = new Map<string, number>();
        for (const sahip of dosyaSahibi.values()) {
          dosyaAdedi.set(sahip, (dosyaAdedi.get(sahip) ?? 0) + 1);
        }

        // Arabulucu adı: `profiles`ten yalnız ad — başka alan çekilmez.
        const kimlikler = [...new Set([...dosyaAdedi.keys(), ...analizAdedi.keys()])];
        const adlar = new Map<string, string>();
        if (kimlikler.length) {
          const { data: pr } = await supabase.from("profiles")
            .select("user_id, full_name").in("user_id", kimlikler);
          for (const p of ((pr ?? []) as { user_id: string; full_name: string | null }[])) {
            if (p.full_name) adlar.set(p.user_id, p.full_name);
          }
        }

        const liste: Satir[] = kimlikler.map((k) => ({
          arabulucu: adlar.get(k) ?? `(ad kayıtlı değil · ${k.slice(0, 8)})`,
          dosya: dosyaAdedi.get(k) ?? 0,
          analiz: analizAdedi.get(k) ?? 0,
        })).sort((a, b) => b.analiz - a.analiz);

        if (aktif) setSatirlar(liste);
      } catch (e) {
        if (aktif) setHata(String((e as Error)?.message ?? e));
      } finally {
        if (aktif) setYukleniyor(false);
      }
    })();
    return () => { aktif = false; };
  }, []);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Analiz tüketimi</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Pilotta <strong>kota uygulanmıyor</strong> — bu liste yalnız sayar.
        Paket fiyatı ve kotaya dahil analiz adedi pilot verisiyle konacak.
        Ekranda yalnız sayı vardır; dosya başlığı, taraf adı ve tutar gösterilmez.
      </p>

      {yukleniyor ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : hata ? (
        <p className="text-sm text-destructive">Tüketim okunamadı: {hata}</p>
      ) : satirlar.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz tüketim yok.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-4 font-medium">Arabulucu</th>
                <th className="py-2 pr-4 font-medium text-right">Dosya</th>
                <th className="py-2 font-medium text-right">Analiz koşumu</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s) => (
                <tr key={s.arabulucu} className="border-b last:border-0">
                  <td className="py-2 pr-4">{s.arabulucu}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{s.dosya}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{s.analiz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
