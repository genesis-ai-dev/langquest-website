'use client';

import { useEffect, useMemo, useState } from 'react';
import CombinedChart, {
  type AreaChartTab,
  type CombinedChartDataPoint,
  type DonutChartTab,
  shortDateXAxisTickFormatter
} from '@/components/dashboard/charts/combined-chart';
import { Spinner } from '@/components/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

type BreakdownItem = {
  id: number | string;
  name: string;
  qty: number;
};

type DashboardChartRecord = {
  date: string;
  quests: number;
  assets: number;
  details: {
    quests: {
      project: BreakdownItem[];
      member: BreakdownItem[];
    };
    assets: {
      project: BreakdownItem[];
      member: BreakdownItem[];
    };
  };
};

type DashboardChartResponse = {
  mocked: boolean;
  range_days: number;
  data: DashboardChartRecord[];
};

type OverviewChartContainerProps = {
  accessToken?: string;
  pieItemLimit?: number;
};

const sortBreakdownItems = (items: BreakdownItem[]) =>
  [...items].sort((a, b) => b.qty - a.qty);

const mergeBreakdownItems = (
  accumulator: Map<string, BreakdownItem>,
  items: BreakdownItem[]
) => {
  items.forEach((item) => {
    const key = String(item.id);
    const previous = accumulator.get(key);
    accumulator.set(key, {
      id: item.id,
      name: item.name,
      qty: (previous?.qty ?? 0) + item.qty
    });
  });
};

