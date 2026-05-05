'use client';

import { useState } from 'react';
import { DashboardQuestCard } from '@/components/dashboard/dashboard-quest-card';
import { DashboardSubquestCard } from '@/components/dashboard/dashhboard-subquest-card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';

export type DashboardSubquest = {
  name: string | null;
  creators: Array<{ id: string; name: string }>;
  languoids: string[];
  itemsExpected: number;
  itemsCompleted: number;
  totalAssets: number;
  totalImages: number;
  totalText: number;
  totalAudio: number;
};

export type DashboardMainQuest = {
  name: string | null;
  questCompleted: boolean;
  totalSubquestsCreated: number;
  totalSubquestsExpected: number;
  totalSubquestsCompleted: number;
  totalAssets: number;
  languoids: string[];
  creators: Array<{ id: string; name: string }>;
  subquests: DashboardSubquest[];
};

type QuestsBoardProps = {
  quests: Record<string, DashboardMainQuest>;
  subquestLabel: string;
};

export function QuestsBoard({ quests, subquestLabel }: QuestsBoardProps) {
  const mainQuests = Object.entries(quests || {});
  const [search, setSearch] = useState('');

  const filteredQuests = search.trim()
    ? mainQuests.filter(([, quest]) =>
        (quest.name ?? '').toLowerCase().includes(search.trim().toLowerCase())
      )
    : mainQuests;

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="uppercase tracking-wide">
          Quest Structure
        </CardTitle>
        <CardDescription>
          Main quests and subquests with progress and asset details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        <ScrollArea className="h-[480px] pr-3">
          {filteredQuests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {mainQuests.length === 0
                ? 'No quests available for this project yet.'
                : 'No quests match your search.'}
            </p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {filteredQuests.map(([questId, quest]) => (
                <AccordionItem key={questId} value={questId}>
                  <AccordionTrigger>
                    <DashboardQuestCard
                      quest={quest}
                      subquestLabel={subquestLabel}
                    />
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    <div className="space-y-2">
                      {quest.subquests.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No subquests for this quest.
                        </p>
                      ) : (
                        quest.subquests.map((subquest, index) => (
                          <div
                            key={`${questId}-${subquest.name ?? 'subquest'}-${index}`}
                            className="border-b first:border-t last:border-b-0 ml-12 mr-8 px-2"
                          >
                            <DashboardSubquestCard subquest={subquest} />
                          </div>
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default QuestsBoard;
