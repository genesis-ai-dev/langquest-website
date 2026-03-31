import { QuestRecord } from '@/app/db/questExplorer';
import {
  BIBLE_BOOKS,
  ICONS_PATH
} from '@/components/QuestExplorerTemplates/bibleComponents/template';
import { getQuestDisabledFlag, getQuestVersionName } from './helpers';
import { DisplayNode, TemplateStrategy } from './types';

function getBibleMetadata(
  metadata: Record<string, unknown> | null
): { book?: string; chapter?: number } | null {
  const bible = (metadata?.bible || null) as {
    book?: string;
    chapter?: number;
  } | null;
  if (!bible) return null;
  return bible;
}

function getBibleCopyTitle(contextNode: DisplayNode | null): string {
  if (!contextNode) {
    return 'Select a Book';
  }

  if (contextNode.kind === 'book') {
    return 'Select a Chapter';
  }

  return 'Select a quest';
}

function getBibleSelectMessage(contextNode: DisplayNode | null): string {
  if (!contextNode) {
    return 'Select a Book to open its content.';
  }

  if (contextNode.kind === 'book') {
    return 'Select a Chapter to open its content.';
  }

  return 'Click a quest in the middle column to open its content.';
}

function getLatestQuest(quests: QuestRecord[]): QuestRecord | null {
  if (quests.length === 0) {
    return null;
  }

  return [...quests].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  })[0];
}

export const bibleStrategy: TemplateStrategy = {
  id: 'bible',
  behavior: {
    showLeftMenuActions: false,
    showRightMenuActions: true,
    allowDisabledQuests: true,
    allowAddQuest: false,
    allowAddAssets: true,
    allowNewVersion: true,
    showAssetLabel: true
  },
  copy: {
    leftColumnTitle: 'Bible Books',
    rootSearchPlaceholder: 'Search Book',
    rootEmptyMessage: 'No books found for this project.',
    breadcrumbEmpty: 'No selection',
    middleHeaderFallback: 'Select a Book',
    middleNoContextMessage: 'Select a Book to start.',
    middleLevelEmptyMessage: 'No chapters in this book.',
    rightDefaultTitle: 'Select a Book',
    rightSelectMessage: 'Select a Chapter to open its content.',
    rightSelectMessageByContext: getBibleSelectMessage,
    rightDefaultTitleByContext: getBibleCopyTitle,
    subquestsSectionTitle: 'Subquests',
    subquestsEmptyMessage: 'No subquests yet.',
    assetsSectionTitle: 'Assets',
    assetsEmptyMessage: 'No assets linked to this quest.',
    newVersionConfirmDescription:
      'This will create a new version of the same chapter. Do you want to continue?',
    msgQuestUpdated: 'Bible quest updated',
    msgSubquestCreated: 'Subquest created for this chapter',
    msgAssetCreated: 'Asset created for this chapter',
    msgSelectQuestForNewVersion:
      'Select a chapter before creating a new version',
    msgNewVersionCreated: 'New chapter version created',
    msgNewVersionCreateError: 'Failed to create chapter version',
    msgBulkAssetsUploaded: 'Assets uploaded successfully'
  },
  getRootNodes: (roots: QuestRecord[]) =>
    BIBLE_BOOKS.map((book) => {
      const rootVariants = roots.filter(
        (quest) => getBibleMetadata(quest.metadata)?.book === book.id
      );
      const rootQuest = getLatestQuest(rootVariants);

      return {
        key: book.id,
        title: book.name,
        subtitle: `${book.chapters} chapters`,
        icon: `${ICONS_PATH}${book.id}@2x.webp`,
        questId: rootQuest?.id || null,
        quest: rootQuest,
        variants: rootVariants,
        versionName: getQuestVersionName(rootQuest),
        kind: 'book' as const,
        book,
        disabled: getQuestDisabledFlag(rootQuest)
      };
    }),
  getChildrenNodes: (contextNode: DisplayNode | null) => {
    if (!contextNode) {
      return [];
    }

    if (contextNode.kind === 'book' && contextNode.book) {
      const chapterVariantsByNumber = new Map<number, QuestRecord[]>();
      const bookVariants =
        contextNode.variants && contextNode.variants.length > 0
          ? contextNode.variants
          : contextNode.quest
            ? [contextNode.quest]
            : [];

      bookVariants.forEach((bookQuest) => {
        bookQuest.children.forEach((chapterQuest) => {
          const chapter = getBibleMetadata(chapterQuest.metadata)?.chapter;
          if (!chapter) {
            return;
          }

          const existing = chapterVariantsByNumber.get(chapter) || [];
          existing.push(chapterQuest);
          chapterVariantsByNumber.set(chapter, existing);
        });
      });

      return contextNode.book.verses.map((verseCount, index) => {
        const chapterNumber = index + 1;
        const chapterVariants =
          chapterVariantsByNumber.get(chapterNumber) || [];
        const chapterQuest = getLatestQuest(chapterVariants);

        return {
          key: `${contextNode.book?.id}:${chapterNumber}`,
          title: `Chapter ${chapterNumber}`,
          subtitle: `${verseCount} verses`,
          questId: chapterQuest?.id || null,
          quest: chapterQuest,
          variants: chapterVariants,
          versionName: getQuestVersionName(chapterQuest),
          kind: 'chapter' as const,
          chapterNumber,
          book: contextNode.book,
          disabled: getQuestDisabledFlag(chapterQuest)
        };
      });
    }

    return (contextNode.quest?.children || []).map((child) => ({
      key: child.id,
      title: child.name,
      subtitle: child.description || undefined,
      questId: child.id,
      quest: child,
      variants: [child],
      versionName: getQuestVersionName(child),
      kind: 'quest' as const,
      disabled: getQuestDisabledFlag(child)
    }));
  },
  resolveAssetLabel: (questNode, asset) => {
    const questName = questNode?.quest?.name || questNode?.title || '';
    const baseLabel = questName || 'Verse';
    const metadata = asset.metadata as
      | {
          verse?: {
            from?: number;
            to?: number;
          };
        }
      | null
      | undefined;

    const from = metadata?.verse?.from;
    const to = metadata?.verse?.to;

    if (typeof from !== 'number') {
      return `No Labeled`;
    }

    if (from === to) {
      return `${baseLabel}:${from}`;
    }

    if (!questName) {
      return `${baseLabel} ${from}-${to}`;
    }

    return `${baseLabel}:${from}-${to}`;
  }
};
