'use client';

import { ProjectWizard } from '@/components/new-project-wizard';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
  // CardFooter
} from '@/components/ui/card';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Copy,
  Crown,
  Eye,
  Upload,
  UserRound,
  Globe
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupabaseEnvironment } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BulkUpload } from '@/components/new-bulk-upload';
import { EnvironmentBadge } from '@/components/environment-badge';

import { env } from '@/lib/env';
import { UserProfile } from '@/components/user-profile';
import { Link } from '@/i18n/navigation';
import { PortalHeader } from '@/components/portal-header';

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="container p-8 max-w-screen-xl mx-auto flex justify-center">
          <Spinner />
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const envParam = searchParams.get('env') as SupabaseEnvironment;
  const environment: SupabaseEnvironment =
    envParam || env.NEXT_PUBLIC_ENVIRONMENT || 'production';
  const { user, isLoading, signOut } = useAuth();

  const [cloningByProjectId, setCloningByProjectId] = useState<
    Record<string, { status?: string; stage?: string; percent: number }>
  >({});

  const getStagePercent = (stage?: string) => {
    switch (stage) {
      case 'seed_project':
        return 5;
      case 'clone_quests':
        return 20;
      case 'clone_assets':
        return 65;
      case 'clone_acl':
        return 85;
      case 'recreate_links':
        return 95;
      case 'recompute_closures':
        return 98;
      case 'done':
        return 100;
      default:
        return 0;
    }
  };

  // Get initial state from URL
  // const getInitialViewState = (): 'projects' | 'quests' | 'assets' => {
  //   const view = searchParams.get('view');
  //   if (view && ['projects', 'quests', 'assets'].includes(view)) {
  //     return view as 'projects' | 'quests' | 'assets';
  //   }
  //   // Determine view based on URL params
  //   if (searchParams.get('questId')) return 'assets';
  //   if (searchParams.get('projectId')) return 'quests';
  //   return 'projects';
  // };

  // View state management
  // const [viewState, setViewState] = useState<'projects' | 'quests' | 'assets'>(
  //   getInitialViewState()
  // );

  // Consolidated state management
  const [pageState, setPageState] = useState({
    selectedProjectId: searchParams.get('projectId') || null,
    selectedProjectName: '',
    selectedQuestId: searchParams.get('questId') || null,
    selectedQuestName: '',
    showProjectForm: false,
    showQuestForm: false,
    showAssetForm: false,
    showBulkAssetUpload: false,
    showProjectUpload: false,
    showQuestUpload: false,
    projectToClone: null as string | null
  });

  // Poll in-progress clone jobs and map to destination project ids
  useEffect(() => {
    if (!user) return;
    // clone_job exists only in preview; skip polling elsewhere to avoid 404 noise
    // if (environment !== 'preview') return;

    const supabase = createBrowserClient(environment);
    let isCancelled = false;
    const tick = async () => {
      const { data } = await supabase
        .from('clone_job')
        .select('status, progress')
        .in('status', ['queued', 'running']);
      if (isCancelled) return;
      const map: Record<
        string,
        { status?: string; stage?: string; percent: number }
      > = {};
      (data || []).forEach((row: any) => {
        const dstId = row?.progress?.dst_project_id as string | undefined;
        const stage = row?.progress?.stage as string | undefined;
        // Skip projects where the stage is 'done' - they should be available
        if (dstId && stage !== 'done')
          map[dstId] = {
            status: row.status,
            stage,
            percent: getStagePercent(stage)
          };
      });
      setCloningByProjectId(map);
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      isCancelled = true;
      clearInterval(id);
    };
  }, [environment, user]);

  // Function to update URL with current state

  // Check authentication for the specific environment
  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = `/login?redirectTo=/portal${environment !== 'production' ? `?env=${environment}` : ''}&env=${environment}`;
    }
  }, [user, isLoading, environment]);

  // Fetch projects with ownership information
  const {
    data: projects = [],
    isLoading: projectsLoading,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['admin-projects', user?.id, environment],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await createBrowserClient(environment)
        .from('project')
        .select(
          `
          id, 
          name, 
          description,
          creator_id,
          target_language:target_language_id(english_name),
          quests:quest(id),
          profile_project_link(
            membership,
            active,
            profile_id
          )
        `
        )
        .order('name');

      if (error) throw error;

      // Add ownership information to each project and sort by ownership
      return (data || [])
        .map((project) => {
          const userMembership = project.profile_project_link?.find(
            (link: any) => link.profile_id === user.id && link.active
          );

          const isOwner =
            project.creator_id === user.id ||
            userMembership?.membership === 'owner';

          return {
            ...project,
            isOwner,
            membership: isOwner ? 'owner' : userMembership?.membership || null
          };
        })
        .sort((a, b) => {
          // Sort owned projects first, then view-only
          if (a.isOwner && !b.isOwner) return -1;
          if (!a.isOwner && b.isOwner) return 1;
          // Then sort by name
          return a.name.localeCompare(b.name);
        });
    },
    enabled: !!user?.id
  });

  // (Removed) clone job tracking from localStorage

  // Update project name when projects load
  useEffect(() => {
    if (pageState.selectedProjectId && projects.length > 0) {
      const selectedProject = projects.find(
        (p) => p.id === pageState.selectedProjectId
      );
      if (
        selectedProject &&
        selectedProject.name !== pageState.selectedProjectName
      ) {
        setPageState((prev) => ({
          ...prev,
          selectedProjectName: selectedProject.name
        }));
      }
    }
  }, [pageState.selectedProjectId, projects, pageState.selectedProjectName]);

  // Handle form success
  const handleProjectCreated = () => {
    setPageState((prevState) => ({ ...prevState, showProjectForm: false }));
    refetchProjects();
  };

  // Navigation handlers with URL updates
  const handleSelectProject = (project: any) => {
    // Redirect to individual project page
    const envQuery = environment !== 'production' ? `?env=${environment}` : '';
    router.push(`/project/${project.id}${envQuery}`);
  };

  // Clone project handler
  const handleCloneProject = (projectId: string) => {
    setPageState((prevState) => ({
      ...prevState,
      projectToClone: projectId,
      showProjectForm: true
    }));
  };

  // Project form dialog
  const handleProjectFormClose = () => {
    setPageState((prevState) => ({
      ...prevState,
      showProjectForm: false,
      projectToClone: null
    }));
  };

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="container p-8 max-w-screen-xl mx-auto flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader environment={environment} user={user} onSignOut={signOut} />

      <div className="container p-6 max-w-screen-xl mx-auto">
        <div className="flex flex-col gap-6">
          {/* Page Title */}
          <div>
            <h1 className="text-3xl font-bold">Project Management Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage your translation projects, quests and assets
            </p>
          </div>

          {/* Environment Notice */}
          {environment !== 'production' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Non-Production Environment</AlertTitle>
              <AlertDescription>
                You are currently working in the <strong>{environment}</strong>{' '}
                environment. Data created here is separate from production.
                {environment === 'preview' &&
                  ' This is the staging/test environment.'}
                {environment === 'development' &&
                  ' This requires a local Supabase instance.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Main Content Area */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Projects</CardTitle>
                <CardDescription>
                  Select a project to manage its quests and assets
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    setPageState((prevState) => ({
                      ...prevState,
                      showProjectForm: true
                    }))
                  }
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPageState((prevState) => ({
                      ...prevState,
                      showProjectUpload: true
                    }))
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Project
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="text-center p-4">
                <Spinner />
              </div>
            ) : (
              <Tabs defaultValue="mine">
                <TabsList className="mb-4">
                  <TabsTrigger value="mine">My Projects</TabsTrigger>
                  <TabsTrigger value="others">Other Projects</TabsTrigger>
                </TabsList>

                <TabsContent value="mine" className="mt-0">
                  {(() => {
                    const myProjects = projects
                      .filter((p: any) => Boolean(p.membership))
                      .sort((a: any, b: any) => {
                        if (a.isOwner && !b.isOwner) return -1;
                        if (!a.isOwner && b.isOwner) return 1;
                        return a.name.localeCompare(b.name);
                      });
                    if (myProjects.length === 0)
                      return (
                        <p className="text-center text-muted-foreground">
                          No projects yet.
                        </p>
                      );
                    return (
                      <ul className="space-y-4">
                        {myProjects.map((project: any) => {
                          const cloning = cloningByProjectId[project.id];
                          return (
                            <li
                              key={project.id}
                              className={cn(
                                'p-4 border rounded-lg transition-colors',
                                cloning
                                  ? 'opacity-60 bg-muted/30 pointer-events-none'
                                  : 'hover:border-primary/50 cursor-pointer'
                              )}
                              onClick={
                                cloning
                                  ? undefined
                                  : () => handleSelectProject(project)
                              }
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">
                                      {project.name}
                                    </h3>
                                    {cloning ? (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Cloning • {cloning.stage || 'running'} (
                                        {cloning.percent}%)
                                      </Badge>
                                    ) : project.isOwner ? (
                                      <Badge
                                        variant="default"
                                        className="text-xs flex items-center gap-1"
                                      >
                                        <Crown className="h-3 w-3" /> Owner
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs flex items-center gap-1"
                                      >
                                        <UserRound className="h-3 w-3" /> Member
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {project.description}
                                  </p>
                                  <p className="text-sm">
                                    {
                                      (project.target_language as any)
                                        ?.english_name
                                    }
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!cloning && (
                                    <>
                                      <Badge variant="secondary">
                                        {project.quests?.length || 0} Quest(s)
                                      </Badge>
                                      {environment !== 'production' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCloneProject(project.id);
                                          }}
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="others" className="mt-0">
                  {(() => {
                    const otherProjects = projects
                      .filter((p: any) => !p.membership)
                      .sort((a: any, b: any) => a.name.localeCompare(b.name));
                    if (otherProjects.length === 0)
                      return (
                        <p className="text-center text-muted-foreground">
                          No other projects.
                        </p>
                      );
                    return (
                      <ul className="space-y-4">
                        {otherProjects.map((project: any) => {
                          const cloning = cloningByProjectId[project.id];
                          return (
                            <li
                              key={project.id}
                              className={cn(
                                'p-4 border rounded-lg transition-colors',
                                cloning
                                  ? 'opacity-60 bg-muted/30 pointer-events-none'
                                  : 'hover:border-primary/50 cursor-pointer'
                              )}
                              onClick={
                                cloning
                                  ? undefined
                                  : () => handleSelectProject(project)
                              }
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">
                                      {project.name}
                                    </h3>
                                    {cloning ? (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Cloning • {cloning.stage || 'running'} (
                                        {cloning.percent}%)
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-xs flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" /> View Only
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {project.description}
                                  </p>
                                  <p className="text-sm">
                                    {
                                      (project.target_language as any)
                                        ?.english_name
                                    }
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!cloning && (
                                    <>
                                      <Badge variant="secondary">
                                        {project.quests?.length || 0} Quest(s)
                                      </Badge>
                                      {environment !== 'production' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCloneProject(project.id);
                                          }}
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Project Creation Modal */}
        <Dialog
          open={pageState.showProjectForm}
          onOpenChange={handleProjectFormClose}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {pageState.projectToClone ? 'Clone Project' : 'Create Project'}
              </DialogTitle>
              <DialogDescription>
                Set up your new translation project with languages and basic
                information.
              </DialogDescription>
            </DialogHeader>
            <ProjectWizard
              onSuccess={handleProjectCreated}
              onCancel={handleProjectFormClose}
              projectToClone={pageState.projectToClone || undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Project Upload Modal */}
        <Dialog
          open={pageState.showProjectUpload}
          onOpenChange={(open) =>
            setPageState((prevState) => ({
              ...prevState,
              showProjectUpload: open
            }))
          }
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Project from CSV</DialogTitle>
              <DialogDescription>
                Create a project with multiple quests and assets from a CSV
                file.
              </DialogDescription>
            </DialogHeader>
            <BulkUpload
              mode="project"
              onSuccess={() => {
                setPageState((prev) => ({
                  ...prev,
                  showProjectUpload: false
                }));
                refetchProjects();
                toast.success('Project uploaded successfully');
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
