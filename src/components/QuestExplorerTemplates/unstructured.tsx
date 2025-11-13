'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { Spinner } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  SidebarProvider,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  FolderOpen,
  File
  // Info,
  // Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { QuestCard } from '@/components/QuestCard';
import { AssetCard } from '@/components/AssetCard';
import { AssetView } from '@/components/asset-view';
import { QuestForm } from '@/components/new-quest-form';
import { AssetForm } from '@/components/new-asset-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { QuestInfo } from '@/components/quest-info';
import { SubQuestMenu } from './components/subquest-menu';
import { QuestMenu } from './components/quest-menu';
import { Quest } from '../quest-explorer';

interface QuestsUnstructuredProps {
  project: any;
  projectId: string;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  // quests: any[] | undefined;
  questsTree: Quest[];
  questsLoading: boolean;
  onSelectQuest: (questId: string | null, quest?: Quest | null) => void;
  selectedQuestId: string | null;
  selectedQuest?: Quest | null;
}

export function QuestsUnstructured({
  project,
  projectId,
  userRole,
  // quests,
  questsTree,
  questsLoading,
  onSelectQuest,
  selectedQuestId,
  selectedQuest
}: QuestsUnstructuredProps) {
  const queryClient = useQueryClient();
  const { environment } = useAuth();

  // Modal states
  const [showQuestForm, setShowQuestForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Handlers for modal actions
  const handleAddQuest = () => setShowQuestForm(true);
  const handleAddAsset = () => setShowAssetForm(true);
  const handleAssetClick = (asset: any) => {
    setSelectedAsset(asset);
    setShowAssetModal(true);
  };

  const handleQuestSuccess = (/*data: { id: string }*/) => {
    setShowQuestForm(false);

    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ['quests', projectId] });
    queryClient.invalidateQueries({
      queryKey: ['child-quests', selectedQuestId]
    });
  };

  const handleAssetSuccess = (/*data: { id: string }*/) => {
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
  return (
    <SidebarProvider>
      <div className="w-full flex min-h-[600px] gap-4">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0">
          <QuestsSideBar
            project={project}
            projectId={projectId}
            userRole={userRole}
            onAddQuest={handleAddQuest}
            onSelectQuest={onSelectQuest}
            selectedQuestId={selectedQuestId}
            // quests={quests}
            questsTree={questsTree}
            questsLoading={questsLoading}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <QuestContent
            projectId={projectId}
            selectedQuestId={selectedQuestId}
            selectedQuest={selectedQuest || null}
            questsTree={questsTree}
            userRole={userRole}
            onAddQuest={handleAddQuest}
            onAddAsset={handleAddAsset}
            onSelectQuest={onSelectQuest}
            onAssetClick={handleAssetClick}
          />
        </div>
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
            projectId={projectId}
            questId={selectedQuestId || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Asset View Modal */}
      <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {selectedAsset && <AssetView asset={selectedAsset} />}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function QuestsSideBar({
  //  project,
  projectId,
  userRole,
  onAddQuest,
  onSelectQuest,
  selectedQuestId,
  // quests,
  questsTree,
  questsLoading
}: {
  project: any;
  projectId: string;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  onAddQuest: () => void;
  onSelectQuest: (questId: string | null, quest?: Quest | null) => void;
  selectedQuestId: string | null;
  // quests: any[] | undefined;
  questsTree: Quest[] | undefined;
  questsLoading: boolean;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Calculate permissions from userRole
  const canManage = userRole === 'owner' || userRole === 'admin';

  // Function to get all parent quest IDs for a given quest
  const getParentPath = (questId: string, questList: any[]): string[] => {
    const quest = questList.find((q) => q.id === questId);
    if (!quest || !quest.parent_id) return [];

    return [quest.parent_id, ...getParentPath(quest.parent_id, questList)];
  };

  // Auto-expand parents and scroll to selected quest
  useEffect(() => {
    if (selectedQuestId && questsTree) {
      const parentPath = getParentPath(selectedQuestId, questsTree);
      if (parentPath.length > 0) {
        const newExpanded = new Set(expandedItems);
        parentPath.forEach((parentId) => newExpanded.add(parentId));
        setExpandedItems(newExpanded);
      }
    }
  }, [selectedQuestId, questsTree]);

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

  const questTree = questsTree; // quests ? buildQuestTree(quests) : [];
  // const totalQuests = quests?.length || 0;

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

  const renderQuest = (quest: Quest, level: number = 0) => {
    const hasChildren = quest.children && quest.children.length > 0;
    const isSelected = selectedQuestId === quest.id;
    const isExpanded = expandedItems.has(quest.id);

    const QuestItem = (isSelected: boolean, quest: Quest) => {
      return (
        <>
          <div
            className={cn(
              'rounded-sm p-2 flex items-center justify-center',
              isSelected && 'bg-primary/10 text-primary'
            )}
          >
            {quest.children && quest.children.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[8px] text-secondary absolute bottom-0.5 -mr-5 px-1 py-0 bg-accent-foreground/70"
              >
                {quest.children.length}
              </Badge>
            )}
            {quest.icon ? (
              <img
                src={quest.icon}
                alt={quest.name}
                className="h-5 w-5 rounded-sm object-cover"
                style={{ filter: 'hue-rotate(180deg)' }}
              />
            ) : (
              <FolderOpen className="h-5 w-5" />
            )}
          </div>
          <span className={cn(isSelected && 'font-bold', 'truncate')}>
            {quest.name || `Quest ${quest.id.slice(0, 8)}`}
          </span>
        </>
      );
    };

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
                  onSelectQuest(
                    selectedQuestId === quest.id ? null : quest.id,
                    selectedQuestId === quest.id ? null : quest
                  )
                }
                className={cn(
                  'relative max-w-full truncate',
                  isSelected && 'font-bold'
                )}
                data-quest-id={quest.id}
                title={quest.name || `Quest ${quest.id.slice(0, 8)}`}
              >
                {QuestItem(isSelected, quest)}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {quest?.children?.map((child: any) =>
                  renderQuest(child, level + 1)
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
          onSelectQuest(
            selectedQuestId === quest.id ? null : quest.id,
            selectedQuestId === quest.id ? null : quest
          )
        }
        className={cn(
          'relative max-w-full truncate',
          isSelected && 'font-bold'
        )}
        data-quest-id={quest.id}
        title={quest.name || `Quest ${quest.id.slice(0, 8)}`}
      >
        {QuestItem(isSelected, quest)}
      </SidebarMenuButton>
    );

    return level > 0 ? (
      <SidebarMenuSubItem
        key={quest.id}
        className="w-full overflow-clip"
        // className={cn(isSelected && 'bg-accent2')}
      >
        {ButtonComponent}
      </SidebarMenuSubItem>
    ) : (
      <SidebarMenuItem
        // className={cn(isSelected && 'bg-accent2')}
        key={quest.id}
      >
        {ButtonComponent}
      </SidebarMenuItem>
    );
  };

  return (
    <Card className="flex flex-col max-w-full overflow-ellipsis">
      <CardHeader className="h-8 ">
        <div className="flex items-center justify-between ">
          <CardTitle className="text-lg">Quests</CardTitle>
          <QuestMenu
            canManage={canManage}
            projectId={projectId}
            onAddQuest={onAddQuest}
          />
        </div>
      </CardHeader>
      <CardContent className="py-1 px-2 flex-1 flex flex-col border-t border-b max-w-full">
        <ScrollArea className="h-[530px]">
          {questsLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading quests...
            </div>
          ) : questsTree && questsTree?.length > 0 ? (
            <SidebarMenu className="px-2 ">
              {questsTree && questsTree.map((quest) => renderQuest(quest))}
            </SidebarMenu>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No quests found. {canManage && 'Click + to create one.'}
            </div>
          )}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground text-center">
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href="/portal">← Back to Portal</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function QuestContent({
  projectId,
  selectedQuestId,
  selectedQuest,
  questsTree,
  userRole,
  onAddQuest,
  onAddAsset,
  onSelectQuest,
  onAssetClick
}: {
  projectId: string;
  selectedQuestId: string | null;
  selectedQuest: Quest | null;
  questsTree: Quest[] | undefined;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  onAddQuest: () => void;
  onAddAsset: () => void;
  onSelectQuest: (questId: string | null, quest?: Quest | null) => void;
  onAssetClick: (asset: any) => void;
}) {
  const { user, environment } = useAuth();
  const supabase = createBrowserClient(environment);

  // Calculate permissions from userRole
  const canManage = userRole === 'owner' || userRole === 'admin';

  const childQuests = selectedQuest?.children || [];

  // Obter quests raiz quando não há quest selecionada
  const rootQuests = questsTree || [];

  console.log('QuestsContent render:', selectedQuest);

  // Fetch counts for each child quest (sub-quests and assets)
  const { data: questCounts } = useQuery({
    queryKey: ['quest-counts', selectedQuestId, environment],
    queryFn: async () => {
      if (!selectedQuestId || !childQuests || childQuests.length === 0)
        return {};

      const counts: Record<
        string,
        { questsCount: number; assetsCount: number }
      > = {};

      // Get counts for each child quest
      await Promise.all(
        childQuests.map(async (quest: any) => {
          try {
            // Count sub-quests
            const { count: questsCount } = await supabase
              .from('quest')
              .select('*', { count: 'exact', head: true })
              .eq('parent_id', quest.id)
              .eq('active', true);

            // Count assets
            const { count: assetsCount } = await supabase
              .from('quest_asset_link')
              .select('*', { count: 'exact', head: true })
              .eq('quest_id', quest.id)
              .eq('active', true);

            counts[quest.id] = {
              questsCount: questsCount || 0,
              assetsCount: assetsCount || 0
            };
          } catch (error) {
            console.error(
              `Error fetching counts for quest ${quest.id}:`,
              error
            );
            counts[quest.id] = { questsCount: 0, assetsCount: 0 };
          }
        })
      );

      return counts;
    },
    enabled:
      !!selectedQuestId && !!user && !!childQuests && childQuests.length > 0
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
    const query = supabase
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
      // Fetch translations based on source_asset_id
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

      // Add translations to main asset
      const assetWithTranslations = {
        ...assets[0],
        translations: translations || []
      };

      onAssetClick(assetWithTranslations);
    }
  };

  if (!selectedQuestId) {
    // Mostrar quests raiz quando não há quest selecionada
    return (
      <Card className="h-full flex flex-col max-h-[700px] overflow-hidden">
        <CardHeader className="max-h-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="max-w-5/6 text-xl flex flex-row">
                <div className="truncate text-muted-foreground">
                  Choose a Quest
                </div>
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 border-t">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-8">
              {/* Root Quests Section */}
              {rootQuests && rootQuests.length > 0 ? (
                <div className="space-y-4">
                  {/* <div className="p-2 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Root Quests</h3>
                      </div>
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        {rootQuests.length}
                      </Badge>
                    </div>
                  </div> */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rootQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={{
                          ...quest,
                          active: true
                        }}
                        isSelected={false}
                        onClick={() => onSelectQuest(quest.id, quest)}
                        questsCount={quest?.children?.length || 0}
                        assetsCount={0}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Quests Found</h3>
                  <p>This project doesn't have any quests yet.</p>
                  {canManage && (
                    <p className="text-sm mt-2">
                      Use the + button in the sidebar to create your first
                      quest.
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col max-h-[700px] overflow-hidden">
        <CardHeader className="max-h-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="max-w-5/6 text-xl flex flex-row ">
                <div className="truncate">{selectedQuest?.name || 'Quest'}</div>
                <div className="self-center">
                  <QuestInfo
                    quest={
                      selectedQuest
                        ? {
                            name: selectedQuest.name,
                            description: selectedQuest.description || undefined,
                            created_at: selectedQuest.created_at,
                            assets: []
                          }
                        : null
                    }
                  />
                </div>
              </CardTitle>
            </div>
            {/* Action Buttons */}
            <SubQuestMenu
              canManage={canManage}
              projectId={projectId}
              selectedQuestId={selectedQuestId}
              onAddQuest={onAddQuest}
              onAddAsset={onAddAsset}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 border-t">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-8">
              {questAssetsLoading ? (
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
                            <h3 className="text-lg font-semibold">
                              Sub-Quests
                            </h3>
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
                            quest={{
                              ...quest,
                              active: true // Valor padrão já que estamos filtrando apenas ativos
                            }}
                            isSelected={selectedQuestId === quest.id}
                            onClick={() =>
                              onSelectQuest(
                                selectedQuestId === quest.id ? null : quest.id,
                                selectedQuestId === quest.id ? null : quest
                              )
                            }
                            questsCount={
                              questCounts?.[quest.id]?.questsCount || 0
                            }
                            assetsCount={
                              questCounts?.[quest.id]?.assetsCount || 0
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
                          This quest doesn&#39;t have any sub-quests or assets
                          yet.
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
    </>
  );
}
