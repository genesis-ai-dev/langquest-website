'use client';

import type { ReactNode } from 'react';
import { ChevronRight, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ImportAssetItemCardAction = 'add' | 'remove';

type ImportAssetItemCardProps = {
  name: string;
  label?: string | null;
  action?: ImportAssetItemCardAction;
  onClick?: () => void;
  children?: ReactNode;
};

function ImportAssetItemCard({
  name,
  label,
  action = 'add',
  onClick,
  children
}: ImportAssetItemCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-left',
        'transition-all duration-150 hover:border-primary/40 hover:bg-accent/30'
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate text-sm font-medium leading-tight">
          {name || 'Untitled asset'}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {label ? (
            <Badge
              variant="outline"
              className="max-w-[140px] truncate rounded-full px-2.5 text-[11px] font-semibold tracking-wide"
            >
              {label}
            </Badge>
          ) : null}
          {action === 'add' ? (
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary" />
          ) : (
            <X className="size-4 text-muted-foreground group-hover:text-destructive" />
          )}
        </div>
      </div>
      {children}
    </button>
  );
}

export { ImportAssetItemCard };
export type { ImportAssetItemCardProps, ImportAssetItemCardAction };
