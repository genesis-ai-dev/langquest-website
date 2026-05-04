'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { PortalHeader } from '@/components/portal-header';
import { Spinner } from '@/components/spinner';
import QuestsBoard, {
  type DashboardMainQuest
} from '@/components/dashboard/quests-board';
import ProjectChartContainer from '@/components/dashboard/project-chart-container';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Activity,
  ArrowLeft,
  FolderOpen,
  Languages,
  ListChecks,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

type Template = 'bible' | 'fia' | 'unstructured';

type DashboardProjectResponse = {
  project_id: string;
  project_status: 'active' | 'inactive';
  template: Template;
  project_name: string;
  project_description: string | null;
  total_quests: number;
  expected_quests: number;
  total_subquests: number;
  total_assets: number;
  assets_with_text: number;
  assets_with_image: number;
  assets_with_audio: number;
  total_source_languages: number;
  total_target_languages: number;
  total_members: number;
  total_owners: number;
  dashboard_json: {
    members: Record<
      string,
      {
        questsCreated: number;
        assetsCreated: number;
        name?: string;
      }
    >;
    quests: Record<string, DashboardMainQuest>;
  };
  updated_at: string;
};

const metricTitlesByTemplate: Record<
  Template,
  {
    members: string;
    languages: string;
    quests: string;
    subquests: string;
    assets: string;
  }
> = {
  bible: {
    members: 'Contributors',
    languages: 'Languages',
    quests: 'Books',
    subquests: 'Chapters',
    assets: 'Assets'
  },
  fia: {
    members: 'Contributors',
    languages: 'Languages',
    quests: 'Books',
    subquests: 'Pericopes',
    assets: 'Assets'
  },
  unstructured: {
    members: 'Members',
    languages: 'Languages',
    quests: 'Quests',
    subquests: 'Subquests',
    assets: 'Assets'
  }
};

export default function ProjectDashboardPage() {
  const { user, session, isLoading, signOut } = useAuth();
  const searchParams = useSearchParams();
  const [projectData, setProjectData] =
    useState<DashboardProjectResponse | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = searchParams.get('project_id');

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/login?redirectTo=/dashboard/project';
      return;
    }

    if (isLoading || !user || !session?.access_token) return;

    if (!projectId) {
      setError('Missing project_id in URL query string.');
      setIsFetching(false);
      return;
    }

    const accessToken = session.access_token;
    let cancelled = false;

    async function fetchProjectDashboard() {
      try {
        setIsFetching(true);
        setError(null);

        const response = await fetch(
          `/api/dashboard/project?project_id=${projectId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            errorPayload?.error || 'Failed to load project dashboard'
          );
        }

        const payload = (await response.json()) as DashboardProjectResponse;
        if (!cancelled) {
          setProjectData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load project dashboard'
          );
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    void fetchProjectDashboard();
    return () => {
      cancelled = true;
    };
  }, [isLoading, projectId, session?.access_token, user]);

  const stats = useMemo(() => {
    if (!projectData) return [];

    const titles = metricTitlesByTemplate[projectData.template];
    return [
      {
        title: titles.members,
        icon: Users,
        value: `${projectData.total_members} / ${projectData.total_owners}`,
        description: 'Members / Owners'
      },
      {
        title: titles.languages,
        icon: Languages,
        value:
          projectData.total_source_languages +
          projectData.total_target_languages,
        description: 'Total languages'
      },
      {
        title: titles.quests,
        icon: ListChecks,
        value: projectData.total_quests,
        description: `${projectData.expected_quests} expected total`
      },
      {
        title: titles.subquests,
        icon: ListChecks,
        value: projectData.total_subquests,
        description: 'Total'
      },
      {
        title: titles.assets,
        icon: Activity,
        value: projectData.total_assets,
        description: `${projectData.assets_with_text} text · ${projectData.assets_with_image} image · ${projectData.assets_with_audio} audio`
      }
    ];
  }, [projectData]);

  if (isLoading) {
    return (
      <div className="container p-8 max-w-(--breakpoint-xl) mx-auto flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isFetching) {
    return (
      <>
        <PortalHeader user={user} onSignOut={signOut} />
        <div className="container p-8 max-w-(--breakpoint-xl) mx-auto flex justify-center">
          <Spinner className="h-6 w-6 text-foreground" />
        </div>
      </>
    );
  }

  if (error || !projectData) {
    return (
      <>
        <PortalHeader user={user} onSignOut={signOut} />
        <div className="container p-8 max-w-(--breakpoint-xl) mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Failed to load project dashboard</CardTitle>
              <CardDescription>
                {error || 'Project data is unavailable.'}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PortalHeader user={user} onSignOut={signOut} />
      <main className="container p-6 md:p-8 max-w-(--breakpoint-xl) mx-auto space-y-8">
        <section className="space-y-4">
          <Button asChild variant="ghost" size="sm" className="mb-4 w-fit">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <Card className="border-primary/20">
            <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardDescription className="uppercase tracking-wide text-xs">
                  Project Overview
                </CardDescription>
                <CardTitle className="text-2xl md:text-3xl tracking-tight">
                  {projectData.project_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {projectData.project_description ||
                    'No project description available.'}
                </p>
              </div>
              <Button asChild variant="outline" className="w-full md:w-auto">
                <Link href={`/project/${projectData.project_id}`}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open Project
                </Link>
              </Button>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className={cn(
                  'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg border-primary/20'
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className="rounded-full border p-2 backdrop-blur-sm text-primary bg-primary/10 border-primary/20">
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <ProjectChartContainer
          accessToken={session?.access_token}
          projectId={projectData.project_id}
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <QuestsBoard
            quests={projectData.dashboard_json.quests || {}}
            subquestLabel={
              metricTitlesByTemplate[projectData.template].subquests
            }
          />
          <RecentActivity
            accessToken={session?.access_token}
            projectId={projectId ?? undefined}
          />
        </section>
      </main>
    </>
  );
}
