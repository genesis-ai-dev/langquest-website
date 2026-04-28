'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { PortalHeader } from '@/components/portal-header';
import { Spinner } from '@/components/spinner';
import { DashboardQuestCard } from '@/components/dashboard/dashboard-quest-card';
import { DashboardSubquestCard } from '@/components/dashboard/dashhboard-subquest-card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
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
  Languages,
  ListChecks,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

type Template = 'bible' | 'fia' | 'unstructured';

type DashboardSubquest = {
  name: string | null;
  creator_id: string[];
  languoids: string[];
  ItemsExpected: number;
  ItemsCompleted: number;
  TotalAssets: number;
  TotalImages: number;
  TotalText: number;
  TotalAudio: number;
};

type DashboardMainQuest = {
  name: string | null;
  QuestCompleted: boolean;
  TotalSubquestsCreated: number;
  TotalSubquestsExpected: number;
  TotalSubquestsCompleted: number;
  TotalAssets: number;
  languoids: string[];
  Creators: string[];
  subquests: DashboardSubquest[];
};

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
        QuestsCreated: number;
        AssetsCreated: number;
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
    quests: 'Modules',
    subquests: 'Steps',
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

  const mainQuests = useMemo(() => {
    if (!projectData) return [];
    return Object.entries(projectData.dashboard_json.quests || {});
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
        <section className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="mb-4 w-fit">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Project Overview
          </h1>
          <h2 className="text-xl font-medium tracking-tight md:text-2xl">
            {projectData.project_name}
          </h2>
          <p className="text-muted-foreground">
            {projectData.project_description ||
              'No project description available.'}
          </p>
          {/* <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Template: {projectData.template}
          </p> */}
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

        <section>
          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="uppercase tracking-wide">
                Quest Structure
              </CardTitle>
              <CardDescription>
                Main quests and subquests with progress and asset details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mainQuests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No quests available for this project yet.
                </p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {mainQuests.map(([questId, quest]) => {
                    return (
                      <AccordionItem key={questId} value={questId}>
                        <AccordionTrigger>
                          <DashboardQuestCard
                            quest={quest}
                            subquestLabel={
                              metricTitlesByTemplate[projectData.template]
                                .subquests
                            }
                          />
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-0">
                          <div className="space-y-2">
                            {quest.subquests.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No subquests for this quest.
                              </p>
                            ) : (
                              quest.subquests.map((subquest, index) => (
                                <div
                                  key={`${questId}-${subquest.name ?? 'subquest'}-${index}`}
                                  className="border-b first:border-t last:border-b-0 ml-12 mr-8 px-2"
                                >
                                  <DashboardSubquestCard
                                    key={`${questId}-${subquest.name ?? 'subquest'}-${index}`}
                                    subquest={subquest}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
