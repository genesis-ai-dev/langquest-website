'use client';

import { AssetSummary } from '@/app/db/questExplorer';
import { Spinner } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import { DisplayNode } from './template-strategies';
import { AssetLabelBadge } from './asset-label-badge';
import { QuestExplorerAssetCard } from './quest-explorer-asset-card';

interface AssetsContainerProps {
  title: string;
  emptyMessage: string;
  assets: AssetSummary[];
  isLoading: boolean;
  onOpenAsset: (assetId: string) => void;
  showAssetLabel?: boolean;
  resolveAssetLabel?: (quest: DisplayNode | null, asset: AssetSummary) => string;
  quest: DisplayNode | null;
}

export function AssetsContainer({
  title,
  emptyMessage,
  assets,
  isLoading,
  onOpenAsset,
  showAssetLabel = false,
  resolveAssetLabel,
  quest
}: AssetsContainerProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <Badge variant="secondary" className="rounded-md tabular-nums">
          {assets.length}
        </Badge>
      </div>
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Spinner className="text-primary h-5 w-5" />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          {assets.map((asset, index) => {
            const resolved = showAssetLabel
              ? resolveAssetLabel?.(quest, asset) || 'No labeled'
              : '';
            const previousResolved =
              showAssetLabel && index > 0
                ? resolveAssetLabel?.(quest, assets[index - 1]) || 'No labeled'
                : '';
            const shouldShowLabel = showAssetLabel && (index === 0 || resolved !== previousResolved);

            return (
              <div key={asset.id}>
                {shouldShowLabel && <AssetLabelBadge text={resolved} />}
                <QuestExplorerAssetCard
                  asset={asset}
                  onClick={() => onOpenAsset(asset.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
