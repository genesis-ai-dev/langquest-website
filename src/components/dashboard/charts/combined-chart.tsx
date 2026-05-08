'use client';

import { useEffect, useMemo, useState } from 'react';
import AreaChartWithTabs, {
  type ChartDataPoint,
  type ChartTab,
  type ChartValueSelectPayload
} from '@/components/dashboard/charts/area-chart-with-tabs';
import DonutChartWithTabs, {
  donutNumberFormatter,
  type DonutChartColors,
  type DonutChartTab as BaseDonutChartTab,
  type DonutValueSelectPayload
} from '@/components/dashboard/charts/donut-chart-with-tabs';
import { AvailableChartColors, getColorClassName } from '@/lib/chartUtils';

type BreakdownItem = {
  id: number | string;
  name: string;
  qty: number;
};

type DetailMetrics = Record<
  string,
  {
    project?: BreakdownItem[];
    member?: BreakdownItem[];
  }
>;

export type CombinedChartDataPoint = {
  [key: string]: string | number | Record<string, DetailMetrics> | undefined;
  details?: Record<string, DetailMetrics>;
};

export type AreaChartTab = Omit<ChartTab, 'data'> & {
  detailSource?: string;
};

export type DonutChartTab = Omit<
  BaseDonutChartTab,
  'data' | 'category' | 'value' | 'summary' | 'label'
> & {
  detailKey?: string;
  detailGroup: 'project' | 'member';
  detailKeyLabel?: Partial<Record<'assets' | 'quests', string>>;
  summaryFormatter?: (value: number) => string;
  labelFormatter?: (total: number) => string;
};

export const shortDateXAxisTickFormatter = (value: string | number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit'
  }).format(date);
};

export const thousandYAxisTickFormatter = (value: number) =>
  Intl.NumberFormat('en-US').format(value);

type CombinedChartProps = {
  data: CombinedChartDataPoint[];
  areaTabs: AreaChartTab[];
  donutTabs: DonutChartTab[];
  pieItemLimit?: number;
  className?: string;
  defaultAreaTab?: string;
  defaultDonutTab?: string;
  onAreaValueSelect?: (payload: ChartValueSelectPayload) => void;
  onDonutValueSelect?: (payload: DonutValueSelectPayload) => void;
  xAxisTickFormatter?: ((value: string | number) => string) | null;
  yAxisTickFormatter?: ((value: number) => string) | null;
};

const getColorForIndex = (colors: DonutChartColors[] | undefined, index: number) =>
  (colors && colors.length ? colors[index % colors.length] : AvailableChartColors[index % AvailableChartColors.length]);

const OTHERS_ITEM_ID = '__others__';
const OTHERS_ITEM_NAME = 'Others';

const applyPieItemLimit = (
  items: BreakdownItem[],
  pieItemLimit: number | undefined
) => {
  if (!Number.isFinite(pieItemLimit)) return items;

  const normalizedLimit = Math.max(1, Math.trunc(pieItemLimit ?? 0));
  if (items.length <= normalizedLimit) return items;

  const headCount = Math.max(0, normalizedLimit - 1);
  const visibleItems = items.slice(0, headCount);
  const othersQty = items
    .slice(headCount)
    .reduce((acc, item) => acc + item.qty, 0);

  if (othersQty <= 0) return visibleItems;

  return [
    ...visibleItems,
    {
      id: OTHERS_ITEM_ID,
      name: OTHERS_ITEM_NAME,
      qty: othersQty
    }
  ];
};

