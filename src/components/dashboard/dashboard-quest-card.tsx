import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardQuestCardData = {
  name: string | null;
  totalSubquestsCreated: number;
  totalSubquestsCompleted: number;
  totalSubquestsExpected: number;
  totalAssets: number;
  creators: Array<{ id: string; name: string }>;
};

type DashboardQuestCardProps = {
  quest: DashboardQuestCardData;
  subquestLabel: string;
};

function toPercent(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

export function DashboardQuestCard({
  quest,
  subquestLabel
}: DashboardQuestCardProps) {
  const createdPercent = toPercent(
    quest.totalSubquestsCreated,
    quest.totalSubquestsExpected
  );
  const completedPercent = toPercent(
    quest.totalSubquestsCompleted,
    quest.totalSubquestsExpected
  );
  const creatorsLabel =
    quest.creators.length > 0
      ? quest.creators.map((creator) => creator.name).join(', ')
      : 'No creators';

  return (
    <div className="w-full pr-2 space-y-4 rounded-md bg-card p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-lg font-semibold leading-snug md:text-xl">
            {quest.name || 'Untitled quest'}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{creatorsLabel}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Assets
          </p>
          <p className="text-base font-semibold tabular-nums text-foreground">
            {quest.totalAssets}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">{subquestLabel} progress</span>
          <span className="tabular-nums">
            <span className="font-semibold">{completedPercent}%</span>
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted relative">
          <div
            className="h-full rounded-full bg-primary/40 transition-all duration-500"
            style={{ width: `${createdPercent}%` }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${completedPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p className="tabular-nums text-muted-foreground">
            Started:{' '}
            <span className="font-semibold ">
              {quest.totalSubquestsCreated}
            </span>
            <span className="text-muted-foreground">
              /{quest.totalSubquestsExpected}
            </span>
          </p>
          <p
            className={cn(
              'tabular-nums text-right',
              completedPercent === 100
                ? 'text-green-600 dark:text-green-400'
                : 'text-muted-foreground'
            )}
          >
            Completed:{' '}
            <span className="font-semibold">
              {quest.totalSubquestsCompleted}
            </span>
            <span className="text-muted-foreground">
              /{quest.totalSubquestsExpected}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
