'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { getTemplateStrategy } from './template-strategies';
import { LabelSelector, LabelSelectorSelection } from './label-selector';

type LabelSelectorBaseProps = React.ComponentProps<typeof LabelSelector>;

interface LabelSelectorModalProps
  extends Omit<LabelSelectorBaseProps, 'onApply'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: string;
  handleApply: (selection: LabelSelectorSelection | null) => void;
  onApply?: (selection: LabelSelectorSelection | null) => void;
  applyText?: string;
  cancelText?: string;
}

export function LabelSelectorModal({
  open,
  onOpenChange,
  template,
  handleApply,
  onApply,
  labels,
  allowRange,
  className,
  applyText = 'Apply',
  cancelText = 'Cancel'
}: LabelSelectorModalProps) {
  const [pendingSelection, setPendingSelection] = useState<
    LabelSelectorSelection | null | undefined
  >(undefined);

  const strategy = useMemo(() => getTemplateStrategy(template), [template]);

  const handleClose = () => {
    setPendingSelection(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{strategy.copy.labelSelectorTitle}</DialogTitle>
        </DialogHeader>

        <LabelSelector
          labels={labels}
          allowRange={allowRange}
          className={className}
          onApply={(selection) => {
            setPendingSelection(selection);
            onApply?.(selection);
          }}
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {cancelText}
          </Button>
          <Button
            disabled={pendingSelection === undefined}
            onClick={() => {
              handleApply(pendingSelection ?? null);
              handleClose();
            }}
          >
            {applyText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
