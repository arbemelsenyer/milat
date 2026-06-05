import { Helmet } from 'react-helmet-async';
import { IntakeForm } from '@/components/intake/IntakeForm';

export default function IntakePage() {
  return (
    <>
      <Helmet>
        <title>Start Your Mediation Intake | MediationPath</title>
        <meta name="description" content="Walk through a neutral, structured intake to describe your dispute, parties, and desired outcome. Generate an AI-assisted case summary." />
        <link rel="canonical" href="/intake" />
        <meta property="og:title" content="Start Your Mediation Intake | MediationPath" />
        <meta property="og:description" content="A calm, step-by-step intake to structure your dispute and prepare for resolution." />
        <meta property="og:url" content="/intake" />
      </Helmet>
      <IntakeForm />
    </>
  );
}
