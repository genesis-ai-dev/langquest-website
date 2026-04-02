'use client';

import { AssetSummary } from '@/app/db/questExplorer';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Image as ImageIcon, Languages, Volume2 } from 'lucide-react';

interface AssetCardProps {
  asset: AssetSummary;
  onClick?: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  const hasText = !!asset.content?.some((item) => item.text?.trim());
  const hasImage = !!asset.images?.length;
  const hasAudio = !!asset.content?.some((item) => !!item.audio);
  const translationCount = asset.translations?.[0]?.count ?? 0;
  const preview =
    asset.content?.find((item) => item.text?.trim())?.text?.trim() ?? '';
  const tagPreview =
    asset.tags?.slice(0, 3).map((t) => `${t.tag.key}:${t.tag.value}`) ?? [];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group h-[88px] min-h-[88px] max-h-[88px] w-full text-left rounded-lg border border-border/60',
        'hover:border-primary/40 hover:bg-accent/30 transition-all duration-150',
        'flex flex-row items-stretch gap-0 overflow-hidden'
      )}
    >
      {/* Left: type icon column */}
      <div className="flex shrink-0 w-12 self-stretch items-center justify-center border-r border-border/60 bg-muted/40 group-hover:bg-primary/5 transition-colors">
        {hasImage ? (
          <ImageIcon className="h-5 w-5 text-primary/60" />
        ) : hasAudio ? (
          <Volume2 className="h-5 w-5 text-primary/60" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground/60" />
        )}
      </div>

      {/* Center: main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 justify-between overflow-hidden px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium leading-tight">
            {asset.name || 'Untitled asset'}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {new Date(asset.created_at).toLocaleDateString()}
          </span>
        </div>

        <p className="line-clamp-1 min-h-4 text-xs text-muted-foreground">
          {preview || '\u00A0'}
        </p>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap gap-1">
            {hasText && (
              <Badge
                variant="secondary"
                className="h-4 gap-0.5 rounded px-1 text-[10px] font-normal"
              >
                <FileText className="h-2.5 w-2.5" />
                Text
              </Badge>
            )}
            {hasImage && (
              <Badge
                variant="secondary"
                className="h-4 gap-0.5 rounded px-1 text-[10px] font-normal"
              >
                <ImageIcon className="h-2.5 w-2.5" />
                Image
              </Badge>
            )}
            {hasAudio && (
              <Badge
                variant="secondary"
                className="h-4 gap-0.5 rounded px-1 text-[10px] font-normal"
              >
                <Volume2 className="h-2.5 w-2.5" />
                Audio
              </Badge>
            )}
          </div>
          {tagPreview.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1">
              {tagPreview.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="h-4 max-w-[120px] truncate rounded px-1 text-[10px] font-normal"
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: translations counter */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 self-stretch border-l border-border/60 bg-muted/20 px-3 text-muted-foreground group-hover:bg-primary/5 transition-colors">
        <Languages className="h-3.5 w-3.5" />
        <span className="text-[11px] tabular-nums font-medium">
          {translationCount}
        </span>
      </div>
    </button>
  );
}
