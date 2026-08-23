import { describe, it, expect } from "vitest";
import {
  kayitIzni,
  kayitKatilimciAnahtarlari,
  kayitIzniHataMetni,
  KAYIT_ONAY_SAAT,
} from "../supabase/functions/create-video-room/kayit-izni";

/* B18 kayıt izni kapısı — kural tezgâhı.
   Kural (kurucu, 16.08): 48 saat · oybirliği · bir ret kapıyı kapatır.
   Bu tezgâh, sunucudaki kapının arabulucu panelindeki hesapla AYNI cevabı
   verdiğini sabitler (23.08 dersi: iki ölçüt = sessiz yanlış cevap). */

const SIMDI = Date.UTC(2026, 7, 24, 12, 0, 0); // 24.08.2026 12:00 UTC
const SAAT = 3600000;

function talepSaatOnce(saat: number) {
  return { id: "talep-1", gonderim_zamani: new Date(SIMDI - saat * SAAT).toISOString() };
}

describe("kayitKatilimciAnahtarlari", () => {
  it("her taraf bir anahtar üretir", () => {
    expect(kayitKatilimciAnahtarlari([{ id: "p1" }, { id: "p2" }], [])).toEqual([
      "taraf:p1",
      "taraf:p2",
    ]);
  });

  it("vekili olan taraf İKİ anahtar üretir", () => {
    expect(kayitKatilimciAnahtarlari([{ id: "p1", vekil_ad_soyad: "Av. A" }], [])).toEqual([
      "taraf:p1",
      "vekil:p1",
    ]);
  });

  it("boş/boşluk vekil adı anahtar üretmez", () => {
    expect(kayitKatilimciAnahtarlari([{ id: "p1", vekil_ad_soyad: "   " }], [])).toEqual([
      "taraf:p1",
    ]);
  });

  it("uzman ataması sayılır; reddedilen/iptal/çıkarılan sayılmaz", () => {
    const anahtarlar = kayitKatilimciAnahtarlari(
      [],
      [
        { id: "a1", status: "assigned" },
        { id: "a2", status: "rejected" },
        { id: "a3", status: "cancelled" },
        { id: "a4", status: "removed" },
        { id: "a5" },
      ]
    );
    expect(anahtarlar).toEqual(["uzman:a1", "uzman:a5"]);
  });
});

