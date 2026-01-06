import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
const translations: Record<Language, Record<string, string>> = {
  tr: {
    // Navigation & Common
    'nav.backToHome': '← Ana sayfaya dön',
    'nav.step': 'Adım',
    'nav.of': '/',
    'nav.decision': 'Karar',
    'nav.aiExploration': 'AI Keşfi',
    'nav.scheduling': 'Oturum Planla',
    'common.back': 'Geri',
    'common.continue': 'Devam',
    'common.submit': 'Gönder',
    'common.processing': 'İşleniyor...',
    'common.submitIntake': 'Başvuruyu Gönder',

    // Landing Page
    'landing.badge': 'Ön-Arabuluculuk Başvuru Aracı',
    'landing.heroTitle1': 'Çözüm bulmadan önce',
    'landing.heroTitle2': 'netlik bul',
    'landing.heroDescription': 'Sakin ve tarafsız başvuru sürecimizle uyuşmazlığınızı yapılandırın ve arabuluculuğa hazırlanın. Dinlenin. Anlayış bulun.',
    'landing.disclaimer': 'Önemli: Bu bir arabuluculuk başvuru aracıdır, hukuki danışmanlık değildir. Çözüme hazırlanmanıza yardımcı oluruz, davalaşmaya değil.',
    'landing.startIntake': 'Başvuruyu Başlat',
    'landing.learnMore': 'Daha Fazla',
    'landing.howItWorks': 'Nasıl Çalışır',
    'landing.howItWorksDesc': 'Arabuluculuğa hazırlanmanıza yardımcı olacak basit ve saygılı bir süreç',
    'landing.shareStory': 'Hikayenizi Paylaşın',
    'landing.shareStoryDesc': 'Uyuşmazlığınız hakkında yönlendirilmiş sorular cevaplayın. Ne olduğunu ve neye ihtiyacınız olduğunu ifade etmenize yardımcı oluruz.',
    'landing.getClarity': 'Netlik Edinin',
    'landing.getClarityDesc': 'Temel sorunları suçlama veya önyargı olmadan belirleyen tarafsız bir özet alın.',
    'landing.choosePath': 'Yolunuzu Seçin',
    'landing.choosePathDesc': 'İnsan arabulucu ile devam etmeyi veya AI destekli seçenekleri keşfetmeyi tercih edin.',
    'landing.privacy': 'Gizlilik',
    'landing.privacyTitle': 'Gizliliğiniz Önemli',
    'landing.privacyDesc': 'Gizlilik, arabuluculuğun temel ilkesidir. Bilgileriniz en yüksek özenle işlenir ve oturumunuzdan sonra saklanmaz.',
    'landing.noDataRetention': 'Veri Saklanmaz',
    'landing.noDataRetentionDesc': 'Başvuru verileriniz kalıcı olarak saklanmaz',
    'landing.neutralProcessing': 'Tarafsız İşleme',
    'landing.neutralProcessingDesc': 'AI yapılandırır, asla yargılamaz',
    'landing.confidential': 'Gizli',
    'landing.confidentialDesc': 'Bilgileriniz taraflar arasında kalır',
    'landing.readyTitle': 'İlk adımı atmaya hazır mısınız?',
    'landing.readyDesc': 'Ön-arabuluculuk başvurunuzu yaklaşık 10 dakikada tamamlayın.',
    'landing.beginIntake': 'Başvuru Sürecini Başlat',
    'landing.footerDisclaimer': 'Bu araç arabuluculuk hazırlığı sağlar, hukuki danışmanlık değildir.',

    // Step 1: Dispute Type
    'step1.title': 'Ne tür bir uyuşmazlıkla karşı karşıyasınız?',
    'step1.description': 'Durumunuzu en iyi tanımlayan kategoriyi seçin',
    'step1.commercial': 'Ticari Uyuşmazlık',
    'step1.commercialDesc': 'İş sözleşmeleri, ortaklıklar, ticari işlemler',
    'step1.ip': 'Fikri Mülkiyet',
    'step1.ipDesc': 'Patentler, markalar, telif hakları, ticari sırlar',
    'step1.healthcare': 'Sağlık',
    'step1.healthcareDesc': 'Tıbbi faturalama, sağlayıcı uyuşmazlıkları, bakım anlaşmazlıkları',
    'step1.other': 'Diğer',
    'step1.otherDesc': 'Durumunuzu açıklayın',
    'step1.describeDispute': 'Lütfen uyuşmazlık türünüzü açıklayın',
    'step1.describePlaceholder': 'Uyuşmazlığınızın niteliğini kısaca açıklayın...',

    // Step 2: Parties
    'step2.title': 'Kimler dahil?',
    'step2.description': 'Bu uyuşmazlıktaki tarafları anlamamıza yardımcı olun',
    'step2.aboutYou': 'Sizin Hakkınızda',
    'step2.yourName': 'Adınız veya kuruluşunuz',
    'step2.yourNamePlaceholder': 'Adınızı veya kuruluş adınızı girin',
    'step2.representing': 'Temsil ediyorsunuz',
    'step2.individual': 'Bireysel',
    'step2.business': 'İşletme',
    'step2.aboutOther': 'Diğer Taraf Hakkında',
    'step2.otherName': 'Diğer tarafın adı veya kuruluşu',
    'step2.otherNamePlaceholder': 'Diğer tarafın adını girin',
    'step2.otherPartyIs': 'Diğer taraf',
    'step2.relationship': 'İlişkinizi nasıl tanımlarsınız?',
    'step2.relationshipDesc': 'örn., iş ortakları, müşteri-tedarikçi, işveren-çalışan',
    'step2.relationshipPlaceholder': 'Diğer tarafla ilişkinizi açıklayın...',

    // Step 3: What Happened
    'step3.title': 'Bize ne olduğunu anlatın',
    'step3.description': 'Bakış açınızı paylaşın. Gerçeklere ve duygulara odaklanın.',
    'step3.guidance': 'Yönlendirme:',
    'step3.guidanceText': 'Kendi bakış açınızdan ne olduğunu anlatmaya çalışın. Hissettiklerinizi ifade etmek normaldir. Bu bilgiyi dengeli bir şekilde sunmanıza yardımcı olacağız.',
    'step3.whatHappened': 'Ne oldu?',
    'step3.whatHappenedDesc': 'Bu uyuşmazlığa yol açan durumu açıklayın',
    'step3.whatHappenedPlaceholder': 'Bu uyuşmazlığa yol açan olayları ve koşulları açıklayın...',
    'step3.when': 'Bu ne zaman oldu?',
    'step3.whenDesc': 'Yaklaşık zaman çizelgesi veya önemli tarihler',
    'step3.whenPlaceholder': 'örn., Ocak 2024\'te başladı, Mart\'ta tırmandı...',
    'step3.previousAttempts': 'Daha önce bunu çözmeye çalıştınız mı?',
    'step3.previousAttemptsDesc': 'Önceki çözüm girişimleri',
    'step3.previousAttemptsPlaceholder': 'Bunu çözmek için yaptığınız görüşmeleri, e-postaları veya diğer girişimleri açıklayın...',

    // Step 4: Desired Outcome
    'step4.title': 'Nasıl bir sonuç umuyorsunuz?',
    'step4.description': 'Hedeflerinizi anlamak doğru yolu bulmamıza yardımcı olur',
    'step4.idealOutcome': 'İdeal sonucunuzu tanımlayın',
    'step4.idealOutcomeDesc': 'Sizin için çözüm nasıl görünür?',
    'step4.idealOutcomePlaceholder': 'Başarılı bir çözüm olarak neyi düşünürsünüz açıklayın...',
    'step4.priorities': 'Sizin için en önemli olan nedir?',
    'step4.prioritiesDesc': 'En fazla 3 öncelik seçin',
    'step4.financial': 'Mali Çözüm',
    'step4.relationship': 'İlişkiyi Koruma',
    'step4.speed': 'Hızlı Çözüm',
    'step4.privacy': 'Gizlilik',
    'step4.clarity': 'Net Anlayış',
    'step4.apology': 'Kabul veya Özür',
    'step4.compromise': 'Uzlaşmaya açık mısınız?',
    'step4.compromiseDesc': 'Gerekirse orta yol bulmaya istekli misiniz?',

    // Step 5: Documents
    'step5.title': 'Destekleyici belgeler var mı?',
    'step5.description': 'İsteğe bağlı: Davanızı desteklemek için ilgili belgeleri ekleyin',
    'step5.privacyNote': 'Gizlilik Notu:',
    'step5.privacyNoteText': 'Buraya yüklenen belgeler yalnızca arabuluculuk hazırlığı içindir ve gizli tutulur. Oturumunuzdan sonra saklanmayacaktır.',
    'step5.uploadClick': 'Belge yüklemek için tıklayın',
    'step5.uploadFormats': 'PDF, Word, Metin veya Görseller (maks. 10MB)',
    'step5.uploadedFiles': 'Yüklenen dosyalar:',
    'step5.additionalNotes': 'Ek notlar',
    'step5.additionalNotesDesc': 'Paylaşmak istediğiniz diğer bağlam',
    'step5.additionalNotesPlaceholder': 'Yararlı olabilecek diğer bilgiler...',

    // Step Labels
    'stepLabel.disputeType': 'Uyuşmazlık Türü',
    'stepLabel.parties': 'Taraflar',
    'stepLabel.whatHappened': 'Ne Oldu',
    'stepLabel.outcome': 'Sonuç',
    'stepLabel.documents': 'Belgeler',

    // Decision Step
    'decision.title': 'Bir sonraki adımınızı seçin',
    'decision.description': 'Aşağıda iki ilerleme yolu bulunmaktadır. Her ikisi de bağlayıcı değildir ve arabuluculuk ilkelerine uygundur.',
    'decision.needSummary': 'Devam etmek için önce yapılandırılmış nötr özet oluşturulmalıdır.',
    'decision.backToIntake': 'Başvuruya geri dön',
    'decision.aiTitle': 'AI ile Çözüm Seçeneklerini Keşfet',
    'decision.aiDesc': 'Uyuşmazlık bağlayıcı olmadan analiz edilir; olası çözüm senaryoları üretilir. Karar verilmez, taraf tutulmaz.',
    'decision.aiFeature1': '3–5 çözüm senaryosu',
    'decision.aiFeature2': 'Ortak zemin önerileri',
    'decision.aiFeature3': 'Kısa geri bildirim ile iterasyon',
    'decision.aiButton': 'AI ile devam et',
    'decision.mediatorTitle': 'Bir Arabulucu ile Devam Et',
    'decision.mediatorDesc': 'Dosyanız arabulucuya iletilir. Ön başvuru özeti paylaşılır ve süreç insan odaklı yürütülür.',
    'decision.mediatorFeature1': 'Profesyonel arabulucu atanır',
    'decision.mediatorFeature2': 'Oturum planlaması',
    'decision.mediatorButton': 'Arabulucuya ilet',
    'decision.disclaimer': 'Bu platform hukuki danışmanlık sunmaz. AI çıktıları bağlayıcı değildir ve karar niteliği taşımaz.',

    // AI Exploration
    'aiExploration.title': 'Çözüm Senaryolarını İnceleyin',
    'aiExploration.description': 'AI tarafından önerilen çözüm seçenekleri. Her seçenek için geri bildirim verin.',
    'aiExploration.tradeoffs': 'Dikkate alınacaklar:',
    'aiExploration.good': 'İyi',
    'aiExploration.maybe': 'Belki',
    'aiExploration.no': 'Hayır',
    'aiExploration.progress': 'Değerlendirme',
    'aiExploration.complete': 'Tamamla',
    'aiExploration.disclaimer': 'Bu senaryolar AI tarafından üretilmiştir ve bağlayıcı değildir. Arabuluculuk sürecinde referans olarak kullanılabilir.',

    // Mediator Scheduling
    'scheduling.title': 'Arabuluculuk Oturumu Planla',
    'scheduling.description': 'Arabulucu ile görüşme için uygun zaman dilimlerinizi seçin.',
    'scheduling.yourInfo': 'İletişim Bilgileriniz',
    'scheduling.email': 'E-posta adresiniz',
    'scheduling.emailPlaceholder': 'ornek@email.com',
    'scheduling.phone': 'Telefon numaranız (isteğe bağlı)',
    'scheduling.phonePlaceholder': '+90 5XX XXX XX XX',
    'scheduling.preferredTimes': 'Tercih Ettiğiniz Zamanlar',
    'scheduling.selectSlots': 'En az 2 uygun zaman dilimi seçin',
    'scheduling.weekdays': 'Hafta içi',
    'scheduling.weekends': 'Hafta sonu',
    'scheduling.morning': 'Sabah (09:00-12:00)',
    'scheduling.afternoon': 'Öğleden sonra (13:00-17:00)',
    'scheduling.evening': 'Akşam (18:00-20:00)',
    'scheduling.notes': 'Ek notlar',
    'scheduling.notesPlaceholder': 'Arabulucu ile paylaşmak istediğiniz başka bilgiler...',
    'scheduling.submit': 'Oturum Talebini Gönder',
    'scheduling.success': 'Talebiniz Alındı',
    'scheduling.successDesc': 'Arabulucu en kısa sürede sizinle iletişime geçecektir.',

    // Toasts / Validation
    'toast.selectDisputeType': 'Lütfen bir uyuşmazlık türü seçin',
    'toast.selectDisputeTypeDesc': 'Bu, durumunuzu daha iyi anlamamıza yardımcı olur.',
    'toast.describeDispute': 'Lütfen uyuşmazlık türünüzü açıklayın',
    'toast.provideNames': 'Lütfen her iki tarafın adını girin',
    'toast.provideNamesDesc': 'Kimlerin dahil olduğunu bilmemiz gerekiyor.',
    'toast.describeHappened': 'Lütfen ne olduğunu açıklayın',
    'toast.describeHappenedDesc': 'Durum hakkındaki bakış açınızı paylaşın.',
    'toast.describeOutcome': 'Lütfen istediğiniz sonucu açıklayın',
    'toast.describeOutcomeDesc': 'Sizin için çözüm nasıl görünür?',
    'toast.error': 'Bir şeyler yanlış gitti',
    'toast.tryAgain': 'Lütfen tekrar deneyin.',
  },
  en: {
    // Navigation & Common
    'nav.backToHome': '← Back to home',
    'nav.step': 'Step',
    'nav.of': 'of',
    'nav.decision': 'Decision',
    'nav.aiExploration': 'AI Exploration',
    'nav.scheduling': 'Schedule Session',
    'common.back': 'Back',
    'common.continue': 'Continue',
    'common.submit': 'Submit',
    'common.processing': 'Processing...',
    'common.submitIntake': 'Submit Intake',

    // Landing Page
    'landing.badge': 'Pre-Mediation Intake Tool',
    'landing.heroTitle1': 'Find clarity before',
    'landing.heroTitle2': 'finding resolution',
    'landing.heroDescription': 'Structure your dispute and prepare for mediation with our calm, neutral intake process. Be heard. Find understanding.',
    'landing.disclaimer': 'Important: This is a mediation intake tool, not legal advice. We help you prepare for resolution, not litigation.',
    'landing.startIntake': 'Start Your Intake',
    'landing.learnMore': 'Learn More',
    'landing.howItWorks': 'How It Works',
    'landing.howItWorksDesc': 'A simple, respectful process to help you prepare for mediation',
    'landing.shareStory': 'Share Your Story',
    'landing.shareStoryDesc': 'Answer guided questions about your dispute. We help you articulate what happened and what you need.',
    'landing.getClarity': 'Get Clarity',
    'landing.getClarityDesc': 'Receive a neutral summary that identifies core issues without accusation or bias.',
    'landing.choosePath': 'Choose Your Path',
    'landing.choosePathDesc': 'Decide whether to proceed with a human mediator or explore AI-assisted options.',
    'landing.privacy': 'Privacy',
    'landing.privacyTitle': 'Your Privacy Matters',
    'landing.privacyDesc': 'Confidentiality is a core principle of mediation. Your information is treated with the utmost care and is not retained beyond your session.',
    'landing.noDataRetention': 'No Data Retention',
    'landing.noDataRetentionDesc': 'Your intake data is not stored permanently',
    'landing.neutralProcessing': 'Neutral Processing',
    'landing.neutralProcessingDesc': 'AI helps structure, never judges',
    'landing.confidential': 'Confidential',
    'landing.confidentialDesc': 'Your information stays between parties',
    'landing.readyTitle': 'Ready to take the first step?',
    'landing.readyDesc': 'Start your pre-mediation intake in about 10 minutes.',
    'landing.beginIntake': 'Begin Intake Process',
    'landing.footerDisclaimer': 'This tool provides mediation preparation, not legal advice.',

    // Step 1: Dispute Type
    'step1.title': 'What type of dispute are you facing?',
    'step1.description': 'Select the category that best describes your situation',
    'step1.commercial': 'Commercial Dispute',
    'step1.commercialDesc': 'Business contracts, partnerships, transactions',
    'step1.ip': 'Intellectual Property',
    'step1.ipDesc': 'Patents, trademarks, copyrights, trade secrets',
    'step1.healthcare': 'Healthcare',
    'step1.healthcareDesc': 'Medical billing, provider disputes, care disagreements',
    'step1.other': 'Other',
    'step1.otherDesc': 'Describe your situation',
    'step1.describeDispute': 'Please describe your dispute type',
    'step1.describePlaceholder': 'Briefly describe the nature of your dispute...',

    // Step 2: Parties
    'step2.title': 'Who is involved?',
    'step2.description': 'Help us understand the parties in this dispute',
    'step2.aboutYou': 'About You',
    'step2.yourName': 'Your name or organization',
    'step2.yourNamePlaceholder': 'Enter your name or organization name',
    'step2.representing': 'You are representing',
    'step2.individual': 'Individual',
    'step2.business': 'Business',
    'step2.aboutOther': 'About the Other Party',
    'step2.otherName': "Other party's name or organization",
    'step2.otherNamePlaceholder': "Enter the other party's name",
    'step2.otherPartyIs': 'The other party is',
    'step2.relationship': 'How would you describe your relationship?',
    'step2.relationshipDesc': 'e.g., business partners, client-vendor, employer-employee',
    'step2.relationshipPlaceholder': 'Describe your relationship with the other party...',

    // Step 3: What Happened
    'step3.title': 'Tell us what happened',
    'step3.description': 'Share your perspective. Focus on facts and feelings.',
    'step3.guidance': 'Guidance:',
    'step3.guidanceText': "Try to describe what happened from your point of view. It's okay to express how you felt. We'll help present this information in a balanced way.",
    'step3.whatHappened': 'What happened?',
    'step3.whatHappenedDesc': 'Describe the situation that led to this dispute',
    'step3.whatHappenedPlaceholder': 'Describe the events and circumstances that led to this dispute...',
    'step3.when': 'When did this happen?',
    'step3.whenDesc': 'Approximate timeline or key dates',
    'step3.whenPlaceholder': 'e.g., Started in January 2024, escalated in March...',
    'step3.previousAttempts': 'Have you tried to resolve this before?',
    'step3.previousAttemptsDesc': 'Any previous attempts at resolution',
    'step3.previousAttemptsPlaceholder': 'Describe any conversations, emails, or other attempts to resolve this...',

    // Step 4: Desired Outcome
    'step4.title': 'What outcome are you hoping for?',
    'step4.description': 'Understanding your goals helps us find the right path forward',
    'step4.idealOutcome': 'Describe your ideal outcome',
    'step4.idealOutcomeDesc': 'What would resolution look like for you?',
    'step4.idealOutcomePlaceholder': 'Describe what you would consider a successful resolution...',
    'step4.priorities': 'What matters most to you?',
    'step4.prioritiesDesc': 'Select up to 3 priorities',
    'step4.financial': 'Financial Resolution',
    'step4.relationship': 'Preserve Relationship',
    'step4.speed': 'Quick Resolution',
    'step4.privacy': 'Privacy & Confidentiality',
    'step4.clarity': 'Clear Understanding',
    'step4.apology': 'Acknowledgment or Apology',
    'step4.compromise': 'Open to compromise?',
    'step4.compromiseDesc': 'Are you willing to find middle ground if needed?',

    // Step 5: Documents
    'step5.title': 'Any supporting documents?',
    'step5.description': 'Optional: Add relevant documents to support your case',
    'step5.privacyNote': 'Privacy Note:',
    'step5.privacyNoteText': 'Documents uploaded here are for mediation preparation only and are treated as confidential. They will not be retained after your session.',
    'step5.uploadClick': 'Click to upload documents',
    'step5.uploadFormats': 'PDF, Word, Text, or Images (max 10MB each)',
    'step5.uploadedFiles': 'Uploaded files:',
    'step5.additionalNotes': 'Additional notes',
    'step5.additionalNotesDesc': 'Any other context you\'d like to share',
    'step5.additionalNotesPlaceholder': 'Any other information that might be helpful...',

    // Step Labels
    'stepLabel.disputeType': 'Dispute Type',
    'stepLabel.parties': 'Parties',
    'stepLabel.whatHappened': 'What Happened',
    'stepLabel.outcome': 'Outcome',
    'stepLabel.documents': 'Documents',

    // Decision Step
    'decision.title': 'Choose your next step',
    'decision.description': 'Below are two paths forward. Both are non-binding and aligned with mediation principles.',
    'decision.needSummary': 'A structured neutral summary must be generated first to proceed.',
    'decision.backToIntake': 'Back to intake',
    'decision.aiTitle': 'Explore Solution Options with AI',
    'decision.aiDesc': 'The dispute is analyzed non-bindingly; possible solution scenarios are generated. No decisions are made, no sides are taken.',
    'decision.aiFeature1': '3–5 solution scenarios',
    'decision.aiFeature2': 'Common ground suggestions',
    'decision.aiFeature3': 'Iteration with brief feedback',
    'decision.aiButton': 'Continue with AI',
    'decision.mediatorTitle': 'Continue with a Mediator',
    'decision.mediatorDesc': 'Your file is forwarded to a mediator. The preliminary application summary is shared and the process is conducted in a human-centered manner.',
    'decision.mediatorFeature1': 'Professional mediator assigned',
    'decision.mediatorFeature2': 'Session scheduling',
    'decision.mediatorButton': 'Forward to mediator',
    'decision.disclaimer': 'This platform does not provide legal advice. AI outputs are not binding and do not constitute decisions.',

    // AI Exploration
    'aiExploration.title': 'Review Solution Scenarios',
    'aiExploration.description': 'Solution options suggested by AI. Provide feedback for each option.',
    'aiExploration.tradeoffs': 'Considerations:',
    'aiExploration.good': 'Good',
    'aiExploration.maybe': 'Maybe',
    'aiExploration.no': 'No',
    'aiExploration.progress': 'Progress',
    'aiExploration.complete': 'Complete',
    'aiExploration.disclaimer': 'These scenarios are AI-generated and non-binding. They can be used as reference in the mediation process.',

    // Mediator Scheduling
    'scheduling.title': 'Schedule Mediation Session',
    'scheduling.description': 'Select your available time slots for a meeting with the mediator.',
    'scheduling.yourInfo': 'Your Contact Information',
    'scheduling.email': 'Your email address',
    'scheduling.emailPlaceholder': 'example@email.com',
    'scheduling.phone': 'Your phone number (optional)',
    'scheduling.phonePlaceholder': '+1 XXX XXX XXXX',
    'scheduling.preferredTimes': 'Preferred Times',
    'scheduling.selectSlots': 'Select at least 2 available time slots',
    'scheduling.weekdays': 'Weekdays',
    'scheduling.weekends': 'Weekends',
    'scheduling.morning': 'Morning (09:00-12:00)',
    'scheduling.afternoon': 'Afternoon (13:00-17:00)',
    'scheduling.evening': 'Evening (18:00-20:00)',
    'scheduling.notes': 'Additional notes',
    'scheduling.notesPlaceholder': 'Any other information you\'d like to share with the mediator...',
    'scheduling.submit': 'Submit Session Request',
    'scheduling.success': 'Request Received',
    'scheduling.successDesc': 'The mediator will contact you shortly.',

    // Toasts / Validation
    'toast.selectDisputeType': 'Please select a dispute type',
    'toast.selectDisputeTypeDesc': 'This helps us understand your situation better.',
    'toast.describeDispute': 'Please describe your dispute type',
    'toast.provideNames': 'Please provide both party names',
    'toast.provideNamesDesc': 'We need to know who is involved.',
    'toast.describeHappened': 'Please describe what happened',
    'toast.describeHappenedDesc': 'Share your perspective on the situation.',
    'toast.describeOutcome': 'Please describe your desired outcome',
    'toast.describeOutcomeDesc': 'What would resolution look like for you?',
    'toast.error': 'Something went wrong',
    'toast.tryAgain': 'Please try again.',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'tr'; // Default to Turkish
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
