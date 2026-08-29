// DEPO SÜPÜRGESİ — dosyaya bağlı depo nesnelerini satırlardan ÖNCE siler.
//
// NEDEN TEK YERDE (29.08.2026). Bir dosyanın verisi iki ayrı yoldan silinebilir:
//   · `dosya-verilerini-sil` — süreç bitince arabulucunun açık eylemiyle (C3)
//   · `basvuru-sil`          — başvuru listesinden "Bu başvuruyu sil" ile
// İkisi de satırları siler. Satır gidince depodaki nesneyi gösteren hiçbir
// kayıt kalmaz; hiçbir silme kolu onu bir daha bulamaz ve dosya kovada
// SÜRESİZ kalır — constitution m.10 ihlali. 25.08'de canlıda bu yolla üretilmiş
// 6 öksüz belge bulundu. Kural iki yolda ayrı ayrı yazılırsa biri düzeltilir,
// öteki açık kalır — 25.08'de tam bu oldu. Bu yüzden kural TEK YERDEDİR.
//
// SIRA KRİTİK: önce depo (asıl kişisel veri), sonra satır. Ters sırada depo
// silmesi düşerse indeks yok olur ve veri erişilemez biçimde KALIR.

// Tarafların belgelerinin ve imzalı anlaşma taramasının durduğu kova.
export const BELGE_KOVASI = "case-documents";
// Sesli notun ham kaydının durduğu kova. `saklama-imha` ile AYNI ad.
// Bu kova istemciye KAPALIDIR (yalnız INSERT politikası var), bu yüzden
// süpürme istemciden değil yalnız sunucu anahtarıyla yapılabilir.
export const KAYIT_KOVASI = "oturum-kayitlari";

/* DEPOYA İŞARET EDEN BÜTÜN KAYNAKLAR.
   · `case_documents.file_path`       → tarafların yüklediği belgeler
   · `agreement_documents.file_path`  → imzalı anlaşmanın TARAMASI
   · `bilirkisi_raporlari.dosya_yolu` → bilirkişinin yüklediği rapor
   · `oturum_kayitlari.ses_dosya_yolu`→ dökümden sonra silinemeyip KAÇAN ses
     (`sesli-not-dokum` silme düşerse yolu bilerek NULL'lamaz)
   Yeni bir tablo depoya yol yazacaksa buraya eklenir; eklenmezse iki koldan da
   kaçar. Tezgâh listeyi `types.ts`e karşı denetler. */
export const DEPO_KAYNAKLARI: { tablo: string; kolon: string; kova: string }[] = [
  { tablo: "case_documents", kolon: "file_path", kova: BELGE_KOVASI },
  { tablo: "agreement_documents", kolon: "file_path", kova: BELGE_KOVASI },
  { tablo: "bilirkisi_raporlari", kolon: "dosya_yolu", kova: BELGE_KOVASI },
  { tablo: "oturum_kayitlari", kolon: "ses_dosya_yolu", kova: KAYIT_KOVASI },
];

/* Tek kaynaktan okunacak en çok yol sayısı. SESSİZ KIRPMA YOK: sınıra
   dayanılırsa işlem DURUR. Sessizce kırpmak, silindiği söylenen bir dosyayı
   kovada bırakmak demektir. */
export const YOL_SINIRI = 1000;

export type SupurgeSonucu =
  | { ok: true; toplamYol: number }
  | { ok: false; hata: string };

/**
 * Dosyanın depodaki bütün nesnelerini siler. Çağıran, SATIRLARA ancak
 * `ok: true` döndükten sonra dokunur.
 *
 * @param admin Servis anahtarlı supabase istemcisi (RLS'i aşar).
 */
// deno-lint-ignore no-explicit-any
export async function depoyuSupur(admin: any, case_id: string): Promise<SupurgeSonucu> {
  const kovaYollari = new Map<string, string[]>();
  let toplamYol = 0;

  for (const kaynak of DEPO_KAYNAKLARI) {
    const { data: satirlar, error: yolErr } = await admin.from(kaynak.tablo)
      .select(kaynak.kolon).eq("case_id", case_id).limit(YOL_SINIRI);
    if (yolErr) {
      /* Tablo yoksa (eski şema) bu bir eksiklik değildir; ama başka her hata
         "okuyamadım" demektir ve okuyamadığımız yolu silemeyiz. */
      if (String(yolErr.code ?? "") === "42P01") continue;
      return { ok: false, hata: `Belge yolları okunamadı; hiçbir kayıt silinmedi: ${yolErr.message}` };
    }
    const ham = (satirlar ?? []) as Record<string, unknown>[];
    /* SESSİZ KIRPMA YOK: sınıra dayandıysak geri kalan yolları hiç görmedik.
       Devam edersek satırları siler, görmediğimiz dosyaları kovada öksüz
       bırakırdık — düzeltmeye çalıştığımız kusurun ta kendisi. */
    if (ham.length === YOL_SINIRI) {
      return {
        ok: false,
        hata: "Bu dosyada silinecek belge sayısı tek seferde işlenemeyecek kadar çok; "
          + "hiçbir kayıt silinmedi. Lütfen bildirin.",
      };
    }
    const yollar = ham
      .map((r) => String(r?.[kaynak.kolon] ?? "").trim())
      .filter((y) => y.length > 0);
    if (yollar.length === 0) continue;
    const birikmis = kovaYollari.get(kaynak.kova) ?? [];
    birikmis.push(...yollar);
    kovaYollari.set(kaynak.kova, birikmis);
    toplamYol += yollar.length;
  }

  for (const [kova, yollar] of kovaYollari) {
    const { error: depoErr } = await admin.storage.from(kova).remove(yollar);
    if (depoErr) {
      // Depo temizlenemediyse SATIRLARA DOKUNULMAZ: dosyalar bulunabilir kalsın.
      // Kova adı ve dosya adı loga YAZILMAZ; yalnız dosya kimliği ve sebep.
      console.error(`[depo-supurge] depo temizlenemedi (${case_id} · ${kova}): ${depoErr.message}`);
      return { ok: false, hata: "Belgeler depodan silinemedi; hiçbir kayıt silinmedi. Lütfen tekrar deneyin." };
    }
  }

  return { ok: true, toplamYol };
}
