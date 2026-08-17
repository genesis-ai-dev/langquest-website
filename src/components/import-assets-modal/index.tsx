'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import {
  useAssetDetails,
  useCompatibleSourceQuests,
  useImportAssetsToQuest,
  useQuestAssets
} from '@/app/db/useQuestExplorerQueries';
import type { AssetSummary, QuestRecord, SourceQuestVersion } from '@/app/db/questExplorer';
import { AssetView } from '@/components/asset-view';
import { LabelSelectorModal } from '@/components/QuestExplorer/label-selector-modal';
import type { LabelSelectorSelection } from '@/components/QuestExplorer/label-selector';
import { getTemplateStrategy } from '@/components/QuestExplorer/template-strategies';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/spinner';
import { getVerseMetadata, resolveAssetLabel } from '@/lib/templatefunctions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { ImportAssetItemCard } from './import-asset-item-card';

type ImportAssetsModalProps = {
  projectId: string;
  questId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  labelContext?: {
    template: string;
    quest: QuestRecord | null;
    assets: AssetSummary[];
  };
};

type SelectedImportAsset = {
  asset: AssetSummary;
  sourceQuest: SourceQuestVersion;
  labelMetadata: Record<string, unknown> | null;
};

type VerseRange = {
  start: number;
  end: number;
};

function cloneLabelMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }

  return structuredClone(metadata);
}

function getVerseRange(metadata: unknown): VerseRange | null {
  const verse = getVerseMetadata(metadata);
  if (typeof verse?.from !== 'number') {
    return null;
  }

  const from = verse.from;
  const to = typeof verse.to === 'number' ? verse.to : from;

  return {
    start: Math.min(from, to),
    end: Math.max(from, to)
  };
}

function rangesOverlap(left: VerseRange, right: VerseRange) {
  return left.start <= right.end && right.start <= left.end;
}

function isSameRange(left: VerseRange, right: VerseRange) {
  return left.start === right.start && left.end === right.end;
}

function rangesConflict(left: VerseRange, right: VerseRange) {
  return rangesOverlap(left, right) && !isSameRange(left, right);
}

