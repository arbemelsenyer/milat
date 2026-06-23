import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import {
  MessageCircle,
  ArrowLeft,
  Loader2,
  Shield,
  Scale,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
    email: z.string().email('Geçerli bir e-posta adresi girin'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp } = useAuth();
  const { language } = useLanguage();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);
    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Giriş başarısız' : 'Login failed',
        description:
          error.message === 'Invalid login credentials'
            ? language === 'tr'
              ? 'E-posta veya şifre hatalı'
              : 'Invalid email or password'
            : error.message,
      });
    } else {
      toast({
        title: language === 'tr' ? 'Giriş başarılı' : 'Login successful',
        description: language === 'tr' ? 'Hoş geldiniz!' : 'Welcome back!',
      });
      navigate('/dashboard');
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);
    if (error) {
      let errorMessage = error.message;
      if (error.message.includes('User already registered')) {
        errorMessage =
          language === 'tr'
            ? 'Bu e-posta adresi zaten kayıtlı'
            : 'This email is already registered';
      }
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Kayıt başarısız' : 'Registration failed',
        description: errorMessage,
      });
    } else {
      toast({
        title: language === 'tr' ? 'Kayıt başarılı' : 'Registration successful',
        description:
          language === 'tr'
            ? 'Hesabınız oluşturuldu, giriş yapabilirsiniz.'
            : 'Your account has been created. You can now log in.',
      });
      navigate('/dashboard');
    }
  };

  const features = [
    {
      icon: Scale,
      title: language === 'tr' ? 'Tarafsız Arabuluculuk' : 'Neutral Mediation',
      desc:
        language === 'tr'
          ? 'AI destekli yapılandırılmış uyuşmazlık çözümü.'
          : 'AI-assisted structured dispute resolution.',
    },
    {
      icon: Shield,
      title: language === 'tr' ? 'Güvenli & KVKK Uyumlu' : 'Secure & GDPR-ready',
      desc:
        language === 'tr'
          ? 'Verileriniz uçtan uca korunur, anonim işlenir.'
          : 'End-to-end protection, anonymous processing.',
    },
    {
      icon: Sparkles,
      title: language === 'tr' ? 'UYAP Formatlı Belgeler' : 'Official Templates',
      desc:
        language === 'tr'
          ? 'Resmi başvuru ve tutanaklar tek tıkla.'
          : 'One-click official applications and minutes.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{language === 'tr' ? 'Giriş Yap veya Kayıt Ol' : 'Login or Sign Up'} | MediPact AI</title>
        <meta
          name="description"
          content="Log in or create a MediPact AI account to save your intake, track your cases, and message your mediator."
        />
        <link rel="canonical" href="/auth" />
      </Helmet>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left brand panel */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-primary-foreground">
          <div
            className="absolute inset-0 -z-10"
            style={{ background: 'var(--gradient-hero)' }}
          />
          <div
            className="absolute inset-0 -z-10 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 10%, hsl(var(--accent) / 0.35), transparent 40%), radial-gradient(circle at 80% 90%, hsl(var(--primary-glow) / 0.4), transparent 45%)',
            }}
          />

          <Link to="/" className="flex items-center gap-3 group w-fit">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-primary-foreground/20 group-hover:scale-105 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="font-display font-semibold text-2xl tracking-tight">
              MediPact AI
            </span>
          </Link>

          <div className="space-y-8 max-w-md">
            <div>
              <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-tight">
                {language === 'tr'
                  ? 'Uyuşmazlıkları sakin, hızlı ve adil çözün.'
                  : 'Resolve disputes calmly, swiftly, and fairly.'}
              </h1>
              <p className="mt-4 text-primary-foreground/80 text-lg leading-relaxed">
                {language === 'tr'
                  ? 'Arabulucular ve taraflar için tasarlanmış modern bir platform.'
                  : 'A modern platform built for mediators and parties alike.'}
              </p>
            </div>

            <ul className="space-y-5">
              {features.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-foreground/10 backdrop-blur-sm ring-1 ring-primary-foreground/15 flex items-center justify-center">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{f.title}</p>
                    <p className="text-sm text-primary-foreground/70">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} MediPact AI ·{' '}
            {language === 'tr' ? 'Tüm hakları saklıdır' : 'All rights reserved'}
          </p>
        </aside>

        {/* Right form panel */}
        <main className="flex flex-col">
          <header className="flex items-center justify-between p-6 lg:p-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'tr' ? 'Ana sayfa' : 'Home'}
            </Link>
            <LanguageToggle />
          </header>

          <div className="flex-1 flex items-center justify-center px-6 pb-12">
            <div className="w-full max-w-md">
              {/* Mobile brand */}
              <div className="lg:hidden flex items-center gap-2 mb-8">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-semibold text-xl">MediPact AI</span>
              </div>

              <div className="mb-8">
                <h2 className="font-display text-3xl font-semibold tracking-tight">
                  {activeTab === 'login'
                    ? language === 'tr'
                      ? 'Tekrar hoş geldiniz'
                      : 'Welcome back'
                    : language === 'tr'
                    ? 'Hesap oluşturun'
                    : 'Create your account'}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {activeTab === 'login'
                    ? language === 'tr'
                      ? 'Davalarınıza ve panelinize erişmek için giriş yapın.'
                      : 'Sign in to access your cases and dashboard.'
                    : language === 'tr'
                    ? 'Saniyeler içinde başlayın. Kredi kartı gerekmez.'
                    : 'Get started in seconds. No credit card required.'}
                </p>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}
              >
                <TabsList className="grid w-full grid-cols-2 mb-6 h-11 p-1 bg-muted/60">
                  <TabsTrigger value="login" className="h-9">
                    {language === 'tr' ? 'Giriş Yap' : 'Login'}
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="h-9">
                    {language === 'tr' ? 'Kayıt Ol' : 'Sign Up'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(handleLogin)}
                      className="space-y-5"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {language === 'tr' ? 'E-posta' : 'Email'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="ornek@email.com"
                                autoComplete="email"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {language === 'tr' ? 'Şifre' : 'Password'}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showLoginPwd ? 'text' : 'password'}
                                  placeholder="••••••••"
                                  autoComplete="current-password"
                                  className="h-11 pr-10"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowLoginPwd((v) => !v)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  aria-label="toggle password"
                                >
                                  {showLoginPwd ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-11 shadow-[var(--shadow-elegant)]"
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {language === 'tr' ? 'Giriş Yap' : 'Sign In'}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <Form {...signupForm}>
                    <form
                      onSubmit={signupForm.handleSubmit(handleSignup)}
                      className="space-y-5"
                    >
                      <FormField
                        control={signupForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {language === 'tr' ? 'Ad Soyad' : 'Full Name'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={
                                  language === 'tr' ? 'Adınız Soyadınız' : 'Your name'
                                }
                                autoComplete="name"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {language === 'tr' ? 'E-posta' : 'Email'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="ornek@email.com"
                                autoComplete="email"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {language === 'tr' ? 'Şifre' : 'Password'}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showSignupPwd ? 'text' : 'password'}
                                  placeholder="••••••••"
                                  autoComplete="new-password"
                                  className="h-11 pr-10"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowSignupPwd((v) => !v)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  aria-label="toggle password"
                                >
                                  {showSignupPwd ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {language === 'tr' ? 'Şifre Tekrar' : 'Confirm Password'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-11 shadow-[var(--shadow-elegant)]"
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {language === 'tr' ? 'Hesap Oluştur' : 'Create Account'}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        {language === 'tr'
                          ? 'Kayıt olarak Kullanım Şartlarımızı ve Gizlilik Politikamızı kabul etmiş olursunuz.'
                          : 'By signing up, you agree to our Terms of Service and Privacy Policy.'}
                      </p>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                {activeTab === 'login' ? (
                  <>
                    {language === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?"}{' '}
                    <button
                      onClick={() => setActiveTab('signup')}
                      className="font-medium text-primary hover:underline"
                    >
                      {language === 'tr' ? 'Kayıt olun' : 'Sign up'}
                    </button>
                  </>
                ) : (
                  <>
                    {language === 'tr' ? 'Zaten hesabınız var mı?' : 'Already have an account?'}{' '}
                    <button
                      onClick={() => setActiveTab('login')}
                      className="font-medium text-primary hover:underline"
                    >
                      {language === 'tr' ? 'Giriş yapın' : 'Log in'}
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
