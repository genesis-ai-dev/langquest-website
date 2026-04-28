'use client';

import AreaChartWithTabs, {
  type ChartDataPoint,
  type ChartTab,
  numberFormatter
} from '@/components/dashboard/charts/area-chart-with-tabs';
import DonutChartWithTabs, {
  type DonutChartTab
} from '@/components/dashboard/charts/donut-chart-with-tabs';

const TOTAL_DAYS = 45;
const startDate = new Date('2026-02-01T00:00:00Z');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  timeZone: 'UTC'
});

const chartData: ChartDataPoint[] = Array.from(
  { length: TOTAL_DAYS },
  (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setUTCDate(startDate.getUTCDate() + index);

    const questsCreated = 1 + ((index * 3) % 6);
    const assetsCreated = 10 + ((index * 5) % 18);
    const completedQuests = Math.max(
      0,
      questsCreated - (index % 3 === 0 ? 1 : 0)
    );
    const reviewedAssets = Math.max(
      0,
      assetsCreated - (index % 4 === 0 ? 3 : 1)
    );

    return {
      date: dateFormatter.format(currentDate),
      QuestsCreated: questsCreated,
      AssetsCreated: assetsCreated,
      QuestsCompleted: completedQuests,
      AssetsReviewed: reviewedAssets
    };
  }
);

const sumOf = (data: ChartDataPoint[], key: string) =>
  data.reduce((acc, item) => acc + Number(item[key] ?? 0), 0);

const tabs: ChartTab[] = [
  {
    name: 'Production',
    data: chartData,
    index: 'date',
    categories: ['AssetsCreated', 'QuestsCreated'],
    colors: ['violet', 'emerald'],
    valueFormatter: numberFormatter,
    summary: [
      {
        name: 'Assets created',
        total: numberFormatter(sumOf(chartData, 'AssetsCreated')),
        colorClassName: 'bg-violet-500'
      },
      {
        name: 'Quests created',
        total: numberFormatter(sumOf(chartData, 'QuestsCreated')),
        colorClassName: 'bg-emerald-500'
      }
    ]
  },
  {
    name: 'Completion',
    data: chartData,
    index: 'date',
    categories: ['AssetsReviewed', 'QuestsCompleted'],
    colors: ['cyan', 'amber'],
    valueFormatter: numberFormatter,
    summary: [
      {
        name: 'Assets reviewed',
        total: numberFormatter(sumOf(chartData, 'AssetsReviewed')),
        colorClassName: 'bg-cyan-500'
      },
      {
        name: 'Quests completed',
        total: numberFormatter(sumOf(chartData, 'QuestsCompleted')),
        colorClassName: 'bg-amber-500'
      }
    ]
  }
];

const donutTabs: DonutChartTab[] = [
  {
    name: 'Assets',
    category: 'name',
    value: 'value',
    data: [
      { name: 'Text', value: 420 },
      { name: 'Image', value: 280 },
      { name: 'Audio', value: 190 }
    ],
    colors: ['violet', 'cyan', 'amber'],
    showLabel: true,
    showTooltip: true,
    label: numberFormatter(420 + 280 + 190),
    summary: [
      {
        name: 'Text',
        total: numberFormatter(420),
        colorClassName: 'bg-violet-500'
      },
      {
        name: 'Image',
        total: numberFormatter(280),
        colorClassName: 'bg-cyan-500'
      },
      {
        name: 'Audio',
        total: numberFormatter(190),
        colorClassName: 'bg-amber-500'
      }
    ]
  },
  {
    name: 'Quests',
    category: 'name',
    value: 'value',
    data: [
      { name: 'Completed', value: 196 },
      { name: 'In progress', value: 84 },
      { name: 'Pending', value: 47 }
    ],
    colors: ['emerald', 'blue', 'gray'],
    showLabel: true,
    showTooltip: true,
    label: numberFormatter(196 + 84 + 47),
    summary: [
      {
        name: 'Completed',
        total: numberFormatter(196),
        colorClassName: 'bg-emerald-500'
      },
      {
        name: 'In progress',
        total: numberFormatter(84),
        colorClassName: 'bg-blue-500'
      },
      {
        name: 'Pending',
        total: numberFormatter(47),
        colorClassName: 'bg-gray-500'
      }
    ]
  }
];

export default function ChartExample() {
  return (
    <div className="grid w-full gap-6 lg:grid-cols-10">
      <div className="lg:col-span-7">
        <AreaChartWithTabs
          tabs={tabs}
          onValueSelect={(payload) => {
            console.log('Area chart value selected:', payload);
          }}
        />
      </div>
      <div className="lg:col-span-3">
        <DonutChartWithTabs
          tabs={donutTabs}
          onValueSelect={(payload) => {
            console.log('Donut chart value selected:', payload);
          }}
        />
      </div>
    </div>
  );
}
