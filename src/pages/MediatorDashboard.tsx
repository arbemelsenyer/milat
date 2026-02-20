import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppNavbar } from '@/components/AppNavbar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

interface CaseRow {
  id: string;
  status: string;
  title: string | null;
  dispute_type: string | null;
  your_name: string | null;
  other_party_name: string | null;
  ai_summary: any;
  created_at: string;
}

interface Message {
  id: string;
  case_id: string;
  sender_id: string;
  sender_role: string | null;
  content: string;
  created_at: string;
}

export default function MediatorDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isMediator } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/auth');
      else if (!isMediator) navigate('/dashboard');
    }
  }, [authLoading, user, isMediator, navigate]);

  useEffect(() => {
    if (user && isMediator) fetchCases();
  }, [user, isMediator]);

  useEffect(() => {
    if (selectedCaseId) {
      fetchMessages(selectedCaseId);

      // Subscribe to realtime messages
      const channel = supabase
        .channel(`messages-${selectedCaseId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `case_id=eq.${selectedCaseId}`,
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedCaseId]);

  const fetchCases = async () => {
    setIsLoading(true);
    // RLS returns only cases assigned to this mediator
    const { data } = await supabase
      .from('cases')
      .select('id, status, title, dispute_type, your_name, other_party_name, ai_summary, created_at')
      .order('created_at', { ascending: false });
    setCases(data || []);
    setIsLoading(false);
  };

  const fetchMessages = async (caseId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedCaseId || !user) return;
    setIsSending(true);

    const { error } = await supabase.from('messages').insert({
      case_id: selectedCaseId,
      sender_id: user.id,
      sender_role: 'mediator',
      content: newMessage.trim(),
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setNewMessage('');
    }
    setIsSending(false);
  };

  if (authLoading || !isMediator) {
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
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">
          {language === 'tr' ? 'Arabulucu Paneli' : 'Mediator Panel'}
        </h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cases list */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-lg font-semibold">{language === 'tr' ? 'Davalarım' : 'My Cases'}</h2>
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            ) : cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">{language === 'tr' ? 'Henüz atanmış dava yok' : 'No assigned cases yet'}</p>
            ) : (
              cases.map(c => (
                <Card
                  key={c.id}
                  className={`cursor-pointer transition-colors ${selectedCaseId === c.id ? 'border-primary' : 'hover:border-primary/30'}`}
                  onClick={() => setSelectedCaseId(c.id)}
                >
                  <CardHeader className="py-3 pb-1">
                    <CardTitle className="text-sm">{c.title || c.dispute_type || 'Case'}</CardTitle>
                    <CardDescription className="text-xs">
                      {c.your_name} vs {c.other_party_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-2">
                    <Badge variant="outline" className="text-xs">{c.status}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Messages panel */}
          <div className="lg:col-span-2">
            {selectedCaseId ? (
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    {language === 'tr' ? 'Mesajlar' : 'Messages'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto py-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {language === 'tr' ? 'Henüz mesaj yok' : 'No messages yet'}
                    </p>
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                          m.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}>
                          <p className="text-xs opacity-70 mb-1">{m.sender_role || 'user'}</p>
                          <p>{m.content}</p>
                          <p className="text-xs opacity-50 mt-1">
                            {format(new Date(m.created_at), 'HH:mm', { locale: language === 'tr' ? tr : enUS })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
                <div className="p-4 border-t flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder={language === 'tr' ? 'Mesaj yazın...' : 'Type a message...'}
                    className="resize-none"
                    rows={2}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()} size="icon" className="shrink-0 self-end">
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                {language === 'tr' ? 'Mesajları görmek için bir dava seçin' : 'Select a case to view messages'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
