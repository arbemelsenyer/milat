import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { MessageCircle, LogOut, Shield, LayoutDashboard, Bell, ShieldCheck } from 'lucide-react';

export function AppNavbar() {
  const navigate = useNavigate();
  const { user, isMediator, isAdmin, signOut } = useAuth();
  const { language } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) return null;

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="container max-w-6xl py-3 px-4 flex items-center justify-between">
        <Link to={isMediator ? "/mediator" : "/dashboard"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-xl text-foreground">
            MediPact AI
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <LayoutDashboard className="w-4 h-4 mr-1" />
              {language === 'tr' ? 'Panel' : 'Dashboard'}
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/mediator">
              <Shield className="w-4 h-4 mr-1" />
              {language === 'tr' ? 'Süreç Yönetimi' : 'Process'}
            </Link>
          </Button>

          {isAdmin && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <Shield className="w-4 h-4 mr-1" />
                  Admin
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/privacy-tests" title="Gizlilik Testleri">
                  <ShieldCheck className="w-4 h-4" />
                </Link>
              </Button>
            </>
          )}

          <Button variant="ghost" size="sm" asChild>
            <Link to="/notification-settings" title={language === 'tr' ? 'Bildirim Ayarları' : 'Notification Settings'}>
              <Bell className="w-4 h-4" />
            </Link>
          </Button>

          <NotificationBell />
          <LanguageToggle />

          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-1" />
            {language === 'tr' ? 'Çıkış' : 'Logout'}
          </Button>
        </nav>
      </div>
    </header>
  );
}
