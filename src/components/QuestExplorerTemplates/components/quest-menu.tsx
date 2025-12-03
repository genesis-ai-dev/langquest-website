'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { BulkUpload } from '@/components/new-bulk-upload';
import { QuestForm } from '@/components/new-quest-form';

interface QuestMenuProps {
  canManage: boolean;
  projectId: string;
  onQuestSuccess?: () => void;
}

export function QuestMenu({
  canManage,
  projectId,
  onQuestSuccess
}: QuestMenuProps) {
  const [showBulkQuestUpload, setShowBulkQuestUpload] = useState(false);
  const [showQuestForm, setShowQuestForm] = useState(false);

  const handleQuestSuccess = () => {
    setShowQuestForm(false);
    onQuestSuccess?.();
  };

  if (!canManage) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowQuestForm(true)}
          title="Add a Quest"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          title="Bulk Upload Quests"
          onClick={(e) => {
            e.stopPropagation();
            setShowBulkQuestUpload(true);
          }}
        >
          <Upload className="h-4 w-4" />
          {/* Bulk Upload */}
        </Button>
      </div>

      {/* Quest Creation Modal */}
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

      {/* Quest Upload Modal */}
      <Dialog
        open={showBulkQuestUpload}
        onOpenChange={(open) => setShowBulkQuestUpload(open)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Quests to Project</DialogTitle>
            <DialogDescription>
              Add multiple quests with their assets to &quot;
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
