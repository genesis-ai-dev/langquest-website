import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardQuestCardData = {
  name: string | null;
  TotalSubquestsCompleted: number;
  TotalSubquestsExpected: number;
  TotalAssets: number;
  Creators: string[];
  subquests: Array<{
    TotalImages: number;
    TotalText: number;
    TotalAudio: number;
  }>;
};

type DashboardQuestCardProps = {
  quest: DashboardQuestCardData;
  subquestLabel: string;
};

function toPercent(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

export function DashboardQuestCard({ quest, subquestLabel }: DashboardQuestCardProps) {
  const percent = toPercent(quest.TotalSubquestsCompleted, quest.TotalSubquestsExpected);
  const totalImages = quest.subquests.reduce((s, q) => s + q.TotalImages, 0);
  const totalText = quest.subquests.reduce((s, q) => s + q.TotalText, 0);
  const totalAudio = quest.subquests.reduce((s, q) => s + q.TotalAudio, 0);
  const creatorsLabel =
    quest.Creators.length > 0 ? quest.Creators.join(', ') : 'No creators';

  const steps = [
    { label: 'text', value: totalText },
    { label: 'img', value: totalImages },
    { label: 'audio', value: totalAudio }
  ];

  return (
    <div className="w-full pr-2 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-base font-semibold leading-snug">
            {quest.name || 'Untitled quest'}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{creatorsLabel}</span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1 text-right">
          <span className="text-2xl font-bold tabular-nums leading-none text-foreground">
            {quest.TotalAssets}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            assets
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {steps.map(({ label, value }) => (
          <span
            key={label}
            className="rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums"
          >
            {value} {label}
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">{subquestLabel}</span>
          <span className="tabular-nums">
            <span
              className={cn(
                'font-semibold',
                percent === 100 ? 'text-green-600 dark:text-green-400' : 'text-foreground'
              )}
            >
              {quest.TotalSubquestsCompleted}
            </span>
            <span className="text-muted-foreground">/{quest.TotalSubquestsExpected}</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              percent === 100
                ? 'bg-green-500 dark:bg-green-400'
                : 'bg-primary'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
