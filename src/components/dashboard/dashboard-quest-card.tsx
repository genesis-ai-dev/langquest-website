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
  const allCreatorNames =
    quest.creators.length > 0
      ? quest.creators.map((c) => c.name).join(', ')
      : 'No creators';
  const visibleCreators =
    quest.creators.length > 2
      ? quest.creators
          .slice(0, 2)
          .map((c) => c.name)
          .join(', ') + '…'
      : allCreatorNames;

  return (
    <div className="w-full rounded-md bg-card px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
          {quest.name || 'Untitled quest'}
        </p>
        <div
          className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground"
          title={allCreatorNames}
        >
          <UserRound className="h-3 w-3 shrink-0 text-primary" />
          <span>{visibleCreators}</span>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground ml-2">
          Assets:{' '}
          <span className="font-semibold text-foreground">
            {quest.totalAssets}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-medium">{subquestLabel} progress</span>
        <span className="tabular-nums font-semibold">{completedPercent}%</span>
      </div>

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/40 transition-all duration-500"
          style={{ width: `${createdPercent}%` }}
        />
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${completedPercent}%` }}
        />
      </div>

      {/* Linha 4: started · completed */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <p className="tabular-nums">
          Started:{' '}
          <span className="font-semibold">{quest.totalSubquestsCreated}</span>
          <span>/{quest.totalSubquestsExpected}</span>
        </p>
        <p
          className={cn(
            'tabular-nums',
            completedPercent === 100
              ? 'text-green-600 dark:text-green-400'
              : 'text-muted-foreground'
          )}
        >
          Completed:{' '}
          <span className="font-semibold">{quest.totalSubquestsCompleted}</span>
          <span className="text-muted-foreground">
            /{quest.totalSubquestsExpected}
          </span>
        </p>
      </div>
    </div>
  );
}
