'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type RecentActivityItem = {
  project_id: string;
  project_name: string;
  description: string;
  user: {
    id: string;
    name: string;
  };
  date_time: string;
  source: 'asset' | 'quest' | 'member' | 'project';
};

type ActivityCardProps = {
  activity: RecentActivityItem;
};

const sourceLabelByType: Record<RecentActivityItem['source'], string> = {
  asset: 'Asset',
  quest: 'Quest',
  member: 'Member',
  project: 'Project'
};

const sourceStyleByType: Record<RecentActivityItem['source'], string> = {
  asset:
    'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
  quest:
    'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  member: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  project:
    'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300'
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
    // hour: '2-digit',
    // minute: '2-digit'
  }).format(date);
};

export function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <article className="rounded-md border border-border/60 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium leading-tight wrap-break-word">
            {activity.description}
          </p>
          <p className="text-xs text-muted-foreground wrap-break-word">
            {activity.project_name}
          </p>
        </div>

        <Badge
          variant="outline"
          className={cn('shrink-0', sourceStyleByType[activity.source])}
        >
          {sourceLabelByType[activity.source]}
        </Badge>
      </div>

      <div className="flex flex-row items-center justify-between text-xs text-muted-foreground space-y-1">
        <p>User: {activity.user.name}</p>
        <p>{formatDateTime(activity.date_time)}</p>
      </div>
    </article>
  );
}
