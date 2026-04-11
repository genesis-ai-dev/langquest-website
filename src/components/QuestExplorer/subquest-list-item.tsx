'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FolderOpen, Link2, Unlink2 } from 'lucide-react';
import { DisplayNode } from './model';

interface SubquestListItemProps {
  node: DisplayNode;
  isSelected: boolean;
  onSelect: (node: DisplayNode) => void;
}

export function SubquestListItem({
  node,
  isSelected,
  onSelect
}: SubquestListItemProps) {
  const isDisabled = !!node.disabled;
  const childrenCount = node.quest?.children?.length || 0;
  const hasChildren = childrenCount > 0;
  const hasContent = !!node.questId || hasChildren;

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      disabled={isDisabled}
      title={node.title}
      className={cn(
        'group max-w-full w-full min-h-14 px-3 py-2 text-left flex items-center gap-3 rounded-lg border transition-all',
        'border-border/70 bg-card/40 hover:bg-accent/40 hover:border-border disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-card/40',
        isSelected && 'border-primary/50 bg-primary/10 text-primary'
      )}
    >
      {/* <div
        className={cn(
          'relative shrink-0 h-9 w-9 rounded-md border border-border/80 bg-background/80 flex items-center justify-center',
          isSelected && 'border-primary/50 bg-primary/10'
        )}
      >
        {node.icon ? (
          <img
            src={node.icon}
            alt={node.title}
            className="h-5 w-5 rounded-sm object-cover dark:invert"
          />
        ) : (
          <FolderOpen className="h-5 w-5" />
        )}
      </div> */}

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-sm font-medium',
            isSelected && 'font-semibold'
          )}
        >
          {node.title}
        </div>
        {node.subtitle && (
          <div className="truncate text-[11px] text-muted-foreground">
            {node.subtitle}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isDisabled && (
          <Badge
            variant="outline"
            className="h-5 rounded-md px-1.5 text-[10px] uppercase tracking-wide"
            title="Disabled"
          >
            Off
          </Badge>
        )}
        <Badge
          variant={hasContent ? 'secondary' : 'outline'}
          className="h-5 w-5 p-0 rounded-md justify-center"
          title={hasContent ? 'Has content' : 'No content'}
        >
          {hasContent ? (
            <Link2 className="h-3.5 w-3.5" />
          ) : (
            <Unlink2 className="h-3.5 w-3.5" />
          )}
        </Badge>

        {hasChildren && (
          <Badge
            variant={isSelected ? 'default' : 'secondary'}
            className="h-5 w-5 p-0 rounded-md text-[10px] tabular-nums justify-center"
          >
            {childrenCount}
          </Badge>
        )}
      </div>
    </button>
  );
}
