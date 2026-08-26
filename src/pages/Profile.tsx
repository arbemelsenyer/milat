import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Building2, Camera, Loader2, Save, User } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Profile() {
  const { user, profile, isMediator, isLoading: authLoading, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  /* ANTET (HAT H-15/2 · seçim A) — YALNIZ ARABULUCUDA görünür ve yazılır.
     26.08 göçü kolonları ekledi, `generate-official-document` onları okuyor;
     ama hiçbir yüzey DOLDURMUYORDU: madde "DONE" işaretliydi, gerçekte her
     belge antetsiz basılıyordu. Okuma yarısı kod gerektirmedi, yazma yarısı
     hiç yazılmamıştı. Bu alanlar tarafın verisi değildir — arabulucunun kendi
     büro kimliğidir ve yalnız onun kendi belgelerine basılır. */
  const [buroAdi, setBuroAdi] = useState('');
  const [buroAdresi, setBuroAdresi] = useState('');
  const [antetLogoUrl, setAntetLogoUrl] = useState<string | null>(null);
  const [logoYukleniyor, setLogoYukleniyor] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const t = {
    tr: {
      title: 'Profil Ayarları',
      description: 'Kişisel bilgilerinizi güncelleyin',
      fullName: 'Ad Soyad',
      phone: 'Telefon Numarası',
      phonePlaceholder: '+90 5XX XXX XX XX',
      email: 'E-posta',
      emailDescription: 'E-posta adresi değiştirilemez',
      save: 'Kaydet',
      saving: 'Kaydediliyor...',
      back: 'Geri',
      uploadPhoto: 'Fotoğraf Yükle',
      changePhoto: 'Fotoğrafı Değiştir',
      successTitle: 'Başarılı',
      successMessage: 'Profiliniz güncellendi',
      errorTitle: 'Hata',
      errorMessage: 'Profil güncellenirken bir hata oluştu',
      uploadError: 'Fotoğraf yüklenirken bir hata oluştu',
      antetTitle: 'Büro Antedi',
      antetDescription: 'Bu bilgiler ürettiğiniz resmî belgelerin antedine ve "düzenlenme yeri" satırına basılır. Boş bırakırsanız belge antetsiz çıkar.',
      buroAdi: 'Büro / Ofis Adı',
      buroAdiPlaceholder: 'Örn. Av. Arb. Ayşe Yılmaz Arabuluculuk Bürosu',
      buroAdresi: 'Büro Adresi',
      buroAdresiPlaceholder: 'Belgelerde "düzenlenme yeri" olarak da kullanılır',
      logo: 'Antet Logosu',
      logoYukle: 'Logo Yükle',
      logoDegistir: 'Logoyu Değiştir',
      logoKaldir: 'Logoyu Kaldır',
      logoHata: 'Logo yüklenemedi. Yalnız JPG, PNG, GIF veya WEBP; en çok 5 MB.',
    },
    en: {
      title: 'Profile Settings',
      description: 'Update your personal information',
      fullName: 'Full Name',
      phone: 'Phone Number',
      phonePlaceholder: '+1 XXX XXX XXXX',
      email: 'Email',
      emailDescription: 'Email address cannot be changed',
      save: 'Save',
      saving: 'Saving...',
      back: 'Back',
      uploadPhoto: 'Upload Photo',
      changePhoto: 'Change Photo',
      successTitle: 'Success',
      successMessage: 'Your profile has been updated',
      errorTitle: 'Error',
      errorMessage: 'An error occurred while updating profile',
      uploadError: 'An error occurred while uploading photo',
      antetTitle: 'Office Letterhead',
      antetDescription: 'These details are printed on the letterhead of the official documents you generate, and on the "place of issue" line. If left empty, documents are produced without a letterhead.',
      buroAdi: 'Office Name',
      buroAdiPlaceholder: 'e.g. Jane Doe Mediation Office',
      buroAdresi: 'Office Address',
      buroAdresiPlaceholder: 'Also used as the "place of issue" on documents',
      logo: 'Letterhead Logo',
      logoYukle: 'Upload Logo',
      logoDegistir: 'Change Logo',
      logoKaldir: 'Remove Logo',
      logoHata: 'Logo could not be uploaded. JPG, PNG, GIF or WEBP only; 5 MB max.',
    },
  };

  const text = t[language];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      const antet = profile as { buro_adi?: string | null; buro_adresi?: string | null; antet_logo_url?: string | null };
      setBuroAdi(antet.buro_adi || '');
      setBuroAdresi(antet.buro_adresi || '');
      setAntetLogoUrl(antet.antet_logo_url || null);
    }
  }, [profile]);

  // Fetch avatar URL from profiles
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    
    fetchAvatar();
  }, [user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: text.errorTitle,
        description: text.uploadError,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: text.errorTitle,
        description: text.uploadError,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting query param
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
      
      toast({
        title: text.successTitle,
        description: text.successMessage,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: text.errorTitle,
        description: text.uploadError,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  /* LOGO YÜKLEME — avatar koluyla aynı desen, aynı kova (`avatars`).
     Yeni kova açmak SQL ister (§10); logo taraf verisi değil, arabulucunun
     büro işaretidir ve belgeye basılabilmesi için okunabilir olmalıdır.
     `storage.upload` ve `profiles.update` sonuçları OKUNUR — supabase-js hata
     fırlatmaz, okunmazsa kullanıcı "yüklendi" duyar ve logo hiç kaydolmaz
     (25.08 sessiz yazım dersi). */
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    event.target.value = '';

    /* Uzantı listesi TAHMİN DEĞİL: `avatars` kovasının INSERT/UPDATE politikası
       canlıda okundu ve yalnız şu beşine izin veriyor. Burada engellenmezse
       dosya sunucuda RLS'e takılır ve kullanıcı anlamsız bir depo hatası görür
       — tipik logo biçimi olan SVG tam olarak buraya düşerdi. */
    const IZINLI = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const uzanti = (file.name.split('.').pop() ?? '').toLowerCase();
    if (!IZINLI.includes(uzanti) || file.size > 5 * 1024 * 1024) {
      toast({ title: text.errorTitle, description: text.logoHata, variant: 'destructive' });
      return;
    }

    setLogoYukleniyor(true);
    try {
      const yol = `${user.id}/antet-logo.${uzanti}`;
      const { error: yuklemeErr } = await supabase.storage
        .from('avatars')
        .upload(yol, file, { upsert: true });
      if (yuklemeErr) {
        toast({ title: text.errorTitle, description: yuklemeErr.message, variant: 'destructive' });
        return;
      }
      const { data: genel } = supabase.storage.from('avatars').getPublicUrl(yol);
      // Önbellek kırıcı: aynı yola yazıldığı için URL değişmezse eski logo görünür.
      const url = `${genel.publicUrl}?v=${Date.now()}`;
      const { error: yazErr } = await supabase
        .from('profiles')
        .update({ antet_logo_url: url })
        .eq('user_id', user.id);
      if (yazErr) {
        toast({ title: text.errorTitle, description: yazErr.message, variant: 'destructive' });
        return;
      }
      setAntetLogoUrl(url);
      refetchProfile();
      toast({ title: text.successTitle, description: text.successMessage });
    } finally {
      setLogoYukleniyor(false);
    }
  };

  const handleLogoKaldir = async () => {
    if (!user) return;
    setLogoYukleniyor(true);
    try {
      // Yalnız bağ koparılır; dosya `avatars` kovasında kalır ve aynı yola
      // yeniden yüklenince ÜZERİNE yazılır (upsert). Kişisel veri değildir.
      const { error } = await supabase
        .from('profiles')
        .update({ antet_logo_url: null })
        .eq('user_id', user.id);
      if (error) {
        toast({ title: text.errorTitle, description: error.message, variant: 'destructive' });
        return;
      }
      setAntetLogoUrl(null);
      refetchProfile();
      toast({ title: text.successTitle, description: text.successMessage });
    } finally {
      setLogoYukleniyor(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          // Antet alanları YALNIZ arabulucu için yazılır; taraf bu alanları
          // hiç görmez ve kaydı da onun profiline yazılmaz.
          ...(isMediator
            ? {
                buro_adi: buroAdi.trim() || null,
                buro_adresi: buroAdresi.trim() || null,
              }
            : {}),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      refetchProfile();
      
      toast({
        title: text.successTitle,
        description: text.successMessage,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: text.errorTitle,
        description: text.errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {text.back}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {text.title}
            </CardTitle>
            <CardDescription>{text.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <UserAvatar 
                  avatarUrl={avatarUrl} 
                  fullName={fullName} 
                  email={user?.email}
                  size="lg"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {avatarUrl ? text.changePhoto : text.uploadPhoto}
              </Button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{text.fullName}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={text.fullName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{text.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={text.phonePlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{text.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {text.emailDescription}
                </p>
              </div>
            </div>

            {/* ANTET — YALNIZ ARABULUCU (HAT H-15/2 · seçim A).
                Taraf bu bölümü hiç görmez; büro kimliği taraf verisi değildir. */}
            {isMediator && (
              <div className="space-y-4 border-t pt-6">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4" />
                    {text.antetTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground">{text.antetDescription}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buroAdi">{text.buroAdi}</Label>
                  <Input
                    id="buroAdi"
                    value={buroAdi}
                    onChange={(e) => setBuroAdi(e.target.value)}
                    placeholder={text.buroAdiPlaceholder}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buroAdresi">{text.buroAdresi}</Label>
                  <Textarea
                    id="buroAdresi"
                    value={buroAdresi}
                    onChange={(e) => setBuroAdresi(e.target.value)}
                    placeholder={text.buroAdresiPlaceholder}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{text.logo}</Label>
                  {antetLogoUrl && (
                    <img
                      src={antetLogoUrl}
                      alt={text.logo}
                      className="h-16 w-auto max-w-full rounded border bg-white object-contain p-1"
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoYukleniyor}
                    >
                      {logoYukleniyor ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 mr-2" />
                      )}
                      {antetLogoUrl ? text.logoDegistir : text.logoYukle}
                    </Button>
                    {antetLogoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleLogoKaldir}
                        disabled={logoYukleniyor}
                      >
                        {text.logoKaldir}
                      </Button>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    /* Kovanın politikasıyla aynı beş biçim (canlıdan okundu). */
                    accept=".jpg,.jpeg,.png,.gif,.webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {text.saving}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {text.save}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
