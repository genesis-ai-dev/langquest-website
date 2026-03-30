import { QuestRecord } from '@/app/db/questExplorer';
import { getQuestDisabledFlag, getQuestVersionName } from './helpers';
import { DisplayNode, TemplateStrategy } from './types';

function mapQuestNode(quest: QuestRecord): DisplayNode {
  return {
    key: quest.id,
    title: quest.name,
    subtitle: quest.description || undefined,
    questId: quest.id,
    quest,
    variants: [quest],
    versionName: getQuestVersionName(quest),
    kind: 'quest',
    disabled: getQuestDisabledFlag(quest)
  };
}

export const unstructuredStrategy: TemplateStrategy = {
  id: 'unstructured',
  behavior: {
    showLeftMenuActions: true,
    showRightMenuActions: true,
    allowDisabledQuests: true,
    allowAddQuest: true,
    allowAddAssets: true,
    allowNewVersion: false
  },
  copy: {
    leftColumnTitle: 'Quests List',
    rootSearchPlaceholder: 'Search Quest',
    rootEmptyMessage: 'No root quests found.',
    breadcrumbEmpty: 'No selection',
    middleHeaderFallback: 'Select a quest',
    middleNoContextMessage: 'Select a root quest to start.',
    middleLevelEmptyMessage: 'No subquests in this level.',
    rightDefaultTitle: 'Select a quest',
    rightSelectMessage:
      'Click a quest in the middle column to open its content.',
    subquestsSectionTitle: 'Subquests',
    subquestsEmptyMessage: 'No subquests yet.',
    assetsSectionTitle: 'Assets',
    assetsEmptyMessage: 'No assets linked to this quest.'
  },
  getRootNodes: (roots: QuestRecord[]) => roots.map(mapQuestNode),
  getChildrenNodes: (contextNode: DisplayNode | null) =>
    (contextNode?.quest?.children || []).map(mapQuestNode)
};
