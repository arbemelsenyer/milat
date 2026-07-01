import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppNavbar } from '@/components/AppNavbar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserCog, Calendar, UserPlus, Trash2, Mail } from 'lucide-react';
import { KnowledgeBaseAdmin } from '@/components/admin/KnowledgeBaseAdmin';


interface CaseRow {
  id: string;
  status: string;
  title: string | null;
  category: string | null;
  dispute_type: string | null;
  your_name: string | null;
  other_party_name: string | null;
  ai_summary: any;
  assigned_mediator_id: string | null;
  created_at: string;
}

interface Mediator {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  email: string | null;
  roles: string[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [mediators, setMediators] = useState<Mediator[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<CaseRow | null>(null);
  const [selectedMediatorId, setSelectedMediatorId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isInviting, setIsInviting] = useState(false);


  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/auth');
      else if (!isAdmin) navigate('/dashboard');
    }
  }, [authLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
      fetchAllUsers();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);

    const { data: casesData } = await supabase
      .from('cases')
      .select('id, status, title, category, dispute_type, your_name, other_party_name, ai_summary, assigned_mediator_id, created_at')
      .in('status', ['submitted', 'assigned', 'scheduled'])
      .order('created_at', { ascending: false });

    setCases(casesData || []);

    // Fetch mediators
    const { data: mediatorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'mediator');

    if (mediatorRoles && mediatorRoles.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', mediatorRoles.map(r => r.user_id));
      setMediators(profilesData || []);
    }

