'use client';

import { AreaChart } from '@/components/dashboard/charts/area-chart';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const data = [
  {
    date: 'Aug 01',
    'Successful requests': 1040,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 02',
    'Successful requests': 1200,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 03',
    'Successful requests': 1130,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 04',
    'Successful requests': 1050,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 05',
    'Successful requests': 920,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 06',
    'Successful requests': 870,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 07',
    'Successful requests': 790,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 08',
    'Successful requests': 910,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 09',
    'Successful requests': 951,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 10',
    'Successful requests': 1232,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 11',
    'Successful requests': 1230,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 12',
    'Successful requests': 1289,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 13',
    'Successful requests': 1002,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 14',
    'Successful requests': 1034,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 15',
    'Successful requests': 1140,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 16',
    'Successful requests': 1280,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 17',
    'Successful requests': 1345,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 18',
    'Successful requests': 1432,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 19',
    'Successful requests': 1321,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 20',
    'Successful requests': 1230,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 21',
    'Successful requests': 1020,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 22',
    'Successful requests': 1040,
    Errors: 0,
    'Mean time to detect': 0,
    'Mean time to resolve': 0
  },
  {
    date: 'Aug 23',
    'Successful requests': 610,
    Errors: 81,
    'Mean time to detect': 1060,
    'Mean time to resolve': 2180
  },
  {
    date: 'Aug 24',
    'Successful requests': 610,
    Errors: 87,
    'Mean time to detect': 1460,
    'Mean time to resolve': 3140
  },
  {
    date: 'Aug 25',
    'Successful requests': 610,
    Errors: 92,
    'Mean time to detect': 2460,
    'Mean time to resolve': 4120
  },
  {
    date: 'Aug 26',
    'Successful requests': 501,
    Errors: 120,
    'Mean time to detect': 2920,
    'Mean time to resolve': 5120
  },
  {
    date: 'Aug 27',
    'Successful requests': 480,
    Errors: 120,
    'Mean time to detect': 3120,
    'Mean time to resolve': 4910
  },
  {
    date: 'Aug 28',
    'Successful requests': 471,
    Errors: 120,
    'Mean time to detect': 3150,
    'Mean time to resolve': 4210
  },
  {
    date: 'Aug 29',
    'Successful requests': 610,
    Errors: 89,
    'Mean time to detect': 2350,
    'Mean time to resolve': 4620
  },
  {
    date: 'Aug 30',
    'Successful requests': 513,
    Errors: 199,
    'Mean time to detect': 2350,
    'Mean time to resolve': 4130
  },
  {
    date: 'Aug 31',
    'Successful requests': 500,
    Errors: 56,
    'Mean time to detect': 2431,
    'Mean time to resolve': 4130
  }
];

const timeFormatter = (seconds: number) => {
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${minutes}m`;
};

const numberFormatter = (value: number) =>
  Intl.NumberFormat('en-US').format(value).toString();

type ChartColor =
  | 'blue'
  | 'amber'
  | 'emerald'
  | 'violet'
  | 'gray'
  | 'cyan'
  | 'pink'
  | 'lime'
  | 'fuchsia';

type ChartTab = {
  name: string;
  valueFormatter: (value: number) => string;
  categories: string[];
  colors: ChartColor[];
  summary: Array<{
    name: string;
    total: string;
    color: string;
  }>;
};

const tabs: ChartTab[] = [
  {
    name: 'API requests',
    valueFormatter: numberFormatter,
    categories: ['Successful requests', 'Errors'],
    colors: ['blue', 'amber'],
    summary: [
      {
        name: 'Successful requests',
        total: '23,450',
        color: 'bg-blue-500'
      },
      {
        name: 'Errors',
        total: '1,397',
        color: 'bg-amber-500'
      }
    ]
  },
  {
    name: 'Incident response',
    valueFormatter: timeFormatter,
    categories: ['Mean time to resolve', 'Mean time to detect'],
    colors: ['blue', 'amber'],
    summary: [
      {
        name: 'Mean time to resolve',
        total: '47min 44s',
        color: 'bg-blue-500'
      },
      {
        name: 'Mean time to detect',
        total: '31min 8s',
        color: 'bg-amber-500'
      }
    ]
  }
];

export default function Example() {
  const defaultTab = tabs[0]?.name ?? 'API requests';

  return (
    <Card className="p-0">
      <div className="rounded-t-lg p-6">
        <h3 className="font-medium">Monitoring</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam
          nonumy eirmod tempor invidunt
        </p>
      </div>
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mx-6" variant="line">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.name} value={tab.name}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.name} value={tab.name} className="mt-0 p-6">
            <div className="md:flex md:items-start md:justify-between">
              <ul
                role="list"
                className="flex flex-wrap items-center gap-x-10 gap-y-4"
              >
                {tab.summary.map((item) => (
                  <li key={item.name}>
                    <div className="flex items-center space-x-2">
                      <span
                        className={classNames(
                          item.color,
                          'size-3 shrink-0 rounded-sm'
                        )}
                        aria-hidden={true}
                      />
                      <p className="font-semibold">{item.total}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.name}</p>
                  </li>
                ))}
              </ul>
            </div>
            <AreaChart
              data={data}
              index="date"
              categories={tab.categories}
              colors={tab.colors}
              showLegend={false}
              yAxisWidth={45}
              valueFormatter={tab.valueFormatter}
              className="mt-10 hidden h-72 sm:block"
            />
            <AreaChart
              data={data}
              index="date"
              categories={tab.categories}
              colors={tab.colors}
              showLegend={false}
              showYAxis={false}
              startEndOnly={true}
              valueFormatter={tab.valueFormatter}
              className="mt-6 h-72 sm:hidden"
            />
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
