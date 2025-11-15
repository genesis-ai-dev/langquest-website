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

interface BookCardProps {
  quest: {
    id: string;
    name: string | null;
    description: string | null;
    created_at: string;
    active: boolean;
  };
  chapterNumber?: number;
  verseCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  assetsCount?: number;
}

export function ChapterCard({
  quest,
  isSelected,
  chapterNumber,
  verseCount,
  onClick,
  icon: Icon = Folder,
  assetsCount = 0
}: BookCardProps) {
  return (
    <Card
      className={`h-36 flex justify-between p-2 px-0 group relative hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 gap-0 ${
        isSelected
          ? 'border-l-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
          : 'border-l-transparent hover:border-l-primary/50 hover:bg-accent/50'
      }`}
      onClick={onClick}
    >
      <CardHeader className="w-full flex flex-row items-center gap-2 overflow-hidden px-2">
        <CardTitle className="flex-1 flex text-sm font-semibold leading-tight overflow-hidden whitespace-nowrap truncate justify-center items-center">
          Chapter
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 py-0 overflow-hidden flex flex-col items-center justify-center">
        <p className="text-4xl font-semibold text-primary text-clip">
          {chapterNumber}
        </p>
        <p className="text-xs text-muted-foreground text-clip">
          {verseCount} verses
        </p>
      </CardContent>

      {/* Footer com estatísticas - mais próximo das bordas */}
      <CardFooter className="">
        <div className="w-full text-xs flex items-center justify-center ">
          {/* <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{questsCount} quests</span> */}
          {/* <span className="text-muted-foreground/60">•</span> */}
          {/* <div>{assetsCount} assets</div> */}
          {/* </div> */}
          <Badge variant={'secondary'} className="text-xs px-2 py-0">
            {assetsCount} assets
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
