'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FolderOpen, Link2, ChevronRight } from 'lucide-react';
import { DisplayNode } from './template-strategies';

interface QuestCardProps {
  nodes: DisplayNode[];
  emptyMessage: string;
  onSelect: (node: DisplayNode) => void;
}

export function QuestCard({ nodes, emptyMessage, onSelect }: QuestCardProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {nodes.map((node) => {
        const childrenCount = node.quest?.children?.length || 0;
        const hasChildren = childrenCount > 0;
        const isDisabled = !!node.disabled;
        const hasContent = !!node.questId || hasChildren;
        const titleTooltip = node.subtitle
          ? `${node.title}\n${node.subtitle}`
          : node.title;

        return (
          <button
            key={node.key}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(node)}
            title={titleTooltip}
            className={cn(
              'w-full overflow-hidden rounded-lg border border-border/70 bg-background/50 px-3 py-2.5 text-left transition-all',
              'hover:bg-accent/40 hover:border-border disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 shrink-0 rounded-md border border-border/70 bg-card/70 flex items-center justify-center">
                {node.icon ? (
                  <img
                    src={node.icon}
                    alt={node.title}
                    className="h-4.5 w-4.5 rounded-sm object-cover dark:invert"
                  />
                ) : (
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium">{node.title}</div>
                {node.subtitle && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    {node.subtitle}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Badge
                  variant={hasContent ? 'secondary' : 'outline'}
                  className="h-5 px-1.5 rounded-md text-[10px]"
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  {hasContent ? 'On' : 'Off'}
                </Badge>
                {hasChildren && (
                  <Badge
                    variant="secondary"
                    className="h-5 w-5 p-0 rounded-md text-[10px] tabular-nums justify-center"
                  >
                    {childrenCount}
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
