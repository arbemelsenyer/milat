import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, MessageCircle, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase parses recovery tokens from the URL hash automatically.
    // Listen for the PASSWORD_RECOVERY event or verify a session exists.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Geçersiz şifre' : 'Invalid password',
        description: language === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.',
      });
      return;
    }
    if (password !== confirm) {
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match',
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: language === 'tr' ? 'Hata' : 'Error', description: error.message });
      return;
    }
    toast({
      title: language === 'tr' ? 'Şifre güncellendi' : 'Password updated',
      description: language === 'tr' ? 'Yeni şifrenizle giriş yapabilirsiniz.' : 'You can now sign in with your new password.',
    });
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{language === 'tr' ? 'Şifre Sıfırla' : 'Reset Password'} | MediPact AI</title>
      </Helmet>
      <header className="p-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          {language === 'tr' ? 'Ana sayfa' : 'Home'}
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold">MediPact AI</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">
            {language === 'tr' ? 'Yeni şifre belirleyin' : 'Set a new password'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {ready
              ? language === 'tr'
                ? 'Hesabınız için yeni bir şifre girin.'
                : 'Enter a new password for your account.'
              : language === 'tr'
              ? 'Sıfırlama bağlantısı doğrulanıyor...'
              : 'Verifying reset link...'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pwd">{language === 'tr' ? 'Yeni Şifre' : 'New Password'}</Label>
              <Input
                id="pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
                autoComplete="new-password"
                disabled={!ready}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd2">{language === 'tr' ? 'Şifre (Tekrar)' : 'Confirm Password'}</Label>
              <Input
                id="pwd2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="h-11"
                autoComplete="new-password"
                disabled={!ready}
              />
            </div>
            <Button type="submit" size="lg" className="w-full h-11" disabled={loading || !ready}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {language === 'tr' ? 'Şifreyi Güncelle' : 'Update Password'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
