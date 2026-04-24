'use client';

import { Globe } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export type ProjectListItem = {
  id: string;
  project_name: string;
  description: string | null;
  target_languages: string[];
  last_updated_at?: string;
  total_members: number;
  total_quests_created: number;
  total_quests_completed: number;
  total_assets: number;
};

function getProgressValue(created: number, completed: number) {
  if (created <= 0) return 0;
  return Math.min(100, Math.round((completed / created) * 100));
}

function formatLastUpdated(value?: string) {
  if (!value) return 'Updated recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Updated recently';

  return `Updated ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })}`;
}

type ProjectListCardProps = {
  project: ProjectListItem;
};

export function ProjectListCard({ project }: ProjectListCardProps) {
  const progressValue = getProgressValue(
    project.total_quests_created,
    project.total_quests_completed
  );

  return (
    <Card className="w-full px-4 py-5">
      <CardContent className="px-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm leading-tight">
            {project.project_name}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[220px] truncate">
                {project.target_languages.length > 0
                  ? project.target_languages.join(', ')
                  : 'No target language'}
              </span>
            </div>
            <span aria-hidden="true">•</span>
            <span>{formatLastUpdated(project.last_updated_at)}</span>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <CardDescription className="line-clamp-1 text-xs">
            {project.description || 'No description provided'}
          </CardDescription>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <p className="whitespace-nowrap">
              <span className="text-muted-foreground">Members: </span>
              <span className="font-semibold">{project.total_members}</span>
            </p>
            <p className="whitespace-nowrap">
              <span className="text-muted-foreground">Quests: </span>
              <span className="font-semibold">
                {project.total_quests_created}
              </span>
            </p>
            {/* <p className="whitespace-nowrap">
              <span className="text-muted-foreground">Completed: </span>
              <span className="font-semibold">{project.total_quests_completed}</span>
            </p> */}
            <p className="whitespace-nowrap">
              <span className="text-muted-foreground">Assets: </span>
              <span className="font-semibold">{project.total_assets}</span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Quest progress</span>
            <span>
              {project.total_quests_completed}/{project.total_quests_created}
            </span>
          </div>
          <Progress value={progressValue} />
        </div>
      </CardContent>
    </Card>
  );
}
