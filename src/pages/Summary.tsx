import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CaseSummary } from '@/types/intake';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  FileText,
  Users,
  Bot,
  ArrowRight,
  Download,
  MessageCircle,
  FileDown,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { exportToPdf, downloadAsHtml } from '@/lib/pdf-export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function SummaryPage() {
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    const stored = sessionStorage.getItem('caseSummary');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.createdAt = new Date(parsed.createdAt);
      setSummary(parsed);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleExportPdf = () => {
    if (summary) {
      exportToPdf(summary, language);
    }
  };

  const handleDownloadHtml = () => {
    if (summary) {
      downloadAsHtml(summary, language);
    }
  };

  const labels = language === 'en'
    ? {
        loading: 'Loading...',
        intakeComplete: 'Intake Complete',
        intakeCompleteDesc: 'Your case has been structured neutrally. Review the summary below.',
        caseId: 'Case ID',
        neutralSummary: 'Neutral Case Summary',
        disputeType: 'Dispute Type',
        partiesInvolved: 'Parties Involved',
        initiatingParty: 'Initiating Party',
        otherParty: 'Other Party',
        coreThemes: 'Core Themes Identified',
        neutralSummaryLabel: 'Neutral Summary',
        keyIssues: 'Key Issues to Address',
        potentialPathways: 'Potential Resolution Pathways',
        whatNext: 'What would you like to do next?',
        connectMediator: 'Connect with a Mediator',
        connectMediatorDesc: 'Proceed with a trained human mediator who will facilitate dialogue between parties.',
        requestMediator: 'Request Mediator',
        exploreAi: 'Explore AI Options',
        exploreAiDesc: 'Continue with AI-assisted option exploration. Non-binding suggestions to consider.',
        exploreOptions: 'Explore Options',
        downloadSummary: 'Download Summary',
        printPdf: 'Print / Save as PDF',
        downloadHtml: 'Download as HTML',
        disclaimer: 'Reminder: This summary is a preparation tool, not legal advice. Any resolution reached through mediation is the decision of the parties involved.',
      }
    : {
        loading: 'Yükleniyor...',
        intakeComplete: 'Başvuru Tamamlandı',
        intakeCompleteDesc: 'Başvurunuz tarafsız olarak yapılandırıldı. Aşağıdaki özeti inceleyin.',
        caseId: 'Dosya No',
        neutralSummary: 'Tarafsız Uyuşmazlık Özeti',
        disputeType: 'Uyuşmazlık Türü',
        partiesInvolved: 'Taraflar',
        initiatingParty: 'Başvuran Taraf',
        otherParty: 'Diğer Taraf',
        coreThemes: 'Temel Temalar',
        neutralSummaryLabel: 'Tarafsız Özet',
        keyIssues: 'Ele Alınacak Konular',
        potentialPathways: 'Potansiyel Çözüm Yolları',
        whatNext: 'Şimdi ne yapmak istersiniz?',
        connectMediator: 'Arabulucu ile Devam Et',
        connectMediatorDesc: 'Eğitimli bir arabulucu taraflar arasında diyalog sürecini yönetecektir.',
        requestMediator: 'Arabulucu Talep Et',
        exploreAi: 'AI Seçeneklerini Keşfet',
        exploreAiDesc: 'AI destekli seçenek keşfine devam edin. Bağlayıcı olmayan öneriler.',
        exploreOptions: 'Seçenekleri Keşfet',
        downloadSummary: 'Özeti İndir',
        printPdf: 'Yazdır / PDF Olarak Kaydet',
        downloadHtml: 'HTML Olarak İndir',
        disclaimer: 'Hatırlatma: Bu özet bir hazırlık aracıdır, hukuki danışmanlık değildir. Arabuluculuk yoluyla ulaşılan herhangi bir çözüm, ilgili tarafların kararıdır.',
      };

  if (!summary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{labels.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Your Neutral Case Summary | MediPact AI</title>
        <meta name="description" content="Review your AI-generated neutral case summary, key issues, and potential resolution pathways. Download as PDF or HTML." />
        <link rel="canonical" href="/summary" />
        <meta name="robots" content="noindex" />
      </Helmet>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-4xl py-4 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              MediPact AI
            </span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="container max-w-3xl py-8 px-4">
        {/* Success banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-8 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                {labels.intakeComplete}
              </h1>
              <p className="text-muted-foreground">
                {labels.intakeCompleteDesc}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {labels.caseId}: <span className="font-mono text-foreground">{summary.id}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Case summary card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8 animate-fade-in-up">
          <div className="border-b border-border px-6 py-4 bg-secondary/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{labels.neutralSummary}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <h2 className="sr-only">{labels.neutralSummary}</h2>
            {/* Dispute type */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {labels.disputeType}
              </h3>
              <p className="text-foreground font-medium">{summary.disputeType}</p>
            </div>

            {/* Parties */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {labels.partiesInvolved}
              </h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{labels.initiatingParty}</p>
                  <p className="font-medium text-foreground">{summary.parties.initiator}</p>
                </div>
                <div className="flex-1 bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{labels.otherParty}</p>
                  <p className="font-medium text-foreground">{summary.parties.respondent}</p>
                </div>
              </div>
            </div>

            {/* Core themes */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {labels.coreThemes}
              </h3>
              <div className="flex flex-wrap gap-2">
                {summary.coreThemes.map((theme, index) => (
                  <span
                    key={index}
                    className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>

            {/* Neutral summary */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {labels.neutralSummaryLabel}
              </h3>
              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <p className="text-foreground leading-relaxed">{summary.neutralSummary}</p>
              </div>
            </div>

            {/* Key issues */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {labels.keyIssues}
              </h3>
              <ul className="space-y-2">
                {summary.keyIssues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium">{index + 1}</span>
                    </div>
                    <span className="text-foreground">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Potential pathways */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {labels.potentialPathways}
              </h3>
              <ul className="space-y-2">
                {summary.potentialPathways.map((pathway, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-foreground"
                  >
                    <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                    {pathway}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Decision node */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display text-xl font-semibold text-foreground mb-4 text-center">
            {labels.whatNext}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <DecisionCard
              icon={<Users className="w-6 h-6" />}
              title={labels.connectMediator}
              description={labels.connectMediatorDesc}
              buttonText={labels.requestMediator}
              onClick={() => navigate('/intake')}
              primary
            />
            <DecisionCard
              icon={<Bot className="w-6 h-6" />}
              title={labels.exploreAi}
              description={labels.exploreAiDesc}
              buttonText={labels.exploreOptions}
              onClick={() => navigate('/intake')}
            />
          </div>
        </div>

        {/* Download/export options */}
        <div className="mt-8 text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {labels.downloadSummary}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={handleExportPdf} className="gap-2 cursor-pointer">
                <FileDown className="w-4 h-4" />
                {labels.printPdf}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadHtml} className="gap-2 cursor-pointer">
                <FileText className="w-4 h-4" />
                {labels.downloadHtml}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            <strong>{language === 'tr' ? 'Hatırlatma:' : 'Reminder:'}</strong> {labels.disclaimer.replace('Reminder: ', '').replace('Hatırlatma: ', '')}
          </p>
        </div>
      </main>
    </div>
  );
}

function DecisionCard({
  icon,
  title,
  description,
  buttonText,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-6 border ${
        primary
          ? 'bg-primary/5 border-primary/30'
          : 'bg-card border-border'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
          primary
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-muted-foreground'
        }`}
      >
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Button
        onClick={onClick}
        variant={primary ? 'default' : 'outline'}
        className="w-full gap-2"
      >
        {buttonText}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
