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
import { QuestForm } from '@/components/new-quest-form';
import { UploadProcessModal } from '@/components/upload-process-modal';

interface QuestMenuPlusProps {
  canManage: boolean;
  projectId: string;
  projectTemplate?: string;
  onQuestSuccess?: () => void;
  allowAddQuest?: boolean;
  allowBulkQuestUpload?: boolean;
}

export function QuestMenuPlus({
  canManage,
  projectId,
  projectTemplate,
  onQuestSuccess,
  allowAddQuest = true,
  allowBulkQuestUpload = true
}: QuestMenuPlusProps) {
  const [showBulkQuestUpload, setShowBulkQuestUpload] = useState(false);
  const [showQuestForm, setShowQuestForm] = useState(false);

  const handleQuestSuccess = () => {
    setShowQuestForm(false);
    onQuestSuccess?.();
  };

  if (!canManage || (!allowAddQuest && !allowBulkQuestUpload)) {
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
          {allowAddQuest && (
            <DropdownMenuItem onSelect={() => setShowQuestForm(true)}>
              <FolderPlus className="h-4 w-4" />
              Add Quest
            </DropdownMenuItem>
          )}
          {allowBulkQuestUpload && (
            <DropdownMenuItem onSelect={() => setShowBulkQuestUpload(true)}>
              <Upload className="h-4 w-4" />
              Bulk Upload Quests
            </DropdownMenuItem>
          )}
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

      <UploadProcessModal
        open={showBulkQuestUpload}
        uploadType="quest"
        projectId={projectId || undefined}
        projectTemplate={projectTemplate}
        onOpenChange={setShowBulkQuestUpload}
        onSuccess={() => {
          toast.success('Quests uploaded successfully');
          handleQuestSuccess();
        }}
        title="Upload Quests to Project"
        subtitle="Follow each step to add multiple quests with their assets."
      />
    </>
  );
}
