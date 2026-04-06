'use client';

import { useMemo, useState } from 'react';
import { AssetSummary } from '@/app/db/questExplorer';
import { Spinner } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DisplayNode } from './template-strategies';
import { AssetLabelBadge } from './asset-label-badge';
import { AssetCard } from './asset-card';

interface AssetsContainerProps {
  title: string;
  emptyMessage: string;
  assets: AssetSummary[];
  isLoading: boolean;
  onOpenAsset: (assetId: string) => void;
  showAssetLabel?: boolean;
  resolveAssetLabel?: (
    quest: DisplayNode | null,
    asset: AssetSummary
  ) => string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const assetsWithLabel = useMemo(
    () =>
      assets.map((asset) => ({
        asset,
        label: showAssetLabel
          ? resolveAssetLabel?.(quest, asset) || 'No labeled'
          : ''
      })),
    [assets, quest, resolveAssetLabel, showAssetLabel]
  );

  const filteredAssetsWithLabel = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return assetsWithLabel;
    }

    return assetsWithLabel.filter(({ asset, label }) => {
      const assetName = asset.name?.toLowerCase() || '';
      const assetLabel = label.toLowerCase();
      return assetName.includes(query) || assetLabel.includes(query);
    });
  }, [assetsWithLabel, searchQuery]);

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <Badge variant="secondary" className="rounded-md tabular-nums">
          {filteredAssetsWithLabel.length}
        </Badge>
      </div>
      <Input
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search Assets..."
        aria-label="Search assets"
        className="h-8 text-sm"
      />
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Spinner className="text-primary h-5 w-5" />
        </div>
      ) : filteredAssetsWithLabel.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          {filteredAssetsWithLabel.map(({ asset, label }, index) => {
            const resolved = label;
            const previousResolved =
              showAssetLabel && index > 0
                ? filteredAssetsWithLabel[index - 1].label
                : '';
            const shouldShowLabel =
              showAssetLabel && (index === 0 || resolved !== previousResolved);

            return (
              <div key={asset.id}>
                {shouldShowLabel && <AssetLabelBadge text={resolved} />}
                <AssetCard
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
