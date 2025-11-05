'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Folder } from 'lucide-react';

interface QuestCardProps {
  quest: {
    id: string;
    name: string | null;
    description: string | null;
    created_at: string;
    active: boolean;
  };
  isSelected?: boolean;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  questsCount?: number;
  assetsCount?: number;
}

export function QuestCard({
  quest,
  isSelected,
  onClick,
  icon: Icon = Folder,
  questsCount = 0,
  assetsCount = 0
}: QuestCardProps) {
  return (
    <Card
      className={`h-36 flex justify-between p-2 px-0 group relative hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 gap-0 ${
        isSelected
          ? 'border-l-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
          : 'border-l-transparent hover:border-l-primary/50 hover:bg-accent/50'
      }`}
      onClick={onClick}
    >
      {/* Header com ícone e título - padding reduzido */}
      <CardHeader className="w-full flex flex-row items-center gap-2 overflow-hidden px-2">
        {/* <div className=""> */}
        <div
          className={`p-2 rounded-lg transition-colors ${
            isSelected
              ? 'bg-primary/10 text-primary'
              : 'bg-muted group-hover:bg-primary/10 group-hover:text-primary'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <CardTitle
          className="flex-1 text-base font-semibold leading-tight overflow-hidden whitespace-nowrap truncate"
          title={quest.name || `Quest ${quest.id.slice(0, 8)}`}
        >
          {quest.name || `Quest ${quest.id.slice(0, 8)}`}
        </CardTitle>
        {/* </div> */}
      </CardHeader>

      {/* Conteúdo - Descrição com padding reduzido */}
      <CardContent className="max-h-16 px-6 py-0 overflow-hidden ">
        {quest.description ? (
          <p className="text-xs text-muted-foreground text-clip">
            {quest.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic mb-2">
            No description available.
          </p>
        )}
      </CardContent>

      {/* Footer com estatísticas - mais próximo das bordas */}
      <CardFooter className="px-4 py-0 pt-1">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{questsCount} quests</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="font-medium">{assetsCount} assets</span>
          </div>
          <Badge
            variant={quest.active ? 'default' : 'secondary'}
            className="text-xs px-2 py-1"
          >
            {quest.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardFooter>

      {/* Indicador visual de seleção */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}
    </Card>
  );
}
