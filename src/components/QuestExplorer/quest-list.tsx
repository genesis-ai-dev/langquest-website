'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FolderOpen } from 'lucide-react';
import { DisplayNode } from './model';

interface QuestListProps {
  nodes: DisplayNode[];
  selectedKey?: string | null;
  emptyMessage: string;
  onSelect: (node: DisplayNode) => void;
}

export function QuestList({
  nodes,
  selectedKey,
  emptyMessage,
  onSelect
}: QuestListProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="flex w-full min-w-0 flex-col gap-1.5 p-2">
      {nodes.map((node) => {
        const isSelected = selectedKey === node.key;
        const childrenCount = node.quest?.children?.length || 0;
        const hasChildren = childrenCount > 0;
        const isDisabled = !!node.disabled;

        return (
          <li key={node.key} className="relative">
            <button
              type="button"
              onClick={() => onSelect(node)}
              disabled={isDisabled}
              title={node.title}
              className={cn(
                'group w-full max-w-full min-h-12 px-3 py-2 text-left flex items-center gap-3 rounded-lg border border-transparent transition-all',
                'hover:bg-accent/40 hover:border-border/60 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent disabled:hover:border-transparent',
                isSelected &&
                  'bg-primary/8 border-primary/30 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]'
              )}
            >
              <div
                className={cn(
                  'relative shrink-0 h-8 w-8 rounded-md border border-border/80 bg-background/80 flex items-center justify-center transition-colors',
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
              </div>

              <div className="min-w-0 flex-1 max-w-sm ">
                <div
                  className={cn(
                    'truncate text-sm font-medium ellipsis',
                    isSelected && 'font-semibold ellipsis'
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

              <div className="flex items-center gap-1.5">
                {isDisabled && (
                  <Badge
                    variant="outline"
                    className="h-5 rounded-md px-1.5 text-[10px] uppercase tracking-wide"
                  >
                    Off
                  </Badge>
                )}
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
          </li>
        );
      })}
    </ul>
  );
}
