'use client';

import { ProjectForm } from '@/components/project-form';
import { QuestForm } from '@/components/quest-form';
import { AssetForm } from '@/components/asset-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/spinner';
import Link from 'next/link';

export default function AdminPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showQuestForm, setShowQuestForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);

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
    data: projects,
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
      return data;
    }
  });

  // Fetch quests for the selected project
  const {
    data: quests,
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
      return data;
    },
    enabled: !!selectedProjectId
  });

  // Handle form success
  const handleProjectSuccess = () => {
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

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="quests" disabled={!selectedProjectId}>
            Quests
          </TabsTrigger>
          <TabsTrigger value="assets" disabled={!selectedQuestId}>
            Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Projects</h2>
            <Button onClick={() => setShowProjectForm(!showProjectForm)}>
              {showProjectForm ? (
                'Cancel'
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Project
                </>
              )}
            </Button>
          </div>

          {showProjectForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Project</CardTitle>
                <CardDescription>
                  Create a new translation project with source and target
                  languages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectForm onSuccess={handleProjectSuccess} />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectsLoading ? (
              <div className="col-span-full flex justify-center py-10">
                <Spinner />
              </div>
            ) : projects?.length === 0 ? (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                No projects found. Create your first project to get started.
              </div>
            ) : (
              projects?.map((project) => (
                <Card
                  key={project.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedProjectId === project.id
                      ? 'ring-2 ring-primary'
                      : ''
                  }`}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      {project.source_language.english_name} →{' '}
                      {project.target_language.english_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {project.description || 'No description provided.'}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {project.quests?.length || 0} quests
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjectId(project.id);
                          setActiveTab('quests');
                        }}
                      >
                        View Quests
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="quests" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedProjectId(null);
                  setActiveTab('projects');
                }}
              >
                Back to Projects
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h2 className="text-xl font-semibold">
                Quests for{' '}
                {projects?.find((p) => p.id === selectedProjectId)?.name}
              </h2>
            </div>
            <Button onClick={() => setShowQuestForm(!showQuestForm)}>
              {showQuestForm ? (
                'Cancel'
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Quest
                </>
              )}
            </Button>
          </div>

          {showQuestForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Quest</CardTitle>
                <CardDescription>
                  Create a new quest for this project.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuestForm
                  onSuccess={handleQuestSuccess}
                  projectId={selectedProjectId || undefined}
                />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {questsLoading ? (
              <div className="col-span-full flex justify-center py-10">
                <Spinner />
              </div>
            ) : quests?.length === 0 ? (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                No quests found for this project. Create your first quest to get
                started.
              </div>
            ) : (
              quests?.map((quest) => (
                <Card
                  key={quest.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedQuestId === quest.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedQuestId(quest.id)}
                >
                  <CardHeader>
                    <CardTitle>{quest.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {quest.description || 'No description provided.'}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {quest.assets?.length || 0} assets
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuestId(quest.id);
                          setActiveTab('assets');
                        }}
                      >
                        View Assets
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedQuestId(null);
                  setActiveTab('quests');
                }}
              >
                Back to Quests
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h2 className="text-xl font-semibold">
                Assets for {quests?.find((q) => q.id === selectedQuestId)?.name}
              </h2>
            </div>
            <Button onClick={() => setShowAssetForm(!showAssetForm)}>
              {showAssetForm ? (
                'Cancel'
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Asset
                </>
              )}
            </Button>
          </div>

          {showAssetForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Asset</CardTitle>
                <CardDescription>
                  Create a new asset for this quest.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetForm
                  onSuccess={handleAssetSuccess}
                  questId={selectedQuestId || undefined}
                />
              </CardContent>
            </Card>
          )}

          <div className="text-center py-10">
            <p className="text-muted-foreground mb-4">
              For a more comprehensive view of assets, use the database viewer.
            </p>
            <Link href="/database">
              <Button>Go to Database Viewer</Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
