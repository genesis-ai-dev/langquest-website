'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/spinner';
import { AssetView } from '@/components/asset-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useAssetDetails,
  useCreateBibleChapter,
  useQuestAssets,
  useQuestTree
} from '@/app/db/useQuestExplorerQueries';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { getChildrenNodes, getRootNodes } from './model';
import { DisplayNode, getTemplateStrategy } from './template-strategies';
import {
  getQuestDisabledFlag,
  getQuestVersionLabel,
  getQuestVersionName
} from './template-strategies/helpers';
import { QuestList } from './quest-list';
import { SubquestList } from './subquest-list';
import { QuestCard } from './quest-card';
import { QuestExplorerAssetCard } from './quest-explorer-asset-card';
import { QuestMenuPlus } from './quest-menu-plus';
import { SubQuestMenuPlus } from './subquest-menu-plus';
import { ArrowLeft, ChevronRight, FolderOpen } from 'lucide-react';

interface QuestExplorerMenuProps {
  projectId: string;
  userPermission: any;
  template: string;
  showActionMenus?: {
    left?: boolean;
    right?: boolean;
  };
  allowDisabledQuests?: boolean;
}

interface PendingBibleChapter {
  node: DisplayNode;
  bookName: string;
  bookId: string;
  chapterNumber: number;
  verseCount: number;
  existingBookQuestId?: string | null;
}

