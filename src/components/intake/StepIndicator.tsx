import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative h-1 bg-secondary rounded-full overflow-hidden mb-4">
        <div
          className="absolute left-0 top-0 h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {labels.map((label, index) => (
          <div
            key={index}
            className={cn(
              'flex flex-col items-center',
              index <= currentStep ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                index < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index === currentStep
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {index < currentStep ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className="text-xs mt-2 hidden sm:block text-center max-w-[80px]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
