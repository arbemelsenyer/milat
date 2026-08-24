// Privacy leak query definitions — pure data, used by both the UI and the test suite.
// Each query represents a "can the current user see another party's data?" probe.
// Pass condition: no rows returned that are NOT owned by the current user.
//
// KAPSAM GENİŞLETİLDİ (24.08.2026). Önceden yalnız ÜÇ tablo korunuyordu
// (`party_analyses`, `case_discovery_questions`, `case_documents`) ve hepsi
// sahipliği bir KULLANICI kimliğiyle tutuyordu. Oysa ürünün taraf-gizli
// yüzeylerinin çoğu sahipliği `party_id` ile tutar — aralarında **kör teklif**
// (`teklif_braketleri`) da vardır ki karşı tarafın bandını görmek kör teklifin
// tamamını anlamsızlaştırır.
//
// Bu boşluk somut bir bedele yol açtı: 24.08'de `case-documents` kovasının
// okuma politikasının veritabanındakinden GENİŞ olduğu bulundu (ölçülen gerçek
// sızıntı: 1 çift). Bu tezgâh o sızıntıyı göremezdi, çünkü yalnız tabloları
// yokluyordu — DEPO hiç kapsanmıyordu.

/** Sahiplik kimin üzerinden ölçülüyor. */
export type SahiplikTuru =
  /** Sütun doğrudan kullanıcı kimliği (auth uid) tutar. */
  | "kullanici"
  /** Sütun bir `case_parties.id` tutar; sahiplik kullanıcının KENDİ taraf kayıtlarıdır. */
  | "taraf";

export type LeakQuery = {
  id: string;
  name: string;
  description: string;
  table: string;
  ownerColumn: string;
  selectColumns: string;
  sahiplik: SahiplikTuru;
};

export const LEAK_QUERIES: LeakQuery[] = [
  // ── Sahipliği doğrudan kullanıcı kimliği olanlar ──────────────────────────
  {
    id: "party_analyses",
    name: "party_analyses gizliliği",
    description: "Mevcut kullanıcı, kendisine ait olmayan party_analyses satırlarını okuyamaz.",
    table: "party_analyses",
    ownerColumn: "user_id",
    selectColumns: "id, user_id",
    sahiplik: "kullanici",
  },
  {
    id: "case_discovery_questions",
    name: "case_discovery_questions gizliliği",
    description: "Diğer tarafa ait keşif sorularına erişim engellenir.",
    table: "case_discovery_questions",
    ownerColumn: "user_id",
    selectColumns: "id, user_id",
    sahiplik: "kullanici",
  },
  {
    id: "case_documents",
    name: "case_documents yalnızca yükleyen/yetkili",
    description: "Karşı tarafa ait belge metaverisi başkası tarafından okunamaz.",
    table: "case_documents",
    ownerColumn: "uploaded_by",
    selectColumns: "id, uploaded_by",
    sahiplik: "kullanici",
  },

  // ── Sahipliği taraf kaydı (case_parties.id) olanlar ───────────────────────
  {
    id: "teklif_braketleri",
    name: "teklif_braketleri — KÖR TEKLİF",
    description:
      "Karşı tarafın teklif bandı görülemez. Bu sızarsa kör teklifin tamamı anlamsızlaşır.",
    table: "teklif_braketleri",
    ownerColumn: "party_id",
    selectColumns: "id, party_id",
    sahiplik: "taraf",
  },
  {
    id: "taraf_kalemleri",
    name: "taraf_kalemleri gizliliği",
    description: "Karşı tarafın talep kalemleri ve dayanakları görülemez.",
    table: "taraf_kalemleri",
    ownerColumn: "party_id",
    selectColumns: "id, party_id",
    sahiplik: "taraf",
  },
  {
    id: "oturum_hazirlik_foyleri",
    name: "oturum_hazirlik_foyleri gizliliği",
    description: "Her taraf yalnız KENDİ hazırlık föyünü görür; karşı tarafınki açılmaz.",
    table: "oturum_hazirlik_foyleri",
    ownerColumn: "party_id",
    selectColumns: "id, party_id",
    sahiplik: "taraf",
  },
  {
    id: "bilirkisi_secim_beyani",
    name: "bilirkisi_secim_beyani gizliliği",
    description: "Karşı tarafın bilirkişi seçim beyanı görülemez.",
    table: "bilirkisi_secim_beyani",
    ownerColumn: "party_id",
    selectColumns: "id, party_id",
    sahiplik: "taraf",
  },
  {
    id: "bilirkisi_taraf_yanitlari",
    name: "bilirkisi_taraf_yanitlari gizliliği",
    description: "Karşı tarafın bilirkişi adaylarına verdiği yanıtlar görülemez.",
    table: "bilirkisi_taraf_yanitlari",
    ownerColumn: "party_id",
    selectColumns: "id, party_id",
    sahiplik: "taraf",
  },
  {
    id: "case_payments",
    name: "case_payments gizliliği",
    description: "Taraf yalnız kendi ödeme satırlarını görür.",
    table: "case_payments",
    ownerColumn: "payer_party_id",
    selectColumns: "id, payer_party_id",
    sahiplik: "taraf",
  },
];

/** Sahiplik ölçütü: tek kimlik ya da kullanıcının kendi taraf kayıtları. */
export type Sahiplik = string | string[];

function sahibiMi(deger: unknown, sahiplik: Sahiplik): boolean {
  if (Array.isArray(sahiplik)) return sahiplik.includes(String(deger));
  return deger === sahiplik;
}

// Evaluates a result set against a leak query for the current user.
// Returns true if NO leak detected.
export function isLeakFree(
  rows: Array<Record<string, unknown>>,
  ownerColumn: string,
  sahiplik: Sahiplik,
): boolean {
  if (!rows || rows.length === 0) return true;
  return rows.every((r) => !r[ownerColumn] || sahibiMi(r[ownerColumn], sahiplik));
}

export function countLeaks(
  rows: Array<Record<string, unknown>>,
  ownerColumn: string,
  sahiplik: Sahiplik,
): number {
  if (!rows) return 0;
  return rows.filter((r) => r[ownerColumn] && !sahibiMi(r[ownerColumn], sahiplik)).length;
}

/* DEPO (STORAGE) YOKLAMASI — tablo yoklaması bunu GÖREMEZ.
   Belgenin satırı gizlense bile DOSYASI ayrı bir yetki sistemindedir. 24.08'de
   `case-documents` kovasının okuma politikası veritabanındakinden genişti ve
   gerçek bir sızıntı ölçüldü. Bu yoklama o sınıfı bir daha kaçırmamak içindir:
   kullanıcının YÜKLEMEDİĞİ bir dosyanın yolu denenir; yetki doğruysa indirme
   başarısız olmalıdır. */
export type DepoYoklamasi = {
  id: string;
  name: string;
  description: string;
  bucket: string;
};

export const DEPO_YOKLAMASI: DepoYoklamasi = {
  id: "case-documents-storage",
  name: "case-documents kovası — başkasının dosyası",
  description:
    "Kullanıcının yüklemediği bir belgenin DOSYASI indirilememeli. Satırın gizlenmesi yetmez; kova ayrı bir yetki sistemidir.",
  bucket: "case-documents",
};

/** Depo yoklamasının sonucu: indirme başarısızsa sızıntı yok demektir. */
export function depoSizintisiVarMi(indirmeBasarili: boolean): boolean {
  return indirmeBasarili;
}
