'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Upload, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { BulkUpload } from '@/components/new-bulk-upload';
import { QuestForm } from '@/components/new-quest-form';

interface QuestMenuPlusProps {
  canManage: boolean;
  projectId: string;
  onQuestSuccess?: () => void;
  allowAddQuest?: boolean;
}

export function QuestMenuPlus({
  canManage,
  projectId,
  onQuestSuccess,
  allowAddQuest = true
}: QuestMenuPlusProps) {
  const [showBulkQuestUpload, setShowBulkQuestUpload] = useState(false);
  const [showQuestForm, setShowQuestForm] = useState(false);

  const handleQuestSuccess = () => {
    setShowQuestForm(false);
    onQuestSuccess?.();
  };

  if (!canManage || !allowAddQuest) {
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
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setShowQuestForm(true)}>
            <FolderPlus className="h-4 w-4" />
            Add Quest
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowBulkQuestUpload(true)}>
            <Upload className="h-4 w-4" />
            Bulk Upload Quests
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
            questParentId={undefined}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showBulkQuestUpload}
        onOpenChange={(open) => setShowBulkQuestUpload(open)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Quests to Project</DialogTitle>
            <DialogDescription>
              Add multiple quests with their assets.
            </DialogDescription>
          </DialogHeader>
          <BulkUpload
            mode="quest"
            projectId={projectId || undefined}
            onSuccess={() => {
              setShowBulkQuestUpload(false);
              toast.success('Quests uploaded successfully');
              handleQuestSuccess();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