    setIsLoading(false);
  };

  const fetchAllUsers = async () => {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .order('created_at', { ascending: false });

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const usersWithRoles: UserWithRoles[] = (profilesData || []).map(p => ({
      ...p,
      roles: (rolesData || []).filter(r => r.user_id === p.user_id).map(r => r.role),
    }));

    setAllUsers(usersWithRoles);
  };

  const handleAssignMediator = async () => {
    if (!selectedCase || !selectedMediatorId) return;
    setIsAssigning(true);

    // Update case
    const { error } = await supabase
      .from('cases')
      .update({ assigned_mediator_id: selectedMediatorId, status: 'assigned' })
      .eq('id', selectedCase.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setIsAssigning(false);
      return;
    }

    // Insert assignment record
    await supabase.from('case_assignments').insert({
      case_id: selectedCase.id,
      mediator_id: selectedMediatorId,
      assigned_by: user!.id,
    });

    // Notify case owner + mediator
    try {
      await supabase.functions.invoke('send-assignment-notification', {
        body: { caseId: selectedCase.id, mediatorId: selectedMediatorId, language },
      });
    } catch (e) {
      console.error('Notification error:', e);
    }

    toast({
      title: language === 'tr' ? 'Arabulucu Atandı' : 'Mediator Assigned',
      description: language === 'tr' ? 'Bildirimler gönderildi.' : 'Notifications sent.',
    });

    setIsAssigning(false);
    setSelectedCase(null);
    setSelectedMediatorId('');
    fetchData();
  };

  const handleAddRole = async (userId: string, role: string) => {
    setIsUpdatingRole(true);
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as 'admin' | 'mediator' | 'user' });
    if (!error) {
      try {
        await supabase.functions.invoke('send-role-notification', {
          body: { targetUserId: userId, role, action: 'added', language },
        });
      } catch {}
      toast({ title: language === 'tr' ? 'Rol Eklendi' : 'Role Added' });
      fetchAllUsers();
      fetchData();
    }
    setIsUpdatingRole(false);
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    setIsUpdatingRole(true);
    await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as 'admin' | 'mediator' | 'user');
    try {
      await supabase.functions.invoke('send-role-notification', {
        body: { targetUserId: userId, role, action: 'removed', language },
      });
    } catch {}
    toast({ title: language === 'tr' ? 'Rol Kaldırıldı' : 'Role Removed' });
    fetchAllUsers();
    fetchData();
    setIsUpdatingRole(false);
  };

  const getMediatorName = (id: string | null) => {
    if (!id) return null;
    const m = mediators.find(m => m.user_id === id);
    return m?.full_name || m?.email || id.slice(0, 8);
  };

  const filteredUsers = allUsers.filter(u => {
    if (!userSearch) return true;
    const s = userSearch.toLowerCase();
    return u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
  });

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />

      <div className="container max-w-6xl py-8 px-4">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {language === 'tr' ? 'Yönetici Paneli' : 'Admin Dashboard'}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{language === 'tr' ? 'Toplam Başvuru' : 'Total Cases'}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{cases.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{language === 'tr' ? 'Atanmamış' : 'Unassigned'}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-orange-500">{cases.filter(c => c.status === 'submitted').length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{language === 'tr' ? 'Arabulucular' : 'Mediators'}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-500">{mediators.length}</div></CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <KnowledgeBaseAdmin />
        </div>

        <Tabs defaultValue="cases" className="space-y-6">
          <TabsList>
            <TabsTrigger value="cases" className="gap-2">
              <Calendar className="w-4 h-4" />
              {language === 'tr' ? 'Başvurular' : 'Cases'}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UserCog className="w-4 h-4" />
              {language === 'tr' ? 'Kullanıcılar' : 'Users'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : cases.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{language === 'tr' ? 'Başvuru bulunamadı' : 'No cases found'}</p>
            ) : (
              cases.map(c => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{c.title || c.dispute_type || 'Case'}</CardTitle>
                        <CardDescription>
                          {c.your_name && c.other_party_name ? `${c.your_name} vs ${c.other_party_name}` : 'Parties pending'}
                        </CardDescription>
                      </div>
                      <Badge variant={c.status === 'submitted' ? 'default' : 'outline'}>{c.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {c.ai_summary && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-primary font-medium">
                          {language === 'tr' ? 'AI Özeti' : 'AI Summary'}
                        </summary>
                        <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
                          {typeof c.ai_summary === 'object' && c.ai_summary !== null
                            ? (c.ai_summary as any).neutralSummary || JSON.stringify(c.ai_summary)
                            : String(c.ai_summary)}
                        </p>
                      </details>
                    )}

                    <div className="flex items-center gap-3">
                      {c.assigned_mediator_id ? (
                        <Badge variant="secondary">
                          {language === 'tr' ? 'Arabulucu: ' : 'Mediator: '}{getMediatorName(c.assigned_mediator_id)}
                        </Badge>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedCase(c)}>
                              <UserPlus className="w-4 h-4 mr-1" />
                              {language === 'tr' ? 'Arabulucu Ata' : 'Assign Mediator'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{language === 'tr' ? 'Arabulucu Ata' : 'Assign Mediator'}</DialogTitle>
                              <DialogDescription>{language === 'tr' ? 'Bu başvuru için bir arabulucu seçin' : 'Select a mediator for this case'}</DialogDescription>
                            </DialogHeader>
                            <Select value={selectedMediatorId} onValueChange={setSelectedMediatorId}>
                              <SelectTrigger><SelectValue placeholder={language === 'tr' ? 'Arabulucu seçin' : 'Select mediator'} /></SelectTrigger>
                              <SelectContent>
                                {mediators.map(m => (
                                  <SelectItem key={m.user_id} value={m.user_id}>
                                    {m.full_name || m.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <DialogFooter>
                              <Button onClick={handleAssignMediator} disabled={!selectedMediatorId || isAssigning}>
                                {isAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {language === 'tr' ? 'Ata' : 'Assign'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder={language === 'tr' ? 'Kullanıcı ara...' : 'Search users...'}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            {filteredUsers.map(u => (
              <Card key={u.user_id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.full_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    <div className="flex gap-1 mt-1">
                      {u.roles.map(r => (
                        <Badge key={r} variant={r === 'admin' ? 'default' : r === 'mediator' ? 'secondary' : 'outline'} className="text-xs">
                          {r}
                          {r !== 'user' && (
                            <button className="ml-1" onClick={() => handleRemoveRole(u.user_id, r)} disabled={isUpdatingRole}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!u.roles.includes('mediator') && (
                      <Button size="sm" variant="outline" onClick={() => handleAddRole(u.user_id, 'mediator')} disabled={isUpdatingRole}>
                        + Mediator
                      </Button>
                    )}
                    {!u.roles.includes('admin') && (
                      <Button size="sm" variant="outline" onClick={() => handleAddRole(u.user_id, 'admin')} disabled={isUpdatingRole}>
                        + Admin
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
