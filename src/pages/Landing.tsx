import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Users, MessageCircle, Lock } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-6xl py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              MediationPath
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl px-4 text-center">
          <div className="inline-block bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6 animate-fade-in">
            Pre-Mediation Intake Tool
          </div>
          
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in-up">
            Find clarity before
            <span className="text-primary block">finding resolution</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Structure your dispute and prepare for mediation with our calm, 
            neutral intake process. Be heard. Find understanding.
          </p>

          {/* Important disclaimer */}
          <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-8 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Important:</strong> This is a mediation intake tool, 
              not legal advice. We help you prepare for resolution, not litigation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button asChild size="lg" className="gap-2 text-base px-8">
              <Link to="/intake">
                Start Your Intake
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <a href="#how-it-works">Learn More</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="py-16 bg-card border-y border-border">
        <div className="container max-w-5xl px-4">
          <h2 className="font-display text-3xl font-bold text-center text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
            A simple, respectful process to help you prepare for mediation
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="Share Your Story"
              description="Answer guided questions about your dispute. We help you articulate what happened and what you need."
              step={1}
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Get Clarity"
              description="Receive a neutral summary that identifies core issues without accusation or bias."
              step={2}
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Choose Your Path"
              description="Decide whether to proceed with a human mediator or explore AI-assisted options."
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
            Your Privacy Matters
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Confidentiality is a core principle of mediation. Your information is treated 
            with the utmost care and is not retained beyond your session.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="font-medium text-foreground">No Data Retention</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your intake data is not stored permanently
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="font-medium text-foreground">Neutral Processing</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI helps structure, never judges
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="font-medium text-foreground">Confidential</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your information stays between parties
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to take the first step?
          </h2>
          <p className="text-muted-foreground mb-8">
            Start your pre-mediation intake in about 10 minutes.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/intake">
              Begin Intake Process
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container max-w-5xl px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <MessageCircle className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-display font-medium text-foreground">MediationPath</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This tool provides mediation preparation, not legal advice.
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
