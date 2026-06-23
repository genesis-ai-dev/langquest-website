import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { UploadProcessStepProps } from '../lib/types';

function DoneStep({ uploadType, processingResult }: UploadProcessStepProps) {
  const stats = processingResult?.stats;
  const errors = stats?.errors ?? [];
  const warnings = stats?.warnings ?? [];
  const createdItems = [
    {
      label: 'Projects',
      created: stats?.projects?.created ?? 0,
      read: stats?.projects?.read ?? 0
    },
    {
      label: 'Quests',
      created: stats?.quests?.created ?? 0,
      read: stats?.quests?.read ?? 0
    },
    {
      label: 'Assets',
      created: stats?.assets?.created ?? 0,
      read: stats?.assets?.read ?? 0
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <CircleCheck className="h-5 w-5 text-green-600" />
          <h3 className="text-xl font-semibold">Done</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          The {uploadType} upload process finished. Review what was created and
          any messages returned by processing.
        </p>
      </div>

      <section className="shrink-0 space-y-3">
        <h4 className="text-sm font-semibold">Created Items</h4>
        <ul className="divide-y rounded-md border bg-background">
          {createdItems.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span className="font-medium">{item.label}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="w-30">
                  {item.created} created
                </Badge>
                {/* <Badge variant="secondary">{item.read} read</Badge> */}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
        <ResultMessagesList
          title="Errors"
          emptyMessage="No errors were returned."
          messages={errors}
          icon={<CircleX className="h-4 w-4 text-destructive" />}
          badgeClassName="bg-destructive text-white"
        />
        <ResultMessagesList
          title="Warnings"
          emptyMessage="No warnings were returned."
          messages={warnings}
          icon={<TriangleAlert className="h-4 w-4 text-yellow-600" />}
          badgeClassName="bg-yellow-600 text-white"
        />
      </div>
    </div>
  );
}

function ResultMessagesList({
  title,
  emptyMessage,
  messages,
  icon,
  badgeClassName
}: {
  title: string;
  emptyMessage: string;
  messages: Array<{ row: number; message: string }>;
  icon: ReactNode;
  badgeClassName: string;
}) {
  return (
    <section className="flex min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h4>
        <Badge className={badgeClassName}>{messages.length}</Badge>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1 rounded-md border bg-background">
          <ul className="divide-y">
            {messages.map((message, index) => (
              <li key={`${message.row}-${index}`} className="p-3 text-sm">
                <div className="font-medium">Row {message.row}</div>
                <div className="text-muted-foreground">{message.message}</div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </section>
  );
}

export { DoneStep };
