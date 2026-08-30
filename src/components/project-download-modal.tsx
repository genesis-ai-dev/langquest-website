'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { createBrowserClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/spinner';
import { CircleHelp, ImageIcon, Volume2 } from 'lucide-react';
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
import {
  downloadProjectZip,
  type ProjectDownloadProgress
} from '@/lib/download';

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
  assetCount: number;
  children: DownloadQuestNode[];
  assets: DownloadAsset[];
};

type DownloadAsset = {
  id: string;
  name: string;
  metadata: string | null;
  created_At: string;
  imageCount?: number;
  audioFileCount?: number;
};

type DownloadTreeResponse = {
  projectId: string;
  projectTemplate?: string | null;
  tree: DownloadQuestNode[];
};

type QuestAssetsResponse = {
  projectId: string;
  questId: string;
  assets: DownloadAsset[];
};

type AssetLoadState = 'loading' | 'loaded' | 'error';

function questNodeToTreeElement(quest: DownloadQuestNode): TreeViewElement {
  const totalAssetCount = countQuestTreeAssets(quest);

  return {
    id: quest.id,
    name: quest.name || 'Untitled Quest',
    label: `${totalAssetCount} ${totalAssetCount === 1 ? 'asset' : 'assets'}`,
    created_at: quest.createdAt,
    type: quest.children.length ? 'folder' : 'file',
    children: quest.children.map(questNodeToTreeElement)
  };
}

function countQuestTreeAssets(quest: DownloadQuestNode): number {
  return (
    quest.assetCount +
    quest.children.reduce(
      (total, child) => total + countQuestTreeAssets(child),
      0
    )
  );
}

