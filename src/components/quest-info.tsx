'use client';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import { Info, Calendar } from 'lucide-react';

interface QuestInfoProps {
  quest: {
    name?: string;
    description?: string;
    created_at?: string;
    assets?: any[];
  } | null;
}

export function QuestInfo({ quest }: QuestInfoProps) {
  if (!quest) return null;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="ml-4 hover:bg-accent hover:text-accent-foreground p-1 rounded-sm transition-colors">
          <Info className="h-4 w-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="bottom" align="start">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{quest.name}</h4>
          {quest.description && (
            <p className="text-sm text-muted-foreground">{quest.description}</p>
          )}
          <div className="flex items-center pt-2">
            <Calendar className="mr-2 h-3 w-3 opacity-70" />
            <span className="text-xs text-muted-foreground">
              Created{' '}
              {quest.created_at
                ? new Date(quest.created_at).toLocaleDateString()
                : 'Unknown'}
            </span>
          </div>
          {/* {quest.assets && (
            <div className="flex items-center">
              <File className="mr-2 h-3 w-3 opacity-70" />
              <span className="text-xs text-muted-foreground">
                {quest.assets.length} asset(s)
              </span>
            </div>
          )} */}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