export default function CombinedChart({
  data,
  areaTabs,
  donutTabs,
  pieItemLimit,
  className,
  defaultAreaTab,
  defaultDonutTab,
  onAreaValueSelect,
  onDonutValueSelect,
  xAxisTickFormatter,
  yAxisTickFormatter
}: CombinedChartProps) {
  const defaultAreaTabName = defaultAreaTab ?? areaTabs[0]?.name;
  const [activeAreaTabName, setActiveAreaTabName] = useState<string | undefined>(
    defaultAreaTabName
  );
  const [activeDonutDetailKey, setActiveDonutDetailKey] = useState<
    'assets' | 'quests'
  >(
    donutTabs[0]?.detailKey === 'quests' ? 'quests' : 'assets'
  );
  const [selectedPoint, setSelectedPoint] = useState<CombinedChartDataPoint | null>(
    data.at(-1) ?? null
  );

  useEffect(() => {
    setSelectedPoint(data.at(-1) ?? null);
  }, [data]);

  useEffect(() => {
    setActiveAreaTabName(defaultAreaTab ?? areaTabs[0]?.name);
  }, [areaTabs, defaultAreaTab]);

  const areaChartData = useMemo<ChartDataPoint[]>(
    () =>
      data.map((item) => {
        const { details, ...flatData } = item;
        return flatData as ChartDataPoint;
      }),
    [data]
  );

  const resolvedAreaTabs = useMemo<ChartTab[]>(
    () =>
      areaTabs.map((tab) => ({
        ...tab,
        data: areaChartData,
        xAxisTickFormatter:
          tab.xAxisTickFormatter !== undefined
            ? tab.xAxisTickFormatter
            : xAxisTickFormatter,
        yAxisTickFormatter:
          tab.yAxisTickFormatter !== undefined
            ? tab.yAxisTickFormatter
            : yAxisTickFormatter
      })),
    [areaTabs, areaChartData, xAxisTickFormatter, yAxisTickFormatter]
  );

  const resolvedDonutTabs = useMemo<BaseDonutChartTab[]>(
    () =>
      donutTabs.map((tab) => {
        const activeAreaTab = areaTabs.find((item) => item.name === activeAreaTabName);
        const detailSource = activeAreaTab?.detailSource ?? 'default';
        const rows =
          selectedPoint?.details?.[detailSource]?.[activeDonutDetailKey]?.[
            tab.detailGroup
          ] ?? [];
        const limitedRows = applyPieItemLimit(rows, pieItemLimit);
        const donutData = limitedRows.map((row) => ({
          id: row.id,
          name: row.name,
          value: row.qty
        }));
        const total = limitedRows.reduce((acc, row) => acc + row.qty, 0);

        const summary = limitedRows.map((row, index) => ({
          name: row.name,
          total: (tab.summaryFormatter ?? donutNumberFormatter)(row.qty),
          colorClassName: getColorClassName(getColorForIndex(tab.colors, index), 'bg')
        }));

        const defaultName = `${activeDonutDetailKey === 'assets' ? 'Assets' : 'Quests'} by ${
          tab.detailGroup === 'project' ? 'project' : 'member'
        }`;
        const tabName =
          tab.detailKeyLabel?.[activeDonutDetailKey] ??
          tab.name ??
          defaultName;

        return {
          name: tabName,
          data: donutData,
          category: 'name',
          value: 'value',
          colors: tab.colors,
          variant: tab.variant,
          valueFormatter: tab.valueFormatter,
          showLabel: tab.showLabel,
          showTooltip: tab.showTooltip,
          label: (tab.labelFormatter ?? donutNumberFormatter)(total),
          summary
        };
      }),
    [
      activeAreaTabName,
      activeDonutDetailKey,
      areaTabs,
      donutTabs,
      pieItemLimit,
      selectedPoint
    ]
  );

  const selectedDateLabel = useMemo(() => {
    const activeAreaTab = areaTabs.find((item) => item.name === activeAreaTabName);
    const indexKey = activeAreaTab?.index ?? 'date';
    const rawValue = selectedPoint?.[indexKey];

    if (typeof rawValue === 'string' || typeof rawValue === 'number') {
      return String(rawValue);
    }

    return undefined;
  }, [activeAreaTabName, areaTabs, selectedPoint]);

  const handleAreaValueSelect = (payload: ChartValueSelectPayload) => {
    setActiveAreaTabName(payload.tab);
    onAreaValueSelect?.(payload);

    const value = payload.value;
    if (!value) return;

    const categoryClicked = String(value.categoryClicked ?? '').toLowerCase();
    if (categoryClicked.includes('quest')) {
      setActiveDonutDetailKey('quests');
    } else if (categoryClicked.includes('asset')) {
      setActiveDonutDetailKey('assets');
    }

    if (value.eventType !== 'dot') return;

    const selectedByIndex = areaTabs.find((tab) => {
      const rawValue = value[tab.index];
      return typeof rawValue === 'string' || typeof rawValue === 'number';
    });

    if (!selectedByIndex) return;

    const targetValue = value[selectedByIndex.index];
    const next = data.find((item) => item[selectedByIndex.index] === targetValue);
    if (next) {
      setSelectedPoint(next);
    }
  };

  return (
    <div className={className ?? 'grid w-full gap-6 lg:grid-cols-10'}>
      <div className="lg:col-span-7">
        <AreaChartWithTabs
          tabs={resolvedAreaTabs}
          defaultTab={defaultAreaTab}
          showLegend={true}
          onTabChange={setActiveAreaTabName}
          onValueSelect={handleAreaValueSelect}
        />
      </div>
      <div className="lg:col-span-3">
        <DonutChartWithTabs
          tabs={resolvedDonutTabs}
          defaultTab={defaultDonutTab}
          selectedDateLabel={selectedDateLabel}
          onValueSelect={onDonutValueSelect}
        />
      </div>
    </div>
  );
}
