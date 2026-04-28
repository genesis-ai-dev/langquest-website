'use client';

import { useEffect, useState } from 'react';
import {
  DonutChart,
  type DonutChartEventProps
} from '@/components/dashboard/charts/donut-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AvailableChartColorsKeys } from '@/lib/chartUtils';
import { cn } from '@/lib/utils';

export type DonutChartColors = AvailableChartColorsKeys;

export const donutNumberFormatter = (value: number) =>
  Intl.NumberFormat('en-US').format(value).toString();

export type DonutSummaryItem = {
  name: string;
  total: string;
  colorClassName: string;
};

export type DonutDataPoint = Record<string, string | number>;

export type DonutChartTab = {
  name: string;
  data: DonutDataPoint[];
  category: string;
  value: string;
  colors?: DonutChartColors[];
  variant?: 'donut' | 'pie';
  valueFormatter?: (value: number) => string;
  label?: string;
  showLabel?: boolean;
  showTooltip?: boolean;
  summary?: DonutSummaryItem[];
};

export type DonutValueSelectPayload = {
  tab: string;
  value: DonutChartEventProps;
};

type DonutChartWithTabsProps = {
  tabs: DonutChartTab[];
  defaultTab?: string;
  className?: string;
  onValueSelect?: (payload: DonutValueSelectPayload) => void;
};

export default function DonutChartWithTabs({
  tabs,
  defaultTab,
  className,
  onValueSelect
}: DonutChartWithTabsProps) {
  const renderedTabs = tabs.slice(0, 5);
  const currentDefaultTab = defaultTab ?? renderedTabs[0]?.name;
  const [activeTab, setActiveTab] = useState<string | undefined>(
    currentDefaultTab
  );

  if (!renderedTabs.length) {
    return null;
  }

  useEffect(() => {
    if (!activeTab || !renderedTabs.some((tab) => tab.name === activeTab)) {
      setActiveTab(currentDefaultTab);
    }
  }, [activeTab, currentDefaultTab, renderedTabs]);

  return (
    <div className={cn('p-0', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mx-4" variant="line">
          {renderedTabs.map((tab) => (
            <TabsTrigger key={tab.name} value={tab.name}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {renderedTabs.map((tab) => (
          <TabsContent key={tab.name} value={tab.name} className="mt-0 p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="mx-auto h-56 w-40 md:mx-0">
                <DonutChart
                  data={tab.data}
                  category={tab.category}
                  value={tab.value}
                  colors={tab.colors}
                  variant={tab.variant}
                  valueFormatter={tab.valueFormatter}
                  label={tab.label}
                  showLabel={tab.showLabel}
                  showTooltip={tab.showTooltip}
                  className="h-full w-full"
                  onValueChange={(value) => {
                    onValueSelect?.({ tab: tab.name, value });
                  }}
                />
              </div>

              {tab.summary?.length ? (
                <ul
                  role="list"
                  className="flex flex-col flex-wrap items-start gap-x-8 gap-y-2 md:justify-start"
                >
                  {tab.summary.map((item) => (
                    <li key={item.name}>
                      <div className="flex items-center space-x-2">
                        <span
                          className={cn(
                            item.colorClassName,
                            'size-2 shrink-0 rounded-sm'
                          )}
                          aria-hidden={true}
                        />
                        <p className="font-semibold">{item.total}</p>
                      </div>
                      <p className="max-w-24 text-xs text-muted-foreground truncate text-ellipsis">
                        {item.name}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
