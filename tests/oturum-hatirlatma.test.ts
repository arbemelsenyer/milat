import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  hatirlatmaPenceresi, hatirlatmaEtiketi, zatenGonderildiMi,
  oturumCevrimIciMi, oturumBicimMetni,
  PENCERE_BASLANGIC_SAAT, PENCERE_BITIS_SAAT,
} from "../supabase/functions/send-session-reminders/hatirlatma";

/* OTURUM HATIRLATMASI TEZGÂHI (24.08.2026 · P0)
   İki ayrı kusur vardı ve ikincisi birincinin altında saklıydı:
   (1) cron işi `x-cron-secret` göndermiyordu → her saat HTTP 401.
   (2) Yetki düzelse BİLE hatırlatma gitmezdi: fonksiyon `mediator_requests`
       tablosunu `scheduled_date` sütunuyla sorguluyordu. O tablo canlıda
       BOŞ (0 satır) ve terk edilmiş; gerçek oturumlar `case_sessions`ta
       `scheduled_at` ile duruyor (canlıda 31 satır).
   Bu tezgâh (2)'yi sabitler: doğru tablo, doğru sütun, mükerrer gönderim
   kapısı ve oturum biçimi. */

const KAYNAK = readFileSync(
  "supabase/functions/send-session-reminders/index.ts", "utf-8",
);

describe("oturum hatırlatması — doğru veri kaynağı", () => {
  it("`case_sessions` sorgulanır, terk edilmiş `mediator_requests` DEĞİL", () => {
    expect(KAYNAK).toContain('.from("case_sessions")');
    // Tabloya yapılan sorgu geri gelmemeli; yalnız açıklama metninde anılabilir.
    expect(KAYNAK).not.toContain('.from("mediator_requests")');
  });

  it("`scheduled_at` ile süzülür, olmayan `scheduled_date` ile DEĞİL", () => {
    expect(KAYNAK).toContain('.gte("scheduled_at"');
    expect(KAYNAK).toContain('.lt("scheduled_at"');
    expect(KAYNAK).not.toContain('"scheduled_date"');
  });

  it("alıcılar dosyadan çözülür (`case_sessions`te user_id/mediator_id yok)", () => {
    expect(KAYNAK).toContain('.from("case_parties")');
    expect(KAYNAK).toContain("assigned_mediator_id");
    // Eski sema alanlari artik okunmamali:
    expect(KAYNAK).not.toContain("session.user_id");
    expect(KAYNAK).not.toContain("session.mediator_id");
  });
});

describe("hatırlatma penceresi", () => {
  it("oturumdan 23–25 saat öncesini kapsar", () => {
    const simdi = new Date("2026-08-24T00:00:00.000Z");
    const { baslangic, bitis } = hatirlatmaPenceresi(simdi);
    expect(baslangic.toISOString()).toBe("2026-08-24T23:00:00.000Z");
    expect(bitis.toISOString()).toBe("2026-08-25T01:00:00.000Z");
    expect(PENCERE_BITIS_SAAT - PENCERE_BASLANGIC_SAAT).toBe(2);
  });

  it("24 saat sonraki oturum pencerenin İÇİNDE kalır", () => {
    const simdi = new Date("2026-08-24T00:00:00.000Z");
    const { baslangic, bitis } = hatirlatmaPenceresi(simdi);
    const oturum = new Date("2026-08-25T00:00:00.000Z");
    expect(oturum >= baslangic && oturum < bitis).toBe(true);
  });

  it("8 saat sonraki oturum pencerenin DIŞINDA kalır", () => {
    const simdi = new Date("2026-08-24T00:00:00.000Z");
    const { baslangic, bitis } = hatirlatmaPenceresi(simdi);
    const oturum = new Date("2026-08-24T08:00:00.000Z");
    expect(oturum >= baslangic && oturum < bitis).toBe(false);
  });
});

describe("mükerrer gönderim kapısı", () => {
  const etiket = hatirlatmaEtiketi("abc-123");

  it("etiket oturum kimliğini taşır", () => {
    expect(etiket).toBe("[hatirlatma:abc-123]");
  });

  it("iz varsa ikinci turda GÖNDERİLMEZ", () => {
    const iz = [{ gerekce: `${etiket} 24 saat hatırlatması gönderildi (2 alıcı)` }];
    expect(zatenGonderildiMi(iz, etiket)).toBe(true);
  });

  it("BAŞKA oturumun izi bu oturumu susturmaz", () => {
    const iz = [{ gerekce: "[hatirlatma:baska-oturum] 24 saat hatırlatması gönderildi (1 alıcı)" }];
    expect(zatenGonderildiMi(iz, etiket)).toBe(false);
  });

  it("iz yoksa gönderilir; boş/eksik liste çökertmez", () => {
    expect(zatenGonderildiMi([], etiket)).toBe(false);
    expect(zatenGonderildiMi(null, etiket)).toBe(false);
    expect(zatenGonderildiMi(undefined, etiket)).toBe(false);
  });
});

describe("oturum biçimi", () => {
  it("video bağlantısı varsa çevrim içi", () => {
    expect(oturumCevrimIciMi({ video_link: "https://ornek/oda" })).toBe(true);
    expect(oturumBicimMetni({ video_link: "https://ornek/oda" })).toBe("Online (Video Call)");
  });

  it("bağlantı yok / boş / boşluk ise yüz yüze — uydurma yok", () => {
    expect(oturumBicimMetni({ video_link: null })).toBe("In-Person");
    expect(oturumBicimMetni({ video_link: "" })).toBe("In-Person");
    expect(oturumBicimMetni({ video_link: "   " })).toBe("In-Person");
    expect(oturumBicimMetni({})).toBe("In-Person");
  });
});
