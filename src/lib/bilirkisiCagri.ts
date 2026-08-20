import { supabase } from "@/integrations/supabase/client";

/* Edge fonksiyon çağrısı — HATA SESSİZ DÜŞMEZ.
   supabase.functions.invoke hatasında error.message her zaman genel bir cümledir
   ("non-2xx status code"); gerçek sebep error.context gövdesindedir
   (tasks/lessons.md · 15.08). Bu yardımcı gövdeyi okur ve çağrılan fonksiyon
   adıyla birlikte GERÇEK sebebi döndürür; çağıran onu kalıcı bir satıra yazar. */
export async function invokeHataMetni(e: any, fonksiyon: string): Promise<string> {
  const ctx = e?.context;
  if (ctx && typeof ctx.text === "function") {
    try {
      const govde = await ctx.text();
      if (govde) {
        try {
          const j = JSON.parse(govde);
          const m = j?.error ?? j?.message ?? j?.sebep;
          if (m) return `${fonksiyon}: ${String(m)}`;
        } catch { /* JSON değilse düz metin kullanılır */ }
        return `${fonksiyon}: ${String(govde).slice(0, 400)}`;
      }
    } catch { /* gövde okunamadıysa mesaja düşülür */ }
    if (ctx.status) return `${fonksiyon}: HTTP ${ctx.status}`;
  }
  return `${fonksiyon}: ${String(e?.message ?? "bilinmeyen hata")}`;
}

export type CagriSonucu<T = any> = { veri: T | null; hata: string | null };

/** Tek çağrı noktası: bütün bilirkişi ekranları buradan geçer. */
export async function bilirkisiCagir<T = any>(
  fonksiyon: "bilirkisi-secim" | "bilirkisi-ekranim" | "bilirkisi-belge-baglantisi" | "bilirkisi-davet",
  govde: Record<string, unknown>,
): Promise<CagriSonucu<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(fonksiyon, { body: govde });
    if (error) return { veri: null, hata: await invokeHataMetni(error, fonksiyon) };
    if ((data as any)?.error) return { veri: null, hata: `${fonksiyon}: ${(data as any).error}` };
    return { veri: data as T, hata: null };
  } catch (e: any) {
    return { veri: null, hata: await invokeHataMetni(e, fonksiyon) };
  }
}

/* TERCİH SIRASI — bilirkisi_taraf_yanitlari'nda `sira` kolonu YOKTUR (canlı şema
   komutta böyle verildi). Tarafın sıralaması bu yüzden not alanının başına
   makine etiketiyle yazılır ve ekrana basılırken ayıklanır. Ürünün başka
   yerlerinde de aynı kalıp kullanılıyor (ajan_gorevleri.gerekce etiketleri).
   AÇIK KALEM: kolon eklenirse etiket bırakılıp alana taşınmalıdır. */
export function siraEtiketiCoz(not: string | null | undefined): { sira: number | null; metin: string } {
  const t = String(not ?? "");
  const m = t.match(/^\[sira:(\d{1,2})\]\s*/);
  if (!m) return { sira: null, metin: t.trim() };
  return { sira: Number(m[1]), metin: t.slice(m[0].length).trim() };
}

export function siraEtiketiKur(sira: number | null, metin: string): string {
  const govde = String(metin ?? "").trim();
  if (!sira || sira < 1) return govde;
  return `[sira:${Math.min(99, Math.floor(sira))}] ${govde}`.trim();
}
