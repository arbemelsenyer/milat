import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* DAVET ZİNCİRİ — kenar işlevlerinde sessiz yazım (25.08.2026)

   Kenar işlevleri **gözetimsiz** çalışır: sessiz başarısızlığı görecek kullanıcı
   yoktur. `supabase-js` hata fırlatmadığı için `try { await admin…update() }`
   kalıbı burada da koruma değildir.

   Taramada `supabase/functions` altında 118 kontrolsüz yazım bulundu. Bu tezgâh
   **taraf daveti/iptali zincirini** dondurur — pilotun kendisi buradan geçer:

   1. `revoke-party-invite` üç yazımı da okumadan `ok: true` dönüyordu. Erişimi
      gerçekten kesen yazım `case_party_invites.token_hash` rotasyonudur:
      başarısız olursa **eski davet bağlantısı çalışmaya devam eder** ama
      arabulucuya "iptal edildi" denirdi. Sessizce başarısız olan bir erişim
      iptali kabul edilemez.
   2. `send-party-invite` jeton karmasını yazamazsa e-posta yine giderdi ve
      taraf bağlantıyı açtığında **içeri giremezdi** — hata da görünmezdi.
      Artık yazım e-postadan ÖNCE doğrulanır; yazılamıyorsa gönderilmez.
   3. `send-meeting-invite` `invite_sent_at` damgasını yazamazsa oturum "davet
      gönderilmedi" görünür ve aynı davet ikinci kez gidebilir.

   Kanıt için kök değiştirilebilir: DAVET_KOK=tests/gecici/davet-kanit */

const KOK = (process.env.DAVET_KOK ?? "").replace(/\/+$/, "");
const y = (goreli: string) => (KOK ? `${KOK}/${goreli}` : goreli);

const oku = (ad: string) => readFileSync(y(`supabase/functions/${ad}/index.ts`), "utf-8");

describe("davet zincirinde sessiz yazım yok", () => {
  it("iptal: jeton rotasyonu başarısızsa 'ok' dönmüyor", () => {
    const g = oku("revoke-party-invite");
    expect(g, "jeton rotasyonunun sonucu okunmuyor").toMatch(
      /const\s*\{\s*error:\s*davetErr\s*\}\s*=\s*await\s+admin\.from\("case_party_invites"\)/,
    );
    const iptalIdx = g.indexOf("davetErr");
    // Yorumda da gecen bir dize aranmaz; gercek yanit govdesi aranir.
    const okIdx = g.indexOf("JSON.stringify({ ok: true");
    expect(iptalIdx).toBeGreaterThan(-1);
    expect(okIdx, "'ok: true' hata dalından önce dönülüyor").toBeGreaterThan(iptalIdx);
    expect(g, "hata durumunda 500 dönülmüyor").toContain("eski bağlantı hâlâ geçerli");
  });

  it("iptal: erişimi etkilemeyen iki yazım da sessiz değil", () => {
    const g = oku("revoke-party-invite");
    expect(g).toMatch(/error:\s*tarafErr/);
    expect(g).toMatch(/error:\s*izErr/);
    expect(g, "eksik kalanlar çağırana bildirilmiyor").toContain("uyarilar");
  });

  it("davet: jeton yazılamadan e-posta gönderilmiyor", () => {
    const g = oku("send-party-invite");
    expect(g).toMatch(/const\s*\{\s*error:\s*jetonErr\s*\}\s*=\s*existingInvite/);
    const jetonIdx = g.indexOf("if (jetonErr)");
    const postaIdx = g.search(/sendResend|resend\.emails\.send|fetch\("https:\/\/api\.resend/);
    expect(jetonIdx, "jeton hatası dalı yok").toBeGreaterThan(-1);
    expect(postaIdx, "e-posta gönderimi bulunamadı — tezgâh güncellenmeli").toBeGreaterThan(-1);
    expect(postaIdx, "e-posta jeton doğrulamasından ÖNCE gidiyor").toBeGreaterThan(jetonIdx);
  });

  it("oturum daveti: gönderim damgası ve izler sessiz değil", () => {
    const g = oku("send-meeting-invite");
    expect(g, "invite_sent_at sonucu okunmuyor").toMatch(/const\s*\{\s*error:\s*damgaErr\s*\}\s*=\s*await\s+admin\s*[\s\S]{0,80}case_sessions/);
    expect(g, "davet izi hatası kayda düşmüyor").toContain("davet izi yazılamadı");
    expect(g, "uyarılar yanıtta dönmüyor").toMatch(/results,\s*uyarilar/);
  });
});
