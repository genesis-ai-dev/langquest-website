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
}

export function QuestCard({
  quest,
  isSelected,
  onClick,
  icon: Icon = Folder
}: QuestCardProps) {
  return (
    <Card
      className={`hover:bg-primary-foreground hover:shadow-md transition-shadow cursor-pointer gap-0 ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="">
        <CardTitle className="text-base flex items-center gap-4 pb-2">
          <Icon className="w-6 h-6" />
          {quest.name || `Quest ${quest.id.slice(0, 8)}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-12 overflow-clip">
        {quest.description ? (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {quest.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3 italic">
            No description.
          </p>
        )}
        {/* <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Created: {new Date(quest.created_at).toLocaleDateString()}
          </span>
          <Badge
            variant={quest.active ? 'default' : 'secondary'}
            className="text-xs"
          >
            {quest.active ? 'Active' : 'Inactive'}
          </Badge>
        </div> */}
      </CardContent>
      <CardFooter className="flex items-center justify-between text-xs pt-2">
        <div>2 quests . 10 assets</div>
        <Badge
          variant={quest.active ? 'default' : 'secondary'}
          className="text-xs"
        >
          {quest.active ? 'Active' : 'Inactive'}
        </Badge>
      </CardFooter>
    </Card>
  );
}
