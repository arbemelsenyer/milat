import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import LegalReasoningEngine from "./LegalReasoningEngine";
import MediationEngine from "./MediationEngine";

/**
 * Unified hub: combines the Legal Reasoning analyzer (yesterday's working flow)
 * with the full mediation pipeline (intake → parties → analysis → mediator →
 * sessions → experts → negotiation → documents). Single entry point after login.
 */
export default function LegalReasoningHub() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const tab = params.get("tab") === "analiz" ? "analiz" : "surec";

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(`/auth?next=${encodeURIComponent(`/legal-reasoning?${params.toString()}`)}`);
    }
  }, [isLoading, user, navigate, params]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl pt-6 px-4">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            const p = new URLSearchParams(params);
            p.set("tab", v);
            setParams(p, { replace: true });
          }}
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="surec">Başvuru & Süreç</TabsTrigger>
            <TabsTrigger value="analiz">Akıllı Analiz</TabsTrigger>
          </TabsList>
          <TabsContent value="surec" className="mt-0">
            <MediationEngine />
          </TabsContent>
          <TabsContent value="analiz" className="mt-0">
            <LegalReasoningEngine />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
