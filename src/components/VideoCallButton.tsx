import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Video, Loader2, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface VideoCallButtonProps {
  sessionId: string;
  existingRoomUrl?: string | null;
}

export function VideoCallButton({ sessionId, existingRoomUrl }: VideoCallButtonProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [roomUrl, setRoomUrl] = useState(existingRoomUrl);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const labels = {
    tr: {
      startCall: 'Video Görüşme Başlat',
      joinCall: 'Görüşmeye Katıl',
      creating: 'Oda oluşturuluyor...',
      title: 'Video Görüşme',
      description: 'Online arabuluculuk oturumunuz için video görüşme odası',
      copyLink: 'Linki Kopyala',
      copied: 'Kopyalandı!',
      openRoom: 'Odayı Aç',
      roomReady: 'Görüşme odanız hazır. Aşağıdaki butona tıklayarak katılabilirsiniz.',
      error: 'Video odası oluşturulamadı',
    },
    en: {
      startCall: 'Start Video Call',
      joinCall: 'Join Call',
      creating: 'Creating room...',
      title: 'Video Call',
      description: 'Video meeting room for your online mediation session',
      copyLink: 'Copy Link',
      copied: 'Copied!',
      openRoom: 'Open Room',
      roomReady: 'Your meeting room is ready. Click the button below to join.',
      error: 'Failed to create video room',
    }
  };

  const t = labels[language];

  const handleCreateRoom = async () => {
    if (roomUrl) {
      setDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-video-room', {
        body: { sessionId }
      });

      if (error) {
        throw error;
      }

      if (data?.room_url) {
        setRoomUrl(data.room_url);
        setDialogOpen(true);
      } else {
        throw new Error('No room URL returned');
      }
    } catch (error) {
      console.error('Error creating video room:', error);
      toast({
        title: t.error,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!roomUrl) return;

    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleOpenRoom = () => {
    if (roomUrl) {
      window.open(roomUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <Button
        variant={roomUrl ? 'default' : 'outline'}
        size="sm"
        onClick={handleCreateRoom}
        disabled={loading}
        className={roomUrl ? 'bg-primary hover:bg-primary/90' : ''}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t.creating}
          </>
        ) : (
          <>
            <Video className="h-4 w-4 mr-2" />
            {roomUrl ? t.joinCall : t.startCall}
          </>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              {t.title}
            </DialogTitle>
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">{t.roomReady}</p>

            {roomUrl && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <input
                  type="text"
                  value={roomUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm truncate outline-none"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-success" />
                    {t.copied}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    {t.copyLink}
                  </>
                )}
              </Button>
              <Button onClick={handleOpenRoom} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                {t.openRoom}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
