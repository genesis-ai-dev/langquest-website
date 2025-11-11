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

interface QuestMenuProps {
  canManage: boolean;
  projectId: string;
  onAddQuest: () => void;
}

export function QuestMenu({
  canManage,
  projectId,
  onAddQuest
}: QuestMenuProps) {
  const [showBulkQuestUpload, setShowBulkQuestUpload] = useState(false);

  if (!canManage) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onAddQuest}
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
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
