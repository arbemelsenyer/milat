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
//   1) DEPO           — asıl kişisel veri; satırlardan önce gider
//   2) SATIRLAR       — yabancı anahtar sırasına uygun
//   3) ANONİM KAYIT   — satırlar GERÇEKTEN gittikten sonra, `cases` dururken
//                       (30.08.2026: önce yazılıyordu; silme yarıda kalınca
//                        geriye "silindi" diyen yalancı bir kanıt kalıyordu)
//   4) `cases`        — en son
import { depoyuSupur } from "./depo-supurge.ts";

/* SİLME SIRASI — yabancı anahtarlara uygun: önce çocuk kayıtlar, sonra
   taraflar. `cases` en sonda ayrıca silinir. Buradaki tabloların çoğu
   `cases`e cascade bağlıdır ve teknik olarak `cases` silinince kendiliğinden
   giderdi; liste yine de AÇIKÇA duruyor, çünkü silinen satır sayısı çağırana
   bildirilen sözün kanıtıdır.

   ── 30.08.2026 · P0: LİSTE ŞEMAYA UYMUYORDU, SİLME YARIDA DURUYORDU ───────
   İki satır `alan: "case_id"` diyordu ama o iki tabloda `case_id` KOLONU YOK;
   ikisi de dosyaya `case_parties` ÜZERİNDEN bağlıdır:
       `taraf_musaitlik.party_id`      · `case_party_invites.case_party_id`
   PostgREST olmayan kolona silme isteğini 42703 ile reddediyor — tablo BOŞ
   olsa bile. Döngü ilk hatada `return` ettiği için silme tam orada duruyordu.

   CANLI KANIT (30.08 03:00 UTC · ilk gerçek emniyet süpürgesi koşumu): süresi
   dolan 5 dosya için listenin ilk 18 tablosu silindi, 19.sında (`taraf_musaitlik`)
   durdu; `case_sessions` (4) · `case_party_invites` (2) · `case_parties` (8) ve
   `cases` (5) satırları YERİNDE KALDI. Üstelik anonim kapanış kaydı silmeden
   ÖNCE yazıldığı için `kapanis_istatistigi`ye "5 dosya silindi" diye 5 satır
   girmişti — SİLİNMEYEN bir şeyin kanıtı. Kodun kendi sözü ("hata olursa DURUR;
   yarım silme bırakılmaz") canlıda tam tersine dönmüştü: yarım silme bırakıldı.

   İKİ KARŞILIK ALINDI:
   · `uzeri: "case_parties"` — dosyaya taraf üzerinden bağlı tablo artık taraf
     kimlikleriyle silinir; kural listede görünür, koda gömülü değildir.
   · Anonim kayıt artık satırlar GERÇEKTEN silindikten SONRA yazılır (yine
     `cases` silinmeden önce, cascade gerekçesi korunur). Silme düşerse geriye
     "silindi" diyen bir kayıt kalmaz.
   · `tests/dosya-verilerini-sil.test.ts` bekçisi: listedeki her `tablo.alan`
     çifti `types.ts` şemasında ARANIR. Bu kusur bir daha kurulamaz. */
