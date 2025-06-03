'use client';

// import { ProjectForm } from '@/components/project-form';
import { QuestForm } from '@/components/quest-form';
import { AssetForm } from '@/components/asset-form';
import { ProjectWizard } from '@/components/project-wizard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
  // CardFooter
} from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PlusCircle, Copy, LogOut } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/spinner';
// import Link from 'next/link';
import { QuestAssetManager } from '@/components/quest-asset-manager';
import { BulkUpload } from '@/components/bulk-upload';
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
  const envParam = searchParams.get('env') as SupabaseEnvironment;
  const environment: SupabaseEnvironment = envParam || 'production';

  // Consolidate related state into a single object
  const [pageState, setPageState] = useState({
    activeTab: 'projects',
    selectedProjectId: null as string | null,
    selectedQuestId: null as string | null,
    selectedQuestName: 'Unnamed Quest',
    showProjectForm: false,
    showQuestForm: false,
    showAssetForm: false,
    projectToClone: null as string | null
  });

  const [user, setUser] = useState<any>(null);

  // Check authentication for the specific environment
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient(environment);
        const {
          data: { user: authUser }
        } = await supabase.auth.getUser();

        if (!authUser) {
          window.location.href = `/login?redirectTo=/admin${environment !== 'production' ? `?env=${environment}` : ''}&env=${environment}`;
        } else {
          setUser(authUser);
        }
      } catch {
        window.location.href = `/login?redirectTo=/admin${environment !== 'production' ? `?env=${environment}` : ''}&env=${environment}`;
      }
    };

    checkAuth();
  }, [environment]);

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

  // Get query parameters
  useEffect(() => {
    const tab = searchParams.get('tab');
    const projectId = searchParams.get('projectId');
    const questId = searchParams.get('questId');

    if (tab) setPageState((prevState) => ({ ...prevState, activeTab: tab }));
    if (projectId)
      setPageState((prevState) => ({
        ...prevState,
        selectedProjectId: projectId
      }));
    if (questId)
      setPageState((prevState) => ({ ...prevState, selectedQuestId: questId }));
  }, [searchParams]);

  // Fetch projects
  const {
    data: projects = [],
    isLoading: projectsLoading,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['admin-projects', environment],
    queryFn: async () => {
      const { data, error } = await createBrowserClient(environment)
        .from('project')
        .select(
          `
          id, 
          name, 
          description,
          source_language:source_language_id(english_name), 
          target_language:target_language_id(english_name),
          quests:quest(id)
        `
        )
        .order('name');

      if (error) throw error;
      return data || [];
    }
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

  // Project form dialog
  const handleProjectFormClose = () => {
    setPageState((prevState) => ({
      ...prevState,
      showProjectForm: false,
      projectToClone: null
    }));
  };

  // Clone project button handler
  const handleCloneProject = (projectId: string) => {
    setPageState((prevState) => ({
      ...prevState,
      projectToClone: projectId,
      showProjectForm: true
    }));
  };

  const handleSelectProject = (projectId: string) => {
    setPageState((prevState) => ({
      ...prevState,
      selectedProjectId: projectId,
      activeTab: 'quests'
    }));
  };

  // Handle selecting a quest
  const handleSelectQuest = (quest: { id: string; name: string | null }) => {
    setPageState((prevState) => ({
      ...prevState,
      selectedQuestId: quest.id,
      selectedQuestName: quest.name || 'Unnamed Quest',
      activeTab: 'assets'
    }));
  };

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
              {pageState.activeTab !== 'projects' && (
                <Button
                  onClick={() =>
                    setPageState((prevState) => ({
                      ...prevState,
                      activeTab: 'projects'
                    }))
                  }
                  className="ml-4"
                >
                  View All Projects
                </Button>
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
                isActive:
                  pageState.activeTab === 'projects' &&
                  !pageState.selectedProjectId
              },
              ...(pageState.selectedProjectId
                ? [
                    {
                      label: selectedProject?.name || 'Selected Project',
                      href: `projects?projectId=${pageState.selectedProjectId}`,
                      isActive:
                        pageState.activeTab === 'quests' &&
                        !pageState.selectedQuestId
                    }
                  ]
                : []),
              ...(pageState.selectedQuestId && pageState.selectedProjectId
                ? [
                    {
                      label: pageState.selectedQuestName,
                      href: `projects?projectId=${pageState.selectedProjectId}&questId=${pageState.selectedQuestId}`,
                      isActive: pageState.activeTab === 'assets'
                    }
                  ]
                : [])
            ]}
          />
          <Separator />
        </div>

        <Tabs
          value={pageState.activeTab}
          onValueChange={(value) =>
            setPageState((prevState) => ({ ...prevState, activeTab: value }))
          }
        >
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger
              value="projects"
              disabled={!!pageState.selectedQuestId}
            >
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="quests"
              disabled={
                !pageState.selectedProjectId || !!pageState.selectedQuestId
              }
            >
              Quests
            </TabsTrigger>
            <TabsTrigger value="assets" disabled={!pageState.selectedQuestId}>
              Assets
            </TabsTrigger>
            <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Projects</CardTitle>
                  <Button
                    onClick={() =>
                      setPageState((prevState) => ({
                        ...prevState,
                        showProjectForm: true
                      }))
                    }
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Project
                  </Button>
                </div>
                <CardDescription>
                  Manage your translation projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="flex justify-center">
                    <Spinner />
                  </div>
                ) : projects.length > 0 ? (
                  <ul className="space-y-4">
                    {projects.map((project) => {
                      return (
                        <li
                          key={project.id}
                          className="p-4 border rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">
                                {project.name}
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {project.description}
                            </p>
                            <p className="text-sm">
                              Source:{' '}
                              {(project.source_language as any)?.english_name}
                            </p>
                            <p className="text-sm">
                              Target:{' '}
                              {(project.target_language as any)?.english_name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {project.quests?.length || 0} Quest(s)
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCloneProject(project.id)}
                            >
                              <Copy className="mr-2 h-4 w-4" /> Clone
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSelectProject(project.id)}
                            >
                              Manage Quests
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>No projects found. Create one to get started.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quests Tab */}
          <TabsContent value="quests">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      Quests for: {selectedProject?.name || 'Selected Project'}
                    </CardTitle>
                    <CardDescription>
                      Manage quests for the selected project.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() =>
                      setPageState((prevState) => ({
                        ...prevState,
                        showQuestForm: true
                      }))
                    }
                    disabled={!pageState.selectedProjectId}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Quest
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {questsLoading ? (
                  <div className="flex justify-center">
                    <Spinner />
                  </div>
                ) : quests.length > 0 ? (
                  <ul className="space-y-4">
                    {quests.map((quest) => (
                      <li
                        key={quest.id}
                        className="p-4 border rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <h3 className="text-lg font-semibold">
                            {quest.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {quest.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            {quest.assets?.length || 0} Asset(s)
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleSelectQuest(quest)}
                          >
                            Manage Assets
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    No quests found for this project. Create one to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets">
            {pageState.selectedQuestId ? (
              <QuestAssetManager
                questId={pageState.selectedQuestId}
                onSuccess={handleAssetSuccess}
                onAddNewAsset={() => {
                  if (pageState.selectedQuestId) {
                    setPageState((prevState) => ({
                      ...prevState,
                      showAssetForm: true
                    }));
                  } else {
                    toast.error('Please select a quest first.');
                  }
                }}
              />
            ) : (
              <p>Please select a quest to manage its assets.</p>
            )}
          </TabsContent>

          {/* Bulk Upload Tab */}
          <TabsContent value="bulk-upload">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Upload</CardTitle>
                <CardDescription>
                  Upload multiple projects or assets using CSV files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="project-upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="project-upload">
                      Project Upload
                    </TabsTrigger>
                    <TabsTrigger
                      value="quest-upload"
                      disabled={!pageState.selectedQuestId}
                    >
                      Quest Asset Upload
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="project-upload" className="mt-6">
                    <BulkUpload
                      mode="project"
                      onSuccess={() => {
                        refetchProjects();
                        toast.success('Projects uploaded successfully!');
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="quest-upload" className="mt-6">
                    {pageState.selectedQuestId ? (
                      <BulkUpload
                        mode="quest"
                        questId={pageState.selectedQuestId}
                        onSuccess={() => {
                          handleAssetSuccess();
                          toast.success('Assets uploaded successfully!');
                        }}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Please select a quest first to upload assets
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Project Form Dialog */}
        <Dialog
          open={pageState.showProjectForm}
          onOpenChange={handleProjectFormClose}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {pageState.projectToClone
                  ? 'Clone Project'
                  : 'Create New Project'}
              </DialogTitle>
              <DialogDescription>
                {pageState.projectToClone
                  ? `Cloning project: ${projects.find((p) => p.id === pageState.projectToClone)?.name}`
                  : 'Fill in the details to create a new project.'}
              </DialogDescription>
            </DialogHeader>
            <ProjectWizard
              onSuccess={handleProjectCreated}
              projectToClone={pageState.projectToClone || undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Quest Form Dialog */}
        <Dialog
          open={pageState.showQuestForm}
          onOpenChange={(value) =>
            setPageState((prevState) => ({
              ...prevState,
              showQuestForm: value
            }))
          }
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Quest</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new quest for project:
                {selectedProject?.name || 'Selected Project'}
              </DialogDescription>
            </DialogHeader>
            {pageState.selectedProjectId && (
              <QuestForm
                projectId={pageState.selectedProjectId}
                onSuccess={handleQuestSuccess}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Asset Form Dialog - This might be managed within QuestAssetManager now */}
        {/* Consider if this explicit dialog is still needed or if QuestAssetManager handles its own modals */}
        <Dialog
          open={pageState.showAssetForm}
          onOpenChange={(value) =>
            setPageState((prevState) => ({
              ...prevState,
              showAssetForm: value
            }))
          }
        >
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background z-10 py-4">
              <DialogTitle>Create New Asset</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new asset for quest:
                {pageState.selectedQuestName || 'Selected Quest'}
              </DialogDescription>
            </DialogHeader>
            {pageState.selectedQuestId && (
              <AssetForm
                questId={pageState.selectedQuestId}
                onSuccess={handleAssetSuccess}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
