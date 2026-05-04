import { AudioLines, FileText, Image, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardSubquestCardData = {
  name: string | null;
  creators: Array<{ id: string; name: string }>;
  itemsExpected: number;
  itemsCompleted: number;
  totalAssets: number;
  totalImages: number;
  totalText: number;
  totalAudio: number;
};

type DashboardSubquestCardProps = {
  subquest: DashboardSubquestCardData;
};

function toPercent(completed: number, expected: number) {
  if (expected <= 0) return 0;
  return Math.min(100, Math.round((completed / expected) * 100));
}

export function DashboardSubquestCard({
  subquest
}: DashboardSubquestCardProps) {
  const allCreatorNames =
    subquest.creators.length > 0
      ? subquest.creators.map((c) => c.name).join(', ')
      : 'No creators';
  const visibleCreators =
    subquest.creators.length > 2
      ? subquest.creators
          .slice(0, 2)
          .map((c) => c.name)
          .join(', ') + '…'
      : allCreatorNames;
  const progressPercent = toPercent(
    subquest.itemsCompleted,
    subquest.itemsExpected
  );

  return (
    <div className="space-y-1.5 border-b border-border/60 py-2 last:border-b-0">
      {/* Linha 1: nome · creators · label "Assets" */}
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
          {subquest.name || 'Untitled subquest'}
        </p>
        <div
          className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground"
          title={allCreatorNames}
        >
          <UserRound className="h-3 w-3 shrink-0 text-primary" />
          <span>{visibleCreators}</span>
        </div>
        <span className="ml-2 shrink-0 text-xs tracking-wide text-muted-foreground">
          Assets:{' '}
          <span className="font-semibold text-foreground">
            {subquest.totalAssets}
          </span>
        </span>
      </div>

      {subquest.itemsExpected > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex basis-[75%] flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>Progress</span>
              <span>
                <span className={cn('font-semibold', 'text-foreground')}>
                  {subquest.itemsCompleted}
                </span>
                <span>/{subquest.itemsExpected}</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  'bg-primary'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex basis-[25%] items-center justify-end gap-1.5 text-[11px] tabular-nums text-muted-foreground">
            <span
              className="inline-flex items-center gap-0.5"
              title={`Text: ${subquest.totalText}`}
            >
              <FileText className="h-3 w-3" />
              {subquest.totalText}
            </span>
            <span
              className="inline-flex items-center gap-0.5"
              title={`Audio: ${subquest.totalAudio}`}
            >
              <AudioLines className="h-3 w-3" />
              {subquest.totalAudio}
            </span>
            <span
              className="inline-flex items-center gap-0.5"
              title={`Images: ${subquest.totalImages}`}
            >
              <Image className="h-3 w-3" />
              {subquest.totalImages}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
