/* DEPO (STORAGE) HATASINI İNSAN DİLİNE ÇEVİRİR — TEK KAYNAK
 *
 * Belge indirme iki yüzeyde yapılıyor: tarafın "Belgelerim" listesi
 * (`CaseRoom`) ve arabulucunun kaynak görüntüleyicisi (`MediationEngine`).
 * İkisi de ham hata metnini gösteriyordu ("Object not found" gibi) — kullanıcı
 * bunun bir YETKİ sorunu mu yoksa DOSYANIN YOKLUĞU mu olduğunu anlayamıyordu.
 *
 * NEDEN ÖNEMLİ (24.08.2026 ölçümü): `case_documents`ta 24 üstveri satırından
 * **2'sinin dosyası kovada yok** (tohum verisi, `farazi-test/…` yollu). O
 * satırlarda indirme her zaman başarısız olur. Kullanıcı "yetkim mi yok?" diye
 * düşünmemeli; kaydın var olduğunu ama dosyanın olmadığını görmeli.
 *
 * Aynı gün kova okuma politikası da daraltıldı (kör veri sızıntısı kapatıldı),
 * yani "yetki yok" cevabı da gerçek bir olasılıktır ve ayrı anlatılmalıdır.
 */

export type DepoHataTuru = "dosya_yok" | "yetki_yok" | "bilinmeyen";

/** Ham hata metninden türü çıkarır. Supabase İngilizce döner; desen dar tutuldu. */
export function depoHataTuru(hata: unknown): DepoHataTuru {
  const m = (
    typeof hata === "string" ? hata : (hata as { message?: unknown })?.message ?? ""
  );
  const t = String(m).toLowerCase();
  if (!t) return "bilinmeyen";
  if (t.includes("not found") || t.includes("does not exist") || t.includes("404")) {
    return "dosya_yok";
  }
  if (
    t.includes("unauthorized") || t.includes("forbidden") ||
    t.includes("permission") || t.includes("row-level security") ||
    t.includes("403") || t.includes("401")
  ) {
    return "yetki_yok";
  }
  return "bilinmeyen";
}

/** Kullanıcıya gösterilecek tek cümle. Ham metin YALNIZ tür anlaşılamazsa geçer. */
export function depoHataMetni(hata: unknown): string {
  switch (depoHataTuru(hata)) {
    case "dosya_yok":
      return "Bu belgenin kaydı var ama dosyası depoda bulunamadı. Belge yeniden yüklenmeli.";
    case "yetki_yok":
      return "Bu belgeyi görme yetkiniz yok. Belgeyi yükleyen taraf ya da dosyanın arabulucusu görebilir.";
    default: {
      const ham = String(
        typeof hata === "string" ? hata : (hata as { message?: unknown })?.message ?? "",
      ).trim();
      return ham || "Dosya indirilemedi.";
    }
  }
}
