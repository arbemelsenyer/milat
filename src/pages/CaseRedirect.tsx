import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * /cases/:id tek kapıdır ve rol duyarlıdır:
 *  - kullanıcı bu dosyada TARAF ise (case_parties.user_id eşleşmesi) → taraf ekranı (CaseRoom)
 *  - dosya sahibi / görevli arabulucu / admin ise → mevcut 8 aşamalı arabulucu ekranı
 *  - hiçbiri değilse → erişim yok
 */
export default function CaseRedirect() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [hedef, setHedef] = useState<"taraf" | "arabulucu" | "yok" | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!id || !user) { setHedef("yok"); return; }
    let aktif = true;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("cases").select("user_id, assigned_mediator_id").eq("id", id).maybeSingle(),
        supabase.from("case_parties").select("id").eq("case_id", id).eq("user_id", user.id).limit(1),
      ]);
      if (!aktif) return;
      const taraf = Array.isArray(p.data) && p.data.length > 0;
      const yonetici = !!c.data && (c.data.user_id === user.id || c.data.assigned_mediator_id === user.id);
      // Taraf kaydı önceliklidir: taraf, arabulucu ekranına düşmez.
      if (taraf) setHedef("taraf");
      else if (yonetici || isAdmin) setHedef("arabulucu");
      else setHedef("yok");
    })();
    return () => { aktif = false; };
  }, [id, user?.id, authLoading, isAdmin]);

  if (!id) return <Navigate to="/cases" replace />;
  if (authLoading || hedef === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (hedef === "taraf") return <Navigate to={`/case-room/${id}`} replace />;
  if (hedef === "arabulucu") return <Navigate to={`/legal-reasoning?caseId=${id}`} replace />;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Lock className="h-10 w-10" />
      <p>Bu başvuruya erişim yetkiniz yok.</p>
    </div>
  );
}
