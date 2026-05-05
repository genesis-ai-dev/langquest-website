'use client';

import { FileTextIcon, Globe, Image, ListChecks, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';
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

function getProjectInitials(projectName: string) {
  const words = projectName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'PR';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type ProjectListCardProps = {
  project: ProjectListItem;
};

export function ProjectListCard({ project }: ProjectListCardProps) {
  const progressValue = getProgressValue(
    project.total_quests_created,
    project.total_quests_completed
  );
  const initials = getProjectInitials(project.project_name);

  return (
    <Link
      href={`/dashboard/project?project_id=${encodeURIComponent(project.id)}`}
      className="block"
    >
      <Card className="w-full cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md py-0">
        <CardContent className="px-2 py-0">
          <div className="flex ">
            <div className="flex w-16 shrink-0 items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
            </div>

            <div className="ml-2 flex min-w-0 flex-1 flex-col justify-between gap-2 py-3 pr-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="line-clamp-1 text-sm leading-tight p-0 m-0">
                  {project.project_name}
                </CardTitle>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    <span className="max-w-[180px] truncate">
                      {project.target_languages.length > 0 ? (
                        project.target_languages.join(', ')
                      ) : (
                        <i className="italic text-muted-foreground">
                          No target language
                        </i>
                      )}
                    </span>
                  </div>
                  <span aria-hidden="true">•</span>
                  <span>{formatLastUpdated(project.last_updated_at)}</span>
                </div>
              </div>

              <CardDescription className="line-clamp-1 text-xs ellipsis">
                {project.description || (
                  <i className="italic text-muted-foreground">
                    No description provided
                  </i>
                )}
              </CardDescription>

              <div className="flex items-end gap-3 p-0">
                <div className="min-w-0 basis-[70%] max-w-[70%] space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Quest progress</span>
                    <span>
                      {project.total_quests_completed}/
                      {project.total_quests_created}
                    </span>
                  </div>
                  <Progress value={progressValue} />
                </div>

                <div className="flex basis-[30%] max-w-[30%] items-center justify-end gap-2 text-xs text-muted-foreground">
                  <div
                    className="flex items-center gap-1"
                    title={`Members: ${project.total_members}`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">
                      {project.total_members}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    title={`Quests: ${project.total_quests_created}`}
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">
                      {project.total_quests_created}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    title={`Assets: ${project.total_assets}`}
                  >
                    <FileTextIcon className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">
                      {project.total_assets}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
