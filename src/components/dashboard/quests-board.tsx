'use client';

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

export type DashboardSubquest = {
  name: string | null;
  creator_id: string[];
  languoids: string[];
  ItemsExpected: number;
  ItemsCompleted: number;
  TotalAssets: number;
  TotalImages: number;
  TotalText: number;
  TotalAudio: number;
};

export type DashboardMainQuest = {
  name: string | null;
  QuestCompleted: boolean;
  TotalSubquestsCreated: number;
  TotalSubquestsExpected: number;
  TotalSubquestsCompleted: number;
  TotalAssets: number;
  languoids: string[];
  Creators: string[];
  subquests: DashboardSubquest[];
};

type QuestsBoardProps = {
  quests: Record<string, DashboardMainQuest>;
  subquestLabel: string;
};

export function QuestsBoard({ quests, subquestLabel }: QuestsBoardProps) {
  const mainQuests = Object.entries(quests || {});

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="uppercase tracking-wide">Quest Structure</CardTitle>
        <CardDescription>
          Main quests and subquests with progress and asset details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mainQuests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No quests available for this project yet.
          </p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {mainQuests.map(([questId, quest]) => (
              <AccordionItem key={questId} value={questId}>
                <AccordionTrigger>
                  <DashboardQuestCard quest={quest} subquestLabel={subquestLabel} />
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
      </CardContent>
    </Card>
  );
}

export default QuestsBoard;
