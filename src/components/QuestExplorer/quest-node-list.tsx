'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FolderOpen, Link2, Unlink2 } from 'lucide-react';
import { DisplayNode } from './model';

interface QuestNodeListProps {
  nodes: DisplayNode[];
  selectedKey?: string | null;
  emptyMessage: string;
  onSelect: (node: DisplayNode) => void;
  dense?: boolean;
  variant?: 'cards' | 'menu';
}

export function QuestNodeList({
  nodes,
  selectedKey,
  emptyMessage,
  onSelect,
  dense = false,
  variant = 'cards'
}: QuestNodeListProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        {emptyMessage}
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <ul className="px-2 flex w-full min-w-0 flex-col gap-1">
        {nodes.map((node) => {
          const isSelected = selectedKey === node.key;
          const hasChildren = (node.quest?.children?.length || 0) > 0;
          const isDisabled = !!node.disabled;

          return (
            <li key={node.key} className="group/menu-item relative">
              <button
                type="button"
                onClick={() => onSelect(node)}
                disabled={isDisabled}
                className={cn(
                  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-[width,height,padding] hover:bg-accent/50',
                  isSelected && 'font-bold bg-primary/10 text-primary',
                  isDisabled &&
                    'cursor-not-allowed opacity-55 hover:bg-transparent'
                )}
                title={node.title}
              >
                <div
                  className={cn(
                    'rounded-sm p-2 flex items-center justify-center',
                    isSelected && 'bg-primary/10 text-primary'
                  )}
                >
                  {hasChildren && (
                    <Badge
                      variant="secondary"
                      className="text-[8px] text-secondary absolute bottom-0.5 -mr-5 px-1 py-0 bg-accent-foreground/70"
                    >
                      {node.quest?.children?.length || 0}
                    </Badge>
                  )}

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
                <span className={cn(isSelected && 'font-bold', 'truncate')}>
                  {node.title}
                </span>
                {isDisabled && (
                  <Badge
                    variant="outline"
                    className="ml-auto h-5 rounded-md px-1.5 text-[10px] uppercase tracking-wide"
                  >
                    Off
                  </Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={cn('space-y-2', dense && 'space-y-1.5')}>
      {nodes.map((node) => {
        const isSelected = selectedKey === node.key;
        const hasContent = !!node.questId;
        const isDisabled = !!node.disabled;

        return (
          <Card
            key={node.key}
            className={cn(
              'cursor-pointer border-l-4 transition-all',
              isSelected
                ? 'border-l-primary bg-primary/5'
                : 'border-l-transparent hover:border-l-primary/40',
              isDisabled &&
                'cursor-not-allowed opacity-55 hover:border-l-transparent'
            )}
            onClick={() => {
              if (isDisabled) return;
              onSelect(node);
            }}
          >
            <CardContent
              className={cn(
                'p-3 flex items-center justify-between gap-3',
                dense && 'py-2'
              )}
            >
              <div className="min-w-0 flex items-center gap-2">
                {node.icon ? (
                  <img
                    src={node.icon}
                    alt={`${node.title} icon`}
                    className="h-6 w-6 rounded-sm object-cover dark:invert"
                  />
                ) : (
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{node.title}</div>
                  {node.subtitle && (
                    <div className="text-xs text-muted-foreground truncate">
                      {node.subtitle}
                    </div>
                  )}
                </div>
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
                {(node.kind === 'chapter' || node.kind === 'book') && (
                  <Badge variant={hasContent ? 'secondary' : 'outline'}>
                    {hasContent ? (
                      <Link2 className="h-3.5 w-3.5" />
                    ) : (
                      <Unlink2 className="h-3.5 w-3.5" />
                    )}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface BackHeaderProps {
  title: string;
  canGoBack: boolean;
  onBack: () => void;
}

export function BackHeader({ title, canGoBack, onBack }: BackHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="font-semibold truncate">{title}</div>
      {canGoBack && (
        <Button variant="outline" size="sm" onClick={onBack}>
          Voltar
        </Button>
      )}
    </div>
  );
}