describe("kayitIzni — kapı", () => {
  const taraflar = [{ id: "p1" }, { id: "p2" }];

  it("onay formu açılmadıysa kapı kapalı", () => {
    const s = kayitIzni({ talep: null, taraflar, uzmanAtamalari: [], onaylar: [], simdiMs: SIMDI });
    expect(s.izinli).toBe(false);
    expect(s.engeller).toContain("onay formu henüz açılmadı");
    expect(s.kalanDakika).toBeNull();
  });

  it("48 saat dolmadıysa kapı kapalı — herkes onay verse bile", () => {
    const s = kayitIzni({
      talep: talepSaatOnce(47),
      taraflar,
      uzmanAtamalari: [],
      onaylar: [
        { katilimci_anahtari: "taraf:p1", durum: "onay" },
        { katilimci_anahtari: "taraf:p2", durum: "onay" },
      ],
      simdiMs: SIMDI,
    });
    expect(s.izinli).toBe(false);
    expect(s.engeller).toContain("48 saatlik süre dolmadı");
    expect(s.kalanDakika).toBe(60);
  });

  it("süre dolduysa ve herkes onay verdiyse kapı açık", () => {
    const s = kayitIzni({
      talep: talepSaatOnce(KAYIT_ONAY_SAAT),
      taraflar,
      uzmanAtamalari: [],
      onaylar: [
        { katilimci_anahtari: "taraf:p1", durum: "onay" },
        { katilimci_anahtari: "taraf:p2", durum: "onay" },
      ],
      simdiMs: SIMDI,
    });
    expect(s.izinli).toBe(true);
    expect(s.engeller).toEqual([]);
    expect(s.kalanDakika).toBe(0);
    expect(s.onayVeren).toBe(2);
  });

  it("TEK RET kapıyı kapatır", () => {
    const s = kayitIzni({
      talep: talepSaatOnce(100),
      taraflar,
      uzmanAtamalari: [],
      onaylar: [
        { katilimci_anahtari: "taraf:p1", durum: "onay" },
        { katilimci_anahtari: "taraf:p2", durum: "ret" },
      ],
      simdiMs: SIMDI,
    });
    expect(s.izinli).toBe(false);
    expect(s.engeller).toContain("1 katılımcı onay vermedi");
  });

  it("cevap vermeyen katılımcı kapıyı kapatır (sessizlik onay değildir)", () => {
    const s = kayitIzni({
      talep: talepSaatOnce(100),
      taraflar,
      uzmanAtamalari: [],
      onaylar: [{ katilimci_anahtari: "taraf:p1", durum: "onay" }],
      simdiMs: SIMDI,
    });
    expect(s.izinli).toBe(false);
    expect(s.engeller).toContain("1 katılımcı henüz cevap vermedi");
    expect(s.bekleyen).toBe(1);
  });

  it("vekilin onayı ayrıca aranır", () => {
    const s = kayitIzni({
      talep: talepSaatOnce(100),
      taraflar: [{ id: "p1", vekil_ad_soyad: "Av. A" }],
      uzmanAtamalari: [],
      onaylar: [{ katilimci_anahtari: "taraf:p1", durum: "onay" }],
      simdiMs: SIMDI,
    });
    expect(s.katilimciSayisi).toBe(2);
    expect(s.izinli).toBe(false);
  });

  it("uzmanın onayı ayrıca aranır", () => {
    const tam = kayitIzni({
      talep: talepSaatOnce(100),
      taraflar: [{ id: "p1" }],
      uzmanAtamalari: [{ id: "a1", status: "assigned" }],
      onaylar: [
        { katilimci_anahtari: "taraf:p1", durum: "onay" },
        { katilimci_anahtari: "uzman:a1", durum: "onay" },
      ],
      simdiMs: SIMDI,
    });
    expect(tam.izinli).toBe(true);
  });

  it("dosyada katılımcı yoksa kapı açılmaz (boş oybirliği oybirliği değildir)", () => {
    const s = kayitIzni({
      talep: talepSaatOnce(100),
      taraflar: [],
      uzmanAtamalari: [],
      onaylar: [],
      simdiMs: SIMDI,
    });
    expect(s.izinli).toBe(false);
    expect(s.engeller).toContain("dosyada katılımcı kaydı yok");
  });

  it("okunamayan gönderim zamanı kapıyı kapatır, çökmez", () => {
    const s = kayitIzni({
      talep: { id: "t", gonderim_zamani: "bozuk-tarih" },
      taraflar,
      uzmanAtamalari: [],
      onaylar: [
        { katilimci_anahtari: "taraf:p1", durum: "onay" },
        { katilimci_anahtari: "taraf:p2", durum: "onay" },
      ],
      simdiMs: SIMDI,
    });
    expect(s.izinli).toBe(false);
    expect(s.engeller).toContain("onay formunun açılış zamanı okunamadı");
    expect(s.kalanDakika).toBeNull();
  });
});

describe("kayitIzniHataMetni", () => {
  it("izin varsa metin boştur", () => {
    const s = kayitIzni({
      talep: talepSaatOnce(100),
      taraflar: [{ id: "p1" }],
      uzmanAtamalari: [],
      onaylar: [{ katilimci_anahtari: "taraf:p1", durum: "onay" }],
      simdiMs: SIMDI,
    });
    expect(kayitIzniHataMetni(s)).toBe("");
  });

  it("engel metni SAYI taşır, kimlik/isim taşımaz (constitution m.1)", () => {
    const s = kayitIzni({
      talep: talepSaatOnce(100),
      taraflar: [{ id: "p1", vekil_ad_soyad: "Av. Ayşe Yılmaz" }],
      uzmanAtamalari: [],
      onaylar: [{ katilimci_anahtari: "taraf:p1", durum: "onay" }],
      simdiMs: SIMDI,
    });
    const metin = kayitIzniHataMetni(s);
    expect(metin).toContain("1 katılımcı henüz cevap vermedi");
    expect(metin).not.toContain("Ayşe");
    expect(metin).not.toContain("p1");
  });
});
