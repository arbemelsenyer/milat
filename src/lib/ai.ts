import type { AiOption, StructuredSummary } from "@/types/mediation";

export async function generateOptions(summary: StructuredSummary, language: string = 'tr'): Promise<AiOption[]> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ summary, language }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI generation error:', errorData);
      throw new Error(errorData.error || 'Failed to generate options');
    }

    const data = await response.json();
    return data.options || [];
  } catch (error) {
    console.error('Failed to generate options:', error);
    
    // Fallback to mock options if API fails
    const base: AiOption[] = language === 'tr' 
      ? [
          {
            id: "opt-1",
            title: "Aşamalı Ödeme / Performansa Bağlı Plan",
            description: "Ödeme veya bedel tartışmasını, taksit + performans koşulları ile kademelendirme.",
            tradeoffs: ["Nakit akışı planlanır", "Takip/izleme ihtiyacı doğar"],
          },
          {
            id: "opt-2",
            title: "Hizmetin Düzeltilmesi / Telafi Edici İfa",
            description: "Uyuşmazlığa konu hizmet/teslimatın düzeltilmesi veya telafi edici ek hizmet verilmesi.",
            tradeoffs: ["İlişki korunabilir", "Teknik/operasyonel kapasite gerekir"],
          },
          {
            id: "opt-3",
            title: "Kısmi İade + Gizlilik / İtibar Koruma",
            description: "Kısmi iade/indirim karşılığında gizlilik ve iletişim protokolü oluşturma.",
            tradeoffs: ["İtibar riski azaltılır", "Taraflar taahhütleri netleştirmeli"],
          },
        ]
      : [
          {
            id: "opt-1",
            title: "Phased Payment / Performance-Based Plan",
            description: "Structure the payment dispute with installments and performance conditions.",
            tradeoffs: ["Cash flow is planned", "Monitoring/tracking need arises"],
          },
          {
            id: "opt-2",
            title: "Service Correction / Remedial Performance",
            description: "Correction of the disputed service/delivery or provision of compensatory additional service.",
            tradeoffs: ["Relationship can be preserved", "Requires technical/operational capacity"],
          },
          {
            id: "opt-3",
            title: "Partial Refund + Confidentiality / Reputation Protection",
            description: "Creating a confidentiality and communication protocol in exchange for partial refund/discount.",
            tradeoffs: ["Reputation risk is reduced", "Parties must clarify commitments"],
          },
        ];

    return base;
  }
}

export async function sendMediatorRequest(
  email: string,
  phone: string,
  selectedSlots: string[],
  notes: string,
  caseSummary: {
    disputeType: string;
    parties: { initiator: string; respondent: string };
    neutralSummary: string;
    coreThemes: string[];
  },
  language: string = 'tr'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-mediator-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        email,
        phone,
        selectedSlots,
        notes,
        caseSummary,
        language,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send mediator request:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
