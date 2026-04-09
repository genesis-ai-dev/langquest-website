'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  FilePlus,
  FileStack,
  FolderPlus,
  GitBranchPlus,
  Plus,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import BulkAssetModal from '@/components/new-bulk-asset-modal';
import { BulkUpload } from '@/components/new-bulk-upload';
import { QuestForm } from '@/components/new-quest-form';
import { AssetForm } from '@/components/new-asset-form';
import { useAuth } from '@/components/auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { AssetSummary, QuestRecord } from '@/app/db/questExplorer';

interface SubQuestMenuPlusProps {
  canManage: boolean;
  projectId: string;
  selectedQuestId: string | null;
  questAssetsCount?: number;
  onQuestSuccess?: () => void;
  onAssetSuccess?: (currentQuestId?: string) => void;
  disableQuests?: boolean;
  labelContext?: {
    template: string;
    quest: QuestRecord | null;
    assets: AssetSummary[];
  };
  menuConfig?: {
    allowAddQuest?: boolean;
    allowAddAssets?: boolean;
    allowNewVersion?: boolean;
    newVersionConfirmDescription?: string;
    msgSelectQuestForNewVersion?: string;
    msgNewVersionCreated?: string;
    msgNewVersionCreateError?: string;
    msgBulkAssetsUploaded?: string;
  };
}

export function SubQuestMenuPlus({
  canManage,
  projectId,
  selectedQuestId,
  questAssetsCount,
  onQuestSuccess,
  onAssetSuccess,
  disableQuests = false,
  labelContext,
  menuConfig
}: SubQuestMenuPlusProps) {
  const { user, supabase } = useAuth();
  const queryClient = useQueryClient();
  const [showBulkAssetUpload, setShowBulkAssetUpload] = useState(false);
  const [showQuestForm, setShowQuestForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showNewVersionConfirm, setShowNewVersionConfirm] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  const canAddQuest = (menuConfig?.allowAddQuest ?? true) && !disableQuests;
  const canAddAssets = menuConfig?.allowAddAssets ?? true;
  const canAddNewVersion =
    (menuConfig?.allowNewVersion ?? false) &&
    !disableQuests &&
    !!selectedQuestId;

  const invalidateQuestQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['qe-tree', projectId]
      }),
      queryClient.invalidateQueries({
        queryKey: ['project-quests', projectId]
      })
    ]);
  };

  const handleQuestSuccess = async () => {
    setShowQuestForm(false);
    await invalidateQuestQueries();
    onQuestSuccess?.();
  };

  const handleAssetSuccess = () => {
    setShowAssetForm(false);
    onAssetSuccess?.(selectedQuestId || undefined);
  };

  const handleCreateNewVersion = async () => {
    if (!selectedQuestId || !user) {
      toast.error(
        menuConfig?.msgSelectQuestForNewVersion ||
          'Select a quest before creating a new version'
      );
      return;
    }

    setIsCreatingVersion(true);
    try {
      const { data: sourceQuest, error: sourceError } = await supabase
        .from('quest')
        .select('name, description, metadata, parent_id, project_id')
        .eq('id', selectedQuestId)
        .single();

      if (sourceError || !sourceQuest) {
        throw sourceError || new Error('Source quest not found');
      }

      const { data: createdQuest, error: createError } = await supabase
        .from('quest')
        .insert({
          name: sourceQuest.name,
          description: sourceQuest.description,
          metadata: sourceQuest.metadata,
          parent_id: sourceQuest.parent_id,
          project_id: sourceQuest.project_id,
          creator_id: user.id
        })
        .select('id')
        .single();

      if (createError || !createdQuest) {
        throw createError || new Error('Failed to create new version');
      }

      const { data: sourceTags, error: tagReadError } = await supabase
        .from('quest_tag_link')
        .select('tag_id')
        .eq('quest_id', selectedQuestId);

      if (tagReadError) {
        throw tagReadError;
      }

      if ((sourceTags || []).length > 0) {
        const { error: tagInsertError } = await supabase
          .from('quest_tag_link')
          .insert(
            (sourceTags || []).map((tag) => ({
              quest_id: createdQuest.id,
              tag_id: tag.tag_id
            }))
          );

        if (tagInsertError) {
          throw tagInsertError;
        }
      }

      setShowNewVersionConfirm(false);
      toast.success(
        menuConfig?.msgNewVersionCreated || 'New quest version created'
      );
      await invalidateQuestQueries();
      onQuestSuccess?.();
    } catch (error: any) {
      toast.error(
        error?.message ||
          menuConfig?.msgNewVersionCreateError ||
          'Failed to create quest version'
      );
    } finally {
      setIsCreatingVersion(false);
    }
  };

  if (!canManage || (!canAddQuest && !canAddAssets && !canAddNewVersion)) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            title="Add"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canAddQuest && (
            <DropdownMenuItem onSelect={() => setShowQuestForm(true)}>
              <FolderPlus className="h-4 w-4" />
              Add Subquest
            </DropdownMenuItem>
          )}
          {canAddNewVersion && (
            <DropdownMenuItem onSelect={() => setShowNewVersionConfirm(true)}>
              <GitBranchPlus className="h-4 w-4" />
              Add New Version
            </DropdownMenuItem>
          )}
          {(canAddQuest || canAddNewVersion) && canAddAssets && (
            <DropdownMenuSeparator />
          )}

          {canAddAssets && (
            <DropdownMenuItem onSelect={() => setShowAssetForm(true)}>
              <FilePlus className="h-4 w-4" />
              Add Asset
            </DropdownMenuItem>
          )}

          {canAddAssets && (
            <BulkAssetModal
              projectId={projectId}
              defaultQuestId={selectedQuestId || undefined}
              disableQuestsChange={disableQuests}
              allowMultiQuest={!disableQuests}
              questAssetsCount={questAssetsCount}
              template={labelContext?.template || 'unstructured'}
              onAssetsCreated={(assets) => {
                toast.success(`Successfully created ${assets.length} assets`);
                onAssetSuccess?.(selectedQuestId || undefined);
              }}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <FileStack className="h-4 w-4" />
                  Add Multiple Assets
                </DropdownMenuItem>
              }
            />
          )}

          {canAddAssets && (
            <DropdownMenuItem onSelect={() => setShowBulkAssetUpload(true)}>
              <Upload className="h-4 w-4" />
              Bulk Upload Assets
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={showBulkAssetUpload}
        onOpenChange={(open) => setShowBulkAssetUpload(open)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Assets to Quest</DialogTitle>
            <DialogDescription>Add multiple assets.</DialogDescription>
          </DialogHeader>
          <BulkUpload
            mode="asset"
            projectId={projectId || undefined}
            questId={selectedQuestId || undefined}
            onSuccess={() => {
              setShowBulkAssetUpload(false);
              toast.success(
                menuConfig?.msgBulkAssetsUploaded ||
                  'Assets uploaded successfully'
              );
              handleAssetSuccess();
            }}
          />
        </DialogContent>
      </Dialog>

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

      <Dialog
        open={showNewVersionConfirm}
        onOpenChange={setShowNewVersionConfirm}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              {menuConfig?.newVersionConfirmDescription ||
                'This will create a new version of the same quest. Do you want to continue?'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewVersionConfirm(false)}
              disabled={isCreatingVersion}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewVersion}
              disabled={isCreatingVersion}
            >
              {isCreatingVersion ? 'Creating...' : 'Create Version'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            questAssetsCount={questAssetsCount}
            hideContentTabs={disableQuests}
            labelContext={labelContext}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
