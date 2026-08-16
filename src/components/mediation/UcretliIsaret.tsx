/* ÜCRETLİ YAPAY ZEKÂ ÇAĞRISI İŞARETİ — TEK TANIM.
   Model çağrısı tetikleyen (yani her basışta ücret oluşturan) düğmelerin yanına
   konur. Bedava düğmelere ("Yenile" gibi yalnız tablodan okuyanlara) KONMAZ.
   Pilota çıkarken bu metin tek yerden kaldırılabilir/yumuşatılabilir — tüm
   ekranlar bu dosyadaki tek bileşeni kullanır. */

export const UCRETLI_ISARET_METNI = "Yapay zekâ çağrısı — her basış ücret oluşturur";

export function UcretliIsaret({ metin, ton = "acik" }: { metin?: string; ton?: "acik" | "koyu" }) {
  // "koyu": kokpitin koyu zeminli kartları (bg-sidebar) için okunur gri ton.
  const renk = ton === "koyu" ? "text-sidebar-foreground/55" : "text-muted-foreground";
  return <p className={`text-[11px] leading-snug ${renk}`}>{metin ?? UCRETLI_ISARET_METNI}</p>;
}
