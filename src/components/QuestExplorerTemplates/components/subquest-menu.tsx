'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FolderPlus, FilePlus, FileStack, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import BulkAssetModal from '@/components/new-bulk-asset-modal';
import { BulkUpload } from '@/components/new-bulk-upload';

interface SubQuestMenuProps {
  canManage: boolean;
  projectId: string;
  selectedQuestId: string | null;
  onAddQuest: () => void;
  onAddAsset: () => void;
  disableQuests?: boolean;
}

export function SubQuestMenu({
  canManage,
  projectId,
  selectedQuestId,
  onAddQuest,
  onAddAsset,
  disableQuests = false
}: SubQuestMenuProps) {
  const [showBulkAssetUpload, setShowBulkAssetUpload] = useState(false);

  console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
  console.log('selectedQuestId:', selectedQuestId);

  if (!canManage) {
    return null;
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {!disableQuests && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddQuest}
            title="Add Sub-Quest"
          >
            <FolderPlus className="h-4 w-4" />
            {/* Add Quest */}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddAsset}
          title="Add Single Asset"
        >
          <FilePlus className="h-4 w-4" />
          {/* Add Asset */}
        </Button>

        <BulkAssetModal
          projectId={projectId}
          defaultQuestId={selectedQuestId || undefined}
          trigger={
            <Button
              title="Add Multiple Assets"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <FileStack className="h-4 w-4" />
              {/* Add Bulk */}
            </Button>
          }
          onAssetsCreated={(assets) => {
            toast.success(`Successfully created ${assets.length} assets`);
          }}
        />

        <Button
          variant="outline"
          size="sm"
          title="Bulk Upload Assets"
          onClick={(e) => {
            e.stopPropagation();
            setShowBulkAssetUpload(true);
          }}
        >
          <Upload className="h-4 w-4" />
          {/* Bulk Upload */}
        </Button>
      </div>

      {/* Asset Upload Modal */}
      <Dialog
        open={showBulkAssetUpload}
        onOpenChange={(open) => setShowBulkAssetUpload(open)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Assets to Quest</DialogTitle>
            <DialogDescription>
              Add multiple assets.
              {/* {pageState.selectedProjectName}&quot; using a CSV file. */}
            </DialogDescription>
          </DialogHeader>
          <BulkUpload
            mode="asset"
            projectId={projectId || undefined}
            questId={selectedQuestId || undefined}
            onSuccess={() => {
              setShowBulkAssetUpload(false);
              toast.success('Assets uploaded successfully');
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
