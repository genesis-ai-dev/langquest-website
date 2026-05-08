'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PortalHeader } from '@/components/portal-header';
import OverviewChartContainer from '@/components/dashboard/overview-chart-container';
import { ProjectList } from '@/components/dashboard/project-list';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { Spinner } from '@/components/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Activity,
  FolderKanban,
  Languages,
  ListChecks,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardOverview = {
  profile_id: string;
  total_projects: number;
  total_active_projects: number;
  total_members: number;
  total_quests: number;
  total_quests_completed: number;
  total_source_languages: number;
  total_target_languages: number;
  total_assets: number;
  total_text_assets: number;
  total_image_assets: number;
  total_audio_assets: number;
};

export default function DashboardPage() {
  const { user, session, isLoading, signOut } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/login?redirectTo=/dashboard';
      return;
    }

    if (isLoading || !user || !session?.access_token) return;

    const userId = user.id;
    const accessToken = session.access_token;

    let cancelled = false;

    async function fetchOverview() {
      try {
        setIsFetching(true);
        setError(null);

        const response = await fetch(
          `/api/dashboard/overview?profile_id=${userId}`,
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
          throw new Error(errorPayload?.error || 'Failed to load dashboard');
        }

        const payload = (await response.json()) as DashboardOverview;
        if (!cancelled) {
          setOverview(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load dashboard'
          );
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    void fetchOverview();
    return () => {
      cancelled = true;
    };
  }, [isLoading, session?.access_token, user]);

  const stats = useMemo(() => {
    if (!overview) return [];

    return [
      {
        title: 'Active Projects',
        icon: FolderKanban,
        value: overview.total_active_projects,
        description: `${overview.total_projects} total projects`,
        cardClass: 'border-primary/20',
        iconClass: 'text-primary bg-primary/10 border-primary/20'
      },
      {
        title: 'Members',
        icon: Users,
        value: overview.total_members,
        // description: 'Total linked members',
        description: 'Across all projects',
        cardClass: 'border-primary/20',
        iconClass: 'text-primary bg-primary/10 border-primary/20'
      },
      {
        title: 'Languages',
        icon: Languages,
        value:
          overview.total_source_languages + overview.total_target_languages,
        description: 'Unique languages',
        cardClass: 'border-primary/20',
        iconClass: 'text-primary bg-primary/10 border-primary/20'
      },
      {
        title: 'Quests',
        icon: ListChecks,
        value: overview.total_quests,
        description: `${overview.total_quests_completed} completed`,
        cardClass: 'border-primary/20',
        iconClass: 'text-primary bg-primary/10 border-primary/20'
      },
      {
        title: 'Assets',
        icon: Activity,
        value: overview.total_assets,
        description: `${overview.total_text_assets} text · ${overview.total_image_assets} image · ${overview.total_audio_assets} audio`,
        cardClass: 'border-primary/20',
        iconClass: 'text-primary bg-primary/10 border-primary/20'
      }
    ];
  }, [overview]);

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

  if (error) {
    return (
      <>
        <PortalHeader user={user} onSignOut={signOut} />
        <div className="container p-8 max-w-(--breakpoint-xl) mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Failed to load dashboard</CardTitle>
              <CardDescription>{error}</CardDescription>
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
        <section className="space-y-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Overview
              </h1>
              <p className="text-muted-foreground">
                Structured View of Content Production and Progress.
              </p>
            </div>
            {/* <Badge
              variant="outline"
              className="w-fit border-primary/40 bg-primary/10 text-primary"
            >
              Live overview
            </Badge> */}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className={cn(
                  'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                  stat.cardClass
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div
                    className={cn(
                      'rounded-full border p-2 backdrop-blur-sm',
                      stat.iconClass
                    )}
                  >
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

        <section>
          <OverviewChartContainer
            accessToken={session?.access_token}
            pieItemLimit={6}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="border-primary/20 shadow-sm xl:col-span-2">
            <CardContent>
              <ProjectList />
            </CardContent>
          </Card>

          <RecentActivity accessToken={session?.access_token} />
        </section>
      </main>
    </>
  );
}
