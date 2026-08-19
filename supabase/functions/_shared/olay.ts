// AKIŞ OLAYI YAZICI (agentic belkemiği, 1. taş)
//
// Tek iş: public.akis_olaylari'na "şu adım BİTTİ" satırı yazmak. Karar vermez,
// fonksiyon çağırmaz, e-posta göndermez. Kuralı koşan yer ayrıdır (akis-yurut).
//
// BEST-EFFORT (bağlayıcı): olay yazılamazsa ÇAĞIRAN İŞLEM BAŞARISIZ SAYILMAZ.
// Bu yardımcı hiçbir koşulda throw etmez; hatayı döndürür, çağıran kendi dönüş
// gövdesine not düşer. Bir olay kaydı arızası hiçbir zaman belge üretimini,
// analizi ya da e-posta gönderimini durduramaz.
//
// KÖR VERİ (constitution m.1): `veri` alanına taraf beyanı, belge içeriği,
// analiz metni, rakam ya da tutar YAZILMAZ. Yalnız kimlikler (document_id,
// session_id, foy_id …) ve durum bilgisi (sayı, kod, true/false) durur.
// Olay kaydı ikinci bir gizli veri deposuna dönüşemez (constitution m.6).

export type OlayGirdisi = {
  case_id: string;
  party_id?: string | null;
  olay_kodu: string;
  veri?: Record<string, unknown> | null;
};

/** Olayı yazar. Başarılıysa null, yazılamadıysa kısa not döner (throw ETMEZ). */
export async function olayYaz(admin: any, girdi: OlayGirdisi): Promise<string | null> {
  try {
    const caseId = String(girdi?.case_id ?? "").trim();
    const kod = String(girdi?.olay_kodu ?? "").trim();
    if (!caseId || !kod) return "olay yazılamadı: case_id ve olay_kodu zorunlu";

    const { error } = await admin.from("akis_olaylari").insert({
      case_id: caseId,
      party_id: girdi.party_id ? String(girdi.party_id) : null,
      olay_kodu: kod,
      veri: girdi.veri ?? {},
      islendi: false,
    });
    if (error) {
      console.error("[olayYaz] yazılamadı", { olay_kodu: kod, error: error.message });
      return `olay yazılamadı (${kod}): ${error.message}`;
    }
    return null;
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 200);
    console.error("[olayYaz] yazılamadı", { olay_kodu: girdi?.olay_kodu, error: msg });
    return `olay yazılamadı: ${msg}`;
  }
}
