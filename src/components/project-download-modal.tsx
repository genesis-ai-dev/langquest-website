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
import { createBrowserClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/spinner';
import {
  Tree,
  type TreeViewElement
} from '@/components/ui/file-tree-selection';

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
  tree: DownloadQuestNode[];
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

function assetToTreeElement(asset: DownloadAsset): TreeViewElement {
  return {
    id: asset.id,
    name: asset.name,
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
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [questTreeError, setQuestTreeError] = useState<string | null>(null);
  const isDialogOpen = open ?? internalOpen;

  const selectedQuestAssets = useMemo(() => {
    if (!selectedQuestId) {
      return [];
    }

    return findQuestNode(questTree, selectedQuestId)?.assets.map(
      assetToTreeElement
    ) ?? [];
  }, [questTree, selectedQuestId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
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
        setQuestTree(json.tree);
        setQuestTreeElements(json.tree.map(questNodeToTreeElement));
        setSelectedQuestId(null);
      } catch (error) {
        console.error('Failed to load project download tree:', error);
        if (!isActive) return;
        setQuestTreeError(
          error instanceof Error ? error.message : 'Failed to load quests'
        );
        setQuestTree([]);
        setQuestTreeElements([]);
        setSelectedQuestId(null);
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
            Download the project data in the selected format.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-hidden">
          <div className="flex min-h-0 flex-col">
            Quests
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
                  initialExpandedItems={questTreeElements.map(
                    (quest) => quest.id
                  )}
                  showDates={true}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  No quests found.
                </div>
              )}
            </div>
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden">
            Assets
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border p-3">
              {selectedQuestId ? (
                selectedQuestAssets.length ? (
                  <Tree
                    key={selectedQuestId}
                    className="h-full"
                    elements={selectedQuestAssets}
                    showDates={true}
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
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
