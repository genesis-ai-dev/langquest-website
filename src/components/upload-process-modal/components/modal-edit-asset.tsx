import * as React from 'react';

import type { CsvDataAsset } from '../lib/csv-data-build';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ModalEditAssetValues = {
  name: string;
  label: string;
};

type ModalEditAssetProps = {
  open: boolean;
  asset: CsvDataAsset | null;
  onOpenChange: (open: boolean) => void;
  onSave: (values: ModalEditAssetValues) => void;
};

function ModalEditAsset({
  open,
  asset,
  onOpenChange,
  onSave
}: ModalEditAssetProps) {
  const [name, setName] = React.useState('');
  const [label, setLabel] = React.useState('');

  React.useEffect(() => {
    setName(asset?.name ?? '');
    setLabel(asset?.label ?? '');
  }, [asset]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSave({
      name: name.trim(),
      label: label.trim()
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-3">
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the asset name and label. Source content is shown for
              reference only.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-4">
              <div className="grid gap-2">
                <Label htmlFor="asset-name">Asset Name</Label>
                <Input
                  id="asset-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Asset name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="asset-label">Label</Label>
                <Input
                  id="asset-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Label"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="asset-source-content">Source Content</Label>
              <Textarea
                id="asset-source-content"
                value={asset?.sourceContent ?? ''}
                readOnly
                className="h-16 min-h-16 resize-none bg-muted/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="asset-source-images">Source Images</Label>
                <Textarea
                  id="asset-source-images"
                  value={asset?.sourceImages.join('\n') ?? ''}
                  readOnly
                  className="h-14 min-h-14 resize-none bg-muted/40"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="asset-source-audio">Source Audio</Label>
                <Textarea
                  id="asset-source-audio"
                  value={asset?.sourceAudio.join('\n') ?? ''}
                  readOnly
                  className="h-14 min-h-14 resize-none bg-muted/40"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ModalEditAsset };
export type { ModalEditAssetValues };
