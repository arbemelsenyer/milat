// DOSYA TEMİZLİĞİ — bir dosyanın bütün kişisel verisini silen TEK kural.
//
// NEDEN TEK YERDE (29.08.2026). Bir dosyanın verisi üç yoldan silinebilir:
//   · `dosya-verilerini-sil` — süreç bitince arabulucunun açık eylemiyle (C3)
//   · `basvuru-sil`          — yürümemiş bir başvuru listeden kaldırılınca
//   · `saklama-imha`         — arabulucu unuttuysa, kapanıştan N gün sonra
//                              (EMNİYET SÜPÜRGESİ · HAT H-15/1)
// Kural üç yerde ayrı yazılırsa biri düzeltilip ötekiler açık kalır — 25.08 ve
// 29.08'de tam bu oldu (depo süpürgesi dört kaynaktan yalnız birini biliyordu;
// "Başvuruyu sil" düğmesi depoya hiç dokunmuyordu).
//
// SIRA DEĞİŞTİRİLEMEZ:
//   1) ANONİM KAYIT   — dosya daha ayaktayken yazılır (aşağıdaki gerekçe)
//   2) DEPO           — asıl kişisel veri; satırlardan önce gider
//   3) SATIRLAR       — yabancı anahtar sırasına uygun
//   4) `cases`        — en son
import { depoyuSupur } from "./depo-supurge.ts";

/* SİLME SIRASI — yabancı anahtarlara uygun: önce çocuk kayıtlar, sonra
   taraflar. `cases` en sonda ayrıca silinir. Her tablo case_id ile silinir.
   Buradaki tabloların çoğu `cases`e cascade bağlıdır ve teknik olarak
   `cases` silinince kendiliğinden giderdi; liste yine de AÇIKÇA duruyor,
   çünkü silinen satır sayısı çağırana bildirilen sözün kanıtıdır. */
export const SILME_SIRASI: { tablo: string; alan?: string }[] = [
  { tablo: "belge_ozetleri", alan: "case_id" },
  { tablo: "case_documents" },
  { tablo: "party_analyses" },
  { tablo: "party_root_cause_analysis" },
  { tablo: "taraf_kalemleri" },
  { tablo: "case_notes" },
  { tablo: "oturum_hazirlik_foyleri" },
  { tablo: "foy_gonderim_kayitlari" },
  { tablo: "case_discovery_questions" },
  { tablo: "ajan_gorevleri" },
  { tablo: "ajan_bellek" },
  { tablo: "akis_olaylari" },
  { tablo: "agent_states" },
  { tablo: "arabulucu_talimatlari" },
  { tablo: "ajan_onerileri" },
  { tablo: "akis_duraklatma" },
  { tablo: "arabulucu_kontrol_tercihleri" },
  { tablo: "iletisim_tercihleri" },
  { tablo: "taraf_musaitlik", alan: "case_id" },
  { tablo: "randevu_teklifleri" },
  { tablo: "teklif_braketleri" },
  { tablo: "olay_cizelgesi" },
  { tablo: "common_ground_reports" },
  { tablo: "bilirkisi_raporlari" },
  { tablo: "agreement_documents" },
  { tablo: "oturum_kayitlari" },
  { tablo: "case_sessions" },
  { tablo: "case_party_invites", alan: "case_id" },
  { tablo: "case_parties" },
];

/** Silmeyi kimin tetiklediği. Anonim kayda yazılır. */
export type Sebep = "arabulucu" | "sure_doldu";

export type TemizlikSonucu =
  | { ok: true; kayit: number; belge: number; uyarilar: string[] }
  | { ok: false; hata: string };

// deno-lint-ignore no-explicit-any
type Istemci = any;

/**
 * Bir dosyanın bütün kişisel verisini siler ve geriye tek satırlık ANONİM
 * kapanış kaydı bırakır.
 *
 * @param admin   Servis anahtarlı supabase istemcisi (RLS'i aşar).
 * @param case_id Silinecek dosya.
 * @param sebep   "arabulucu" (C3, elle) · "sure_doldu" (emniyet süpürgesi).
 */
