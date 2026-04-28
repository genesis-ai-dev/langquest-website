import { AudioLines, FileText, Image, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardSubquestCardData = {
  name: string | null;
  creator_id: string[];
  ItemsExpected: number;
  ItemsCompleted: number;
  TotalAssets: number;
  TotalImages: number;
  TotalText: number;
  TotalAudio: number;
};

type DashboardSubquestCardProps = {
  subquest: DashboardSubquestCardData;
};

function toPercent(completed: number, expected: number) {
  if (expected <= 0) return 0;
  return Math.min(100, Math.round((completed / expected) * 100));
}

export function DashboardSubquestCard({ subquest }: DashboardSubquestCardProps) {
  const creatorsLabel =
    subquest.creator_id.length > 0
      ? subquest.creator_id.join(', ')
      : 'No creators';
  const progressPercent = toPercent(
    subquest.ItemsCompleted,
    subquest.ItemsExpected
  );

  return (
    <div className="space-y-3 border-b border-border/60 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-tight">
            {subquest.name || 'Untitled subquest'}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{creatorsLabel}</span>
          </div>
        </div>

        <div className="shrink-0 text-right space-y-1">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Assets
            </p>
            <p className="text-base font-semibold tabular-nums text-foreground">
              {subquest.TotalAssets}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {subquest.TotalText}
            </span>
            <span className="inline-flex items-center gap-1">
              <AudioLines className="h-3 w-3" />
              {subquest.TotalAudio}
            </span>
            <span className="inline-flex items-center gap-1">
              <Image className="h-3 w-3" />
              {subquest.TotalImages}
            </span>
          </div>
        </div>
      </div>

      {subquest.ItemsExpected > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span>Progress</span>
            <span>
              <span
                className={cn(
                  'font-semibold',
                  progressPercent === 100
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-foreground'
                )}
              >
                {subquest.ItemsCompleted}
              </span>
              <span>/ {subquest.ItemsExpected}</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progressPercent === 100
                  ? 'bg-green-500 dark:bg-green-400'
                  : 'bg-primary'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
