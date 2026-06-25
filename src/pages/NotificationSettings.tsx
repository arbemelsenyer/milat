import { useEffect, useState } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Navigate } from "react-router-dom";

type Prefs = {
  email_session_invite: boolean;
  email_session_reminder: boolean;
  email_expert_updates: boolean;
  email_mediator_assignment: boolean;
  email_negotiation_updates: boolean;
  inapp_session_invite: boolean;
  inapp_session_reminder: boolean;
  inapp_expert_updates: boolean;
  inapp_mediator_assignment: boolean;
  inapp_negotiation_updates: boolean;
};

const DEFAULTS: Prefs = {
  email_session_invite: true,
  email_session_reminder: true,
  email_expert_updates: true,
  email_mediator_assignment: true,
  email_negotiation_updates: true,
  inapp_session_invite: true,
  inapp_session_reminder: true,
  inapp_expert_updates: true,
  inapp_mediator_assignment: true,
  inapp_negotiation_updates: true,
};

const ROWS: Array<{ key: keyof Prefs extends string ? string : never; label: string; email: keyof Prefs; inapp: keyof Prefs }> = [
  { key: "session_invite", label: "Toplantı davetleri", email: "email_session_invite", inapp: "inapp_session_invite" },
  { key: "session_reminder", label: "Toplantı hatırlatmaları", email: "email_session_reminder", inapp: "inapp_session_reminder" },
  { key: "expert_updates", label: "Bilirkişi atama / onay / red", email: "email_expert_updates", inapp: "inapp_expert_updates" },
  { key: "mediator_assignment", label: "Arabulucu ataması", email: "email_mediator_assignment", inapp: "inapp_mediator_assignment" },
  { key: "negotiation_updates", label: "Müzakere turu güncellemeleri", email: "email_negotiation_updates", inapp: "inapp_negotiation_updates" },
];

export default function NotificationSettings() {
  const { user, isLoading } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs({ ...DEFAULTS, ...(data as any) });
      setLoaded(true);
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });
    setBusy(false);
    if (error) toast({ title: "Hata", description: error.message, variant: "destructive" });
    else toast({ title: "Tercihler kaydedildi" });
  };

  const toggle = (k: keyof Prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-3xl py-8 px-4">
        <h1 className="text-2xl font-display font-semibold mb-2">Bildirim Tercihleri</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Hangi olaylar için e-posta ve uygulama içi bildirim almak istediğinizi seçin.
        </p>

        <Card className="p-5">
          {!loaded ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto_auto] gap-6 px-2 py-2 text-xs text-muted-foreground border-b">
                <span>Olay</span>
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> E-posta</span>
                <span className="flex items-center gap-1"><Bell className="h-3 w-3" /> Uygulama</span>
              </div>
              {ROWS.map((row) => (
                <div key={row.key} className="grid grid-cols-[1fr_auto_auto] gap-6 px-2 py-3 items-center border-b last:border-0">
                  <Label className="text-sm">{row.label}</Label>
                  <Switch checked={prefs[row.email]} onCheckedChange={() => toggle(row.email)} />
                  <Switch checked={prefs[row.inapp]} onCheckedChange={() => toggle(row.inapp)} />
                </div>
              ))}
            </div>
          )}
          <Button onClick={save} disabled={busy || !loaded} className="mt-6">
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Kaydet
          </Button>
        </Card>
      </main>
    </div>
  );
}
