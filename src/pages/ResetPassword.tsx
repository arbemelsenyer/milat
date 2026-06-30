import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, MessageCircle, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

function mapAuthError(msg: string, tr: boolean): string {
  const m = msg.toLowerCase();
  if (m.includes('expired') || m.includes('invalid') && m.includes('token'))
    return tr ? 'Sıfırlama bağlantısının süresi dolmuş veya geçersiz. Lütfen yeni bir bağlantı isteyin.' : 'Reset link expired or invalid. Please request a new one.';
  if (m.includes('same') && m.includes('password'))
    return tr ? 'Yeni şifre eski şifreyle aynı olamaz.' : 'New password cannot match the old password.';
  if (m.includes('weak'))
    return tr ? 'Şifre çok zayıf. Daha güçlü bir şifre seçin.' : 'Password too weak. Choose a stronger one.';
  if (m.includes('rate'))
    return tr ? 'Çok fazla istek. Lütfen bir dakika bekleyin.' : 'Too many requests. Please wait a minute.';
  return tr ? `Şifre güncellenemedi: ${msg}` : `Could not update password: ${msg}`;
}

export default function ResetPassword() {
  const { language } = useLanguage();
  const tr = language === 'tr';
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    // If the URL had an error (expired/invalid) Supabase places it in the hash.
    const hash = window.location.hash || '';
    if (hash.includes('error') || hash.includes('error_code')) {
      setLinkInvalid(true);
    }
    // After 4s if still not ready and no session, treat as invalid link.
    const timer = setTimeout(() => {
      setReady((r) => {
        if (!r) setLinkInvalid(true);
        return r;
      });
    }, 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  function validate(): string | null {
    if (password.length < 8) return tr ? 'Şifre en az 8 karakter olmalı.' : 'Password must be at least 8 characters.';
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
      return tr ? 'Şifre en az bir harf ve bir rakam içermeli.' : 'Password must contain at least one letter and one number.';
    if (password !== confirm) return tr ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.';
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(mapAuthError(err.message, tr));
      return;
    }
    setSuccess(true);
    toast({
      title: tr ? 'Şifre güncellendi' : 'Password updated',
      description: tr ? 'Giriş ekranına yönlendiriliyorsunuz...' : 'Redirecting to sign in...',
    });
    await supabase.auth.signOut();
    setTimeout(() => navigate('/auth'), 1800);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{tr ? 'Şifre Sıfırla' : 'Reset Password'} | MediPact AI</title>
      </Helmet>
      <header className="p-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          {tr ? 'Ana sayfa' : 'Home'}
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
            {tr ? 'Yeni şifre belirleyin' : 'Set a new password'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {success
              ? tr ? 'Şifre güncellendi. Giriş ekranına yönlendiriliyorsunuz...' : 'Password updated. Redirecting...'
              : ready
              ? tr ? 'Hesabınız için yeni bir şifre girin.' : 'Enter a new password for your account.'
              : linkInvalid
              ? tr ? 'Sıfırlama bağlantısı doğrulanamadı.' : 'Could not verify reset link.'
              : tr ? 'Sıfırlama bağlantısı doğrulanıyor...' : 'Verifying reset link...'}
          </p>

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {tr ? 'Yeni şifrenizle giriş yapabilirsiniz.' : 'You can now sign in with your new password.'}
              </AlertDescription>
            </Alert>
          )}

          {linkInvalid && !success && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>{tr
                  ? 'Bağlantının süresi dolmuş, daha önce kullanılmış veya geçersiz olabilir.'
                  : 'The link may have expired, already been used, or is invalid.'}</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                  {tr ? 'Yeni bağlantı iste' : 'Request a new link'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {error && !success && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{error}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setError(null)}
                >
                  {tr ? 'Tekrar Dene' : 'Try Again'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="pwd">{tr ? 'Yeni Şifre' : 'New Password'}</Label>
                <Input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11"
                  autoComplete="new-password"
                  disabled={!ready || loading}
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  {tr ? 'En az 8 karakter; harf ve rakam içermeli.' : 'At least 8 characters with letters and digits.'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd2">{tr ? 'Şifre (Tekrar)' : 'Confirm Password'}</Label>
                <Input
                  id="pwd2"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="h-11"
                  autoComplete="new-password"
                  disabled={!ready || loading}
                  minLength={8}
                />
              </div>
              <Button type="submit" size="lg" className="w-full h-11" disabled={loading || !ready}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {tr ? 'Şifreyi Güncelle' : 'Update Password'}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
