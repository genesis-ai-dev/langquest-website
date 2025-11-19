'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BibleBookQuest } from './template';

interface BookCardProps {
  quest: BibleBookQuest;
  isSelected?: boolean;
  onClick?: () => void;
}

export function BookCard({ quest, isSelected, onClick }: BookCardProps) {
  return (
    <Card
      className={`h-36 flex flex-row items-stretch p-0 px-0 group relative hover:shadow-lg transition-all duration-300 cursor-pointer gap-0 overflow-hidden border-l-4 border-l-primary/10 ${
        isSelected
          ? 'border-l-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
          : 'border-l-primary/10 hover:border-l-primary/50 hover:bg-accent/50'
      }`}
      onClick={onClick}
    >
      <div
        className={`w-16 flex justify-center items-center p-2 transition-colors ${
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'bg-muted group-hover:bg-primary/10 group-hover:text-primary'
        }`}
      >
        <img
          src={quest.icon}
          alt={`${quest.name} icon`}
          className="w-10 h-10"
        />
      </div>
      <div className="flex-1 flex flex-col justify-between p-2 py-3">
        <div className="flex flex-col">
          <div className="text-md font-semibold">{quest.name}</div>
          <div className="text-xs">{quest.chapters} chapters</div>
        </div>
        <div className="text-xs text-muted-foreground">
          {quest.children ? (
            <Badge variant="secondary">Content Included</Badge>
          ) : (
            'No content yet'
          )}
        </div>
      </div>

      {/* Indicador visual de seleção */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}
    </Card>
  );
}
