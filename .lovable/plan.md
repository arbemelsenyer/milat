# MediPact AI Sistem 1 — Arabulucu Odaklı İki Taraflı Gizli Analiz

Mevcut `MediationEngine.tsx` baştan yeniden yapılandırılır. Her taraf yalnız kendi analizini görür; arabulucu her iki analizi + AI ortak zemin raporunu görür; taraflar birbirinin verisine erişemez (Supabase RLS).

## Mimari Özet

```text
Arabulucu (mediator)        Taraf A (user_id=A)        Taraf B (user_id=B)
     │                            │                          │
     ├─ Dava açar                 ├─ Davet e-postası →       ├─ Davet e-postası →
     ├─ Tarafları ekler           │  giriş + kendi paneli    │  giriş + kendi paneli
     ├─ Tüm belgeleri görür       ├─ Sadece kendi belgesi    ├─ Sadece kendi belgesi
     ├─ Her iki gizli analizi     ├─ Sadece kendi analizi    ├─ Sadece kendi analizi
     ├─ AI Ortak Zemin Raporu     │  (RLS bloklu)            │  (RLS bloklu)
     └─ Strateji önerisi (yalnız ona)
```

## Veritabanı Değişiklikleri (migration)

Yeni / değiştirilen tablolar — hepsinde RLS + GRANT:

- `cases`: kolonlar eklenir → `uyap_no`, `application_no` (otomatik `2026/xxxx`), `dispute_subtype`, `current_phase` (1–8), `round_number`.
- `case_parties`: `user_id` (davet kabul edilince doldurulur), `invite_token`, `invite_status` (`pending|accepted`), `party_role` (`A|B|C...`). RLS: taraf yalnızca `user_id = auth.uid()` olan satırı görür; arabulucu (cases.assigned_mediator_id) tümünü görür.
- `party_analyses` (YENİ): `case_id`, `party_id`, `user_id`, `analysis_jsonb` (güçlü/zayıf/risk/fırsat/emsal), `discovery_questions jsonb`, `prep_notes jsonb`. RLS: yalnız `user_id = auth.uid()` veya arabulucu.
- `common_ground_reports` (YENİ): `case_id`, `report_jsonb`, `strategy_jsonb`, `round_number`. RLS: yalnız arabulucu.
- `case_documents`: zaten var; RLS sertleştirilir → taraf sadece kendi yüklediğini, arabulucu tümünü görür.
- `case_discovery_questions`: party-scoped RLS.
- `case_sessions` (mevcut): `meeting_type` (`pre|main|caucus`), `participants[]`, `video_url`, `prep_notes_generated` bool.
- `agreement_documents` (YENİ): üretilen 5 resmi belge PDF metadata + storage path.
- `negotiation_rounds` (YENİ): `case_id`, `round_no`, `status`, `accepted_by[]`, `rejected_by[]`.

