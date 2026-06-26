import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Users, MessageCircle, Lock, LogIn } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function Landing() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>MediPact AI — Pre-Mediation Intake & Online Dispute Resolution</title>
        <meta name="description" content="Structure your dispute with a calm, neutral pre-mediation intake. Get an AI-assisted summary and choose AI exploration or a human mediator." />
        <link rel="canonical" href="/" />
        <meta property="og:title" content="MediPact AI — Pre-Mediation Intake & Online Dispute Resolution" />
        <meta property="og:description" content="Structure your dispute with a calm, neutral pre-mediation intake. Choose AI exploration or a human mediator." />
        <meta property="og:url" content="/" />
      </Helmet>
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-6xl py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              MediPact AI
            </span>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6">
            <a href="#how-it-works" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.howItWorks')}
            </a>
            <a href="#privacy" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.privacy')}
            </a>
            <LanguageToggle />
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">
                <LogIn className="w-4 h-4 mr-2" />
                {language === 'tr' ? 'Giriş' : 'Login'}
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl px-4 text-center">
          <div className="inline-block bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6 animate-fade-in">
            {t('landing.badge')}
          </div>
          
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in-up">
            {t('landing.heroTitle1')}
            <span className="text-primary block">{t('landing.heroTitle2')}</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {t('landing.heroDescription')}
          </p>

          {/* Important disclaimer */}
          <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-8 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-sm text-muted-foreground">
              {t('landing.disclaimer')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button asChild size="lg" className="gap-2 text-base px-8">
              <Link to="/mediation-engine">
                {t('landing.startIntake')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <a href="#how-it-works">{language === 'tr' ? 'Arabuluculuk Nasıl Çalışır' : 'How Mediation Works'}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="py-16 bg-card border-y border-border">
        <div className="container max-w-5xl px-4">
          <h2 className="font-display text-3xl font-bold text-center text-foreground mb-4">
            {t('landing.howItWorks')}
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
            {t('landing.howItWorksDesc')}
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title={t('landing.shareStory')}
              description={t('landing.shareStoryDesc')}
              step={1}
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title={t('landing.getClarity')}
              description={t('landing.getClarityDesc')}
              step={2}
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title={t('landing.choosePath')}
              description={t('landing.choosePathDesc')}
              step={3}
            />
          </div>
        </div>
      </section>

      {/* Privacy section */}
      <section id="privacy" className="py-16">
        <div className="container max-w-4xl px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-6">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-4">
            {t('landing.privacyTitle')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('landing.privacyDesc')}
          </p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="font-medium text-foreground">{t('landing.noDataRetention')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('landing.noDataRetentionDesc')}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="font-medium text-foreground">{t('landing.neutralProcessing')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('landing.neutralProcessingDesc')}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="font-medium text-foreground">{t('landing.confidential')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('landing.confidentialDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t('landing.readyTitle')}
          </h2>
          <p className="text-muted-foreground mb-8">
            {t('landing.readyDesc')}
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/mediation-engine">
              {t('landing.beginIntake')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container max-w-5xl px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <MessageCircle className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-display font-medium text-foreground">MediPact AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('landing.footerDisclaimer')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  step,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  step: number;
}) {
  return (
    <div className="relative bg-background border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
      <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
        {step}
      </div>
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
