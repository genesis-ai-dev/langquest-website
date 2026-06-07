'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { createBrowserClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/spinner';
import {
  Tree,
  type TreeCheckedState,
  type TreeViewElement
} from '@/components/ui/file-tree-selection';
import {
  getVerseMetadata,
  resolveAssetLabel,
  sortQuestByTemplate
} from '@/lib/templatefunctions';

interface ProjectDownloadModalProps {
  projectId: string;
  trigger?: React.ReactNode;
  title?: string;
  selectedQuests?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type DownloadQuestNode = {
  id: string;
  name: string | null;
  metadata: string | null;
  createdAt: string;
  children: DownloadQuestNode[];
  assets: DownloadAsset[];
};

type DownloadAsset = {
  id: string;
  name: string;
  metadata: string | null;
  created_At: string;
};

type DownloadTreeResponse = {
  projectId: string;
  projectTemplate?: string | null;
  tree: DownloadQuestNode[];
};

type DownloadJobResponse = {
  jobId: string;
  status: string;
  createdAt: string;
};

function questNodeToTreeElement(quest: DownloadQuestNode): TreeViewElement {
  return {
    id: quest.id,
    name: quest.name || 'Untitled Quest',
    created_at: quest.createdAt,
    type: quest.children.length ? 'folder' : 'file',
    children: quest.children.map(questNodeToTreeElement)
  };
}

function assetToTreeElement(
  asset: DownloadAsset,
  label?: string | null
): TreeViewElement {
  return {
    id: asset.id,
    name: asset.name,
    label: label || undefined,
    created_at: asset.created_At,
    type: 'file'
  };
}

function findQuestNode(
  quests: DownloadQuestNode[],
  questId: string
): DownloadQuestNode | null {
  for (const quest of quests) {
    if (quest.id === questId) {
      return quest;
    }

    const child = findQuestNode(quest.children, questId);
    if (child) {
      return child;
    }
  }

  return null;
}

function collectQuestIds(quest: DownloadQuestNode): string[] {
  return [quest.id, ...quest.children.flatMap(collectQuestIds)];
}

function collectAssetIds(quest: DownloadQuestNode): string[] {
  return [
    ...quest.assets.map((asset) => asset.id),
    ...quest.children.flatMap(collectAssetIds)
  ];
}

function applySelection(current: Set<string>, ids: string[], checked: boolean) {
  const next = new Set(current);

  ids.forEach((id) => {
    if (checked) {
      next.add(id);
      return;
    }

    next.delete(id);
  });

  return next;
}

export function ProjectDownloadModal({
  projectId,
  trigger,
  title = 'Download Project',
  open,
  onOpenChange
}: ProjectDownloadModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoadingQuests, setIsLoadingQuests] = useState(false);
  const [questTreeElements, setQuestTreeElements] = useState<TreeViewElement[]>(
    []
  );
  const [questTree, setQuestTree] = useState<DownloadQuestNode[]>([]);
  const [projectTemplate, setProjectTemplate] = useState<string | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [selectedQuestIds, setSelectedQuestIds] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    () => new Set()
  );
  const [downloadOption, setDownloadOption] = useState<
    'includeCsv' | 'mergeAudioByQuest' | null
  >(null);
  const [questTreeError, setQuestTreeError] = useState<string | null>(null);
  const [isCreatingDownloadJob, setIsCreatingDownloadJob] = useState(false);
  const [downloadJobError, setDownloadJobError] = useState<string | null>(null);
  const isDialogOpen = open ?? internalOpen;

  const selectedQuestAssets = useMemo(() => {
    if (!selectedQuestId) {
      return [];
    }

    const quest = findQuestNode(questTree, selectedQuestId);
    if (!quest) {
      return [];
    }

    const assets = quest.assets.sort((a, b) => {
      const aFrom = getVerseMetadata(a.metadata)?.from;
      const bFrom = getVerseMetadata(b.metadata)?.from;
      const aOrder =
        typeof aFrom === 'number' ? aFrom : Number.MAX_SAFE_INTEGER;
      const bOrder =
        typeof bFrom === 'number' ? bFrom : Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return (
        new Date(a.created_At).getTime() - new Date(b.created_At).getTime()
      );
    });

    return assets.map((asset) =>
      assetToTreeElement(
        asset,
        resolveAssetLabel(projectTemplate, quest, asset)
      )
    );
  }, [projectTemplate, questTree, selectedQuestId]);

  const selectedQuest = useMemo(() => {
    if (!selectedQuestId) {
      return null;
    }

    return findQuestNode(questTree, selectedQuestId);
  }, [questTree, selectedQuestId]);

  const selectedAssetIdsForCurrentQuest = selectedQuestAssets.map(
    (asset) => asset.id
  );
  const areAllCurrentQuestAssetsSelected =
    selectedAssetIdsForCurrentQuest.length > 0 &&
    selectedAssetIdsForCurrentQuest.every((assetId) =>
      selectedAssetIds.has(assetId)
    );

  const getQuestCheckedState = (quest: DownloadQuestNode): TreeCheckedState => {
    const childStates = quest.children.map(getQuestCheckedState);
    const assetStates = quest.assets.map((asset) =>
      selectedAssetIds.has(asset.id)
    );
    const descendantStates = [...childStates, ...assetStates];

    if (!descendantStates.length) {
      return selectedQuestIds.has(quest.id);
    }

    if (descendantStates.every((state) => state === true)) {
      return true;
    }

    if (descendantStates.every((state) => state === false)) {
      return false;
    }

    return 'indeterminate';
  };

  const areAllQuestsSelected =
    questTree.length > 0 &&
    questTree.every((quest) => getQuestCheckedState(quest) === true);

  const selectedCounts = useMemo(() => {
    const validAssetIds = new Set<string>();
    let selectedQuests = 0;

    const walk = (quest: DownloadQuestNode) => {
      quest.assets.forEach((asset) => validAssetIds.add(asset.id));
      quest.children.forEach(walk);

      const checkedState = getQuestCheckedState(quest);
      if (checkedState === true || checkedState === 'indeterminate') {
        selectedQuests += 1;
      }
    };

    questTree.forEach(walk);

    return {
      quests: selectedQuests,
      assets: [...selectedAssetIds].filter((id) => validAssetIds.has(id)).length
    };
  }, [questTree, selectedAssetIds, selectedQuestIds]);

  const getQuestElementCheckedState = (
    element: TreeViewElement
  ): TreeCheckedState => {
    const quest = findQuestNode(questTree, element.id);
    if (!quest) {
      return false;
    }

    return getQuestCheckedState(quest);
  };

  const handleQuestCheckedChange = (
    element: TreeViewElement,
    checked: boolean
  ) => {
    const quest = findQuestNode(questTree, element.id);
    if (!quest) {
      return;
    }

    setSelectedQuestIds((current) =>
      applySelection(current, collectQuestIds(quest), checked)
    );
    setSelectedAssetIds((current) =>
      applySelection(current, collectAssetIds(quest), checked)
    );
  };

  const handleAllQuestsCheckedChange = (checked: boolean) => {
    const allQuestIds = questTree.flatMap(collectQuestIds);
    const allAssetIds = questTree.flatMap(collectAssetIds);

    setSelectedQuestIds((current) =>
      applySelection(current, allQuestIds, checked)
    );
    setSelectedAssetIds((current) =>
      applySelection(current, allAssetIds, checked)
    );
  };

  const getAssetElementCheckedState = (element: TreeViewElement) =>
    selectedAssetIds.has(element.id);

  const handleAssetCheckedChange = (
    element: TreeViewElement,
    checked: boolean
  ) => {
    setSelectedAssetIds((current) =>
      applySelection(current, [element.id], checked)
    );
  };

  const handleAllCurrentQuestAssetsCheckedChange = (checked: boolean) => {
    setSelectedAssetIds((current) =>
      applySelection(current, selectedAssetIdsForCurrentQuest, checked)
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const selectedDownloadQuestIds = useMemo(() => {
    const questIds: string[] = [];

    const walk = (quest: DownloadQuestNode) => {
      const checkedState = getQuestCheckedState(quest);
      if (checkedState === true || checkedState === 'indeterminate') {
        questIds.push(quest.id);
      }

      quest.children.forEach(walk);
    };

    questTree.forEach(walk);
    return questIds;
  }, [questTree, selectedAssetIds, selectedQuestIds]);

  const selectedDownloadAssetIds = useMemo(() => {
    const validAssetIds = new Set<string>();

    const walk = (quest: DownloadQuestNode) => {
      quest.assets.forEach((asset) => validAssetIds.add(asset.id));
      quest.children.forEach(walk);
    };

    questTree.forEach(walk);
    return [...selectedAssetIds].filter((assetId) => validAssetIds.has(assetId));
  }, [questTree, selectedAssetIds]);

  const handleDownload = async () => {
    setDownloadJobError(null);

    if (!selectedDownloadQuestIds.length || !selectedDownloadAssetIds.length) {
      const message = 'Select at least one quest with assets to download.';
      setDownloadJobError(message);
      toast.error(message);
      return;
    }

    setIsCreatingDownloadJob(true);

    try {
      const {
        data: { session }
      } = await createBrowserClient().auth.getSession();

      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/download/${projectId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questIds: selectedDownloadQuestIds,
          assetIds: selectedDownloadAssetIds,
          includeCsv: downloadOption === 'includeCsv',
          combineAudioByQuest: downloadOption === 'mergeAudioByQuest'
        })
      });

      const json = (await response.json()) as DownloadJobResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || 'Failed to create download job');
      }

      console.log('Project download job response:', json);
      toast.success('Download request created successfully.');
    } catch (error) {
      console.error('Failed to create download job:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create download job';
      setDownloadJobError(message);
      toast.error(message);
    } finally {
      setIsCreatingDownloadJob(false);
    }
  };

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    let isActive = true;

    const loadQuestTree = async () => {
      setIsLoadingQuests(true);
      setQuestTreeError(null);

      try {
        const {
          data: { session }
        } = await createBrowserClient().auth.getSession();

        if (!session?.access_token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(`/api/download/${projectId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        const json = (await response.json()) as DownloadTreeResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(json.error || 'Failed to load project download tree');
        }

        if (!isActive) return;
        const sortedTree = sortQuestByTemplate(
          json.tree,
          json.projectTemplate || null
        );

        setProjectTemplate(json.projectTemplate || null);
        setQuestTree(sortedTree);
        setQuestTreeElements(sortedTree.map(questNodeToTreeElement));
        setSelectedQuestId(null);
        setSelectedQuestIds(new Set());
        setSelectedAssetIds(new Set());
        setDownloadJobError(null);
      } catch (error) {
        console.error('Failed to load project download tree:', error);
        if (!isActive) return;
        setQuestTreeError(
          error instanceof Error ? error.message : 'Failed to load quests'
        );
        setQuestTree([]);
        setProjectTemplate(null);
        setQuestTreeElements([]);
        setSelectedQuestId(null);
        setSelectedQuestIds(new Set());
        setSelectedAssetIds(new Set());
        setDownloadJobError(null);
      } finally {
        if (isActive) {
          setIsLoadingQuests(false);
        }
      }
    };

    loadQuestTree();

    return () => {
      isActive = false;
    };
  }, [isDialogOpen, projectId]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex h-[75vh] w-[75vw] max-w-[75vw] flex-col xl:max-w-[50vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Export translation data with related content.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-hidden">
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 pb-2">
              <div className="min-w-0 flex-1 overflow-hidden truncate">
                Quests list:
              </div>
              <span className="text-sm">Select All</span>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <Checkbox
                  checked={areAllQuestsSelected}
                  disabled={!questTree.length}
                  onCheckedChange={(checked) =>
                    handleAllQuestsCheckedChange(checked === true)
                  }
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border p-3">
              {isLoadingQuests ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : questTreeError ? (
                <div className="text-sm text-destructive">{questTreeError}</div>
              ) : questTreeElements.length ? (
                <Tree
                  key={questTreeElements.map((quest) => quest.id).join('-')}
                  className="h-full"
                  elements={questTreeElements}
                  onSelectItem={setSelectedQuestId}
                  getCheckedState={getQuestElementCheckedState}
                  onCheckedChange={handleQuestCheckedChange}
                  initialExpandedItems={questTreeElements.map(
                    (quest) => quest.id
                  )}
                  showDates={true}
                  sort="none"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  No quests found.
                </div>
              )}
            </div>
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex items-center gap-2 pb-2">
              <div className="min-w-0 flex-1 overflow-hidden truncate">
                {selectedQuest
                  ? `Assets of ${selectedQuest.name || 'Untitled Quest'}`
                  : 'No quest selected'}
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <span className="text-sm">Select All</span>
                <Checkbox
                  checked={areAllCurrentQuestAssetsSelected}
                  disabled={!selectedAssetIdsForCurrentQuest.length}
                  onCheckedChange={(checked) =>
                    handleAllCurrentQuestAssetsCheckedChange(checked === true)
                  }
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border p-3">
              {selectedQuestId ? (
                selectedQuestAssets.length ? (
                  <Tree
                    key={selectedQuestId}
                    className="h-full"
                    elements={selectedQuestAssets}
                    getCheckedState={getAssetElementCheckedState}
                    onCheckedChange={handleAssetCheckedChange}
                    showLabels={true}
                    showDates={true}
                    sort="none"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No assets found for this quest.
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground">
                  Select a quest to view its assets.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="text-muted-foreground p-0 text-xs -mt-2">
          {selectedCounts.quests} quests selected, {selectedCounts.assets}{' '}
          assets selected
        </div>
        {downloadJobError ? (
          <div className="text-xs text-destructive">{downloadJobError}</div>
        ) : null}
        <DialogFooter className="items-end justify-between sm:justify-between">
          <div className="flex flex-col gap-2 text-sm">
            <div className="font-medium">Options</div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={downloadOption === 'includeCsv'}
                  disabled={downloadOption === 'mergeAudioByQuest'}
                  onCheckedChange={(checked) =>
                    setDownloadOption(checked === true ? 'includeCsv' : null)
                  }
                />
                Include CSV file
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={downloadOption === 'mergeAudioByQuest'}
                  disabled={downloadOption === 'includeCsv'}
                  onCheckedChange={(checked) =>
                    setDownloadOption(
                      checked === true ? 'mergeAudioByQuest' : null
                    )
                  }
                />
                Combine audio by quest
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={
                isLoadingQuests ||
                isCreatingDownloadJob ||
                !selectedDownloadAssetIds.length
              }
              onClick={handleDownload}
            >
              {isCreatingDownloadJob ? 'Requesting...' : 'Download'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
