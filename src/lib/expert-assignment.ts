import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/* Bilirkişi ataması — denetim izi ve taraf bildirimi (25.08.2026)

   Bilirkişi önerisi iki yüzeyden yapılabiliyordu ve ikisi aynı işi yapmıyordu:
   `CaseRoom.ExpertsTab` iz yazıp tarafları uyarıyor, `MediationEngine.Phase7Expert`
   ise yalnız satırı atıyordu. Arabulucu canlıda `CaseRedirect` üzerinden HER ZAMAN
   `MediationEngine`e düşer — yani eksik olan yol, gerçekte kullanılan yoldu:
   canlıda 2 atama var, `expert_assignment_logs` 0 satır ve tek bir bilirkişi
   bildirimi gönderilmemiş. Öneri "Onay Bekliyor"da kalıyor çünkü taraf hiç
   haberdar edilmiyor.

   Bu modül o iki adımı tek yere alır. Hata SESSİZ YUTULMAZ: çağıran katman
   sonucu görür ve kullanıcıya bildirir. */

export type BilirkisiIzi = {
  caseId: string;
  assignmentId?: string | null;
  expertId?: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  details?: Json;
};

/** Bilirkişi denetim izine tek satır yazar. Hata yutulmaz, çağırana döner. */
export async function logExpertAction(args: BilirkisiIzi): Promise<{ error: string | null }> {
  const { error } = await supabase.from("expert_assignment_logs").insert({
    case_id: args.caseId,
    assignment_id: args.assignmentId ?? null,
    expert_id: args.expertId ?? null,
    actor_id: args.actorId,
    actor_role: args.actorRole,
    action: args.action,
    details: args.details ?? {},
  });
  return { error: error?.message ?? null };
}

/**
 * Dosyanın hesabı bağlı taraflarına bildirim gönderir.
 * `sent` gerçekten yazılan bildirim sayısıdır; hesabı bağlı taraf yoksa 0 döner.
 */
export async function notifyCaseParties(
  caseId: string,
  title: string,
  message: string,
): Promise<{ sent: number; error: string | null }> {
  const { data, error } = await supabase
    .from("case_parties")
    .select("user_id")
    .eq("case_id", caseId);
  if (error) return { sent: 0, error: error.message };

  const hedefler = (data ?? [])
    .map((p) => p.user_id)
    .filter((uid): uid is string => !!uid);
  if (hedefler.length === 0) return { sent: 0, error: null };

  const sonuclar = await Promise.all(
    hedefler.map((uid) =>
      supabase.rpc("create_notification", {
        p_user_id: uid,
        p_title: title,
        p_message: message,
        p_type: "info",
        p_link: `/cases/${caseId}`,
      }),
    ),
  );
  const hatali = sonuclar.filter((r) => r.error);
  return {
    sent: hedefler.length - hatali.length,
    error: hatali.length > 0 ? hatali[0].error?.message ?? "bildirim yazılamadı" : null,
  };
}
