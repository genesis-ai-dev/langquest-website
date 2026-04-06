import { AssetSummary, QuestRecord } from '@/app/db/questExplorer';
import { BibleBook } from '@/components/QuestExplorerTemplates/bibleComponents/template';

export type QuestTemplate = 'bible' | 'unstructured' | string;

export interface DisplayNode {
  key: string;
  title: string;
  subtitle?: string;
  icon?: string;
  questId: string | null;
  quest: QuestRecord | null;
  variants?: QuestRecord[];
  versionName?: string;
  kind: 'quest' | 'book' | 'chapter' | 'pericope';
  book?: BibleBook;
  chapterNumber?: number;
  pericopeId?: string;
  pericopeSequence?: number;
  pericopeVerseRange?: string;
  disabled?: boolean;
}

export interface FiaPericope {
  id: string;
  sequence: number;
  verseRange: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

export interface FiaBookPericopes {
  id: string;
  title: string;
  pericopes: FiaPericope[];
}

export interface FiaPericopesResponse {
  books: FiaBookPericopes[];
}

export interface TemplateStrategyContext {
  fiaPericopes?: FiaPericopesResponse | null;
}

export interface TemplateBehavior {
  showLeftMenuActions: boolean;
  showRightMenuActions: boolean;
  allowDisabledQuests: boolean;
  allowAddQuest: boolean;
  allowAddAssets: boolean;
  allowNewVersion: boolean;
  showAssetLabel: boolean;
}

export interface TemplateCopy {
  leftColumnTitle: string;
  rootSearchPlaceholder: string;
  rootEmptyMessage: string;
  breadcrumbEmpty: string;
  middleHeaderFallback: string;
  middleNoContextMessage: string;
  middleLevelEmptyMessage: string;
  rightDefaultTitle: string;
  rightSelectMessage: string;
  rightSelectMessageByContext?: (contextNode: DisplayNode | null) => string;
  rightDefaultTitleByContext?: (contextNode: DisplayNode | null) => string;
  subquestsSectionTitle: string;
  subquestsEmptyMessage: string;
  assetsSectionTitle: string;
  assetsEmptyMessage: string;
  newVersionConfirmDescription?: string;
  msgQuestUpdated: string;
  msgSubquestCreated: string;
  msgAssetCreated: string;
  msgSelectQuestForNewVersion: string;
  msgNewVersionCreated: string;
  msgNewVersionCreateError: string;
  msgBulkAssetsUploaded: string;
}

export interface TemplateStrategy {
  id: string;
  behavior: TemplateBehavior;
  copy: TemplateCopy;
  getRootNodes: (
    roots: QuestRecord[],
    strategyContext?: TemplateStrategyContext
  ) => DisplayNode[];
  getChildrenNodes: (
    contextNode: DisplayNode | null,
    strategyContext?: TemplateStrategyContext
  ) => DisplayNode[];
  resolveAssetLabel: (quest: DisplayNode | null, asset: AssetSummary) => string;
}

export interface Quest {
  id: string;
  name: string;
  description: string | null;
  metadata: string | null;
  parent_id: string | null;
  created_at: string;
  children?: Quest[];
  icon?: string;
  active?: boolean;
}
