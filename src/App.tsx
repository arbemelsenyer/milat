import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Landing from "./pages/Landing";
import SummaryPage from "./pages/Summary";
import AuthPage from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import MediatorDashboard from "./pages/MediatorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ExpertWitness from "./pages/ExpertWitness";
import LegalPrecedents from "./pages/LegalPrecedents";
import AgreementGenerator from "./pages/AgreementGenerator";
import MediationEngine from "./pages/MediationEngine";
import CaseDetail from "./pages/CaseDetail";
import CaseRoom from "./pages/CaseRoom";
import MediatorDetail from "./pages/MediatorDetail";
import NotificationSettings from "./pages/NotificationSettings";
import PrivacyTests from "./pages/PrivacyTests";
import HealthCheck from "./pages/HealthCheck";

// Legacy routes funnel into the unified /legal-reasoning hub
function RedirectToHub({ tab }: { tab?: string }) {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  if (tab) params.set("tab", tab);
  const qs = params.toString();
  return <Navigate to={`/legal-reasoning${qs ? `?${qs}` : ""}`} replace />;
}


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mediator" element={<RedirectToHub />} />
            <Route path="/mediator-dashboard" element={<MediatorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/intake" element={<RedirectToHub />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/expert-witness" element={<ExpertWitness />} />
            <Route path="/legal-precedents" element={<LegalPrecedents />} />
            <Route path="/agreement-generator" element={<AgreementGenerator />} />
            <Route path="/legal-reasoning" element={<MediationEngine />} />
            <Route path="/mediation-engine" element={<RedirectToHub />} />
            <Route path="/case/:id" element={<CaseDetail />} />
            <Route path="/case-room/:id" element={<CaseRoom />} />
            <Route path="/mediator/:id" element={<MediatorDetail />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/privacy-tests" element={<PrivacyTests />} />
            <Route path="/health-check" element={<HealthCheck />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
