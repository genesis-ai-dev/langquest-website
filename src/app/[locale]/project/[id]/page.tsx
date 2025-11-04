'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { EnvironmentBadge } from '@/components/environment-badge';
import { UserProfile } from '@/components/user-profile';
import { Spinner } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import { QuestForm } from '@/components/new-quest-form';
import { AssetForm } from '@/components/new-asset-form';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Globe,
  AlertCircle,
  Users,
  Calendar,
  Settings,
  BarChart3,
  FolderOpen,
  Home,
  FileText,
  UserCheck,
  Plus,
  File,
  FolderPlus,
  FilePlus,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SupabaseEnvironment } from '@/lib/supabase';
import { env } from '@/lib/env';
import { Link } from '@/i18n/navigation';
import { ProjectHeaderV1 } from '@/components/project-header-v1';
import { QuestCard } from '@/components/QuestCard';
import { Asset } from 'next/font/google';
import { AssetCard } from '@/components/AssetCard';
import { AssetView } from '@/components/asset-view';

export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="container p-8 max-w-screen-xl mx-auto flex justify-center">
          <Spinner />
        </div>
      }
    >
      <ProjectPageContent />
    </Suspense>
  );
}

function ProjectPageContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user, isLoading, signOut, environment } = useAuth();
  const supabase = createBrowserClient(environment);
  const queryClient = useQueryClient();
  const [showQuestForm, setShowQuestForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Fetch project data
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError
  } = useQuery({
    queryKey: ['project', projectId, environment],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      console.log('🔍 Fetching project with ID:', projectId);
      console.log('🌍 Environment:', environment);
      console.log('👤 User ID:', user?.id);

      // Check if project exists (without filters first)
      const { data: allProjects, error: allError } = await supabase
        .from('project')
        .select('*');

      console.log(
        '� All projects in environment:',
        allProjects?.length || 0,
        'projects'
      );
      console.log('🎯 Looking for project ID:', projectId);

      const matchingProject = allProjects?.find((p) => p.id === projectId);
      console.log('🔍 Found matching project:', matchingProject);

      if (!matchingProject) {
        const availableIds = allProjects?.map((p) => p.id) || [];
        console.log('📝 Available project IDs:', availableIds);
        throw new Error(
          `Project ${projectId} not found. Available projects: ${availableIds.length}`
        );
      }

      // Try to get language info separately if the project exists
      let languageData = null;
      if (matchingProject.target_language_id) {
        const { data: lang } = await supabase
          .from('language')
          .select('*')
          .eq('id', matchingProject.target_language_id)
          .single();
        languageData = lang;
        console.log('🗣️ Language data:', lang);
      }

      // Get quests count
      const { data: quests } = await supabase
        .from('quest')
        .select('id')
        .eq('project_id', projectId);

      // Get project members
      const { data: members } = await supabase
        .from('profile_project_link')
        .select('*')
        .eq('project_id', projectId)
        .eq('active', true);

      // Return complete data structure
      const data = {
        ...matchingProject,
        target_language: languageData,
        quests: quests || [],
        project_members: members || []
      };

      console.log('📊 Final project data:', data);
      return data;
    }
  });

  // Check user permission to access this project
  const { data: userPermission } = useQuery({
    queryKey: ['project-permission', projectId, user?.id, environment],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      console.log(
        '🔐 Checking permissions for project:',
        projectId,
        'user:',
        user?.id
      );

      const { data, error } = await supabase
        .from('profile_project_link')
        .select('*')
        .eq('project_id', projectId)
        .eq('profile_id', user?.id)
        .eq('active', true)
        .single();

      console.log('👥 Permission data:', data);
      console.log('🚫 Permission error:', error);

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    }
  });

  // Query única para buscar Assets e Translations
  const { data: assetsCounts = { assets: 0, translations: 0 } } = useQuery({
    queryKey: ['assets-translations-count', projectId, environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset')
        .select('source_asset_id')
        .eq('project_id', projectId);

      if (error) throw error;

      const assets = (data || []).filter(
        (item) => item.source_asset_id === null
      ).length;
      const translations = (data || []).filter(
        (item) => item.source_asset_id !== null
      ).length;

      return { assets, translations };
    },
    enabled: !!projectId && !!user
  });

  const assetsCount = assetsCounts.assets;
  const translationsCount = assetsCounts.translations;

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      const currentUrl = `/project/${projectId}`;
      const envQuery =
        environment !== 'production' ? `?env=${environment}` : '';
      router.push(
        `/login${envQuery}&redirectTo=${encodeURIComponent(currentUrl)}`
      );
    }
  }, [isLoading, user, router, projectId, environment]);

  // Show loading state while authentication is being checked
  if (isLoading || projectLoading) {
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

  // Show error if project not found or no access
  if (projectError || (!project && !projectLoading)) {
    console.log('🚨 Project error details:', {
      projectError,
      project,
      projectLoading,
      projectId,
      environment
    });

    return (
      <div className="container p-8 max-w-screen-xl mx-auto">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Project Not Found</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              The project you're looking for doesn't exist or you don't have
              permission to access it.
            </p>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Project ID: {projectId}</p>
              <p>Environment: {environment}</p>
              {projectError && <p>Error: {projectError.message}</p>}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading if we don't have project data yet
  if (!project) {
    return (
      <div className="container p-8 max-w-screen-xl mx-auto flex justify-center">
        <Spinner />
      </div>
    );
  }

  // Check if user has access
  const hasAccess = userPermission || user?.user_metadata?.role === 'admin';

  if (!hasAccess) {
    return (
      <div className="container p-8 max-w-screen-xl mx-auto">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this project.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isOwner = userPermission?.membership === 'owner';
  const isAdmin = userPermission?.membership === 'admin';
  const canManage = isOwner || isAdmin;

  const handleQuestSuccess = (data: { id: string }) => {
    toast.success('Quest created successfully!');
    setShowQuestForm(false);
    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ['quests', projectId] });
    queryClient.invalidateQueries({
      queryKey: ['child-quests', selectedQuestId]
    });
  };

  const handleAssetSuccess = (data: { id: string }) => {
    toast.success('Asset created successfully!');
    setShowAssetForm(false);
    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({
      queryKey: ['child-quests', selectedQuestId]
    });
    // Also invalidate asset counts to update the project header
    queryClient.invalidateQueries({
      queryKey: ['assets-translations-count', projectId, environment]
    });
    // And invalidate quest-assets query to refresh asset list in quest view
    queryClient.invalidateQueries({
      queryKey: ['quest-assets', selectedQuestId, environment]
    });
  };

  const handleAssetClick = (asset: any) => {
    setSelectedAsset(asset);
    setShowAssetModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex gap-2 items-center flex-nowrap no-underline font-bold"
          >
            <Globe className="h-6 w-6 text-accent4" />
            <span className="font-bold text-xl">LangQuest</span>
          </Link>

          <div className="flex items-center gap-4">
            <EnvironmentBadge environment={environment} />
            {user && <UserProfile user={user} onSignOut={handleSignOut} />}
          </div>
        </div>
      </header>

      {/* Project Header - Modelo Original com Stats */}
      <div className="container p-6 max-w-screen-xl mx-auto">
        <ProjectHeaderV1
          project={project}
          userRole={isOwner ? 'owner' : isAdmin ? 'admin' : 'member'}
          assetsCount={assetsCount}
          translationsCount={translationsCount}
        />
      </div>

      {/* Content Area - Sem cards desnecessários */}
      <div className="container p-6 max-w-screen-xl mx-auto ">
        {/* Bottom Layout with Sidebar and Content */}
        <SidebarProvider>
          <div className="w-full flex min-h-[600px] gap-4">
            {/* Sidebar */}
            <div className="w-80 flex-shrink-0">
              <ProjectSidebar
                project={project}
                projectId={projectId}
                canManage={canManage}
                userRole={isOwner ? 'owner' : isAdmin ? 'admin' : 'member'}
                onAddQuest={() => setShowQuestForm(true)}
                onSelectQuest={setSelectedQuestId}
                selectedQuestId={selectedQuestId}
              />
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <QuestContent
                projectId={projectId}
                selectedQuestId={selectedQuestId}
                canManage={canManage}
                onAddQuest={() => setShowQuestForm(true)}
                onAddAsset={() => setShowAssetForm(true)}
                onSelectQuest={setSelectedQuestId}
                onAssetClick={handleAssetClick}
              />
            </div>
          </div>
        </SidebarProvider>
      </div>

      {/* Quest Creation Modal */}
      <Dialog open={showQuestForm} onOpenChange={setShowQuestForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Quest</DialogTitle>
            <DialogDescription>
              Add a new quest to organize your project content.
            </DialogDescription>
          </DialogHeader>
          <QuestForm
            onSuccess={handleQuestSuccess}
            projectId={projectId}
            questParentId={selectedQuestId || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Asset Creation Modal */}
      <Dialog open={showAssetForm} onOpenChange={setShowAssetForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Asset</DialogTitle>
            <DialogDescription>
              Add a new asset to this quest.
            </DialogDescription>
          </DialogHeader>
          <AssetForm
            onSuccess={handleAssetSuccess}
            questId={selectedQuestId || undefined}
            projectId={projectId}
          />
        </DialogContent>
      </Dialog>

      {/* Asset View Modal */}
      <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset</DialogTitle>
            {/* <DialogTitle>{selectedAsset?.name || 'Asset Details'}</DialogTitle> */}
          </DialogHeader>
          {selectedAsset && <AssetView asset={selectedAsset} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestContent({
  projectId,
  selectedQuestId,
  canManage,
  onAddQuest,
  onAddAsset,
  onSelectQuest,
  onAssetClick
}: {
  projectId: string;
  selectedQuestId: string | null;
  canManage: boolean;
  onAddQuest: () => void;
  onAddAsset: () => void;
  onSelectQuest: (questId: string | null) => void;
  onAssetClick: (asset: any) => void;
}) {
  const { user, environment } = useAuth();
  const supabase = createBrowserClient(environment);

  // Fetch child quests when a parent quest is selected
  const { data: childQuests, isLoading: childQuestsLoading } = useQuery({
    queryKey: ['child-quests', selectedQuestId, environment],
    queryFn: async () => {
      if (!selectedQuestId) return [];

      const { data, error } = await supabase
        .from('quest')
        .select('*')
        .eq('parent_id', selectedQuestId)
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedQuestId && !!user
  });

  // Fetch selected quest details
  const { data: selectedQuest, isLoading: selectedQuestLoading } = useQuery({
    queryKey: ['quest', selectedQuestId, environment],
    queryFn: async () => {
      if (!selectedQuestId) return null;

      const { data, error } = await supabase
        .from('quest')
        .select('*')
        .eq('id', selectedQuestId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedQuestId && !!user
  });

  // Fetch assets for the selected quest through quest_asset_link
  const { data: questAssets, isLoading: questAssetsLoading } = useQuery({
    queryKey: ['quest-assets', selectedQuestId, environment],
    queryFn: async () => {
      if (!selectedQuestId) return [];

      const { data, error } = await supabase
        .from('quest_asset_link')
        .select(
          `
          asset:asset_id (
            id,
            name,
            active,
            created_at,
            last_updated,
            images,
            content:asset_content_link(id, text, audio),
            tags:asset_tag_link(tag(id, key, value)),
            translations:asset!source_asset_id(count)
          )
        `
        )
        .eq('quest_id', selectedQuestId)
        .eq('active', true)
        .is('asset.source_asset_id', null)
        .order('created_at', { ascending: true });

      console.log('Fetched quest assets data:', { data, error });

      if (error) throw error;

      // Filter only assets that are active and extract the asset data
      const assets =
        data
          ?.map((item: any) => item.asset)
          .filter((asset: any) => asset && asset.active) || [];

      return assets;
    },
    enabled: !!selectedQuestId && !!user
  });

  const handleAssetClick = async (assetId: string) => {
    console.log('Fetching details for asset ID:', assetId);
    // translations:translation(id, text, audio, target_language:target_language_id(id, english_name), votes:vote(id, polarity)),
    let query = supabase
      .from('asset')
      .select(
        `
            id, 
            name, 
            images,
            content:asset_content_link(id, audio, text),
            tags:asset_tag_link(tag(id, key, value)),
            quests:quest_asset_link(quest(id, name, description, 
              project(id, name, description),
              tags:quest_tag_link(tag(id, key, value))
            ))
          `
      )
      .eq('id', assetId);

    const { data: assets, error } = await query;

    if (error) {
      console.error('Error fetching asset details:', error);
      return;
    }

    if (assets && assets.length > 0) {
      // Buscar traduções baseadas no source_asset_id
      const { data: translations, error: translationsError } = await supabase
        .from('asset')
        .select(
          `
          id,
          name,
          content:asset_content_link(
            id,
            text,
            audio,
            source_language_id
          ),
          votes:vote!asset_id(
            polarity,
            creator_id
          )
          `
        )
        .eq('source_asset_id', assets[0].id)
        .eq('vote.active', true);

      if (translationsError) {
        console.error('Error fetching translations:', translationsError);
      }

      // Adicionar traduções ao asset principal
      const assetWithTranslations = {
        ...assets[0],
        translations: translations || []
      };

      onAssetClick(assetWithTranslations);
    }
  };

  if (!selectedQuestId) {
    return (
      <Card className="h-full max-h-[700px]">
        <CardContent className="p-6 h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Select a Quest</h3>
            <p>
              Choose a quest from the sidebar to view its sub-quests and
              details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedQuestLoading) {
    return (
      <Card className="h-full max-h-[700px]">
        <CardContent className="p-6 h-full flex items-center justify-center">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col max-h-[700px] overflow-hidden">
      <CardHeader className="max-h-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl flex flex-row">
              {selectedQuest?.name || 'Quest'}
              {/* {selectedQuest?.description && (
              <p className="text-muted-foreground mt-1">
              {selectedQuest.description}
              </p>
              )} */}
              <div className="">
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button className="ml-4 hover:bg-accent hover:text-accent-foreground p-1 rounded-sm transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="w-80"
                    side="bottom"
                    align="start"
                  >
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">
                        {selectedQuest?.name}
                      </h4>
                      {selectedQuest?.description && (
                        <p className="text-sm text-muted-foreground">
                          {selectedQuest.description}
                        </p>
                      )}
                      <div className="flex items-center pt-2">
                        <Calendar className="mr-2 h-3 w-3 opacity-70" />
                        <span className="text-xs text-muted-foreground">
                          Created{' '}
                          {new Date(
                            selectedQuest?.created_at
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedQuest?.assets && (
                        <div className="flex items-center">
                          <File className="mr-2 h-3 w-3 opacity-70" />
                          <span className="text-xs text-muted-foreground">
                            {selectedQuest.assets.length} asset(s)
                          </span>
                        </div>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              {/* <Button
                size="sm"
                variant="outline"
                onClick={onAddQuest}
                className="flex items-center gap-2"
                title="Add a quest"
              >
                <Info className="h-4 w-4" />
              </Button> */}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* <Button
              size="sm"
              variant="outline"
              onClick={onAddQuest}
              className="flex items-center gap-2"
              title="Add a quest"
            >
              <Info className="h-4 w-4" />
            </Button> */}

            {canManage && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAddQuest}
                  className="flex items-center gap-2"
                  title="Add a quest"
                >
                  <FolderPlus className="h-4 w-4" />
                  {/* Add Quest */}
                </Button>
                <Button
                  title="Add Asset"
                  size="sm"
                  variant="outline"
                  onClick={onAddAsset}
                  className="flex items-center gap-2"
                >
                  <FilePlus className="h-4 w-4" />
                  {/* Add Asset */}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 border-t">
        <ScrollArea className="h-[600px]">
          <div className="p-4 space-y-8">
            {childQuestsLoading || questAssetsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner />
              </div>
            ) : (
              <>
                {/* Sub-Quests Section */}
                {childQuests && childQuests.length > 0 && (
                  <div className="space-y-4">
                    <div className="p-2 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Sub-Quests</h3>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-sm px-3 py-1"
                        >
                          {childQuests.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {childQuests.map((quest) => (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          isSelected={selectedQuestId === quest.id}
                          onClick={() =>
                            onSelectQuest(
                              selectedQuestId === quest.id ? null : quest.id
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets Section */}
                {questAssets && questAssets.length > 0 && (
                  <div className="space-y-4">
                    <div className="p-2 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <File className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Assets</h3>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-sm px-3 py-1"
                        >
                          {questAssets.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {questAssets.map((asset) => (
                        <AssetCard
                          asset={asset}
                          key={asset.id}
                          onClick={() => handleAssetClick(asset.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!childQuests || childQuests.length === 0) &&
                  (!questAssets || questAssets.length === 0) && (
                    <div className="text-center text-muted-foreground py-12">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        No Content Yet
                      </h3>
                      <p>
                        This quest doesn't have any sub-quests or assets yet.
                      </p>
                      {canManage && (
                        <p className="text-sm mt-2">
                          Use the buttons above to create quests or assets.
                        </p>
                      )}
                    </div>
                  )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ProjectSidebar({
  project,
  projectId,
  canManage,
  userRole,
  onAddQuest,
  onSelectQuest,
  selectedQuestId
}: {
  project: any;
  projectId: string;
  canManage: boolean;
  userRole: 'owner' | 'admin' | 'member';
  onAddQuest: () => void;
  onSelectQuest: (questId: string | null) => void;
  selectedQuestId: string | null;
}) {
  const { user, environment } = useAuth();
  const supabase = createBrowserClient(environment);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fetch quests for this project
  const { data: quests, isLoading: questsLoading } = useQuery({
    queryKey: ['quests', projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quest')
        .select('*')
        .eq('project_id', projectId)
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  // Build hierarchical quest structure
  const buildQuestTree = (
    quests: any[],
    parentId: string | null = null
  ): any[] => {
    return quests
      .filter((quest) => quest.parent_id === parentId)
      .map((quest) => ({
        ...quest,
        children: buildQuestTree(quests, quest.id)
      }));
  };

  const questTree = quests ? buildQuestTree(quests) : [];
  const totalQuests = quests?.length || 0;

  // Toggle expansion of items
  const toggleExpanded = (questId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(questId)) {
      newExpanded.delete(questId);
    } else {
      newExpanded.add(questId);
    }
    setExpandedItems(newExpanded);
  };

  // Render quest item recursively
  const renderQuestItem = (quest: any, level: number = 0) => {
    const hasChildren = quest.children && quest.children.length > 0;
    const isSelected = selectedQuestId === quest.id;
    const isExpanded = expandedItems.has(quest.id);

    if (hasChildren) {
      // If this is a sub-item (level > 0), wrap in SidebarMenuSubItem
      const CollapsibleComponent = (
        <Collapsible
          key={quest.id}
          open={isExpanded}
          onOpenChange={() => toggleExpanded(quest.id)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                onClick={() =>
                  onSelectQuest(selectedQuestId === quest.id ? null : quest.id)
                }
                className={cn(isSelected && 'bg-muted font-medium')}
              >
                <FolderOpen className="h-4 w-4" />
                <span>{quest.name || `Quest ${quest.id.slice(0, 8)}`}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {quest.children.length}
                </Badge>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {quest.children.map((child: any) =>
                  renderQuestItem(child, level + 1)
                )}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );

      return level > 0 ? (
        <SidebarMenuSubItem key={quest.id}>
          {CollapsibleComponent}
        </SidebarMenuSubItem>
      ) : (
        CollapsibleComponent
      );
    }

    // Leaf node (no children)
    const ButtonComponent = (
      <SidebarMenuButton
        onClick={() =>
          onSelectQuest(selectedQuestId === quest.id ? null : quest.id)
        }
        className={cn(isSelected && 'bg-muted font-medium')}
      >
        <FileText className="h-4 w-4" />
        <span>{quest.name || `Quest ${quest.id.slice(0, 8)}`}</span>
      </SidebarMenuButton>
    );

    return level > 0 ? (
      <SidebarMenuSubItem key={quest.id}>{ButtonComponent}</SidebarMenuSubItem>
    ) : (
      <SidebarMenuItem key={quest.id}>{ButtonComponent}</SidebarMenuItem>
    );
  };

  return (
    <>
      <Card className="flex flex-col ">
        <CardHeader className="h-8 ">
          <div className="flex items-center justify-between ">
            <CardTitle className="text-lg">Quests</CardTitle>
            {canManage && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={onAddQuest}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        {/* <div className="border-t " /> */}
        <CardContent className="py-1 px-2 flex-1 flex flex-col border-t border-b">
          <ScrollArea className="h-[530px]">
            {questsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading quests...
              </div>
            ) : questTree.length > 0 ? (
              <SidebarMenu className="px-2 ">
                {questTree.map((quest) => renderQuestItem(quest))}
              </SidebarMenu>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No quests found. {canManage && 'Click + to create one.'}
              </div>
            )}
          </ScrollArea>

          {/* <div className="p-3 border-t mt-auto h-8">
          </div> */}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground text-center">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/portal">← Back to Portal</Link>
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