export default function OverviewChartContainer({
  accessToken,
  pieItemLimit
}: OverviewChartContainerProps) {
  const [dashboardChartData, setDashboardChartData] = useState<
    DashboardChartRecord[]
  >([]);
  const [isChartFetching, setIsChartFetching] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    async function fetchChartData() {
      try {
        setIsChartFetching(true);
        setChartError(null);

        const response = await fetch('/api/dashboard/chart', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(errorPayload?.error || 'Failed to load chart data');
        }

        const payload = (await response.json()) as DashboardChartResponse;
        if (!cancelled) {
          // intermediate state that can be reused before applying chart transforms
          setDashboardChartData(payload.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setChartError(
            err instanceof Error ? err.message : 'Failed to load chart data'
          );
          setDashboardChartData([]);
        }
      } finally {
        if (!cancelled) {
          setIsChartFetching(false);
        }
      }
    }

    void fetchChartData();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const combinedSeriesData = useMemo<CombinedChartDataPoint[]>(() => {
    let cumulativeQuests = 0;
    let cumulativeAssets = 0;

    const cumulativeDetails = {
      quests: {
        project: new Map<string, BreakdownItem>(),
        member: new Map<string, BreakdownItem>()
      },
      assets: {
        project: new Map<string, BreakdownItem>(),
        member: new Map<string, BreakdownItem>()
      }
    };

    return dashboardChartData.map((item) => {
      cumulativeQuests += item.quests;
      cumulativeAssets += item.assets;

      mergeBreakdownItems(
        cumulativeDetails.quests.project,
        item.details.quests.project
      );
      mergeBreakdownItems(
        cumulativeDetails.quests.member,
        item.details.quests.member
      );
      mergeBreakdownItems(
        cumulativeDetails.assets.project,
        item.details.assets.project
      );
      mergeBreakdownItems(
        cumulativeDetails.assets.member,
        item.details.assets.member
      );

      return {
        date: item.date,
        questsDaily: item.quests,
        assetsDaily: item.assets,
        questsCumulative: cumulativeQuests,
        assetsCumulative: cumulativeAssets,
        details: {
          byDate: {
            quests: {
              project: sortBreakdownItems(item.details.quests.project),
              member: sortBreakdownItems(item.details.quests.member)
            },
            assets: {
              project: sortBreakdownItems(item.details.assets.project),
              member: sortBreakdownItems(item.details.assets.member)
            }
          },
          cumulative: {
            quests: {
              project: sortBreakdownItems([
                ...cumulativeDetails.quests.project.values()
              ]),
              member: sortBreakdownItems([
                ...cumulativeDetails.quests.member.values()
              ])
            },
            assets: {
              project: sortBreakdownItems([
                ...cumulativeDetails.assets.project.values()
              ]),
              member: sortBreakdownItems([
                ...cumulativeDetails.assets.member.values()
              ])
            }
          }
        }
      };
    });
  }, [dashboardChartData]);

  const chartNumberFormatter = (value: number) =>
    Intl.NumberFormat('en-US').format(value).toString();

  const areaTabs = useMemo<AreaChartTab[]>(() => {
    const totalAssetsDaily = dashboardChartData.reduce(
      (acc, item) => acc + Number(item.assets ?? 0),
      0
    );
    const totalQuestsDaily = dashboardChartData.reduce(
      (acc, item) => acc + Number(item.quests ?? 0),
      0
    );
    const lastPoint = combinedSeriesData.at(-1);
    const totalAssetsCumulative = Number(lastPoint?.assetsCumulative ?? 0);
    const totalQuestsCumulative = Number(lastPoint?.questsCumulative ?? 0);

    return [
      {
        name: 'By Date',
        detailSource: 'byDate',
        index: 'date',
        categories: ['assetsDaily', 'questsDaily'],
        categoryLabels: {
          assetsDaily: 'Assets',
          questsDaily: 'Quests'
        } as Record<string, string>,
        colors: ['violet', 'emerald'],
        valueFormatter: chartNumberFormatter,
        summary: [
          {
            name: 'Assets',
            total: chartNumberFormatter(totalAssetsDaily),
            colorClassName: 'bg-violet-500'
          },
          {
            name: 'Quests',
            total: chartNumberFormatter(totalQuestsDaily),
            colorClassName: 'bg-emerald-500'
          }
        ]
      },
      {
        name: 'Cumulative',
        detailSource: 'cumulative',
        index: 'date',
        categories: ['assetsCumulative', 'questsCumulative'],
        categoryLabels: {
          assetsCumulative: 'Assets',
          questsCumulative: 'Quests'
        } as Record<string, string>,
        colors: ['violet', 'emerald'],
        valueFormatter: chartNumberFormatter,
        summary: [
          {
            name: 'Assets',
            total: chartNumberFormatter(totalAssetsCumulative),
            colorClassName: 'bg-violet-500'
          },
          {
            name: 'Quests',
            total: chartNumberFormatter(totalQuestsCumulative),
            colorClassName: 'bg-emerald-500'
          }
        ]
      }
    ];
  }, [combinedSeriesData, dashboardChartData]);

  const donutTabs = useMemo<DonutChartTab[]>(
    () => [
      {
        name: 'By Project',
        detailGroup: 'project',
        colors: [
          'blue',
          'cyan',
          'amber',
          'pink',
          'gray',
          'fuchsia',
          'lime',
          'emerald',
          'violet'
        ],
        detailKeyLabel: {
          assets: 'Assets by project',
          quests: 'Quests by project'
        },
        showLabel: true,
        showTooltip: true
      },
      {
        name: 'By Member',
        detailGroup: 'member',
        colors: [
          'blue',
          'cyan',
          'amber',
          'pink',
          'gray',
          'fuchsia',
          'lime',
          'emerald',
          'violet'
        ],
        detailKeyLabel: {
          assets: 'Assets by member',
          quests: 'Quests by member'
        },
        showLabel: true,
        showTooltip: true
      }
    ],
    []
  );

  return (
    <section>
      <Card className="border-primary/20 shadow-sm flex flex-col">
        <CardHeader>
          <CardTitle className="uppercase tracking-wide">
            Asset And Quest Trend
          </CardTitle>
          <CardDescription>
            Daily evolution of created assets and completed quests.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-[360px]">
          {isChartFetching ? (
            <div className="h-[320px] flex items-center justify-center">
              <Spinner className="h-5 w-5 text-foreground" />
            </div>
          ) : chartError ? (
            <p className="text-sm text-destructive">{chartError}</p>
          ) : (
            <CombinedChart
              data={combinedSeriesData}
              areaTabs={areaTabs}
              donutTabs={donutTabs}
              pieItemLimit={pieItemLimit}
              xAxisTickFormatter={shortDateXAxisTickFormatter}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