Yardımcı fonksiyonlar:
- `is_case_mediator(case_id, user_id)` SECURITY DEFINER.
- `is_case_party(case_id, user_id)` SECURITY DEFINER.
- Tüm RLS politikaları bu iki helper üzerinden yazılır (recursion'dan kaçınmak için).

## Edge Functions

- `party-confidential-analysis` (YENİ): Tek tarafın belgeleri + cevapları → Gemini ile gizli analiz. `party_analyses` tablosuna yazar. JWT doğrulaması; sadece o tarafın user_id'siyle çağrılabilir.
- `common-ground-report` (YENİ): Arabulucu çağırır; iki tarafın analizini birleştirip ortak zemin + strateji üretir. `common_ground_reports`'a yazar.
- `mediator-strategy-suggestion` (YENİ): "AI Önerisi Al" butonu — o ana kadarki tüm veri ile yeni öneri.
- `generate-prep-notes` (YENİ): Toplantı öncesi her tarafa ayrı hazırlık notu (party-scoped).
- `generate-agreement-documents` (YENİ): Anlaşma → 5 Adalet Bakanlığı formatında PDF (mevcut `pdfTemplates.ts` şablonlarını kullanır).
- `send-party-invite` (YENİ): Resend ile davet e-postası + invite_token.
- Mevcut `legal-reasoning-gemini` ve `mediation-ai` korunur ama yeni akışa adapte edilir.

> Not: `VITE_GEMINI_API_KEY` istemcide ifşa olur. Güvenlik için tüm AI çağrıları edge function arkasında `GEMINI_API_KEY` (zaten secret) ile yapılır. Kullanıcı isteğindeki `VITE_GEMINI_API_KEY` ifadesini bu şekilde uyguluyoruz; aksi halde KVKK ve sızıntı riski oluşur.

## Frontend Yapısı

`src/pages/MediationEngine.tsx` — role-aware ana sayfa. `useAuth` + dava rolüne göre üç görünüm:

```text
MediationEngine
├── MediatorView/
│   ├── PhaseStepper (1-8)
│   ├── CaseHeader (UYAP no, başvuru no, tarih)
│   ├── PartiesManager (dinamik ekle/davet)
│   ├── DocumentsAllPanel (tüm belgeler)
│   ├── DualAnalysisPanel (A | B yan yana)
│   ├── CommonGroundPanel (AI rapor + "AI Önerisi Al")
│   ├── SessionsPanel (ön/ana/özel görüşme)
│   ├── ExpertPanel
│   ├── RoundsPanel
│   └── AgreementPanel (5 belge üretimi)
├── PartyView/
│   ├── MyDocumentsUpload
│   ├── MyMissingDocsList (AI)
│   ├── MyConfidentialAnalysis
│   ├── MyDiscoveryQuestions (5 soru)
│   ├── MyMeetings + PrepNotes
│   └── MyProposals (kabul/red)
└── InviteAcceptPage (token ile)
```

Yeni bileşenler `src/components/mediation/` altına: `PartiesManager.tsx`, `DualAnalysisPanel.tsx`, `CommonGroundPanel.tsx`, `ConfidentialAnalysisCard.tsx`, `DiscoveryQuestionsForm.tsx`, `MeetingPrepNotes.tsx`, `AgreementDocsPanel.tsx`, `PhaseStepper.tsx`.

## Tema

`src/index.css` semantic tokens güncellenir: primary `#2D3580` (lacivert), accent `#C4A882` (bej). Mevcut bileşenler bu tokenları zaten kullanıyor.

## Güvenlik

- Tüm yeni tablolarda RLS + GRANT (authenticated/service_role).
- Taraf-A asla Taraf-B'nin satırını okuyamaz (politika: `user_id = auth.uid()`).
- Arabulucu erişimi `is_case_mediator()` helper'ı ile.
- AI çağrıları edge function arkasında — `GEMINI_API_KEY` istemciye sızmaz.
- KVKK onayı `/auth` Sign Up'ta zaten zorunlu (mevcut).

## Uygulama Sırası

1. **Migration** — yeni tablolar, kolonlar, helper fonksiyonlar, RLS politikaları, GRANT'ler.
2. **Edge Functions** — 6 yeni fonksiyon + `config.toml` güncelleme.
3. **Theme** — `index.css` lacivert/bej tokenları.
4. **MediationEngine yeniden yazımı** — role-aware ana sayfa.
5. **Bileşenler** — `src/components/mediation/` altında 8 yeni bileşen.
6. **Invite akışı** — `/invite/:token` rotası + `App.tsx` güncellenir.
7. **Smoke test** — playwright ile arabulucu/taraf akışı doğrulanır.

## Korunanlar

- `AppNavbar`, mevcut Supabase entegrasyonu, auth akışı, `pdfTemplates.ts`, dil sistemi, mevcut `experts` tablosu/akışı.

## Açık Sorular

1. **Davet e-postası**: Yeni taraf hesap oluşturmamışsa davet linki `/auth?invite=<token>` üzerinden kayıt → otomatik `case_parties.user_id` bağlama akışı doğru mu?
2. **VITE_GEMINI_API_KEY**: Güvenlik için tüm AI çağrılarını edge function arkasında tutuyorum (istemciye Gemini anahtarı koymuyorum). Onaylıyor musunuz?
3. **Kapsam büyüklüğü**: Bu plan 1 turda iskeleti kurar (migration + edge functions + ana bileşenler). Ortak zemin AI prompt'ları, bilirkişi entegrasyonu detayı ve dijital imza için 2. tur gerekebilir — onay verir misiniz yoksa hepsi tek seferde mi?
