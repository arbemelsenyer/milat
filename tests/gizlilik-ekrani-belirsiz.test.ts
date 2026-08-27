import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* GİZLİLİK EKRANI YÖNETİCİ OTURUMUNDA ANLAMLI SONUÇ VEREMEZ (24.08.2026)

   Ekran "Taraf A, Taraf B'nin verisini okuyamıyor mu?" sorusunu yanıtlar.
   Ama iki şey aynı anda doğruydu:
     · Sayfa YALNIZ yöneticiye açıktı (`if (!isAdmin) return "...yalnızca yöneticilere açıktır"`)
     · Yönetici RLS'i tasarım gereği aşar → her yoklama "sızıntı" görür
   Yani ekran amacını YAPISAL OLARAK yerine getiremiyordu.

   CANLI KANIT (24.08, yönetici oturumu): 12 yoklama koştu → **Geçti 5,
   Başarısız 7**. Yedisi de yanlış alarmdı. Bu, gerçek bir sızıntının yıllarca
   fark edilmemesinin de sebebi: ekran zaten kırmızı yanıyordu.

   DÜZELTME: kapı açıldı (sayfa yalnız kullanıcının zaten koşabileceği sorguları
   koşar, yeni veri açmaz) ve yönetici oturumunda sonuçlar "belirsiz" olarak
   işaretlenir. */

const EKRAN = kaynakOku("src/pages/PrivacyTests.tsx");
const RAPOR = kaynakOku("src/lib/privacyReport.ts");

describe("gizlilik ekranı — yönetici kapısı", () => {
  it("sayfa artık yalnız yöneticiye kapalı DEĞİL", () => {
    expect(EKRAN).not.toContain("Bu sayfa yalnızca yöneticilere açıktır");
    expect(EKRAN).not.toContain("if (!isAdmin)\n    return (");
  });

  it("oturum açmamış kullanıcı yine de giremez", () => {
    expect(EKRAN).toContain('if (!user) return <Navigate to="/auth" replace />');
  });
});

describe("yönetici oturumu — sonuç BELİRSİZ", () => {
  it("tablo yoklamaları yönetici oturumunda belirsiz işaretlenir", () => {
    expect(EKRAN).toContain('status: isAdmin ? "belirsiz"');
  });

  it("depo yoklaması da belirsiz işaretlenir", () => {
    const depoBlok = EKRAN.slice(EKRAN.indexOf("DEPO_YOKLAMASI.name"));
    expect(depoBlok).toContain('isAdmin ? "belirsiz"');
  });

  it("kullanıcıya sebebi açıkça yazılır", () => {
    expect(EKRAN).toContain("YONETICI_NOTU");
    expect(EKRAN).toContain("RLS'i tasarım gereği aşar");
    expect(EKRAN).toContain("TARAF hesabıyla");
  });

  it("ekranda uyarı bandı var", () => {
    expect(EKRAN).toContain("Yönetici oturumundasınız.");
  });

  it("belirsiz sayısı özet rozetinde gösterilir", () => {
    expect(EKRAN).toContain('r.status === "belirsiz"');
    expect(EKRAN).toContain("Belirsiz: {belirsiz}");
  });
});

describe("rapor (PDF) belirsizi tanır", () => {
  it("durum tipinde belirsiz var", () => {
    expect(RAPOR).toContain('"pass" | "fail" | "pending" | "belirsiz"');
  });

  it("PDF satırında BELİRSİZ yazılır", () => {
    expect(RAPOR).toContain('"BELİRSİZ"');
  });

  it("PDF özetinde belirsiz sayısı ve sebebi geçer", () => {
    expect(RAPOR).toContain("Belirsiz: ${belirsiz} (yönetici oturumu)");
  });
});
