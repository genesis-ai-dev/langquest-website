'use client';

import { ProjectForm } from '@/components/project-form';
import { QuestForm } from '@/components/quest-form';
import { AssetForm } from '@/components/asset-form';
import { ProjectWizard } from '@/components/project-wizard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PlusCircle, Copy, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/spinner';
import Link from 'next/link';
import { QuestAssetManager } from '@/components/quest-asset-manager';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/breadcrumbs';

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
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showQuestForm, setShowQuestForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [selectedQuestName, setSelectedQuestName] =
    useState<string>('Unnamed Quest');
  const [projectToClone, setProjectToClone] = useState<string | null>(null);
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      // Use window.location for a hard redirect
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Check if user is authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      console.log('No user found in admin page, redirecting to login');
      window.location.href = '/login';
    }
  }, [user, isLoading]);

  // Get query parameters
  useEffect(() => {
    const tab = searchParams.get('tab');
    const projectId = searchParams.get('projectId');
    const questId = searchParams.get('questId');

    if (tab) setActiveTab(tab);
    if (projectId) setSelectedProjectId(projectId);
    if (questId) setSelectedQuestId(questId);
  }, [searchParams]);

  // Fetch projects
  const {
    data: projects = [],
    isLoading: projectsLoading,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project')
        .select(
          `
          id, 
          name, 
          description,
          source_language:language!source_language_id(english_name), 
          target_language:language!target_language_id(english_name),
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
    queryKey: ['admin-quests', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];

      const { data, error } = await supabase
        .from('quest')
        .select(
          `
          id, 
          name, 
          description,
          assets:quest_asset_link(asset_id)
        `
        )
        .eq('project_id', selectedProjectId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Handle form success
  const handleProjectCreated = () => {
    setShowProjectForm(false);
    refetchProjects();
  };

  const handleQuestSuccess = () => {
    setShowQuestForm(false);
    refetchQuests();
  };

  const handleAssetSuccess = () => {
    setShowAssetForm(false);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Project form dialog
  const handleProjectFormClose = () => {
    setShowProjectForm(false);
    setProjectToClone(null);
  };

  // Clone project button handler
  const handleCloneProject = (projectId: string) => {
    setProjectToClone(projectId);
    setShowProjectForm(true);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('quests');
  };

  // Handle selecting a quest
  const handleSelectQuest = (quest: { id: string; name: string | null }) => {
    setSelectedQuestId(quest.id);
    setSelectedQuestName(quest.name || 'Unnamed Quest');
    setActiveTab('assets');
  };

  return (
    <div className="container p-8 max-w-screen-xl mx-auto">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          {/* Header with contextual navigation and user info */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Project Management Dashboard</h1>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Logged in as {user.email}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </div>
              )}
              {activeTab !== 'projects' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (activeTab === 'assets' && selectedProjectId) {
                      // Go back to quests
                      setSelectedQuestId(null);
                      setActiveTab('quests');
                    } else {
                      // Go back to projects
                      setSelectedProjectId(null);
                      setSelectedQuestId(null);
                      setActiveTab('projects');
                    }
                  }}
                >
                  {activeTab === 'assets'
                    ? '← Back to Quests'
                    : '← Back to Projects'}
                </Button>
              )}
            </div>
          </div>

          {/* Breadcrumb navigation */}
          <Breadcrumbs
            items={[
              {
                label: 'Projects',
                href: 'projects',
                isActive: activeTab === 'projects' && !selectedProjectId
              },
              ...(selectedProjectId
                ? [
                    {
                      label: selectedProject?.name || 'Selected Project',
                      href: `projects?projectId=${selectedProjectId}`,
                      isActive: activeTab === 'quests' && !selectedQuestId
                    }
                  ]
                : []),
              ...(selectedQuestId && selectedProjectId
                ? [
                    {
                      label: selectedQuestName,
                      href: `projects?projectId=${selectedProjectId}&questId=${selectedQuestId}`,
                      isActive: activeTab === 'assets'
                    }
                  ]
                : [])
            ]}
          />
          <Separator />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="projects" disabled={!!selectedQuestId}>
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="quests"
              disabled={!selectedProjectId || !!selectedQuestId}
            >
              Quests
            </TabsTrigger>
            <TabsTrigger value="assets" disabled={!selectedQuestId}>
              Assets
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Projects</CardTitle>
                  <Button onClick={() => setShowProjectForm(true)}>
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
                    {projects.map((project) => (
                      <li
                        key={project.id}
                        className="p-4 border rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <h3 className="text-lg font-semibold">
                            {project.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {project.description}
                          </p>
                          <p className="text-sm">
                            Source: {project.source_language?.english_name}
                          </p>
                          <p className="text-sm">
                            Target: {project.target_language?.english_name}
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
                    ))}
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
                    onClick={() => setShowQuestForm(true)}
                    disabled={!selectedProjectId}
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
            {selectedQuestId ? (
              <QuestAssetManager
                questId={selectedQuestId}
                questName={selectedQuestName}
                projectId={selectedProjectId!}
                onAssetCreated={handleAssetSuccess}
                onAssetUpdated={handleAssetSuccess}
                onAddNewAsset={() => {
                  if (selectedQuestId) {
                    setShowAssetForm(true);
                  } else {
                    toast.error('Please select a quest first.');
                  }
                }}
                onBack={() => {
                  setSelectedQuestId(null);
                  setActiveTab('quests');
                }}
              />
            ) : (
              <p>Please select a quest to manage its assets.</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Project Form Dialog */}
        <Dialog open={showProjectForm} onOpenChange={handleProjectFormClose}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {projectToClone ? 'Clone Project' : 'Create New Project'}
              </DialogTitle>
              <DialogDescription>
                {projectToClone
                  ? `Cloning project: ${projects.find((p) => p.id === projectToClone)?.name}`
                  : 'Fill in the details to create a new project.'}
              </DialogDescription>
            </DialogHeader>
            <ProjectWizard
              onSuccess={handleProjectCreated}
              projectToClone={projectToClone}
            />
          </DialogContent>
        </Dialog>

        {/* Quest Form Dialog */}
        <Dialog open={showQuestForm} onOpenChange={setShowQuestForm}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Quest</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new quest for project:
                {selectedProject?.name || 'Selected Project'}
              </DialogDescription>
            </DialogHeader>
            {selectedProjectId && (
              <QuestForm
                projectId={selectedProjectId}
                onSuccess={handleQuestSuccess}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Asset Form Dialog - This might be managed within QuestAssetManager now */}
        {/* Consider if this explicit dialog is still needed or if QuestAssetManager handles its own modals */}
        <Dialog open={showAssetForm} onOpenChange={setShowAssetForm}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-background z-10 py-4">
              <DialogTitle>Create New Asset</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new asset for quest:
                {selectedQuestName || 'Selected Quest'}
              </DialogDescription>
            </DialogHeader>
            {selectedQuestId && (
              <AssetForm
                questId={selectedQuestId}
                onSuccess={handleAssetSuccess}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
