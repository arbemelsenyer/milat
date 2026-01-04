import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';

export default function SummaryPage() {
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const navigate = useNavigate();

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

  if (!summary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-4xl py-4 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              MediationPath
            </span>
          </Link>
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
                Intake Complete
              </h1>
              <p className="text-muted-foreground">
                Your case has been structured neutrally. Review the summary below.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Case ID: <span className="font-mono text-foreground">{summary.id}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Case summary card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8 animate-fade-in-up">
          <div className="border-b border-border px-6 py-4 bg-secondary/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Neutral Case Summary</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Dispute type */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Dispute Type
              </h3>
              <p className="text-foreground font-medium">{summary.disputeType}</p>
            </div>

            {/* Parties */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Parties Involved
              </h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Initiating Party</p>
                  <p className="font-medium text-foreground">{summary.parties.initiator}</p>
                </div>
                <div className="flex-1 bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Other Party</p>
                  <p className="font-medium text-foreground">{summary.parties.respondent}</p>
                </div>
              </div>
            </div>

            {/* Core themes */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Core Themes Identified
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
                Neutral Summary
              </h3>
              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <p className="text-foreground leading-relaxed">{summary.neutralSummary}</p>
              </div>
            </div>

            {/* Key issues */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Key Issues to Address
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
                Potential Resolution Pathways
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
            What would you like to do next?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <DecisionCard
              icon={<Users className="w-6 h-6" />}
              title="Connect with a Mediator"
              description="Proceed with a trained human mediator who will facilitate dialogue between parties."
              buttonText="Request Mediator"
              onClick={() => {
                // In production, this would route to mediator booking
                alert('Mediator request feature coming soon!');
              }}
              primary
            />
            <DecisionCard
              icon={<Bot className="w-6 h-6" />}
              title="Explore AI Options"
              description="Continue with AI-assisted option exploration. Non-binding suggestions to consider."
              buttonText="Explore Options"
              onClick={() => {
                // In production, this would route to AI option generation
                alert('AI option exploration coming soon!');
              }}
            />
          </div>
        </div>

        {/* Download/print option */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground"
            onClick={() => window.print()}
          >
            <Download className="w-4 h-4" />
            Download Summary
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Reminder:</strong> This summary is a preparation tool, not legal advice. 
            Any resolution reached through mediation is the decision of the parties involved.
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