export async function dosyayiTemizle(
  admin: Istemci, case_id: string, sebep: Sebep,
): Promise<TemizlikSonucu> {
  const uyarilar: string[] = [];

  const { data: dosya } = await admin.from("cases")
    .select("id, outcome, closed_at, created_at").eq("id", case_id).maybeSingle();
  if (!dosya) return { ok: false, hata: "Dosya bulunamadı" };

  // SİLMEDEN ÖNCE SAYIM (yalnız sayı; içerik okunmaz).
  let kayit = 0;
  for (const t of SILME_SIRASI) {
    try {
      const { count } = await admin.from(t.tablo)
        .select("id", { count: "exact", head: true }).eq(t.alan ?? "case_id", case_id);
      kayit += count ?? 0;
    } catch { /* tablo yoksa sayıma girmez */ }
  }

  // 1) DEPO — satırlardan ÖNCE. Gerekçe `depo-supurge.ts` başlığındadır.
  //    Süpürge düşerse hiçbir şey silinmemiştir; kayıt da yazılmaz.
  const supurge = await depoyuSupur(admin, case_id);
  if (!supurge.ok) return { ok: false, hata: supurge.hata };

  /* 2) ANONİM KAYIT — `cases` SİLİNMEDEN ÖNCE.
     29.08.2026 kusuru: bu kayıt `dosya_kapanis` tablosuna, üstelik `cases`
     silindikten SONRA yazılıyordu. `dosya_kapanis.case_id` `cases`e ON DELETE
     CASCADE bağlıdır — satır çoktan gitmiş oluyor, güncelleme 0 satır
     etkiliyor ve supabase-js bunu HATA SAYMIYOR. Yani KVKK silmesinin kanıtı
     ne yazılıyor ne de yazılmadığı söyleniyordu.
     `kapanis_istatistigi` bilerek YABANCI ANAHTARSIZDIR; bağlanırsa aynı
     kusur geri gelir. */
  const acilis = new Date(String(dosya.created_at ?? "")).getTime();
  const kapanis = new Date(String(dosya.closed_at ?? new Date().toISOString())).getTime();
  const surec_gun = Number.isFinite(acilis) && Number.isFinite(kapanis)
    ? Math.max(0, Math.round((kapanis - acilis) / 86_400_000)) : null;

  const { error: istErr } = await admin.from("kapanis_istatistigi").insert({
    sebep,
    sonuc: (typeof dosya.outcome === "string" ? dosya.outcome.trim() : "") || null,
    surec_gun,
    silinen_kayit: kayit,
    silinen_belge: supurge.toplamYol,
  });
  if (istErr) {
    /* Tablo henüz kurulmamışsa (42P01) silmeyi DURDURMA — silme kişinin
       hakkıdır, istatistik yalnız kayıttır. Ama SESSİZ GEÇME. */
    if (String(istErr.code ?? "") === "42P01") {
      uyarilar.push("anonim kapanış kaydı yazılamadı: `kapanis_istatistigi` tablosu yok (tests/sabit/kapanis-istatistigi.sql çalıştırılmalı)");
    } else {
      uyarilar.push(`anonim kapanış kaydı yazılamadı: ${istErr.message}`);
    }
  }

  // 3) SATIRLAR — sırayla. Hata olursa DURUR; yarım silme bırakılmaz.
  for (const t of SILME_SIRASI) {
    const { error } = await admin.from(t.tablo).delete().eq(t.alan ?? "case_id", case_id);
    if (error) {
      console.error("[dosya-silme] silme durdu", { tablo: t.tablo, kod: error.code ?? "" });
      return { ok: false, hata: "Silme tamamlanamadı; hiçbir kayıt yarım bırakılmadı. Lütfen tekrar deneyin." };
    }
  }

  /* KALANLAR (kurucu kararı — kişisel veri İÇERMEZ): öğrenme kayıtları kalır,
     dosya bağlantısı KOPARILIR. Yabancı anahtar zaten SET NULL; yazımı yine de
     açıkça yapıp sonucunu OKUYORUZ — sessiz geçilmez. */
  const { error: deneyimErr } = await admin.from("ajan_deneyim")
    .update({ case_id: null }).eq("case_id", case_id);
  if (deneyimErr) uyarilar.push(`ajan_deneyim dosya bağlantısı koparılamadı: ${deneyimErr.message}`);
  const { error: duzeltmeErr } = await admin.from("duzeltme_kayitlari")
    .update({ case_id: null }).eq("case_id", case_id);
  if (duzeltmeErr) uyarilar.push(`duzeltme_kayitlari dosya bağlantısı koparılamadı: ${duzeltmeErr.message}`);

  // 4) DOSYANIN KENDİSİ — en son. `dosya_kapanis` buna cascade bağlıdır.
  const { error: dErr } = await admin.from("cases").delete().eq("id", case_id);
  if (dErr) {
    return { ok: false, hata: "Dosya kaydı silinemedi; içerik silindi ama dosya satırı kaldı. Lütfen tekrar deneyin." };
  }

  if (uyarilar.length > 0) {
    console.error("[dosya-silme] silme sonrası eksikler", { case_id, uyarilar });
  }
  return { ok: true, kayit, belge: supurge.toplamYol, uyarilar };
}
