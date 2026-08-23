# MEDİPACT — BAŞLANGIÇ PAKETİ

`medipact` komutunda okunacak malzeme ve sırası. `medipact devam` komutunda başlanacak iş buradan çıkar.
Yetkili kural kitabı `CLAUDE.md`'dir; bu dosya onun okuma listesidir, yerine geçmez.

---

## A. `medipact` → OKU (kod değiştirme, dosya yazma, commit atma)

Sırayla ve **yalnızca** şunlar:

| # | Dosya | Ne kadarı okunur |
|---|---|---|
| 1 | `CLAUDE.md` | Tamamı. Çalışma anayasası. |
| 2 | `constitution.md` | Tamamı. |
| 3 | `tasks/todo.md` | **Yalnız en üstteki "Nerede kaldık" bloğu** + aktif göreve ait satırlar. Dosya ~230 KB, baştan sona okuma. |
| 4 | `PROJE_OZETI.md` | `## Doğrulama Komutları` bölümü + aktif aşamayı anlatan kısım. |
| 5 | `OZET_KOMUTLARI.md` | Tamamı (kısa). |

**Açılmayacaklar:** `repomix-output.xml` (4.7 MB), `mimari/99-ARSIV-mimari-tam.md`, `AGENTS.md`, `COWORK.md`, `node_modules/`, `dist/`.
`mimari/` bölüm dosyaları (`00`–`17`) ve `tasks/lessons.md`, `tasks/yol-haritasi.md`, `tasks/kurulu-envanter.md`, `tasks/akis-kurallari-onerisi.md` **yalnızca ilgili göreve bakarken** açılır.

Okuma bitince ekrana **tek blok** yaz, sonra dur:

```
Aşama:
Aktif görev:
Açık blokaj:
Sıradaki uygulanabilir iş:
Doğrulama komutları: hazır / eksik
Hazırım.
```

---

## B. İLK OTURUM — bir kereye mahsus kontrol listesi

Bu üç madde daha önce yapılmadıysa, `medipact devam` denince **ilk iş** bunlardır.

**0. P0 · Lovable MCP'yi kur — publish/deploy yetkisini kendine al**
Bu kurulmadan canlıya çıkamazsın ve her seferinde dışarıya bağımlı kalırsın. İlk iş budur.

```
claude mcp add --transport http lovable "https://mcp.lovable.dev"
```

Sonra `/mcp` ile `lovable` sunucusunun listelendiğini doğrula. İlk araç çağrısında tarayıcıda Lovable girişi açılır — kurucu bir kez onaylar, bir daha sorulmaz. Onaydan sonra **kaldığın yerden devam et**, "şimdi ne yapayım" diye sorma.

Kurulduktan sonra publish ve edge function redeploy senin işindir (§11-B). Bunları Cowork'e devretme, kullanıcıya sordurma.

Kurulum başarısız olursa: hatayı `tasks/todo.md`'ye P0 olarak yaz, kullanıcıya tek satırla bildir, kuyruktaki deploy gerektirmeyen işlere devam et — bekleme.

**1. P0 · `.env` git kontrolü**
`.gitignore` içinde `.env` satırı yok; yalnız `.env.scraper` yoksayılıyor. Proje kökünde `.env` var.

```
git ls-files --error-unmatch .env
```

- Komut "did not match any file" derse → `.gitignore`'a `.env` ve `.env.*` (`!.env.example` hariç) satırlarını ekle, commit et, devam et.
- Komut dosyayı listelerse → **DUR ve kullanıcıya bildir.** Geçmişten temizleme + anahtar yenileme gerekir. Human Gate.

**2. P1 · Doğrulama komutlarını yaz**
`PROJE_OZETI.md` içinde `## Doğrulama Komutları` başlığı yoksa şu tabloyu ekle:

| Amaç | Komut |
|---|---|
| Build | `npm run build` |
| Lint | `npm run lint` |
| Test | `npm run test` |
| Type check | `npx tsc --noEmit -p tsconfig.app.json` |
| Dev sunucu | `npm run dev` |

**3. P1 · `tasks/todo.md` başlığını standarda getir**
Dosyanın en üstünde `CLAUDE.md` §3'teki "Nerede kaldık" bloğu yoksa oluştur. Mevcut içeriği silme, sadece üste ekle.

**4. P2 · İzin listesini genişlet**
`.claude/settings.local.json` içindeki `permissions.allow` dizisine, yoksa şunları ekle (mevcut satırları silme, sadece ekle):

```
"Bash(npx:*)", "Bash(node:*)", "Bash(npm run:*)",
"PowerShell(npm:*)", "PowerShell(npx:*)", "PowerShell(git:*)",
"Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)",
"Bash(git revert:*)", "Bash(git ls-files:*)",
"Bash(cat:*)", "Bash(ls:*)", "Bash(find:*)", "Bash(grep:*)",
"Bash(head:*)", "Bash(tail:*)", "Bash(sed:*)", "Bash(awk:*)", "Bash(wc:*)"
```

`permissions.defaultMode` anahtarına **dokunma** — proje dosyasında `auto` değeri geçersizdir ve kullanıcının makine ayarını da bozar.

---

## C. `medipact devam` → BAŞLA

1. B bölümündeki üç madde bitti mi? Bitmediyse önce onlar.
2. Bittiyse `tasks/todo.md` kuyruğundan **en yüksek öncelikli, bağımlılığı çözülmüş** işi seç.
3. Kuyruk boşsa: kodun gerçek durumundan P0/P1 aday çıkar, kabul kriteriyle kuyruğa yaz, en üsttekinden başla.
4. `CLAUDE.md` §4 döngüsünü uygula: keşfet → analiz → planla → uygula → test → düzelt → etki alanı → doğrula → kaydet → commit.
5. **Durma, sıradaki işe geç.** Yalnız §5'teki dört durumda dur: gerçek Human Gate · BLOCKED · kuyruk boş · `medipact dur`.

---

## D. HATIRLATMALAR

- Proje kökü: `C:\Users\ASUS\milat` · Branch: `main` · Canlı: `medipact-ai.lovable.app`
- Kullanıcı yazılımcı değildir. Ona teknik adım sordurma, hata düzeltme komutu taşıtma.
- "Yetkim yok / izin gerekiyor" bir durma gerekçesi değildir (§18).
- Codex cevap vermezse bekleme, devam et (§19).
- Bağlam dolarsa: kaydet → commit → kullanıcıya `/clear` + `medipact devam` de (§20).
- Test çalıştırmadan "tamamlandı" deme (§15).
