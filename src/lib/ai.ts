import type { AiOption, StructuredSummary } from "@/types/mediation";

export async function generateOptions(summary: StructuredSummary): Promise<AiOption[]> {
  // MVP: mock. Later: call your LLM endpoint.
  await new Promise((r) => setTimeout(r, 800));

  const base: AiOption[] = [
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
  ];

  // küçük kişiselleştirme (dispute temalarına göre başlık eklemek gibi) ileri sürümlere bırakılabilir
  return base;
}