export function QuestExplorerMenu({
  projectId,
  userPermission,
  template,
  showActionMenus,
  allowDisabledQuests
}: QuestExplorerMenuProps) {
  const queryClient = useQueryClient();
  const { user, environment } = useAuth();
  const supabase = useMemo(
    () => createBrowserClient(environment),
    [environment]
  );
  const { data: projectName } = useQuery({
    queryKey: ['qe-project-name', projectId, environment],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('project')
        .select('name')
        .eq('id', projectId)
        .single();
      return data?.name || null;
    }
  });
  const { data, isLoading } = useQuestTree(projectId);
  const createBibleChapterMutation = useCreateBibleChapter();

  const [activeRootNode, setActiveRootNode] = useState<DisplayNode | null>(
    null
  );
  const [contextNode, setContextNode] = useState<DisplayNode | null>(null);
  const [contextHistory, setContextHistory] = useState<DisplayNode[]>([]);
  const [selectedMiddleNode, setSelectedMiddleNode] =
    useState<DisplayNode | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [rootSearch, setRootSearch] = useState('');
  const [pendingBibleChapter, setPendingBibleChapter] =
    useState<PendingBibleChapter | null>(null);
  const [showChapterConfirmModal, setShowChapterConfirmModal] = useState(false);

  const templateStrategy = useMemo(
    () => getTemplateStrategy(template),
    [template]
  );
  const copy = templateStrategy.copy;
  const behavior = templateStrategy.behavior;
  const shouldAllowDisabledQuests =
    allowDisabledQuests ?? behavior.allowDisabledQuests;
  const showLeftMenuActions =
    showActionMenus?.left ?? behavior.showLeftMenuActions;
  const showRightMenuActions =
    showActionMenus?.right ?? behavior.showRightMenuActions;
  const allowAddQuest = behavior.allowAddQuest;
  const allowAddAssets = behavior.allowAddAssets;
  const allowNewVersion = behavior.allowNewVersion;

  const roots = data?.roots || [];
  const rawRootNodes = useMemo(
    () => getRootNodes(template, roots),
    [template, roots]
  );
  const rootNodes = useMemo(
    () =>
      shouldAllowDisabledQuests
        ? rawRootNodes
        : rawRootNodes.map((node) => ({ ...node, disabled: false })),
    [rawRootNodes, shouldAllowDisabledQuests]
  );
  const filteredRootNodes = useMemo(() => {
    const query = rootSearch.trim().toLowerCase();
    if (!query) {
      return rootNodes;
    }

    return rootNodes.filter((node) => node.title.toLowerCase().includes(query));
  }, [rootNodes, rootSearch]);

  const canManage =
    userPermission?.membership === 'owner' ||
    userPermission?.membership === 'admin';

  const rawMiddleNodes = useMemo(
    () => getChildrenNodes(template, contextNode),
    [template, contextNode]
  );
  const middleNodes = useMemo(
    () =>
      shouldAllowDisabledQuests
        ? rawMiddleNodes
        : rawMiddleNodes.map((node) => ({ ...node, disabled: false })),
    [rawMiddleNodes, shouldAllowDisabledQuests]
  );
  const selectedContentNode =
    selectedMiddleNode ||
    (templateStrategy.id === 'unstructured' ? contextNode : null);
  const rawThirdLevelNodes = useMemo(
    () =>
      selectedContentNode?.quest?.children?.map((child) => ({
        key: child.id,
        title: child.name,
        subtitle: child.description || undefined,
        questId: child.id,
        quest: child,
        variants: [child],
        versionName: getQuestVersionName(child),
        kind: 'quest' as const,
        disabled: getQuestDisabledFlag(child)
      })) || [],
    [selectedContentNode]
  );
  const thirdLevelNodes = useMemo(
    () =>
      shouldAllowDisabledQuests
        ? rawThirdLevelNodes
        : rawThirdLevelNodes.map((node) => ({ ...node, disabled: false })),
    [rawThirdLevelNodes, shouldAllowDisabledQuests]
  );

  const selectedQuestIdForAssets = selectedContentNode?.questId || null;
  const {
    data: questAssets = [],
    isLoading: isLoadingAssets,
    refetch: refetchAssets
  } = useQuestAssets(selectedQuestIdForAssets);
  const { data: selectedAssetDetails, isLoading: isLoadingAssetDetails } =
    useAssetDetails(selectedAssetId);

  const handleSelectRoot = (node: DisplayNode) => {
    if (node.disabled) {
      return;
    }
    setActiveRootNode(node);
    setContextNode(node);
    setContextHistory([]);
    setSelectedMiddleNode(null);
    setSelectedAssetId(null);
  };

  const handleSelectMiddle = (node: DisplayNode) => {
    if (node.disabled) {
      return;
    }

    if (
      templateStrategy.id === 'bible' &&
      node.kind === 'chapter' &&
      !node.questId
    ) {
      if (!node.book || !node.chapterNumber) {
        return;
      }

      const verseCount = node.book.verses[node.chapterNumber - 1] || 0;
      setPendingBibleChapter({
        node,
        bookName: node.book.name,
        bookId: node.book.id,
        chapterNumber: node.chapterNumber,
        verseCount,
        existingBookQuestId: contextNode?.questId || null
      });
      setShowChapterConfirmModal(true);
      return;
    }

    setSelectedMiddleNode(node);
    setSelectedAssetId(null);
  };

  const handleDrillDownFromThird = (node: DisplayNode) => {
    if (!contextNode) {
      return;
    }
    if (node.disabled) {
      return;
    }

    // Keep full navigation chain in breadcrumbs by preserving context + content
    // level before moving deeper from the third column.
    setContextHistory((prev) => {
      const next = [...prev];
      const appendIfNeeded = (item: DisplayNode) => {
        if (next[next.length - 1]?.key !== item.key) {
          next.push(item);
        }
      };

      appendIfNeeded(contextNode);
      if (selectedContentNode && selectedContentNode.key !== contextNode.key) {
        appendIfNeeded(selectedContentNode);
      }

      return next;
    });
    setContextNode(node);
    // Promote clicked third-column node as active selected content so
    // actions (new subquest/asset) target this node immediately.
    setSelectedMiddleNode(node);
    setSelectedAssetId(null);
  };

  const handleGoBack = () => {
    setContextHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const next = [...prev];
      const previousContext = next.pop() || null;
      setContextNode(previousContext);
      setSelectedMiddleNode(null);
      setSelectedAssetId(null);
      return next;
    });
  };

  const handleOpenAssetDetails = (assetId: string) => {
    setSelectedAssetId(assetId);
    setShowAssetModal(true);
  };

  const handleSelectVersion = (versionQuestId: string) => {
    setSelectedMiddleNode((prev) => {
      if (!prev?.variants || prev.variants.length <= 1) {
        return prev;
      }

      const selectedQuest =
        prev.variants.find((quest) => quest.id === versionQuestId) || null;
      if (!selectedQuest) {
        return prev;
      }

      return {
        ...prev,
        questId: selectedQuest.id,
        quest: selectedQuest,
        versionName: getQuestVersionName(selectedQuest),
        disabled: getQuestDisabledFlag(selectedQuest)
      };
    });
    setSelectedAssetId(null);
  };

  const handleConfirmBibleChapter = async () => {
    if (!pendingBibleChapter) {
      return;
    }

    try {
      const result = await createBibleChapterMutation.mutateAsync({
        projectId,
        bookId: pendingBibleChapter.bookId,
        bookName: pendingBibleChapter.bookName,
        chapterNumber: pendingBibleChapter.chapterNumber,
        verseCount: pendingBibleChapter.verseCount,
        existingBookQuestId: pendingBibleChapter.existingBookQuestId
      });

      setContextNode((prev) =>
        prev
          ? {
              ...prev,
              questId: result.bookQuestId
            }
          : prev
      );
      setSelectedMiddleNode({
        ...pendingBibleChapter.node,
        questId: result.chapterQuestId,
        quest: {
          id: result.chapterQuestId,
          name: `${pendingBibleChapter.bookName} ${pendingBibleChapter.chapterNumber}`,
          description: `${pendingBibleChapter.verseCount} verses`,
          metadata: {
            bible: {
              book: pendingBibleChapter.bookId,
              chapter: pendingBibleChapter.chapterNumber
            }
          },
          parent_id: result.bookQuestId,
          created_at: new Date().toISOString(),
          children: []
        },
        variants: [
          {
            id: result.chapterQuestId,
            name: `${pendingBibleChapter.bookName} ${pendingBibleChapter.chapterNumber}`,
            description: `${pendingBibleChapter.verseCount} verses`,
            metadata: {
              bible: {
                book: pendingBibleChapter.bookId,
                chapter: pendingBibleChapter.chapterNumber
              }
            },
            parent_id: result.bookQuestId,
            created_at: new Date().toISOString(),
            children: []
          }
        ],
        versionName: undefined
      });
      toast.success(
        `Created ${pendingBibleChapter.bookName} ${pendingBibleChapter.chapterNumber}`
      );
      setShowChapterConfirmModal(false);
      setPendingBibleChapter(null);
    } catch {
      toast.error('Failed to create chapter quest');
    }
  };

  const contentTitle = selectedContentNode
    ? selectedContentNode.title
    : copy.rightDefaultTitleByContext?.(contextNode) || copy.rightDefaultTitle;
  const selectedContentVariants = useMemo(
    () =>
      [...(selectedContentNode?.variants || [])].sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return bTime - aTime;
      }),
    [selectedContentNode]
  );
  const showVersionSelector = selectedContentVariants.length > 1;

  const middleHeaderNode = contextNode;

  const breadcrumbNodes = useMemo(() => {
    const chain: DisplayNode[] = [...contextHistory];
    if (contextNode) {
      chain.push(contextNode);
    }
    if (selectedContentNode && selectedContentNode.key !== contextNode?.key) {
      chain.push(selectedContentNode);
    }
    return chain;
  }, [contextHistory, contextNode, selectedContentNode]);

  useEffect(() => {
    const byId = data?.byId;
    if (!byId) {
      return;
    }

    const refreshNodeFromTree = (
      node: DisplayNode | null
    ): DisplayNode | null => {
      if (!node?.questId) {
        return node;
      }

      const latestQuest = byId[node.questId];
      if (!latestQuest) {
        return node;
      }

      return {
        ...node,
        quest: latestQuest,
        questId: latestQuest.id
      };
    };

    const refreshNodeListFromTree = (nodes: DisplayNode[]): DisplayNode[] =>
      nodes.map((node) => refreshNodeFromTree(node) || node);

    setActiveRootNode((prev) => refreshNodeFromTree(prev));
    setContextNode((prev) => refreshNodeFromTree(prev));
    setSelectedMiddleNode((prev) => refreshNodeFromTree(prev));
    setContextHistory((prev) => refreshNodeListFromTree(prev));
  }, [data]);

  const handleSelectProjectBreadcrumb = () => {
    setActiveRootNode(null);
    setContextNode(null);
    setContextHistory([]);
    setSelectedMiddleNode(null);
    setSelectedAssetId(null);
  };

  const handleSelectNodeBreadcrumb = (targetNode: DisplayNode) => {
    const contextChain: DisplayNode[] = [];
    contextChain.push(...contextHistory);
    if (contextNode) {
      contextChain.push(contextNode);
    }

    const isSelectedMiddleBreadcrumb =
      selectedContentNode &&
      selectedContentNode.key !== contextNode?.key &&
      selectedContentNode.key === targetNode.key;

    if (isSelectedMiddleBreadcrumb) {
      setSelectedMiddleNode(targetNode);
      setSelectedAssetId(null);
      return;
    }

    const contextIdx = contextChain.findIndex(
      (node) => node.key === targetNode.key
    );
    if (contextIdx === -1) {
      return;
    }

    const nextContext = contextChain[contextIdx];
    const nextHistory = contextChain.slice(0, contextIdx);
    const nextRoot = contextChain[0] || nextContext || null;

    setContextHistory(nextHistory);
    setContextNode(nextContext);
    setSelectedMiddleNode(null);
    setSelectedAssetId(null);
    setActiveRootNode(nextRoot);
  };

  return (
    <>
      <Card className="w-full overflow-hidden p-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 h-[680px]">
          {/* ===== Left column (col 1) ===== */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <div className="px-2 py-3">
              <div className="flex items-center justify-between gap-2 p-2">
                <CardTitle className="text-lg">
                  {copy.leftColumnTitle}
                </CardTitle>
                {showLeftMenuActions && (
                  <QuestMenuPlus
                    canManage={canManage}
                    projectId={projectId}
                    allowAddQuest={allowAddQuest}
                    onQuestSuccess={() => {
                      queryClient.invalidateQueries({
                        queryKey: ['qe-tree']
                      });
                      queryClient.invalidateQueries({
                        queryKey: ['project-quests', projectId, environment]
                      });
                      toast.success('Quest updated');
                    }}
                  />
                )}
              </div>
              <div className="px-1 pb-2 pt-1">
                <Input
                  value={rootSearch}
                  onChange={(event) => setRootSearch(event.target.value)}
                  placeholder={copy.rootSearchPlaceholder}
                  aria-label={copy.rootSearchPlaceholder}
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {isLoading ? (
                <div className="py-12 flex justify-center">
                  <Spinner className="text-primary h-6 w-6" />
                </div>
              ) : (
                <QuestList
                  nodes={filteredRootNodes}
                  selectedKey={activeRootNode?.key || null}
                  emptyMessage={copy.rootEmptyMessage}
                  onSelect={handleSelectRoot}
                />
              )}
            </div>
          </div>

          {/* ===== Columns 2+3 wrapper ===== */}
          <div className="lg:col-span-9 flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l">
            {/* Breadcrumb (merged across col 2 and col 3) */}
            <div className="h-10 shrink-0 border-b px-4 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectProjectBreadcrumb}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {projectName || 'Project'}
                </button>
              </div>
              {breadcrumbNodes.map((node) => (
                <div
                  key={node.key}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => handleSelectNodeBreadcrumb(node)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {node.icon && (
                      <img
                        src={node.icon}
                        alt=""
                        className="h-3.5 w-3.5 rounded-sm object-cover dark:invert"
                      />
                    )}
                    <span>{node.title}</span>
                  </button>
                </div>
              ))}
              {breadcrumbNodes.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  <ChevronRight className="h-3 w-3 inline-block mr-1 align-middle" />
                  {copy.breadcrumbEmpty}
                </span>
              )}
            </div>

            {/* Sub-grid: col 2 and col 3 side by side */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-9">
              {/* ===== Middle column (col 2) ===== */}
              <div className="lg:col-span-3 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b flex items-center gap-2 min-w-0">
                  {contextHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="shrink-0 rounded-md p-1 hover:bg-accent/50 transition-colors"
                      title="Go back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  {middleHeaderNode?.icon ? (
                    <img
                      src={middleHeaderNode.icon}
                      alt={middleHeaderNode.title}
                      className="h-5 w-5 rounded-sm object-cover dark:invert shrink-0"
                    />
                  ) : (
                    <FolderOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-semibold truncate">
                    {middleHeaderNode?.title || copy.middleHeaderFallback}
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  {contextNode ? (
                    <SubquestList
                      nodes={middleNodes}
                      selectedKey={selectedMiddleNode?.key || null}
                      emptyMessage={copy.middleLevelEmptyMessage}
                      onSelect={handleSelectMiddle}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground py-8 text-center">
                      {copy.middleNoContextMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* ===== Right column (col 3) ===== */}
              <div className="lg:col-span-6 flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l">
                <div className="px-4 py-3 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="truncate">{contentTitle}</CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      {showVersionSelector && selectedContentNode && (
                        <Select
                          value={selectedContentNode.questId || ''}
                          onValueChange={handleSelectVersion}
                        >
                          <SelectTrigger className="h-8 w-[190px]">
                            <SelectValue placeholder="Select version" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedContentVariants.map((variant) => (
                              <SelectItem key={variant.id} value={variant.id}>
                                {getQuestVersionLabel(variant)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {showRightMenuActions && selectedContentNode?.questId && (
                        <SubQuestMenuPlus
                          canManage={canManage}
                          projectId={projectId}
                          selectedQuestId={selectedContentNode.questId}
                          allowAddQuest={allowAddQuest}
                          allowAddAssets={allowAddAssets}
                          allowNewVersion={allowNewVersion}
                          newVersionConfirmDescription={
                            copy.newVersionConfirmDescription
                          }
                          onQuestSuccess={() => {
                            queryClient.invalidateQueries({
                              queryKey: ['qe-tree']
                            });
                            queryClient.invalidateQueries({
                              queryKey: [
                                'project-quests',
                                projectId,
                                environment
                              ]
                            });
                            queryClient.invalidateQueries({
                              queryKey: [
                                'qe-assets',
                                selectedContentNode.questId
                              ]
                            });
                            toast.success('Subquest created');
                          }}
                          onAssetSuccess={() => {
                            queryClient.invalidateQueries({
                              queryKey: [
                                'qe-assets',
                                selectedContentNode.questId
                              ]
                            });
                            refetchAssets();
                            toast.success('Asset created');
                          }}
                          disableQuests={false}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full pr-2">
                    {!selectedContentNode ? (
                      <div className="text-sm text-muted-foreground py-8 text-center">
                        {copy.rightSelectMessageByContext?.(contextNode) ||
                          copy.rightSelectMessage}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 p-3">
                        {thirdLevelNodes.length > 0 && (
                          <div className="rounded-xl border border-border/70 bg-card/40 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold">
                                {copy.subquestsSectionTitle}
                              </span>
                              <Badge
                                variant="secondary"
                                className="rounded-md tabular-nums"
                              >
                                {thirdLevelNodes.length}
                              </Badge>
                            </div>
                            <QuestCard
                              nodes={thirdLevelNodes}
                              emptyMessage={copy.subquestsEmptyMessage}
                              onSelect={handleDrillDownFromThird}
                            />
                          </div>
                        )}

                        <div className="rounded-xl border border-border/70 bg-card/40 p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">
                              {copy.assetsSectionTitle}
                            </span>
                            <Badge
                              variant="secondary"
                              className="rounded-md tabular-nums"
                            >
                              {questAssets.length}
                            </Badge>
                          </div>
                          {isLoadingAssets ? (
                            <div className="py-10 flex justify-center">
                              <Spinner className="text-primary h-5 w-5" />
                            </div>
                          ) : questAssets.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-6 text-center">
                              {copy.assetsEmptyMessage}
                            </div>
                          ) : (
                            <div className="flex w-full flex-col gap-3">
                              {questAssets.map((asset) => (
                                <QuestExplorerAssetCard
                                  key={asset.id}
                                  asset={asset}
                                  onClick={() =>
                                    handleOpenAssetDetails(asset.id)
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {isLoadingAssetDetails ? (
            <div className="py-10 flex justify-center">
              <Spinner className="text-primary h-6 w-6" />
            </div>
          ) : selectedAssetDetails ? (
            <AssetView asset={selectedAssetDetails} />
          ) : (
            <div className="text-sm text-muted-foreground py-6">
              Asset not found.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showChapterConfirmModal}
        onOpenChange={setShowChapterConfirmModal}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Chapter Quest</DialogTitle>
            <DialogDescription>
              Do you want to create{' '}
              <b>
                {pendingBibleChapter?.bookName}{' '}
                {pendingBibleChapter?.chapterNumber}
              </b>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowChapterConfirmModal(false);
                setPendingBibleChapter(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBibleChapter}
              disabled={createBibleChapterMutation.isPending}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default QuestExplorerMenu;
