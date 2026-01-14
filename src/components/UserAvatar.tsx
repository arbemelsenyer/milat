import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({ avatarUrl, fullName, email, className, size = 'md' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-24 w-24 text-2xl',
  };

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email?.[0].toUpperCase() || 'U';

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarUrl || undefined} alt={fullName || 'User avatar'} />
      <AvatarFallback className="bg-primary text-primary-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