export const SILME_SIRASI: {
  tablo: string;
  alan?: string;
  /** Dolu ise satır `case_id` ile DEĞİL, dosyanın taraf kimlikleriyle silinir. */
  uzeri?: "case_parties";
}[] = [
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
  { tablo: "taraf_musaitlik", alan: "party_id", uzeri: "case_parties" },
  { tablo: "randevu_teklifleri" },
  { tablo: "teklif_braketleri" },
  { tablo: "olay_cizelgesi" },
  { tablo: "common_ground_reports" },
  { tablo: "bilirkisi_raporlari" },
  { tablo: "agreement_documents" },
  { tablo: "oturum_kayitlari" },
  { tablo: "case_sessions" },
  { tablo: "case_party_invites", alan: "case_party_id", uzeri: "case_parties" },
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

  /* TARAF KİMLİKLERİ — `uzeri: "case_parties"` diyen tablolar dosyaya taraf
     üzerinden bağlıdır; onların satırları `case_id` ile DEĞİL bu kimliklerle
     bulunur. Liste bir kez okunur; hem sayım hem silme aynı kimlikleri
     kullanır ki iki yer ayrışamasın. Okuma düşerse silmeye BAŞLANMAZ:
     eksik kimlik listesiyle silmek "yarım silme"nin ta kendisidir. */
  const { data: tarafSatirlari, error: tarafErr } = await admin
    .from("case_parties").select("id").eq("case_id", case_id);
  if (tarafErr) {
    return { ok: false, hata: "Dosyanın tarafları okunamadı; hiçbir kayıt silinmedi. Lütfen tekrar deneyin." };
  }
  const tarafIdler = ((tarafSatirlari ?? []) as { id: string }[]).map((t) => t.id);

  /** Bir liste satırının kapsamını kurar. `uzeri` doluysa taraf kimlikleriyle,
   *  değilse dosya kimliğiyle daraltılır. Taraf yoksa `null` döner — o tabloda
   *  bu dosyaya ait satır OLAMAZ, sorgu hiç kurulmaz. */
  // deno-lint-ignore no-explicit-any
  const kapsamla = (t: (typeof SILME_SIRASI)[number], q: any) =>
    t.uzeri
      ? (tarafIdler.length === 0 ? null : q.in(t.alan ?? "party_id", tarafIdler))
      : q.eq(t.alan ?? "case_id", case_id);

  // SİLMEDEN ÖNCE SAYIM (yalnız sayı; içerik okunmaz).
  let kayit = 0;
  for (const t of SILME_SIRASI) {
    const q = kapsamla(t, admin.from(t.tablo).select("id", { count: "exact", head: true }));
    if (!q) continue;
    const { count, error } = await q;
    /* SESSİZ SIFIR YOK. 30.08'e kadar sayım try/catch içindeydi ve
       supabase-js hatayı FIRLATMADIĞI için okunamayan tablo sessizce 0
       sayılıyordu; şemayla uyuşmayan iki satır tam bu yüzden görünmedi. */
    if (error) uyarilar.push(`${t.tablo}: sayılamadı — ${error.message}`);
    kayit += count ?? 0;
  }

  // 1) DEPO — satırlardan ÖNCE. Gerekçe `depo-supurge.ts` başlığındadır.
  //    Süpürge düşerse hiçbir şey silinmemiştir; kayıt da yazılmaz.
  const supurge = await depoyuSupur(admin, case_id);
  if (!supurge.ok) return { ok: false, hata: supurge.hata };

  // 2) SATIRLAR — sırayla. Hata olursa DURUR; yarım silme bırakılmaz.
  for (const t of SILME_SIRASI) {
    const q = kapsamla(t, admin.from(t.tablo).delete());
    if (!q) continue;
    const { error } = await q;
    if (error) {
      console.error("[dosya-silme] silme durdu", { tablo: t.tablo, kod: error.code ?? "" });
      return { ok: false, hata: "Silme tamamlanamadı; hiçbir kayıt yarım bırakılmadı. Lütfen tekrar deneyin." };
    }
  }

  /* 3) ANONİM KAYIT — SATIRLAR GİTTİKTEN SONRA, `cases` DURURKEN.
     Neden `cases` silinmeden ÖNCE: 29.08.2026'da bu kayıt `dosya_kapanis`
     tablosuna, üstelik `cases` silindikten SONRA yazılıyordu.
     `dosya_kapanis.case_id` `cases`e ON DELETE CASCADE bağlıdır — satır çoktan
     gitmiş oluyor, güncelleme 0 satır etkiliyor ve supabase-js bunu HATA
     SAYMIYOR. Yani KVKK silmesinin kanıtı ne yazılıyor ne de yazılmadığı
     söyleniyordu. `kapanis_istatistigi` bilerek YABANCI ANAHTARSIZDIR;
     bağlanırsa aynı kusur geri gelir.
     Neden satırlardan SONRA: 30.08.2026'da kayıt silmeden ÖNCE yazılıyordu ve
     silme yarıda kalınca geriye "5 dosya silindi" diyen 5 satır kaldı —
     olmamış bir işin kanıtı. Kanıt, kanıtladığı işten sonra yazılır. */
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
