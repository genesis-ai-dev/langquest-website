'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  type AreaChartEventProps,
  type TooltipProps as AreaTooltipProps
} from '@/components/dashboard/charts/area-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getColorClassName,
  type AvailableChartColorsKeys
} from '@/lib/chartUtils';
import { cn } from '@/lib/utils';

export type ChartColors = AvailableChartColorsKeys;

export const numberFormatter = (value: number) =>
  Intl.NumberFormat('en-US').format(value).toString();

export const minutesFormatter = (seconds: number) => {
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${minutes}m`;
};

export type ChartSummaryItem = {
  name: string;
  total: string;
  colorClassName: string;
};

export type ChartDataPoint = Record<string, string | number>;

export type ChartTab = {
  name: string;
  data: ChartDataPoint[];
  index: string;
  categories: string[];
  categoryLabels?: Record<string, string>;
  colors: ChartColors[];
  valueFormatter?: (value: number) => string;
  xAxisTickFormatter?: ((value: string | number) => string) | null;
  yAxisTickFormatter?: ((value: number) => string) | null;
  summary?: ChartSummaryItem[];
};

export type ChartValueSelectPayload = {
  tab: string;
  value: AreaChartEventProps;
};

type AreaChartWithTabsProps = {
  tabs: ChartTab[];
  defaultTab?: string;
  className?: string;
  showLegend?: boolean;
  onTabChange?: (tabName: string) => void;
  onValueSelect?: (payload: ChartValueSelectPayload) => void;
};

export default function AreaChartWithTabs({
  tabs,
  defaultTab,
  className,
  showLegend = false,
  onTabChange,
  onValueSelect
}: AreaChartWithTabsProps) {
  const renderedTabs = tabs.slice(0, 5);
  const currentDefaultTab = defaultTab ?? renderedTabs[0]?.name;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsMobile(media.matches);

    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  if (!renderedTabs.length) {
    return null;
  }

  return (
    <div className={cn('p-0', className)}>
      <Tabs defaultValue={currentDefaultTab} onValueChange={onTabChange}>
        <TabsList className="mx-4" variant="line">
          {renderedTabs.map((tab) => (
            <TabsTrigger key={tab.name} value={tab.name}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {renderedTabs.map((tab) => (
          <TabsContent key={tab.name} value={tab.name} className="mt-0 p-6">
            {/* {tab.summary?.length ? (
              <div className="md:flex md:items-start md:justify-between">
                <ul
                  role="list"
                  className="flex flex-wrap items-center gap-x-10 gap-y-4"
                >
                  {tab.summary.map((item) => (
                    <li key={item.name}>
                      <div className="flex items-center space-x-2">
                        <span
                          className={cn(
                            item.colorClassName,
                            'size-3 shrink-0 rounded-sm'
                          )}
                          aria-hidden={true}
                        />
                        <p className="font-semibold">{item.total}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.name}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null} */}

            <div
              className={cn(
                // tab.summary?.length ? 'mt-10' : 'mt-2',
                'mt-0 h-60 w-full'
              )}
            >
              <AreaChart
                data={tab.data}
                index={tab.index}
                categories={tab.categories}
                categoryLabels={tab.categoryLabels}
                colors={tab.colors}
                showLegend={showLegend}
                yAxisWidth={45}
                showYAxis={!isMobile}
                startEndOnly={isMobile}
                valueFormatter={tab.valueFormatter}
                xAxisTickFormatter={tab.xAxisTickFormatter}
                yAxisTickFormatter={tab.yAxisTickFormatter}
                className="h-full w-full"
                customTooltip={(props) => (
                  <AreaTooltipRenderer
                    {...props}
                    categoryLabels={tab.categoryLabels}
                    valueFormatter={tab.valueFormatter}
                  />
                )}
                onValueChange={(value) => {
                  onValueSelect?.({ tab: tab.name, value });
                }}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function AreaTooltipRenderer({
  active,
  payload,
  label,
  categoryLabels,
  valueFormatter
}: Partial<AreaTooltipProps> & {
  categoryLabels?: Record<string, string>;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  const formatValue = valueFormatter ?? numberFormatter;

  return (
    <div className="rounded-md border border-gray-200 bg-white text-sm shadow-md dark:border-gray-800 dark:bg-gray-950 ">
      {label ? (
        <div className="border-b border-inherit px-4 py-2 z-100 bg-white">
          <p className="font-medium text-gray-900 dark:text-gray-50">{label}</p>
        </div>
      ) : null}
      <div className="space-y-1 px-4 py-2">
        {payload.map((item, index) => {
          const displayName = categoryLabels?.[item.category] ?? item.category;
          return (
            <div
              key={`tooltip-item-${index}`}
              className="flex items-center justify-between space-x-8"
            >
              <div className="flex items-center space-x-2">
                <span
                  aria-hidden={true}
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    getColorClassName(item.color, 'bg')
                  )}
                />
                <p className="text-gray-700 dark:text-gray-300">
                  {displayName}
                </p>
              </div>
              <p className="font-medium tabular-nums text-gray-900 dark:text-gray-50">
                {formatValue(item.value)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
