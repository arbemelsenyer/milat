import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
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
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Giriş başarısız' : 'Login failed',
        description: error.message === 'Invalid login credentials'
          ? (language === 'tr' ? 'E-posta veya şifre hatalı' : 'Invalid email or password')
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
        errorMessage = language === 'tr' 
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
        description: language === 'tr' 
          ? 'Hesabınız oluşturuldu, giriş yapabilirsiniz.' 
          : 'Your account has been created. You can now log in.',
      });
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Login or Sign Up | MediPact AI</title>
        <meta name="description" content="Log in or create a MediPact AI account to save your intake, track your cases, and message your mediator." />
        <link rel="canonical" href="/auth" />
        <meta property="og:title" content="Login or Sign Up | MediPact AI" />
        <meta property="og:description" content="Access your MediPact AI dashboard to track cases and message your mediator." />
        <meta property="og:url" content="/auth" />
      </Helmet>
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-6xl py-4 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              MediPact AI
            </span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'tr' ? 'Ana sayfaya dön' : 'Back to home'}
          </Link>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-display">
                {language === 'tr' ? 'Hoş Geldiniz' : 'Welcome'}
              </CardTitle>
              <CardDescription>
                {language === 'tr' 
                  ? 'Başvurularınızı takip edin ve yönetin' 
                  : 'Track and manage your applications'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">
                    {language === 'tr' ? 'Giriş Yap' : 'Login'}
                  </TabsTrigger>
                  <TabsTrigger value="signup">
                    {language === 'tr' ? 'Kayıt Ol' : 'Sign Up'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'tr' ? 'E-posta' : 'Email'}</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="ornek@email.com" 
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
                            <FormLabel>{language === 'tr' ? 'Şifre' : 'Password'}</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="••••••••" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {language === 'tr' ? 'Giriş Yap' : 'Login'}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="signup">
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                      <FormField
                        control={signupForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{language === 'tr' ? 'Ad Soyad' : 'Full Name'}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={language === 'tr' ? 'Adınız Soyadınız' : 'Your name'} 
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
                            <FormLabel>{language === 'tr' ? 'E-posta' : 'Email'}</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="ornek@email.com" 
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
                            <FormLabel>{language === 'tr' ? 'Şifre' : 'Password'}</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="••••••••" 
                                {...field} 
                              />
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
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {language === 'tr' ? 'Kayıt Ol' : 'Sign Up'}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
