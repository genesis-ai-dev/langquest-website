'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Link2, Unlink2 } from 'lucide-react';

interface ChapterCardProps {
  quest: {
    id: string;
    name: string | null;
    description: string | null;
    created_at: string;
    active: boolean;
    metadata: string | null;
  };
  chapterNumber?: number;
  verseCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  assetsCount?: number;
  hasContent?: boolean;
}

export function ChapterCard({
  isSelected,
  chapterNumber,
  verseCount,
  onClick,
  // icon: Icon = Folder,
  hasContent = false
}: ChapterCardProps) {
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

      <CardFooter className="">
        <div className="w-full text-xs flex items-center justify-center ">
          {hasContent ? (
            <Badge variant={'secondary'} className="w-full text-xs px-2 py-0">
              <Link2 className="w-5 h-5" />
            </Badge>
          ) : (
            <Badge variant={'outline'} className="w-full text-xs px-2 py-0">
              <Unlink2 className="w-5 h-5" />
            </Badge>
          )}
        </div>
      </CardFooter>

      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}
    </Card>
  );
}
