'use client';

import { useLoading } from './loading-provider';
import { Spinner } from './spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  className?: string;
}

export function LoadingOverlay({ className }: LoadingOverlayProps) {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 p-6 bg-background border rounded-lg shadow-lg">
        <Spinner />
        {loadingMessage && (
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {loadingMessage}
          </p>
        )}
      </div>
    </div>
  );
}
