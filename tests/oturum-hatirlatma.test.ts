import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* OTURUM HATIRLATMASI — TEK KOL TEZGÂHI (24.08.2026)

   BU MADDE ÜÇ TURDA ÇÖZÜLDÜ; her tur bir öncekinin eksiğini gösterdi:
   (1) cron işi `x-cron-secret` göndermiyordu → her saat HTTP 401.
   (2) Yetki düzelince görüldü ki `send-session-reminders` terk edilmiş
       `mediator_requests` tablosunu sorguluyor (canlıda 0 satır) → yetki
       düzelse bile hiçbir şey göndermezdi.
   (3) Kaynağı `case_sessions`e çevirince görüldü ki ürünün ZATEN çalışan bir
       hatırlatma kolu var: `ajan-nobetci` → `oturumHatirlatmaGorevleriAc` +
       `oturumHatirlatmaYurut`. O kol 24 saati kapsıyor, 3 dakikada bir koşuyor,
       TÜRKÇE yazıyor, adresi `case_parties.email`ten alıyor, iletişim
       tercihini uyguluyor. Yani yazdığım şey KOPYAYDI.
       Dahası zararlıydı: aynı `gorev_tipi`/etiketi yazdığı için nöbetçinin
       mükerrer kapısını tetikleyip DOĞRU kolu susturacaktı.

   ASIL KUSUR ise nöbetçideydi: `oturumHatirlatmaYurut` etiketi
   `^\[hatirlatma:…\]` ile SATIR BAŞINA çapalı arıyordu; oysa `anaAjanaBildir`
   geçidi gerekçenin başına `[kaynak:nobetci]` koyuyor. Desen hiç eşleşmedi,
   her görev `atlandi` oldu — nöbetçi HİÇBİR ZAMAN hatırlatma göndermedi.
   CANLI KANIT: 24.08 01:27 · 01:30 · 01:33 aynı oturum için üst üste `atlandi`.

   Bu tezgâh iki şeyi sabitler: tek kol kalsın, ve o kolun etiket okuyucusu
   çapalı olmasın. */

const NOBETCI = readFileSync("supabase/functions/ajan-nobetci/index.ts", "utf-8");
const CRON = readFileSync("supabase/functions/send-session-reminders/index.ts", "utf-8");

describe("hatırlatma kolu — nöbetçi etiketi metnin İÇİNDE arar", () => {
  it("etiket deseni satır başına ÇAPALI değildir", () => {
    /* Kacis karmasasina girmemek icin desenin YAZILDIGI satir okunur. */
    const satir = NOBETCI.split(/\r?\n/)
      .find((l) => l.includes("hatirlatma:([0-9a-f-]+)"));
    expect(satir, "hatırlatma etiketi deseni bulunamadı").toBeTruthy();
    // Capali hali "/^" ile baslar; gecit basa [kaynak:nobetci] koydugu icin hic eslesmez.
    expect(satir!.includes("/^")).toBe(false);
  });

  it("mükerrer yazım kapısı da çapalı değildir (21.08 onarımı yerinde)", () => {
    expect(NOBETCI).toContain('String(r?.gerekce ?? "").includes(etiket)');
  });
});

describe("send-session-reminders — kopya kol kaldırıldı", () => {
  it("terk edilmiş `mediator_requests` artık sorgulanmıyor", () => {
    expect(CRON).not.toContain('.from("mediator_requests")');
    expect(CRON).not.toContain('"scheduled_date"');
  });

  it("e-posta GÖNDERMİYOR: tek kol nöbetçidedir", () => {
    expect(CRON).not.toContain("resend.emails.send");
    expect(CRON).toContain('devredildi: "ajan-nobetci"');
  });

  it("nöbetçinin mükerrer kapısını tetikleyecek satır YAZMIYOR", () => {
    // Ayni gorev_tipi yazilsaydi nobetcinin dogru kolu susardi.
    expect(CRON).not.toContain('gorev_tipi: "oturum_hatirlatma"');
  });

  it("yetki kapısı yerinde kalır (cron sırrı ya da yönetici)", () => {
    expect(CRON).toContain('req.headers.get("x-cron-secret")');
    expect(CRON).toContain('status: 401');
  });
});

/* ALICI KURALI — ÖZEL OTURUM ile ORTAK OTURUM AYRIDIR (24.08.2026)
   Nöbetçi alıcıları HER ZAMAN `participants`ten alıyordu. Ama `randevu-teklif`
   oraya YALNIZ saati kabul eden TEK tarafı yazıyor (randevu-teklif:659-661).
   Sonuç: ortak oturumda KARŞI TARAF hiç hatırlatma almıyordu.
   CANLI KANIT (24.08 02:00): eski cron kolu aynı oturum için 3 alıcı buldu
   (2 taraf + arabulucu); nöbetçi kolu ise `participants` boş olduğu için
   hiç kimseye gönderemezdi.
   Ama özel (caucus) oturumda genişletme YASAK: özel oturumun varlığı karşı
   tarafa hiçbir yüzeyden açılmaz (constitution · kör veri). */
describe("hatırlatma alıcıları — özel oturum genişletilmez", () => {
  it("özel oturumda YALNIZ katılımcılar hedeflenir", () => {
    expect(NOBETCI).toContain('=== "private"');
    expect(NOBETCI).toContain('tarafSorgusu.in("id", katilimciIds)');
  });

  it("özel oturumda katılımcı yoksa iş ATLANIR, alıcı genişletilmez", () => {
    expect(NOBETCI).toContain("Özel oturumda katılımcı taraf kaydı yok — alıcı genişletilmedi");
  });

  it("ortak oturumda dosyanın BÜTÜN tarafları hedeflenir", () => {
    expect(NOBETCI).toContain('tarafSorgusu.eq("case_id", dosya.id)');
  });

  it("alıcı bulunamazsa sessizce düşmez, sebebi yazılır", () => {
    expect(NOBETCI).toContain("Oturum için alıcı taraf bulunamadı");
  });

  it("session_type sorguda okunur (yoksa kural uygulanamaz)", () => {
    expect(NOBETCI).toContain("participants, video_link, session_type");
  });
});
