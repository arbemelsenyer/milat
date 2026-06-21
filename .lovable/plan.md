
# MediPact AI — Akıllı Arabuluculuk & Doküman Analiz Sistemi

Bu çok geniş kapsamlı bir özellik. Onayınızdan sonra fazları sırayla uygulayacağım. Aşağıda mimari ve adımlar var; hepsini tek seferde inşa etmek tek bir tur içinde mümkün değil — onay sonrası fazları birbiri ardına teslim edeceğim.

## Kapsam Özeti

7 aşamalı timeline (Başvuru → Arabulucu Seçimi → Belge Analizi → İhtiyaç Tespiti → Planlama → Müzakere → Kapanış) ile MediationEngine sayfası, çift katmanlı maskeleme, çift AI doğrulama pipeline, doküman çelişki analizi, arabulucu marketplace ve resmi belge üretimi.

## Faz 1 — Veritabanı Şeması (migration)

Yeni tablolar (RLS + GRANT + updated_at trigger dahil):
- `cases_private_keys` — gerçek değer ⇄ maske eşlemesi (pgcrypto ile şifreli)
- `cases_vector_pool` — anonimleştirilmiş metin + niche_area + embedding (pgvector)
- `pending_pool` — dış kaynak ham içerik + doğrulama durumu
- `case_discovery_questions` — dinamik mülakat Q/A
- `case_sessions` — ön / ana / özel görüşme planlaması
- `mediators` — arabulucu profili (spesializasyon, oran, müsaitlik)
- `case_parties` — bireysel/kurumsal taraf bilgileri (mevcut tabloya yeni alanlar ekle: party_type, is_individual, tc_kimlik, birth_date, company_name, tax_office, tax_number, trade_registry_no, authorized_person)

`case_documents` zaten var — gerekirse `analysis_result jsonb` alanı eklenecek.

`pgvector` ve `pgcrypto` extension'ları aktif edilecek.

RLS: tarafgör-yalnızca-kendi-davası, mediator atanmışsa erişim, admin tam erişim. `cases_private_keys` yalnızca `service_role` ve dava sahibi.

## Faz 2 — Maskeleme Motoru

`src/lib/masking.ts`:
- Regex tabanlı PII tespiti: TC (11 hane Luhn), IBAN, telefon (TR formatı), e-posta, vergi no (10 hane), tarih
- NER lite: form alanlarından gelen tam adlar/şirket adları için sözlük tabanlı maskeleme
- `maskText(text, caseId)` → `{ masked, mappings[] }`; `unmaskText(masked, caseId)` ters eşleme
- Eşlemeler edge function ile `cases_private_keys`'e şifreli yazılır (pgcrypto `pgp_sym_encrypt`, anahtar = LOVABLE secret)

Kural: AI Gateway'e yapılan TÜM çağrılar maskelenmiş metin gönderir; yanıt unmask edilir (ya da kullanıcıya maskeli kalır — UI'da toggle).

## Faz 3 — Edge Functions

| Fonksiyon | Görev |
|---|---|
| `mask-and-store` | Metin/doküman maskele, private_keys ve vector_pool'a yaz |
| `analyze-document` | Yüklenen PDF/Word'ü parse et, Turbo Law tarzı çelişki kartları üret (Gemini Pro), paralel olarak `discovery-questions` tetikler |
| `discovery-questions` | Niş alana + dokümana göre 4-5 derin soru üret |
| `legal-research` | Listelenen 20+ resmi kaynaktan Firecrawl ile arama, en ilgili 3-5 karar tam metni → `pending_pool` |
| `validate-pool` | A: Gemini Flash format/ilgi triage → B: Gemini Pro derin doğrulama → approved JSON; reddedilen silinir |
| `negotiation-suggest` | Müzakere aşamasında gerçek zamanlı AI önerisi |
| `generate-agreement` | 6325 sayılı kanun formatında 4 belge tipi streaming |

Tüm çağrılar Lovable AI Gateway (`google/gemini-3-flash-preview` triage, `google/gemini-2.5-pro` derin analiz). Kullanıcının istediği `VITE_GEMINI_API_KEY` yerine **Lovable AI Gateway** kullanılacak (ücretsiz kota dahili, secret tarafında zaten var). Bunu mesajda not edeceğim.

Firecrawl bağlantısı **gerekli** — connector flow ile bağlatılacak.

## Faz 4 — Frontend Sayfaları & Bileşenler

Yeni dosyalar:
- `src/pages/MediationEngine.tsx` — 7 aşamalı timeline orkestratörü
- `src/components/mediation/StepTimeline.tsx`
- `src/components/mediation/PartyForm.tsx` — bireysel/kurumsal toggle, tüm alanlar + Zod
- `src/components/mediation/MediatorMarketplace.tsx` — Hiwell tarzı kart grid + filtre + detay sheet + randevu
- `src/components/mediation/DocumentUploader.tsx` — drag/drop, PDF/Word
- `src/components/mediation/ConflictCards.tsx` — çelişki/risk kartları
- `src/components/mediation/DiscoveryInterview.tsx` — şık mülakat simülasyonu
- `src/components/mediation/SessionScheduler.tsx` — 3 seans tipi
- `src/components/mediation/NegotiationRoom.tsx` — AI önerili müzakere
- `src/components/mediation/AgreementGenerator.tsx` — streaming belge üretimi (zaten ayrı sayfa var, modüle dönüştür)

App.tsx'e `/mediation-engine` route eklenir.

## Faz 5 — Arabulucu Marketplace

Tohum verisi (5-8 örnek arabulucu) `mediators` tablosuna eklenir. Filtre: uzmanlık, dil (TR/EN/AR), ücret aralığı, müsaitlik. Detay sayfası mevcut `MediatorAvailabilityCalendar` bileşenini yeniden kullanır.

## Faz 6 — Belge Üretimi

`generate-agreement` 6325 sayılı kanunun 18. madde formatına göre 4 şablon (Tutanak / Anlaşma / Mutabakat / Uzlaşma). Streaming görüntüleme + PDF export (mevcut `pdf-export.ts` kullanılır).

## Onayınız Gereken Noktalar

1. **AI sağlayıcı**: `VITE_GEMINI_API_KEY` yerine Lovable AI Gateway (sunucu tarafı `LOVABLE_API_KEY`, frontend'e sızmaz, ücretsiz kota dahil). Onaylar mısınız?
2. **Firecrawl**: 20+ resmi sitenin agentik taraması için Firecrawl connector bağlantısı gerek. Onayınız varsa connector flow başlatırım.
3. **Teslimat**: Bu faz listesi sırayla uygulanacak (her faz ayrı turla). Faz 1 (DB migration) ile başlamamı onaylıyor musunuz?

## Teknik Notlar

- pgvector boyutu: `gemini-embedding-001` → 3072
- Tüm AI çağrıları edge function arkasında, JWT doğrulama in-code
- Tüm maskeleme istemci tarafında ön-tarama + sunucuda kesin tarama (defense in depth)
- i18n: tüm yeni stringler mevcut `useLanguage` hook + TR/EN sözlüğü
- Tasarım: mevcut `#1D9E75` accent, Outfit/Source Sans 3, AppNavbar
