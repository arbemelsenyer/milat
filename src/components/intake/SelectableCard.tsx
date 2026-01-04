import { cn } from '@/lib/utils';

interface SelectableCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function SelectableCard({
  selected,
  onClick,
  title,
  description,
  icon,
  disabled,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full p-4 rounded-lg border-2 text-left transition-all duration-200',
        'hover:border-primary/50 hover:bg-primary/5',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card',
        disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-card'
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}
          >
            {icon}
          </div>
        )}
        <div>
          <h3 className={cn('font-medium', selected ? 'text-primary' : 'text-foreground')}>
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </button>
  );
}
