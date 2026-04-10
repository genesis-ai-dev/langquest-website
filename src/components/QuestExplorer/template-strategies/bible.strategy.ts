import { AssetSummary, QuestRecord } from '@/app/db/questExplorer';
import { BIBLE_BOOKS, ICONS_PATH } from './bible.template';
import { getQuestDisabledFlag, getQuestVersionName } from './helpers';
import { BibleAvailableLabel, DisplayNode, TemplateStrategy } from './types';

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
    allowLabel: true,
    showAssetLabel: true,
    showQuestTabInAssetForm: false
  },
  copy: {
    leftColumnTitle: 'Bible Books',
    labelSelectorTitle: 'Verses',
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
  getAvailableLabels: (
    quest: QuestRecord | null,
    assets: AssetSummary[] = []
  ): BibleAvailableLabel[] => {
    if (!quest?.metadata) {
      return [];
    }

    const metadata = getBibleMetadata(quest.metadata);
    const bookId = metadata?.book;
    const chapterNumber = metadata?.chapter;
    if (!bookId || !chapterNumber) {
      return [];
    }

    const book = BIBLE_BOOKS.find((item) => item.id === bookId);
    const totalVerses = book?.verses?.[chapterNumber - 1];
    if (!totalVerses || totalVerses < 1) {
      return [];
    }

    const usedRanges = assets
      .map((asset) => {
      const assetMetadata = asset.metadata as
        | {
            verse?: {
              from?: number;
              to?: number;
            };
          }
        | null
        | undefined;

      const fromRaw = assetMetadata?.verse?.from;
      const toRaw = assetMetadata?.verse?.to;

      if (typeof fromRaw !== 'number') {
        return null;
      }

      const from = Math.max(1, Math.min(totalVerses, Math.floor(fromRaw)));
      const to =
        typeof toRaw === 'number'
          ? Math.max(1, Math.min(totalVerses, Math.floor(toRaw)))
          : from;

      const start = Math.min(from, to);
      const end = Math.max(from, to);
      return { start, end };
    })
      .filter((range): range is { start: number; end: number } => range !== null)
      .sort((a, b) => {
        if (a.start !== b.start) {
          return a.start - b.start;
        }
        return a.end - b.end;
      });

    const mergedUsedRanges: Array<{ start: number; end: number }> = [];
    for (const range of usedRanges) {
      const last = mergedUsedRanges[mergedUsedRanges.length - 1];
      if (!last) {
        mergedUsedRanges.push({ ...range });
        continue;
      }

      if (range.start <= last.end) {
        last.end = Math.max(last.end, range.end);
        continue;
      }

      mergedUsedRanges.push({ ...range });
    }

    const labels: BibleAvailableLabel[] = [];
    let verse = 1;
    for (const range of mergedUsedRanges) {
      while (verse < range.start) {
        labels.push({
          name: `${verse}`,
          inUse: false,
          metadata: {
            verse: { from: verse, to: verse }
          }
        });
        verse += 1;
      }

      labels.push({
        name: range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`,
        inUse: true,
        metadata: {
          verse: { from: range.start, to: range.end }
        }
      });
      verse = range.end + 1;
    }

    while (verse <= totalVerses) {
      labels.push({
        name: `${verse}`,
        inUse: false,
        metadata: {
          verse: { from: verse, to: verse }
        }
      });
      verse += 1;
    }

    return labels;
  },
  formatLabelMetadata: (selection) => {
    const fromVerse = (
      selection?.from?.metadata as
        | {
            verse?: { from?: number };
          }
        | undefined
    )?.verse?.from;
    const toVerse = (
      selection?.to?.metadata as
        | {
            verse?: { to?: number };
          }
        | undefined
    )?.verse?.to;

    if (typeof fromVerse !== 'number') {
      return null;
    }

    return {
      verse: {
        from: fromVerse,
        to: typeof toVerse === 'number' ? toVerse : fromVerse
      }
    };
  },
  getOrderIndex: (assetMetadata, counter) => {
    const verseFrom = (assetMetadata as { verse?: { from?: number } } | null)
      ?.verse?.from;
    const normalizedCounter = Number.isFinite(counter) ? counter : 0;
    const verseBase =
      typeof verseFrom === 'number' ? Math.floor(verseFrom) : 999;

    return verseBase * 1000 * 1000 + normalizedCounter * 1000;
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
