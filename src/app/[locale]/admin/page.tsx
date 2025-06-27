'use client';

// import { ProjectForm } from '@/components/project-form';
import { QuestForm } from '@/components/quest-form';
import { AssetForm } from '@/components/asset-form';
import { ProjectWizard } from '@/components/project-wizard';
import { DataView } from '@/components/data-view';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
  // CardFooter
} from '@/components/ui/card';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Copy,
  LogOut,
  Crown,
  Eye,
  ArrowLeft,
  Upload,
  Plus
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/spinner';
// import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
// import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupabaseEnvironment } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { ProjectDownloadButton } from '@/components/project-download-button';
import { BulkUpload } from '@/components/bulk-upload';

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
  const environment: SupabaseEnvironment = envParam || 'production';
  const { user, isLoading } = useAuth();

  // Get initial state from URL
  const getInitialViewState = (): 'projects' | 'quests' | 'assets' => {
    const view = searchParams.get('view');
    if (view && ['projects', 'quests', 'assets'].includes(view)) {
      return view as 'projects' | 'quests' | 'assets';
    }
    // Determine view based on URL params
    if (searchParams.get('questId')) return 'assets';
    if (searchParams.get('projectId')) return 'quests';
    return 'projects';
  };

  // View state management
  const [viewState, setViewState] = useState<'projects' | 'quests' | 'assets'>(
    getInitialViewState()
  );

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

  // Function to update URL with current state
  const updateURL = useCallback(
    (updates: {
      view?: string;
      projectId?: string | null;
      questId?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update or remove parameters
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Clean up dependent parameters
      if (updates.view === 'projects') {
        params.delete('projectId');
        params.delete('questId');
      } else if (updates.view === 'quests') {
        params.delete('questId');
      }

      if (updates.projectId === null) {
        params.delete('questId');
      }

      // Keep environment parameter if it exists
      if (envParam) {
        params.set('env', envParam);
      }

      const newURL = `${window.location.pathname}?${params.toString()}`;
      router.replace(newURL);
    },
    [searchParams, router, envParam]
  );

  // Check authentication for the specific environment
  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = `/login?redirectTo=/admin${environment !== 'production' ? `?env=${environment}` : ''}&env=${environment}`;
    }
  }, [user, isLoading, environment]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient(environment);
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      window.location.href = `/login?env=${environment}`;
    } catch {
      toast.error('Failed to sign out');
    }
  };

  // Sync URL parameters with state
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    const questId = searchParams.get('questId');
    const view = searchParams.get('view');

    // Update view state based on URL
    if (view && ['projects', 'quests', 'assets'].includes(view)) {
      setViewState(view as 'projects' | 'quests' | 'assets');
    } else {
      // Infer view from presence of parameters
      if (questId) {
        setViewState('assets');
      } else if (projectId) {
        setViewState('quests');
      } else {
        setViewState('projects');
      }
    }

    // Update page state
    setPageState((prevState) => ({
      ...prevState,
      selectedProjectId: projectId,
      selectedQuestId: questId
    }));
  }, [searchParams]);

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
          source_language:source_language_id(english_name), 
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

          return {
            ...project,
            isOwner: userMembership?.membership === 'owner',
            membership: userMembership?.membership || null
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

  // Fetch quests for the selected project
  const {
    data: quests = [],
    isLoading: questsLoading,
    refetch: refetchQuests
  } = useQuery({
    queryKey: ['admin-quests', pageState.selectedProjectId, environment],
    queryFn: async () => {
      if (!pageState.selectedProjectId) return [];

      const { data, error } = await createBrowserClient(environment)
        .from('quest')
        .select(
          `
          id, 
          name, 
          description,
          assets:quest_asset_link(asset_id)
        `
        )
        .eq('project_id', pageState.selectedProjectId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!pageState.selectedProjectId
  });

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

  // Update quest name when quests load
  useEffect(() => {
    if (pageState.selectedQuestId && quests.length > 0) {
      const selectedQuest = quests.find(
        (q) => q.id === pageState.selectedQuestId
      );
      if (selectedQuest && selectedQuest.name !== pageState.selectedQuestName) {
        setPageState((prev) => ({
          ...prev,
          selectedQuestName: selectedQuest.name || 'Unnamed Quest'
        }));
      }
    }
  }, [pageState.selectedQuestId, quests, pageState.selectedQuestName]);

  // Handle form success
  const handleProjectCreated = () => {
    setPageState((prevState) => ({ ...prevState, showProjectForm: false }));
    refetchProjects();
  };

  const handleQuestSuccess = () => {
    setPageState((prevState) => ({ ...prevState, showQuestForm: false }));
    refetchQuests();
  };

  const handleAssetSuccess = () => {
    setPageState((prevState) => ({ ...prevState, showAssetForm: false }));
  };

  const selectedProject = projects.find(
    (p) => p.id === pageState.selectedProjectId
  );

  const isSelectedProjectOwner = selectedProject?.isOwner || false;

  // Navigation handlers with URL updates
  const handleSelectProject = (project: any) => {
    setPageState((prevState) => ({
      ...prevState,
      selectedProjectId: project.id,
      selectedProjectName: project.name,
      selectedQuestId: null,
      selectedQuestName: ''
    }));
    setViewState('quests');
    updateURL({
      view: 'quests',
      projectId: project.id,
      questId: null
    });
  };

  const handleSelectQuest = (quest: { id: string; name: string | null }) => {
    setPageState((prevState) => ({
      ...prevState,
      selectedQuestId: quest.id,
      selectedQuestName: quest.name || 'Unnamed Quest'
    }));
    setViewState('assets');
    updateURL({
      view: 'assets',
      questId: quest.id
    });
  };

  const handleBackToProjects = () => {
    setPageState((prevState) => ({
      ...prevState,
      selectedProjectId: null,
      selectedProjectName: '',
      selectedQuestId: null,
      selectedQuestName: ''
    }));
    setViewState('projects');
    updateURL({
      view: 'projects',
      projectId: null,
      questId: null
    });
  };

  const handleBackToQuests = () => {
    setPageState((prevState) => ({
      ...prevState,
      selectedQuestId: null,
      selectedQuestName: ''
    }));
    setViewState('quests');
    updateURL({
      view: 'quests',
      questId: null
    });
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
    <div className="container p-8 max-w-screen-xl mx-auto">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          {/* Header with contextual navigation and user info */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Project Management Dashboard</h1>
            <div className="flex items-center gap-4">
              {/* Environment Badge */}
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
                  environment === 'production' &&
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                  environment === 'preview' &&
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                  environment === 'development' &&
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                )}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    environment === 'production' && 'bg-green-500',
                    environment === 'preview' && 'bg-yellow-500',
                    environment === 'development' && 'bg-blue-500'
                  )}
                ></div>
                {environment.charAt(0).toUpperCase() + environment.slice(1)}{' '}
                Environment
              </div>
              {user && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {user.email}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Environment Notice */}
          {environment !== 'production' && (
            <Alert className="mb-6">
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

          {/* Breadcrumb navigation */}
          <Breadcrumbs
            items={[
              {
                label: 'Projects',
                href: 'projects',
                isActive: viewState === 'projects'
              },
              ...(pageState.selectedProjectId
                ? [
                    {
                      label:
                        pageState.selectedProjectName ||
                        selectedProject?.name ||
                        'Selected Project',
                      href: 'quests',
                      isActive: viewState === 'quests'
                    }
                  ]
                : []),
              ...(pageState.selectedQuestId && pageState.selectedProjectId
                ? [
                    {
                      label: pageState.selectedQuestName,
                      href: 'assets',
                      isActive: viewState === 'assets'
                    }
                  ]
                : [])
            ]}
            onNavigate={(href) => {
              switch (href) {
                case 'projects':
                  handleBackToProjects();
                  break;
                case 'quests':
                  handleBackToQuests();
                  break;
                case 'assets':
                  // Already on assets, no need to navigate
                  break;
              }
            }}
          />

          <Separator />
        </div>

        {/* Main Content Area */}
        {viewState === 'projects' && (
          <Card>
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
              ) : projects.length > 0 ? (
                <ul className="space-y-4">
                  {projects.map((project) => {
                    return (
                      <li
                        key={project.id}
                        className={cn(
                          'p-4 border rounded-lg hover:border-primary/50 transition-colors cursor-pointer',
                          !project.isOwner && 'opacity-75 bg-muted/30'
                        )}
                        onClick={() => handleSelectProject(project)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">
                                {project.name}
                              </h3>
                              {project.isOwner ? (
                                <Badge
                                  variant="default"
                                  className="text-xs flex items-center gap-1"
                                >
                                  <Crown className="h-3 w-3" />
                                  Owner
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View Only
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {project.description}
                            </p>
                            <p className="text-sm">
                              {(project.source_language as any)?.english_name} →{' '}
                              {(project.target_language as any)?.english_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {project.quests?.length || 0} Quest(s)
                            </Badge>
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
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground">
                  No projects found. Create one to get started.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {viewState === 'quests' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToProjects}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Projects
                  </Button>
                  <div>
                    <CardTitle>Quests in {selectedProject?.name}</CardTitle>
                    <CardDescription>
                      Select a quest to manage its assets
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {pageState.selectedProjectId && (
                    <ProjectDownloadButton
                      projectId={pageState.selectedProjectId}
                    />
                  )}
                  {isSelectedProjectOwner && (
                    <>
                      <Button
                        onClick={() =>
                          setPageState((prevState) => ({
                            ...prevState,
                            showQuestForm: true
                          }))
                        }
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Quest
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setPageState((prevState) => ({
                            ...prevState,
                            showQuestUpload: true
                          }))
                        }
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Quests
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {questsLoading ? (
                <div className="text-center p-4">
                  <Spinner />
                </div>
              ) : quests.length > 0 ? (
                <ul className="space-y-4">
                  {quests.map((quest) => (
                    <li
                      key={quest.id}
                      className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => handleSelectQuest(quest)}
                        >
                          <h3 className="text-lg font-semibold">
                            {quest.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {quest.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {quest.assets?.length || 0} Asset(s)
                          </Badge>
                          {isSelectedProjectOwner && (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPageState((prev) => ({
                                    ...prev,
                                    selectedQuestId: quest.id,
                                    selectedQuestName: quest.name,
                                    showAssetForm: true
                                  }));
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Asset
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPageState((prev) => ({
                                    ...prev,
                                    selectedQuestId: quest.id,
                                    selectedQuestName: quest.name,
                                    showBulkAssetUpload: true
                                  }));
                                }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Bulk Upload
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground">
                  No quests found.{' '}
                  {isSelectedProjectOwner
                    ? 'Create one to get started.'
                    : 'This project has no quests yet.'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {viewState === 'assets' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToQuests}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Quests
                  </Button>
                  <div>
                    <CardTitle>
                      Assets in {pageState.selectedQuestName}
                    </CardTitle>
                    <CardDescription>
                      View and manage translation assets with their content and
                      votes
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isSelectedProjectOwner && (
                    <Button
                      onClick={() =>
                        setPageState((prev) => ({
                          ...prev,
                          showAssetForm: true
                        }))
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Asset
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pageState.selectedQuestId && (
                <DataView
                  projectId={pageState.selectedProjectId || undefined}
                  questId={pageState.selectedQuestId}
                  showProjectFilter={false}
                />
              )}
            </CardContent>
          </Card>
        )}

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

        {/* Quest Creation Modal */}
        <Dialog
          open={pageState.showQuestForm}
          onOpenChange={(open) =>
            setPageState((prevState) => ({
              ...prevState,
              showQuestForm: open
            }))
          }
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Quest</DialogTitle>
              <DialogDescription>
                Add a new quest to organize your translation assets.
              </DialogDescription>
            </DialogHeader>
            <QuestForm
              onSuccess={handleQuestSuccess}
              projectId={pageState.selectedProjectId || undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Asset Creation Modal */}
        <Dialog
          open={pageState.showAssetForm}
          onOpenChange={(open) =>
            setPageState((prevState) => ({
              ...prevState,
              showAssetForm: open
            }))
          }
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Asset</DialogTitle>
              <DialogDescription>
                Add a new asset to your selected quest.
              </DialogDescription>
            </DialogHeader>
            <AssetForm
              onSuccess={handleAssetSuccess}
              questId={pageState.selectedQuestId || undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Bulk Asset Upload Modal */}
        <Dialog
          open={pageState.showBulkAssetUpload}
          onOpenChange={(open) =>
            setPageState((prevState) => ({
              ...prevState,
              showBulkAssetUpload: open
            }))
          }
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Assets to Quest</DialogTitle>
              <DialogDescription>
                Add multiple assets to &quot;{pageState.selectedQuestName}&quot;
                using a CSV file.
              </DialogDescription>
            </DialogHeader>
            <BulkUpload
              mode="quest"
              questId={pageState.selectedQuestId || undefined}
              onSuccess={() => {
                setPageState((prev) => ({
                  ...prev,
                  showBulkAssetUpload: false
                }));
                refetchQuests();
                toast.success('Assets uploaded successfully');
              }}
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

        {/* Quest Upload Modal */}
        <Dialog
          open={pageState.showQuestUpload}
          onOpenChange={(open) =>
            setPageState((prevState) => ({
              ...prevState,
              showQuestUpload: open
            }))
          }
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Quests to Project</DialogTitle>
              <DialogDescription>
                Add multiple quests with their assets to &quot;
                {pageState.selectedProjectName}&quot; using a CSV file.
              </DialogDescription>
            </DialogHeader>
            <BulkUpload
              mode="questToProject"
              projectId={pageState.selectedProjectId || undefined}
              onSuccess={() => {
                setPageState((prev) => ({
                  ...prev,
                  showQuestUpload: false
                }));
                refetchQuests();
                toast.success('Quests uploaded successfully');
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