function formatQuestCreatedAt(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatSourceQuestOption(version: SourceQuestVersion) {
  const createdAtLabel = formatQuestCreatedAt(version.createdAt);
  const dateSuffix = createdAtLabel ? ` (${createdAtLabel})` : '';

  return `${version.authorInitials} ${version.versionLabel}${dateSuffix}`;
}

function ImportAssetsModal({
  projectId,
  questId,
  open,
  onOpenChange,
  onSuccess,
  trigger,
  labelContext
}: ImportAssetsModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [selectedSourceQuestId, setSelectedSourceQuestId] = React.useState<
    string | null
  >(null);
  const [selectedAssets, setSelectedAssets] = React.useState<
    SelectedImportAsset[]
  >([]);
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);
  const [viewingAssetId, setViewingAssetId] = React.useState<string | null>(
    null
  );
  const [labelModalOpen, setLabelModalOpen] = React.useState(false);
  const [editingLabelAssetIndex, setEditingLabelAssetIndex] = React.useState<
    number | null
  >(null);
  const isOpen = open ?? uncontrolledOpen;

  const { data: sourceQuestsData, isLoading: isLoadingSourceQuests } =
    useCompatibleSourceQuests(projectId, questId, isOpen);
  const { data: sourceAssets = [], isLoading: isLoadingSourceAssets } =
    useQuestAssets(selectedSourceQuestId);
  const { data: viewingAssetDetails, isLoading: isLoadingAssetDetails } =
    useAssetDetails(viewingAssetId);
  const importAssetsMutation = useImportAssetsToQuest();

  const versions = sourceQuestsData?.versions ?? [];
  const template =
    labelContext?.template || sourceQuestsData?.template || 'unstructured';
  const templateStrategy = React.useMemo(
    () => getTemplateStrategy(template),
    [template]
  );
  const allowLabel =
    Boolean(labelContext) && templateStrategy.behavior.allowLabel;
  const existingTargetAssets = labelContext?.assets || [];
  const selectedSourceQuest =
    versions.find((version) => version.id === selectedSourceQuestId) ?? null;
  const selectedAssetIds = React.useMemo(
    () => new Set(selectedAssets.map((item) => item.asset.id)),
    [selectedAssets]
  );
  const importedAssetIds = React.useMemo(
    () => new Set(existingTargetAssets.map((asset) => asset.id)),
    [existingTargetAssets]
  );
  const availableAssets = React.useMemo(
    () =>
      sourceAssets.filter(
        (asset) =>
          !selectedAssetIds.has(asset.id) && !importedAssetIds.has(asset.id)
      ),
    [importedAssetIds, selectedAssetIds, sourceAssets]
  );
  const overlappingAssetIds = React.useMemo(() => {
    const occupyingRanges: VerseRange[] = [];
    existingTargetAssets.forEach((asset) => {
      const range = getVerseRange(asset.metadata);
      if (range) {
        occupyingRanges.push(range);
      }
    });

    const overlappingIds = new Set<string>();
    selectedAssets.forEach((item) => {
      const range = getVerseRange(item.labelMetadata);
      if (!range) {
        return;
      }

      const overlaps = occupyingRanges.some((occupied) =>
        rangesConflict(range, occupied)
      );
      if (overlaps) {
        overlappingIds.add(item.asset.id);
        return;
      }

      occupyingRanges.push(range);
    });

    return overlappingIds;
  }, [existingTargetAssets, selectedAssets]);
  const canImport =
    selectedAssets.length > 0 &&
    overlappingAssetIds.size === 0 &&
    !importAssetsMutation.isPending;

  React.useEffect(() => {
    if (isOpen) {
      return;
    }

    setSelectedSourceQuestId(null);
    setSelectedAssets([]);
    setIsComboboxOpen(false);
    setViewingAssetId(null);
    setLabelModalOpen(false);
    setEditingLabelAssetIndex(null);
  }, [isOpen]);

  function handleOpenChange(nextOpen: boolean) {
    if (open === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function handleSelectSourceQuest(nextQuestId: string) {
    setSelectedSourceQuestId(nextQuestId || null);
    setIsComboboxOpen(false);
  }

  function handleAddAsset(asset: AssetSummary) {
    if (!selectedSourceQuest) {
      return;
    }

    setSelectedAssets((currentAssets) => {
      if (
        currentAssets.some((item) => item.asset.id === asset.id) ||
        importedAssetIds.has(asset.id)
      ) {
        return currentAssets;
      }

      return [
        ...currentAssets,
        {
          asset,
          sourceQuest: selectedSourceQuest,
          labelMetadata: cloneLabelMetadata(asset.metadata)
        }
      ];
    });
  }

  function handleRemoveAsset(assetId: string) {
    setSelectedAssets((currentAssets) =>
      currentAssets.filter((item) => item.asset.id !== assetId)
    );
  }

  function getAvailableLabelsForIndex(index: number) {
    if (!allowLabel || !labelContext) {
      return [];
    }

    const occupyingAssets: AssetSummary[] = [
      ...existingTargetAssets,
      ...selectedAssets
        .filter((item, itemIndex) => {
          if (itemIndex === index) {
            return false;
          }

          return !overlappingAssetIds.has(item.asset.id);
        })
        .map((item) => ({
          ...item.asset,
          metadata: item.labelMetadata
        }))
    ];

    return (
      templateStrategy.getAvailableLabels?.(
        labelContext.quest,
        occupyingAssets
      ) || []
    );
  }

  function handleApplyLabel(
    index: number,
    selection: LabelSelectorSelection | null
  ) {
    const nextMetadata = templateStrategy.formatLabelMetadata
      ? templateStrategy.formatLabelMetadata(selection)
      : null;

    setSelectedAssets((currentAssets) =>
      currentAssets.map((item, itemIndex) =>
        itemIndex === index ? { ...item, labelMetadata: nextMetadata } : item
      )
    );
  }

  function getAssetLabel(asset: AssetSummary, quest: SourceQuestVersion | null) {
    if (!quest || !template) {
      return null;
    }

    return resolveAssetLabel(
      template,
      { name: quest.name, metadata: quest.metadata },
      { metadata: asset.metadata }
    );
  }

  function getSelectedAssetLabel(item: SelectedImportAsset) {
    const quest = labelContext?.quest || item.sourceQuest;

    return resolveAssetLabel(
      template,
      { name: quest.name, metadata: quest.metadata },
      { metadata: item.labelMetadata }
    );
  }

  async function handleImport() {
    if (!canImport) {
      return;
    }

    const existingCount = existingTargetAssets.length;

    try {
      await importAssetsMutation.mutateAsync({
        projectId,
        questId,
        items: selectedAssets.map((item, index) => ({
          assetId: item.asset.id,
          name: item.asset.name,
          order_index: templateStrategy.getOrderIndex(
            item.labelMetadata,
            existingCount + index
          ),
          metadata: item.labelMetadata
        }))
      });

      toast.success(
        selectedAssets.length === 1
          ? 'Asset imported successfully'
          : `${selectedAssets.length} assets imported successfully`
      );
      onSuccess?.();
      handleOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to import assets. Please try again.';
      toast.error(message);
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="grid h-[75vh] max-h-[75vh] w-[75vw]! max-w-[75vw]! grid-rows-[auto_1fr_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Assets</DialogTitle>
          <DialogDescription>
            Bring assets from an earlier version of this quest into the one
            you&apos;re working on. Pick a source version, then move over the
            assets you want to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 grid-cols-2 gap-4 overflow-hidden">
          <section className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-lg border bg-muted/20 p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Source versions</h3>
              <Popover
                modal
                open={isComboboxOpen}
                onOpenChange={setIsComboboxOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isComboboxOpen}
                    className={cn(
                      'w-full justify-between bg-background font-normal',
                      !selectedSourceQuest && 'text-muted-foreground'
                    )}
                    disabled={isLoadingSourceQuests}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate">
                        {isLoadingSourceQuests
                          ? 'Loading versions...'
                          : selectedSourceQuest
                            ? formatSourceQuestOption(selectedSourceQuest)
                            : 'Select a source version'}
                      </span>
                      {selectedSourceQuest ? (
                        <Badge
                          variant="secondary"
                          className="rounded-md tabular-nums"
                        >
                          {selectedSourceQuest.assetCount}
                        </Badge>
                      ) : null}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                >
                  <Command>
                    <CommandInput placeholder="Search versions..." />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingSourceQuests
                          ? 'Loading versions...'
                          : 'No matching quest versions found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => handleSelectSourceQuest('')}
                        >
                          <Check
                            className={cn(
                              'size-4',
                              selectedSourceQuestId
                                ? 'opacity-0'
                                : 'opacity-100'
                            )}
                          />
                          <span className="text-muted-foreground">
                            Select a source version
                          </span>
                        </CommandItem>
                        {versions.map((version) => (
                          <CommandItem
                            key={version.id}
                            value={`${formatSourceQuestOption(version)} ${version.id}`}
                            onSelect={() => handleSelectSourceQuest(version.id)}
                          >
                            <Check
                              className={cn(
                                'size-4',
                                selectedSourceQuestId === version.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                                {version.authorInitials}
                              </span>
                              <span className="truncate">
                                {version.versionLabel}
                              </span>
                              <span className="ml-auto shrink-0 text-muted-foreground">
                                ({formatQuestCreatedAt(version.createdAt)})
                              </span>
                              <Badge
                                variant="secondary"
                                className="rounded-md tabular-nums"
                              >
                                {version.assetCount}
                              </Badge>
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <p className="mb-2 text-sm font-semibold">Available assets</p>
              <ScrollArea className="h-full min-h-0 flex-1">
                <div className="flex flex-col gap-2 pr-3">
                  {!selectedSourceQuestId ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Choose a source version to see its assets.
                    </p>
                  ) : isLoadingSourceAssets ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                      <Spinner className="size-4 text-primary" />
                      Loading assets...
                    </div>
                  ) : availableAssets.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      {sourceAssets.length === 0
                        ? 'This version has no assets yet.'
                        : sourceAssets.every((asset) =>
                              importedAssetIds.has(asset.id)
                            )
                          ? 'All assets from this version have already been imported.'
                          : 'All remaining assets from this version are already selected.'}
                    </p>
                  ) : (
                    availableAssets.map((asset) => (
                      <ImportAssetItemCard
                        key={asset.id}
                        name={asset.name || 'Untitled asset'}
                        label={getAssetLabel(asset, selectedSourceQuest)}
                        action="add"
                        onClick={() => handleAddAsset(asset)}
                        onView={() => setViewingAssetId(asset.id)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </section>

          <section className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Selected to import</h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {selectedAssets.length}
              </span>
            </div>
            <ScrollArea className="h-full min-h-0 flex-1">
              <div className="flex flex-col gap-2 pr-3">
                {selectedAssets.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Assets you pick will show up here, ready to import.
                  </p>
                ) : (
                  selectedAssets.map((item, index) => (
                    <ImportAssetItemCard
                      key={item.asset.id}
                      name={item.asset.name || 'Untitled asset'}
                      label={getSelectedAssetLabel(item)}
                      action="remove"
                      labelEditable={allowLabel}
                      labelError={overlappingAssetIds.has(item.asset.id)}
                      onClick={() => handleRemoveAsset(item.asset.id)}
                      onView={() => setViewingAssetId(item.asset.id)}
                      onLabelClick={() => {
                        setEditingLabelAssetIndex(index);
                        setLabelModalOpen(true);
                      }}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </section>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
          >
            {importAssetsMutation.isPending ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={!!viewingAssetId}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setViewingAssetId(null);
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asset Details</DialogTitle>
        </DialogHeader>
        {isLoadingAssetDetails ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : viewingAssetDetails ? (
          <AssetView asset={viewingAssetDetails} />
        ) : (
          <div className="py-6 text-sm text-muted-foreground">
            Asset not found.
          </div>
        )}
      </DialogContent>
    </Dialog>

    {allowLabel && editingLabelAssetIndex !== null ? (
      <LabelSelectorModal
        open={labelModalOpen}
        onOpenChange={(nextOpen) => {
          setLabelModalOpen(nextOpen);
          if (!nextOpen) {
            setEditingLabelAssetIndex(null);
          }
        }}
        template={template}
        labels={getAvailableLabelsForIndex(editingLabelAssetIndex)}
        allowRange={true}
        handleApply={(selection) => {
          handleApplyLabel(editingLabelAssetIndex, selection);
        }}
      />
    ) : null}
    </>
  );
}

export { ImportAssetsModal };
export { ImportAssetItemCard } from './import-asset-item-card';
export type { ImportAssetsModalProps };
export default ImportAssetsModal;
