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
                      label: `Project: ${selectedProject ? selectedProject.name : 'Loading...'}`,
                      href: 'quests',
                      isActive: activeTab === 'quests' && !selectedQuestId
                    }
                  ]
                : []),
              ...(selectedQuestId
                ? [
                    {
                      label: `Quest: ${selectedQuestName}`,
                      href: 'assets',
                      isActive: activeTab === 'assets'
                    }
                  ]
                : [])
            ]}
            onNavigate={(href) => {
              if (href === 'projects') {
                setSelectedProjectId(null);
                setSelectedQuestId(null);
                setActiveTab('projects');
              } else if (href === 'quests') {
                setSelectedQuestId(null);
                setActiveTab('quests');
              } else if (href === 'assets') {
                setActiveTab('assets');
              }
            }}
          />

          {/* Main content area */}
          <div className="mt-4">
            {/* Projects tab */}
            {activeTab === 'projects' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Your Projects</h2>
                  <Button onClick={() => setShowProjectForm(true)}>
                    Create New Project
                  </Button>
                </div>

                {/* Project form dialog */}
                {showProjectForm && (
                  <Dialog
                    open={showProjectForm}
                    onOpenChange={handleProjectFormClose}
                  >
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {projectToClone
                            ? 'Clone Project'
                            : 'Create New Project'}
                        </DialogTitle>
                        <DialogDescription>
                          {projectToClone
                            ? 'Clone an existing project with a new target language.'
                            : 'Create a new project from scratch or by cloning an existing one.'}
                        </DialogDescription>
                      </DialogHeader>
                      <ProjectWizard
                        onSuccess={handleProjectCreated}
                        onCancel={handleProjectFormClose}
                        projectToClone={projectToClone || undefined}
                      />
                    </DialogContent>
                  </Dialog>
                )}

                {/* Projects list */}
                {projectsLoading ? (
                  <div className="flex justify-center p-8">
                    <Spinner />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">
                      You don't have any projects yet. Create your first project
                      to get started.
                    </p>
                    <Button onClick={() => setShowProjectForm(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Project
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {projects.map((project) => (
                      <Card key={project.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">
                              {project.name}
                            </CardTitle>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {project.description || 'No description'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="outline">
                              Source: {project.source_language.english_name}
                            </Badge>
                            <Badge variant="outline">
                              Target: {project.target_language.english_name}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {project.quests.length} quest
                            {project.quests.length !== 1 ? 's' : ''}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCloneProject(project.id)}
                          >
                            Clone
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSelectProject(project.id)}
                          >
                            Manage Quests
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quests tab */}
            {activeTab === 'quests' && selectedProjectId && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    Quests in "{selectedProject ? selectedProject.name : ''}"
                  </h2>
                  <Button onClick={() => setShowQuestForm(true)}>
                    Add New Quest
                  </Button>
                </div>

                {/* Quest form */}
                {showQuestForm && (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Create New Quest</CardTitle>
                          <CardDescription>
                            Create a new quest for project{' '}
                            {selectedProject ? selectedProject.name : ''}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowQuestForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <QuestForm
                        projectId={selectedProjectId}
                        onSuccess={() => {
                          setShowQuestForm(false);
                          refetchQuests();
                        }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Quests list */}
                {questsLoading ? (
                  <div className="flex justify-center p-8">
                    <Spinner />
                  </div>
                ) : quests.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">
                      This project doesn't have any quests yet. Add your first
                      quest to get started.
                    </p>
                    <Button onClick={() => setShowQuestForm(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Quest
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {quests.map((quest) => (
                      <Card key={quest.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">
                            {quest.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {quest.description || 'No description'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="text-sm text-muted-foreground">
                            {(quest.assets && quest.assets.length) || 0} asset
                            {(quest.assets && quest.assets.length) !== 1
                              ? 's'
                              : ''}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end pt-0">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSelectQuest(quest)}
                          >
                            Manage Assets
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Assets tab */}
            {activeTab === 'assets' && selectedQuestId && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    Assets in "{selectedQuestName}"
                  </h2>
                  <Button onClick={() => setShowAssetForm(true)}>
                    Add New Asset
                  </Button>
                </div>

                {/* Asset form */}
                {showAssetForm && (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Create New Asset</CardTitle>
                          <CardDescription>
                            Create a new asset for quest {selectedQuestName}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAssetForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <AssetForm
                        questId={selectedQuestId || undefined}
                        onSuccess={() => {
                          setShowAssetForm(false);
                          refetchQuests();
                        }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Asset manager */}
                {selectedQuestId && (
                  <QuestAssetManager questId={selectedQuestId} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
