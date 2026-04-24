'use client';

import React from 'react';

import { AreaChart } from '@/components/dashboard/area-chart';

const chartData = [
  {
    date: 'Apr 06',
    Assets: 29,
    Quests: 3
  },
  {
    date: 'Apr 07',
    Assets: 28,
    Quests: 3
  },
  {
    date: 'Apr 08',
    Assets: 33,
    Quests: 3
  },
  {
    date: 'Apr 09',
    Assets: 35,
    Quests: 4
  },
  {
    date: 'Apr 10',
    Assets: 35,
    Quests: 3
  },
  {
    date: 'Apr 11',
    Assets: 31,
    Quests: 3
  },
  {
    date: 'Apr 12',
    Assets: 35,
    Quests: 4
  },
  {
    date: 'Apr 13',
    Assets: 29,
    Quests: 3
  },
  {
    date: 'Apr 14',
    Assets: 26,
    Quests: 3
  },
  {
    date: 'Apr 15',
    Assets: 28,
    Quests: 3
  },
  {
    date: 'Apr 16',
    Assets: 30,
    Quests: 3
  },
  {
    date: 'Apr 17',
    Assets: 32,
    Quests: 3
  },
  {
    date: 'Apr 18',
    Assets: 31,
    Quests: 3
  },
  {
    date: 'Apr 19',
    Assets: 32,
    Quests: 3
  }
];

export const AreaChartTypeExample = () => {
  const types: Array<'default' | 'stacked' | 'percent'> = [
    'default',
    'stacked',
    'percent'
  ];

  return (
    <div className="min-h-[300px]">
      {/* {types.map((type, index) => ( */}
      <div className="h-[320px] p-4 md:h-[360px]">
        {/* <p className="mx-auto font-mono text-sm font-medium">type="{type}"</p> */}
        <AreaChart
          // key={index}
          // type={type}
          type="default"
          className="h-full"
          data={chartData}
          index="date"
          colors={['violet', 'emerald']}
          categories={['Assets', 'Quests']}
          //   xAxisLabel="Day"
          //   yAxisLabel="Volume"
          showLegend={true}
          //   tooltipCallback={({ active, payload, label }) => {
          //     if (active && payload?.length) {
          //       console.log('Hover em:', label, payload);
          //     }
          //   }}
          onValueChange={(v) => console.log(v)}
        />
      </div>
      {/* ))} */}
    </div>
  );
};
