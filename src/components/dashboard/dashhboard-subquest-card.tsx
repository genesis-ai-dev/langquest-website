type DashboardSubquestCardData = {
  name: string | null;
  TotalAssets: number;
  TotalImages: number;
  TotalText: number;
  TotalAudio: number;
};

type DashboardSubquestCardProps = {
  subquest: DashboardSubquestCardData;
};

export function DashboardSubquestCard({ subquest }: DashboardSubquestCardProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/60 py-2 last:border-b-0">
      <p className="text-sm font-medium min-w-[180px]">
        {subquest.name || 'Untitled subquest'}
      </p>
      <p className="text-xs text-muted-foreground">Assets: {subquest.TotalAssets}</p>
      <p className="text-xs text-muted-foreground">Images: {subquest.TotalImages}</p>
      <p className="text-xs text-muted-foreground">Text: {subquest.TotalText}</p>
      <p className="text-xs text-muted-foreground">Audio: {subquest.TotalAudio}</p>
    </div>
  );
}
