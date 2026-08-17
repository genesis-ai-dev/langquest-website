'use client';

import type { ReactNode } from 'react';
import { ChevronRight, Eye, Pencil, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ImportAssetItemCardAction = 'add' | 'remove';

type ImportAssetItemCardProps = {
  name: string;
  label?: string | null;
  action?: ImportAssetItemCardAction;
  labelEditable?: boolean;
  labelError?: boolean;
  onClick?: () => void;
  onView?: () => void;
  onLabelClick?: () => void;
  children?: ReactNode;
};

function ImportAssetItemCard({
  name,
  label,
  action = 'add',
  labelEditable = false,
  labelError = false,
  onClick,
  onView,
  onLabelClick,
  children
}: ImportAssetItemCardProps) {
  const labelText = label?.trim() || (labelEditable ? 'No label' : '');

  return (
    <div
      className={cn(
        'group flex w-full flex-col gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5',
        'transition-all duration-150 hover:border-primary/40 hover:bg-accent/30'
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {onView ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="View asset"
              title="View asset"
              onClick={onView}
            >
              <Eye className="size-4" />
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onClick}
            className="min-w-0 flex-1 truncate text-left text-sm font-medium leading-tight"
          >
            {name || 'Untitled asset'}
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {labelText ? (
            labelEditable ? (
              <button
                type="button"
                onClick={onLabelClick}
                aria-label="Edit label"
                title="Edit label"
              >
                <Badge
                  variant={labelError ? 'destructive' : 'default'}
                  className="max-w-[160px] cursor-pointer gap-1 truncate rounded-full px-2.5 text-[11px] font-semibold tracking-wide"
                >
                  <Pencil className="size-3 shrink-0" />
                  <span className="truncate">{labelText}</span>
                </Badge>
              </button>
            ) : (
              <Badge
                variant="default"
                className="max-w-[140px] truncate rounded-full px-2.5 text-[11px] font-semibold tracking-wide"
              >
                {labelText}
              </Badge>
            )
          ) : null}
          <button
            type="button"
            onClick={onClick}
            aria-label={action === 'add' ? 'Add asset' : 'Remove asset'}
            className="flex size-7 items-center justify-center"
          >
            {action === 'add' ? (
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary" />
            ) : (
              <X className="size-4 text-muted-foreground group-hover:text-destructive" />
            )}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

export { ImportAssetItemCard };
export type { ImportAssetItemCardProps, ImportAssetItemCardAction };