function assetToTreeElement(
  asset: DownloadAsset,
  label?: string | null
): TreeViewElement {
  const extraContent =
    (asset.imageCount ?? 0) > 0 || (asset.audioFileCount ?? 0) > 0 ? (
      <span className="inline-flex items-center gap-1">
        {(asset.imageCount ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <ImageIcon className="h-3 w-3" />
            {asset.imageCount}
          </span>
        ) : null}
        {(asset.audioFileCount ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <Volume2 className="h-3 w-3" />
            {asset.audioFileCount}
          </span>
        ) : null}
      </span>
    ) : undefined;

  return {
    id: asset.id,
    name: asset.name,
    label: label || undefined,
    extraContent,
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

function updateQuestAssets(
  quests: DownloadQuestNode[],
  questId: string,
  assets: DownloadAsset[]
): DownloadQuestNode[] {
  return quests.map((quest) => {
    if (quest.id === questId) {
      return {
        ...quest,
        assets
      };
    }

    return {
      ...quest,
      children: updateQuestAssets(quest.children, questId, assets)
    };
  });
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
  const [assetLoadStates, setAssetLoadStates] = useState<
    Record<string, AssetLoadState>
  >({});
  const [assetLoadErrors, setAssetLoadErrors] = useState<
    Record<string, string>
  >({});
  const [downloadOption, setDownloadOption] = useState<
    'includeCsv' | 'mergeAudioByQuest' | null
  >(null);
  const [questTreeError, setQuestTreeError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<ProjectDownloadProgress | null>(null);
  const isDialogOpen = open ?? internalOpen;

  const selectedQuestAssets = useMemo(() => {
    if (!selectedQuestId) {
      return [];
    }

    const quest = findQuestNode(questTree, selectedQuestId);
    if (!quest) {
      return [];
    }

    const assets = [...quest.assets].sort((a, b) => {
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
    const assetState = (() => {
      if (quest.assetCount === 0) {
        return null;
      }

      if (selectedQuestIds.has(quest.id)) {
        return true;
      }

      const selectedLoadedAssets = quest.assets.filter((asset) =>
        selectedAssetIds.has(asset.id)
      );

      if (!selectedLoadedAssets.length) {
        return false;
      }

      if (
        quest.assets.length === quest.assetCount &&
        selectedLoadedAssets.length === quest.assetCount
      ) {
        return true;
      }

      return 'indeterminate';
    })();
    const descendantStates = [
      ...childStates,
      ...(assetState === null ? [] : [assetState])
    ];

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

  const getQuestElementCheckedState = (
    element: TreeViewElement
  ): TreeCheckedState => {
    const quest = findQuestNode(questTree, element.id);
    if (!quest) {
      return false;
    }

    return getQuestCheckedState(quest);
  };

  const selectedCounts = useMemo(() => {
    let selectedQuests = 0;
    let selectedAssets = 0;

    const walk = (quest: DownloadQuestNode) => {
      const checkedState = getQuestCheckedState(quest);
      if (checkedState === true || checkedState === 'indeterminate') {
        selectedQuests += 1;
      }

      if (checkedState === true) {
        selectedAssets += quest.assetCount;
      } else {
        selectedAssets += quest.assets.filter((asset) =>
          selectedAssetIds.has(asset.id)
        ).length;
      }

      quest.children.forEach(walk);
    };

    questTree.forEach(walk);

    return {
      quests: selectedQuests,
      assets: selectedAssets
    };
  }, [questTree, selectedAssetIds, selectedQuestIds]);

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
    selectedAssetIds.has(element.id) ||
    Boolean(selectedQuestId && selectedQuestIds.has(selectedQuestId));

  const handleAssetCheckedChange = (
    element: TreeViewElement,
    checked: boolean
  ) => {
    const currentQuest = selectedQuestId
      ? findQuestNode(questTree, selectedQuestId)
      : null;

    if (!currentQuest) {
      return;
    }

    if (selectedQuestIds.has(currentQuest.id)) {
      setSelectedQuestIds((current) =>
        applySelection(current, [currentQuest.id], false)
      );
      setSelectedAssetIds((current) =>
        applySelection(
          current,
          currentQuest.assets
            .map((asset) => asset.id)
            .filter((assetId) => assetId !== element.id),
          true
        )
      );
    }

    setSelectedAssetIds((current) =>
      applySelection(current, [element.id], checked)
    );
  };

  const handleAllCurrentQuestAssetsCheckedChange = (checked: boolean) => {
    if (!checked && selectedQuestId) {
      setSelectedQuestIds((current) =>
        applySelection(current, [selectedQuestId], false)
      );
    }

    setSelectedAssetIds((current) =>
      applySelection(current, selectedAssetIdsForCurrentQuest, checked)
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const selectedDownloadSelection = useMemo(() => {
    const fullQuestIds: string[] = [];
    const partialQuestIds: string[] = [];
    const partialAssetIds = new Set<string>();

    const walk = (quest: DownloadQuestNode) => {
      const checkedState = getQuestCheckedState(quest);
      if (checkedState === true) {
        fullQuestIds.push(quest.id);
      } else if (checkedState === 'indeterminate') {
        partialQuestIds.push(quest.id);
        quest.assets.forEach((asset) => {
          if (selectedAssetIds.has(asset.id)) {
            partialAssetIds.add(asset.id);
          }
        });
      }

      quest.children.forEach(walk);
    };

    questTree.forEach(walk);
    return {
      fullQuestIds,
      partialQuestIds,
      partialAssetIds: [...partialAssetIds]
    };
  }, [questTree, selectedAssetIds, selectedQuestIds]);

  const hasDownloadSelection =
    selectedDownloadSelection.fullQuestIds.length > 0 ||
    selectedDownloadSelection.partialAssetIds.length > 0;

  const selectedQuestAssetCountLabel = useMemo(() => {
    if (!selectedQuest) {
      return 'Select a quest to view asset counts.';
    }

    const imageFiles = selectedQuest.assets.reduce(
      (total, asset) => total + (asset.imageCount ?? 0),
      0
    );
    const audioFiles = selectedQuest.assets.reduce(
      (total, asset) => total + (asset.audioFileCount ?? 0),
      0
    );
    const selectedAssets = selectedQuestIds.has(selectedQuest.id)
      ? selectedQuest.assetCount
      : selectedQuest.assets.filter((asset) => selectedAssetIds.has(asset.id))
          .length;

    return `${imageFiles} images, ${audioFiles} audio. ${selectedQuest.assetCount} assets available, ${selectedAssets} assets selected.`;
  }, [selectedAssetIds, selectedQuest, selectedQuestIds]);

  const handleDownload = async () => {
    setDownloadError(null);
    setDownloadProgress(null);

    if (!hasDownloadSelection) {
      const message = 'Select at least one quest with assets to download.';
      setDownloadError(message);
      return;
    }

    setIsDownloading(true);

    try {
      await downloadProjectZip({
        projectId,
        fullQuestIds: selectedDownloadSelection.fullQuestIds,
        partialQuestIds: selectedDownloadSelection.partialQuestIds,
        assetIds: selectedDownloadSelection.partialAssetIds,
        includeCsv: downloadOption === 'includeCsv',
        mergeAudioByQuest: downloadOption === 'mergeAudioByQuest',
        onProgress: setDownloadProgress
      });
    } catch (error) {
      console.error('Failed to download project:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to download project';
      setDownloadError(message);
    } finally {
      setIsDownloading(false);
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

        /* REMOVE THIS BEFORE DEPLOYMENT */
        console.log('Project download API response:', json);

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
        setAssetLoadStates({});
        setAssetLoadErrors({});
        setDownloadError(null);
        setDownloadProgress(null);
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
        setAssetLoadStates({});
        setAssetLoadErrors({});
        setDownloadError(null);
        setDownloadProgress(null);
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

  useEffect(() => {
    if (!isDialogOpen || !selectedQuestId) {
      return;
    }

    const quest = findQuestNode(questTree, selectedQuestId);
    const currentLoadState = assetLoadStates[selectedQuestId];
    if (!quest || quest.assetCount === 0 || currentLoadState === 'loaded') {
      return;
    }

    let isActive = true;

    const loadQuestAssets = async () => {
      setAssetLoadStates((current) => ({
        ...current,
        [selectedQuestId]: 'loading'
      }));
      setAssetLoadErrors((current) => {
        const next = { ...current };
        delete next[selectedQuestId];
        return next;
      });

      try {
        const {
          data: { session }
        } = await createBrowserClient().auth.getSession();

        if (!session?.access_token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(
          `/api/download/${projectId}/quests/${selectedQuestId}/assets`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        );

        const json = (await response.json()) as QuestAssetsResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(json.error || 'Failed to load quest assets');
        }

        if (!isActive) return;

        setQuestTree((current) =>
          updateQuestAssets(current, selectedQuestId, json.assets)
        );
        setAssetLoadStates((current) => ({
          ...current,
          [selectedQuestId]: 'loaded'
        }));
      } catch (error) {
        console.error('Failed to load quest assets:', error);
        if (!isActive) return;

        setAssetLoadStates((current) => ({
          ...current,
          [selectedQuestId]: 'error'
        }));
        setAssetLoadErrors((current) => ({
          ...current,
          [selectedQuestId]:
            error instanceof Error ? error.message : 'Failed to load assets'
        }));
      }
    };

    loadQuestAssets();

    return () => {
      isActive = false;
    };
  }, [isDialogOpen, projectId, selectedQuestId]);

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
                  showLabels={true}
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
                assetLoadStates[selectedQuestId] === 'loading' ? (
                  <div className="flex h-full items-center justify-center">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : assetLoadStates[selectedQuestId] === 'error' ? (
                  <div className="text-sm text-destructive">
                    {assetLoadErrors[selectedQuestId] ||
                      'Failed to load assets'}
                  </div>
                ) : selectedQuestAssets.length ? (
                  <Tree
                    key={selectedQuestId}
                    className="h-full"
                    elements={selectedQuestAssets}
                    getCheckedState={getAssetElementCheckedState}
                    onCheckedChange={handleAssetCheckedChange}
                    showExtraContent={true}
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
        <div className="grid w-full grid-cols-2 gap-4">
          <div className="text-muted-foreground p-0 text-xs -mt-2">
            {selectedCounts.quests} quests selected, {selectedCounts.assets}{' '}
            assets selected
          </div>
          <div className="text-muted-foreground p-0 text-xs -mt-2">
            {selectedQuestAssetCountLabel}
          </div>
        </div>

        {downloadProgress ? (
          <div className="space-y-2 rounded-md border px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">
                  {downloadProgress.phase === 'complete'
                    ? 'Download complete'
                    : 'Preparing download'}
                </div>
                <div className="text-muted-foreground truncate">
                  {downloadProgress.message}
                </div>
              </div>
              <div className="shrink-0 text-muted-foreground">
                {downloadProgress.currentQuest}/{downloadProgress.totalQuests}{' '}
                quests
              </div>
            </div>
            <Progress value={downloadProgress.percent} />
            {downloadProgress.warnings?.length ? (
              <div className="max-h-20 overflow-y-auto rounded-sm bg-yellow-50 px-2 py-1 text-yellow-800">
                <div className="font-medium">Warnings</div>
                <ul className="list-disc pl-4">
                  {downloadProgress.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        {downloadError ? (
          <div className="text-xs text-destructive">{downloadError}</div>
        ) : null}
        <DialogFooter className="items-end justify-between sm:justify-between">
          <div className="flex flex-col gap-2 text-sm">
            <div className="font-medium">Options</div>
            <div className="flex items-center gap-4">
              <label
                className={`flex items-center gap-2 ${
                  downloadOption === 'mergeAudioByQuest'
                    ? 'cursor-not-allowed text-muted-foreground opacity-60'
                    : ''
                }`}
              >
                <Checkbox
                  checked={downloadOption === 'includeCsv'}
                  disabled={downloadOption === 'mergeAudioByQuest'}
                  onCheckedChange={(checked) =>
                    setDownloadOption(checked === true ? 'includeCsv' : null)
                  }
                />
                Include CSV file
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleHelp className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    Creates a text file (CSV) with the list of exported items,
                    including quests and assets.
                  </TooltipContent>
                </Tooltip>
              </label>
              <label
                className={`flex items-center gap-2 ${
                  downloadOption === 'includeCsv'
                    ? 'cursor-not-allowed text-muted-foreground opacity-60'
                    : ''
                }`}
              >
                <Checkbox
                  checked={downloadOption === 'mergeAudioByQuest'}
                  disabled={downloadOption === 'includeCsv'}
                  onCheckedChange={(checked) =>
                    setDownloadOption(
                      checked === true ? 'mergeAudioByQuest' : null
                    )
                  }
                />
                Combine audio files
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleHelp className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    Combines audio files into one file for each quest version,
                    such as a Bible chapter, pericope, or similar unit.
                  </TooltipContent>
                </Tooltip>
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
                isLoadingQuests || isDownloading || !hasDownloadSelection
              }
              onClick={handleDownload}
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
