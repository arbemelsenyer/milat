import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Landing from "./pages/Landing";
import IntakePage from "./pages/Intake";
import SummaryPage from "./pages/Summary";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MediatorDashboard from "./pages/MediatorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ExpertWitness from "./pages/ExpertWitness";
import LegalPrecedents from "./pages/LegalPrecedents";
import AgreementGenerator from "./pages/AgreementGenerator";
import LegalReasoningEngine from "./pages/LegalReasoningEngine";
import MediationEngine from "./pages/MediationEngine";
import CaseDetail from "./pages/CaseDetail";
import CaseRoom from "./pages/CaseRoom";
import MediatorDetail from "./pages/MediatorDetail";
import NotificationSettings from "./pages/NotificationSettings";
import PrivacyTests from "./pages/PrivacyTests";


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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mediator" element={<MediationEngine />} />
            <Route path="/mediator-dashboard" element={<MediatorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/intake" element={<IntakePage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/expert-witness" element={<ExpertWitness />} />
            <Route path="/legal-precedents" element={<LegalPrecedents />} />
            <Route path="/agreement-generator" element={<AgreementGenerator />} />
            <Route path="/legal-reasoning" element={<LegalReasoningEngine />} />
            <Route path="/mediation-engine" element={<MediationEngine />} />
            <Route path="/case/:id" element={<CaseDetail />} />
            <Route path="/case-room/:id" element={<CaseRoom />} />
            <Route path="/mediator/:id" element={<MediatorDetail />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/privacy-tests" element={<PrivacyTests />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
