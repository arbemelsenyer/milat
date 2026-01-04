import { cn } from '@/lib/utils';

interface CheckboxGroupProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelections?: number;
}

export function CheckboxGroup({
  options,
  selected,
  onChange,
  maxSelections,
}: CheckboxGroupProps) {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else if (!maxSelections || selected.length < maxSelections) {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        const isDisabled = !isSelected && maxSelections && selected.length >= maxSelections;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleToggle(option.value)}
            disabled={isDisabled}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
              'hover:border-primary/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              isSelected
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card',
              isDisabled && 'opacity-50 cursor-not-allowed hover:border-border'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                isSelected
                  ? 'bg-primary border-primary'
                  : 'border-muted-foreground/50'
              )}
            >
              {isSelected && (
                <svg
                  className="w-3 h-3 text-primary-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className={cn('text-sm', isSelected ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
