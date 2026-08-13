'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import {
  useCompatibleSourceQuests,
  useQuestAssets
} from '@/app/db/useQuestExplorerQueries';
import type { AssetSummary, SourceQuestVersion } from '@/app/db/questExplorer';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/spinner';
import { resolveAssetLabel } from '@/lib/templatefunctions';
import { cn } from '@/lib/utils';

import { ImportAssetItemCard } from './import-asset-item-card';

type ImportAssetsModalProps = {
  projectId: string;
  questId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

type SelectedImportAsset = {
  asset: AssetSummary;
  sourceQuest: SourceQuestVersion;
};

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
  trigger
}: ImportAssetsModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [selectedSourceQuestId, setSelectedSourceQuestId] = React.useState<
    string | null
  >(null);
  const [selectedAssets, setSelectedAssets] = React.useState<
    SelectedImportAsset[]
  >([]);
  const [isComboboxOpen, setIsComboboxOpen] = React.useState(false);
  const isOpen = open ?? uncontrolledOpen;

  const { data: sourceQuestsData, isLoading: isLoadingSourceQuests } =
    useCompatibleSourceQuests(projectId, questId, isOpen);
  const { data: sourceAssets = [], isLoading: isLoadingSourceAssets } =
    useQuestAssets(selectedSourceQuestId);

  const versions = sourceQuestsData?.versions ?? [];
  const template = sourceQuestsData?.template ?? null;
  const selectedSourceQuest =
    versions.find((version) => version.id === selectedSourceQuestId) ?? null;
  const selectedAssetIds = React.useMemo(
    () => new Set(selectedAssets.map((item) => item.asset.id)),
    [selectedAssets]
  );
  const availableAssets = React.useMemo(
    () => sourceAssets.filter((asset) => !selectedAssetIds.has(asset.id)),
    [selectedAssetIds, sourceAssets]
  );

  React.useEffect(() => {
    if (isOpen) {
      return;
    }

    setSelectedSourceQuestId(null);
    setSelectedAssets([]);
    setIsComboboxOpen(false);
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
      if (currentAssets.some((item) => item.asset.id === asset.id)) {
        return currentAssets;
      }

      return [...currentAssets, { asset, sourceQuest: selectedSourceQuest }];
    });
  }

  function handleRemoveAsset(assetId: string) {
    setSelectedAssets((currentAssets) =>
      currentAssets.filter((item) => item.asset.id !== assetId)
    );
  }

  function getAssetLabel(asset: AssetSummary, quest: SourceQuestVersion | null) {
    if (!quest || !template) {
      return null;
    }

    return resolveAssetLabel(
      template,
      { name: quest.name, metadata: quest.metadata },
      asset
    );
  }

  return (
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
                    <span className="truncate">
                      {isLoadingSourceQuests
                        ? 'Loading versions...'
                        : selectedSourceQuest
                          ? formatSourceQuestOption(selectedSourceQuest)
                          : 'Select a source version'}
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
                        : 'All assets from this version are already selected.'}
                    </p>
                  ) : (
                    availableAssets.map((asset) => (
                      <ImportAssetItemCard
                        key={asset.id}
                        name={asset.name || 'Untitled asset'}
                        label={getAssetLabel(asset, selectedSourceQuest)}
                        action="add"
                        onClick={() => handleAddAsset(asset)}
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
                  selectedAssets.map(({ asset, sourceQuest }) => (
                    <ImportAssetItemCard
                      key={asset.id}
                      name={asset.name || 'Untitled asset'}
                      label={getAssetLabel(asset, sourceQuest)}
                      action="remove"
                      onClick={() => handleRemoveAsset(asset.id)}
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
          <Button type="button" onClick={() => {}}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ImportAssetsModal };
export { ImportAssetItemCard } from './import-asset-item-card';
export type { ImportAssetsModalProps };
export default ImportAssetsModal;
