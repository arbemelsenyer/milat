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
import { LanguageToggle } from '@/components/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, LogOut, Calendar, User, Clock, Users, Shield, Loader2, ArrowLeft, UserPlus, Search, UserCog, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

interface MediatorRequest {
  id: string;
  case_id: string;
  user_id: string;
  mediator_id: string | null;
  status: string;
  preferred_dates: string[] | null;
  preferred_time: string | null;
  session_type: string | null;
  notes: string | null;
  scheduled_date: string | null;
  created_at: string;
  cases: {
    dispute_type: string | null;
    your_name: string | null;
    other_party_name: string | null;
    issue_description: string | null;
  } | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
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

const statusConfig: Record<string, { label: { tr: string; en: string }; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: { tr: 'Beklemede', en: 'Pending' }, variant: 'secondary' },
  scheduled: { label: { tr: 'Planlandı', en: 'Scheduled' }, variant: 'default' },
  completed: { label: { tr: 'Tamamlandı', en: 'Completed' }, variant: 'outline' },
  cancelled: { label: { tr: 'İptal', en: 'Cancelled' }, variant: 'destructive' },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, signOut } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  // Requests state
  const [requests, setRequests] = useState<MediatorRequest[]>([]);
  const [mediators, setMediators] = useState<Mediator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MediatorRequest | null>(null);
  const [selectedMediatorId, setSelectedMediatorId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'assigned'>('pending');
  
  // Users state
  const [allUsers, setAllUsers] = useState<UserWithRoles[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<string>('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/dashboard');
      }
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
    
    // Fetch all requests
    const { data: requestsData, error: requestsError } = await supabase
      .from('mediator_requests')
      .select(`
        *,
        cases (
          dispute_type,
          your_name,
          other_party_name,
          issue_description
        ),
        profiles!mediator_requests_user_id_fkey (
          full_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (!requestsError && requestsData) {
      setRequests(requestsData as unknown as MediatorRequest[]);
    }

    // Fetch all mediators (users with mediator role)
    const { data: mediatorRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'mediator');

    if (!rolesError && mediatorRoles) {
      const mediatorIds = mediatorRoles.map(r => r.user_id);
      
      if (mediatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', mediatorIds);

        if (profilesData) {
          setMediators(profilesData);
        }
      }
    }

    setIsLoading(false);
  };

  const fetchAllUsers = async () => {
    setUsersLoading(true);
    
    // Fetch all profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setUsersLoading(false);
      return;
    }

    // Fetch all user roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      setUsersLoading(false);
      return;
    }

    // Combine profiles with their roles
    const usersWithRoles: UserWithRoles[] = (profilesData || []).map(profile => {
      const userRoles = (rolesData || [])
        .filter(r => r.user_id === profile.user_id)
        .map(r => r.role);
      
      return {
        ...profile,
        roles: userRoles
      };
    });

    setAllUsers(usersWithRoles);
    setUsersLoading(false);
  };

  const handleAssignMediator = async () => {
    if (!selectedRequest || !selectedMediatorId) return;

    setIsAssigning(true);
    
    const { error } = await supabase
      .from('mediator_requests')
      .update({ mediator_id: selectedMediatorId })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Hata' : 'Error',
        description: language === 'tr' ? 'Arabulucu atanamadı' : 'Failed to assign mediator',
      });
    } else {
      toast({
        title: language === 'tr' ? 'Arabulucu Atandı' : 'Mediator Assigned',
        description: language === 'tr' 
          ? 'Arabulucu başarıyla davaya atandı.' 
          : 'Mediator has been successfully assigned to the case.',
      });
      fetchData();
    }

    setIsAssigning(false);
    setSelectedRequest(null);
    setSelectedMediatorId('');
  };

  const handleAddRole = async (userId: string, role: string) => {
    if (role !== 'user' && role !== 'mediator' && role !== 'admin') return;
    
    setIsUpdatingRole(true);
    
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: role });

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Hata' : 'Error',
        description: language === 'tr' ? 'Rol eklenemedi' : 'Failed to add role',
      });
    } else {
      toast({
        title: language === 'tr' ? 'Rol Eklendi' : 'Role Added',
        description: language === 'tr' 
          ? `${role} rolü başarıyla eklendi.` 
          : `${role} role has been added successfully.`,
      });
      fetchAllUsers();
      fetchData(); // Refresh mediators list
    }

    setIsUpdatingRole(false);
    setSelectedUser(null);
    setRoleToAdd('');
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (role !== 'user' && role !== 'mediator' && role !== 'admin') return;
    
    setIsUpdatingRole(true);
    
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Hata' : 'Error',
        description: language === 'tr' ? 'Rol kaldırılamadı' : 'Failed to remove role',
      });
    } else {
      toast({
        title: language === 'tr' ? 'Rol Kaldırıldı' : 'Role Removed',
        description: language === 'tr' 
          ? `${role} rolü başarıyla kaldırıldı.` 
          : `${role} role has been removed successfully.`,
      });
      fetchAllUsers();
      fetchData(); // Refresh mediators list
    }

    setIsUpdatingRole(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'pending') return !request.mediator_id;
    if (filter === 'assigned') return !!request.mediator_id;
    return true;
  });

  const filteredUsers = allUsers.filter(u => {
    if (!userSearch) return true;
    const search = userSearch.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    );
  });

  const getMediatorName = (mediatorId: string | null) => {
    if (!mediatorId) return null;
    const mediator = mediators.find(m => m.user_id === mediatorId);
    return mediator?.full_name || mediator?.email || mediatorId;
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
    if (role === 'admin') return 'default';
    if (role === 'mediator') return 'secondary';
    return 'outline';
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-6xl py-4 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              MediationPath
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1">
              <Shield className="w-3 h-3" />
              Admin
            </Badge>
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {language === 'tr' ? 'Çıkış' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container max-w-6xl py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'tr' ? 'Panele Dön' : 'Back to Dashboard'}
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {language === 'tr' ? 'Yönetici Paneli' : 'Admin Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'tr' 
              ? 'Talepleri, arabulucuları ve kullanıcı rollerini yönetin' 
              : 'Manage requests, mediators, and user roles'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'tr' ? 'Toplam Talep' : 'Total Requests'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'tr' ? 'Atanmamış' : 'Unassigned'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {requests.filter(r => !r.mediator_id).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'tr' ? 'Aktif Arabulucular' : 'Active Mediators'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{mediators.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'tr' ? 'Toplam Kullanıcı' : 'Total Users'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{allUsers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests" className="gap-2">
              <Calendar className="w-4 h-4" />
              {language === 'tr' ? 'Talepler' : 'Requests'}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UserCog className="w-4 h-4" />
              {language === 'tr' ? 'Kullanıcı Rolleri' : 'User Roles'}
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-2">
              <Button 
                variant={filter === 'pending' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('pending')}
              >
                {language === 'tr' ? 'Atanmamış' : 'Unassigned'}
              </Button>
              <Button 
                variant={filter === 'assigned' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('assigned')}
              >
                {language === 'tr' ? 'Atanmış' : 'Assigned'}
              </Button>
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('all')}
              >
                {language === 'tr' ? 'Tümü' : 'All'}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {language === 'tr' ? 'Talep bulunamadı' : 'No requests found'}
                  </h3>
                  <p className="text-muted-foreground text-center">
                    {filter === 'pending' 
                      ? (language === 'tr' ? 'Atanmamış talep yok.' : 'No unassigned requests.')
                      : (language === 'tr' ? 'Bu filtre için talep yok.' : 'No requests for this filter.')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map((request) => {
                  const status = statusConfig[request.status] || statusConfig.pending;
                  const assignedMediator = getMediatorName(request.mediator_id);

                  return (
                    <Card key={request.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {request.profiles?.full_name || (language === 'tr' ? 'Anonim Kullanıcı' : 'Anonymous User')}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {request.cases?.your_name && request.cases?.other_party_name 
                                ? `${request.cases.your_name} vs ${request.cases.other_party_name}`
                                : request.cases?.dispute_type || (language === 'tr' ? 'Uyuşmazlık bilgisi yok' : 'No dispute info')}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {assignedMediator ? (
                              <Badge variant="outline" className="gap-1">
                                <Users className="w-3 h-3" />
                                {assignedMediator}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                {language === 'tr' ? 'Atanmamış' : 'Unassigned'}
                              </Badge>
                            )}
                            <Badge variant={status.variant}>
                              {status.label[language]}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {request.cases?.issue_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {request.cases.issue_description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 text-sm">
                          {request.preferred_time && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {request.preferred_time}
                            </Badge>
                          )}
                          {request.session_type && (
                            <Badge variant="outline">
                              {request.session_type === 'video' 
                                ? (language === 'tr' ? 'Video' : 'Video')
                                : request.session_type === 'phone'
                                ? (language === 'tr' ? 'Telefon' : 'Phone')
                                : (language === 'tr' ? 'Yüz yüze' : 'In-person')}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {format(new Date(request.created_at), 'PP', { 
                              locale: language === 'tr' ? tr : enUS 
                            })}
                          </Badge>
                        </div>

                        {request.scheduled_date && (
                          <p className="text-sm text-primary font-medium">
                            {language === 'tr' ? 'Planlanan: ' : 'Scheduled: '}
                            {format(new Date(request.scheduled_date), 'PPp', { 
                              locale: language === 'tr' ? tr : enUS 
                            })}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                variant={request.mediator_id ? 'outline' : 'default'}
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setSelectedMediatorId(request.mediator_id || '');
                                }}
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                {request.mediator_id 
                                  ? (language === 'tr' ? 'Arabulucu Değiştir' : 'Change Mediator')
                                  : (language === 'tr' ? 'Arabulucu Ata' : 'Assign Mediator')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  {language === 'tr' ? 'Arabulucu Ata' : 'Assign Mediator'}
                                </DialogTitle>
                                <DialogDescription>
                                  {language === 'tr' 
                                    ? 'Bu davayı üstlenecek bir arabulucu seçin.' 
                                    : 'Select a mediator to handle this case.'}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Select
                                    value={selectedMediatorId}
                                    onValueChange={setSelectedMediatorId}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={language === 'tr' ? 'Arabulucu seçin...' : 'Select mediator...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {mediators.map((mediator) => (
                                        <SelectItem key={mediator.user_id} value={mediator.user_id}>
                                          {mediator.full_name || mediator.email || mediator.user_id}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {mediators.length === 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    {language === 'tr' 
                                      ? 'Henüz kayıtlı arabulucu yok. Kullanıcı Rolleri sekmesinden arabulucu atayabilirsiniz.' 
                                      : 'No mediators registered yet. You can assign mediator role from User Roles tab.'}
                                  </p>
                                )}
                              </div>
                              <DialogFooter>
                                <Button 
                                  onClick={handleAssignMediator} 
                                  disabled={!selectedMediatorId || isAssigning}
                                >
                                  {isAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  {language === 'tr' ? 'Ata' : 'Assign'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button variant="outline" size="sm" asChild className="ml-auto">
                            <Link to={`/summary?case=${request.case_id}`}>
                              {language === 'tr' ? 'Detayları Gör' : 'View Details'}
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === 'tr' ? 'Kullanıcı ara...' : 'Search users...'}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {language === 'tr' ? 'Kullanıcı bulunamadı' : 'No users found'}
                  </h3>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredUsers.map((userItem) => (
                  <Card key={userItem.user_id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {userItem.full_name || (language === 'tr' ? 'İsimsiz' : 'Unnamed')}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {userItem.email}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {userItem.roles.map((role) => (
                            <Badge 
                              key={role} 
                              variant={getRoleBadgeVariant(role)}
                              className="gap-1"
                            >
                              {role}
                              {role !== 'user' && (
                                <button
                                  onClick={() => handleRemoveRole(userItem.user_id, role)}
                                  disabled={isUpdatingRole}
                                  className="ml-1 hover:text-destructive transition-colors"
                                  title={language === 'tr' ? 'Rolü kaldır' : 'Remove role'}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedUser(userItem)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {language === 'tr' ? 'Rol Ekle' : 'Add Role'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                {language === 'tr' ? 'Rol Ekle' : 'Add Role'}
                              </DialogTitle>
                              <DialogDescription>
                                {language === 'tr' 
                                  ? `${userItem.full_name || userItem.email} için yeni bir rol seçin.` 
                                  : `Select a new role for ${userItem.full_name || userItem.email}.`}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Select
                                value={roleToAdd}
                                onValueChange={setRoleToAdd}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={language === 'tr' ? 'Rol seçin...' : 'Select role...'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {!userItem.roles.includes('mediator') && (
                                    <SelectItem value="mediator">
                                      {language === 'tr' ? 'Arabulucu' : 'Mediator'}
                                    </SelectItem>
                                  )}
                                  {!userItem.roles.includes('admin') && (
                                    <SelectItem value="admin">
                                      {language === 'tr' ? 'Yönetici' : 'Admin'}
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              {userItem.roles.includes('mediator') && userItem.roles.includes('admin') && (
                                <p className="text-sm text-muted-foreground">
                                  {language === 'tr' 
                                    ? 'Bu kullanıcı tüm rollere sahip.' 
                                    : 'This user has all available roles.'}
                                </p>
                              )}
                            </div>
                            <DialogFooter>
                              <Button 
                                onClick={() => handleAddRole(userItem.user_id, roleToAdd)}
                                disabled={!roleToAdd || isUpdatingRole}
                              >
                                {isUpdatingRole && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {language === 'tr' ? 'Ekle' : 'Add'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}