import { cn } from '@/lib/utils';

interface EnvironmentBadgeProps {
  environment: 'production' | 'preview' | 'development';
  className?: string;
}

export function EnvironmentBadge({
  environment,
  className
}: EnvironmentBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
        environment === 'production' &&
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        environment === 'preview' &&
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        environment === 'development' &&
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        className
      )}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          environment === 'production' && 'bg-green-500',
          environment === 'preview' && 'bg-yellow-500',
          environment === 'development' && 'bg-blue-500'
        )}
      />
      <span className="first-letter:uppercase">{environment} Environment</span>
    </div>
  );
}
