import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, Loader2, Save, User } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Profile() {
  const { user, profile, isLoading: authLoading, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
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
