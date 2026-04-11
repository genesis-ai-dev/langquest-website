import { AssetSummary, QuestRecord } from '@/app/db/questExplorer';
import { BIBLE_BOOKS, ICONS_PATH } from './fia.template';
import { getQuestDisabledFlag, getQuestVersionName } from './helpers';
import {
  DisplayNode,
  FiaBookPericopes,
  TemplateStrategy,
  TemplateStrategyContext
} from './types';

function getFiaMetadata(
  metadata: Record<string, unknown> | null
): { bookId?: string; pericopeId?: string; verseRange?: string } | null {
  const fia = (metadata?.fia || null) as {
    bookId?: string;
    pericopeId?: string;
    verseRange?: string;
  } | null;
  if (!fia) return null;
  return fia;
}

function getBookPericopesMap(strategyContext?: TemplateStrategyContext) {
  return new Map<string, FiaBookPericopes>(
    (strategyContext?.fiaPericopes?.books || []).map((book) => [book.id, book])
  );
}

function getFiaCopyTitle(contextNode: DisplayNode | null): string {
  if (!contextNode) {
    return 'Select a Book';
  }

  if (contextNode.kind === 'book') {
    return 'Select a Pericope';
  }

  return 'Select a quest';
}

function getFiaSelectMessage(contextNode: DisplayNode | null): string {
  if (!contextNode) {
    return 'Select a Book to open its content.';
  }

  if (contextNode.kind === 'book') {
    return 'Select a Pericope to open its content.';
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

function getPericopeNameFromId(pericopeId: string): string {
  const separatorIndex = pericopeId.indexOf('-');
  if (separatorIndex === -1 || separatorIndex === pericopeId.length - 1) {
    return pericopeId;
  }

  return pericopeId.slice(separatorIndex + 1);
}

function parseFiaVerseRange(verseRange: string): {
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
} | null {
  const normalized = verseRange.trim();
  const match = normalized.match(/^(\d+):(\d+)-(?:(\d+):)?(\d+)$/);
  if (!match) {
    return null;
  }

  const startChapter = Number(match[1]);
  const startVerse = Number(match[2]);
  const endChapter = match[3] ? Number(match[3]) : startChapter;
  const endVerse = Number(match[4]);

  if (
    !Number.isFinite(startChapter) ||
    !Number.isFinite(startVerse) ||
    !Number.isFinite(endChapter) ||
    !Number.isFinite(endVerse)
  ) {
    return null;
  }

  return {
    startChapter,
    startVerse,
    endChapter,
    endVerse
  };
}

function resolveSequentialVerseToReference(
  bookVerses: number[],
  startChapter: number,
  startVerse: number,
  sequence: number
): { chapter: number; verse: number } | null {
  if (sequence < 1) {
    return null;
  }

  let chapterIndex = startChapter - 1;
  let verse = startVerse;
  let remainingOffset = sequence - 1;

  while (chapterIndex >= 0 && chapterIndex < bookVerses.length) {
    const chapterTotal = bookVerses[chapterIndex];
    if (!chapterTotal || verse < 1 || verse > chapterTotal) {
      return null;
    }

    const remainingInCurrentChapter = chapterTotal - verse;
    if (remainingOffset <= remainingInCurrentChapter) {
      return {
        chapter: chapterIndex + 1,
        verse: verse + remainingOffset
      };
    }

    remainingOffset -= remainingInCurrentChapter + 1;
    chapterIndex += 1;
    verse = 1;
  }

  return null;
}

function countVersesInRange(
  bookVerses: number[],
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): number {
  if (
    startChapter < 1 ||
    endChapter < 1 ||
    startChapter > bookVerses.length ||
    endChapter > bookVerses.length
  ) {
    return 0;
  }

  if (
    endChapter < startChapter ||
    (endChapter === startChapter && endVerse < startVerse)
  ) {
    return 0;
  }

  let total = 0;
  for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
    const chapterTotal = bookVerses[chapter - 1];
    if (!chapterTotal || chapterTotal < 1) {
      return 0;
    }

    if (chapter === startChapter && chapter === endChapter) {
      const start = Math.max(1, startVerse);
      const end = Math.min(chapterTotal, endVerse);
      if (end < start) {
        return 0;
      }
      total += end - start + 1;
      continue;
    }

    if (chapter === startChapter) {
      const start = Math.max(1, startVerse);
      if (start > chapterTotal) {
        return 0;
      }
      total += chapterTotal - start + 1;
      continue;
    }

    if (chapter === endChapter) {
      const end = Math.min(chapterTotal, endVerse);
      if (end < 1) {
        return 0;
      }
      total += end;
      continue;
    }

    total += chapterTotal;
  }

  return total;
}

function formatSequentialVerseRangeLabel(
  bookVerses: number[],
  startChapter: number,
  startVerse: number,
  from: number,
  to: number
): string {
  const fromReference = resolveSequentialVerseToReference(
    bookVerses,
    startChapter,
    startVerse,
    from
  );
  const toReference = resolveSequentialVerseToReference(
    bookVerses,
    startChapter,
    startVerse,
    to
  );

  if (!fromReference || !toReference) {
    return from === to ? `${from}` : `${from}-${to}`;
  }

  if (
    fromReference.chapter === toReference.chapter &&
    fromReference.verse === toReference.verse
  ) {
    return `${fromReference.chapter}:${fromReference.verse}`;
  }

  return `${fromReference.chapter}:${fromReference.verse}-${toReference.chapter}:${toReference.verse}`;
}

export const fiaStrategy: TemplateStrategy = {
  id: 'fia',
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
    middleLevelEmptyMessage: 'No pericopes in this book.',
    rightDefaultTitle: 'Select a Book',
    rightSelectMessage: 'Select a Pericope to open its content.',
    rightSelectMessageByContext: getFiaSelectMessage,
    rightDefaultTitleByContext: getFiaCopyTitle,
    subquestsSectionTitle: 'Subquests',
    subquestsEmptyMessage: 'No subquests yet.',
    assetsSectionTitle: 'Assets',
    assetsEmptyMessage: 'No assets linked to this quest.',
    newVersionConfirmDescription:
      'This will create a new version of the same pericope. Do you want to continue?',
    msgQuestUpdated: 'FIA quest updated',
    msgSubquestCreated: 'Subquest created for this pericope',
    msgAssetCreated: 'Asset created for this pericope',
    msgSelectQuestForNewVersion:
      'Select a pericope before creating a new version',
    msgNewVersionCreated: 'New pericope version created',
    msgNewVersionCreateError: 'Failed to create pericope version',
    msgBulkAssetsUploaded: 'Assets uploaded successfully'
  },
  getRootNodes: (
    roots: QuestRecord[],
    strategyContext?: TemplateStrategyContext
  ) => {
    const pericopesMap = getBookPericopesMap(strategyContext);

    return BIBLE_BOOKS.map((book) => {
      const rootVariants = roots.filter(
        (quest) => getFiaMetadata(quest.metadata)?.bookId === book.id
      );
      const rootQuest = getLatestQuest(rootVariants);
      const bookPericopes = pericopesMap.get(book.id) || null;
      const hasPericopes =
        !!bookPericopes && (bookPericopes.pericopes?.length || 0) > 0;
      const isUnavailableInApi = !hasPericopes;

      return {
        key: book.id,
        title: bookPericopes?.title || book.name,
        subtitle: bookPericopes
          ? `${bookPericopes.pericopes.length} pericopes`
          : 'No pericopes',
        icon: `${ICONS_PATH}${book.imgId || book.id}@2x.webp`,
        questId: rootQuest?.id || null,
        quest: rootQuest,
        variants: rootVariants,
        versionName: getQuestVersionName(rootQuest),
        kind: 'book' as const,
        book,
        disabled: isUnavailableInApi || getQuestDisabledFlag(rootQuest)
      };
    });
  },
  getChildrenNodes: (
    contextNode: DisplayNode | null,
    strategyContext?: TemplateStrategyContext
  ) => {
    if (!contextNode) {
      return [];
    }

    if (contextNode.kind === 'book' && contextNode.book) {
      const pericopesMap = getBookPericopesMap(strategyContext);
      const bookPericopes = pericopesMap.get(contextNode.book.id);
      if (!bookPericopes) {
        return [];
      }

      const pericopeVariantsById = new Map<string, QuestRecord[]>();
      const bookVariants =
        contextNode.variants && contextNode.variants.length > 0
          ? contextNode.variants
          : contextNode.quest
            ? [contextNode.quest]
            : [];

      bookVariants.forEach((bookQuest) => {
        bookQuest.children.forEach((pericopeQuest) => {
          const pericopeId = getFiaMetadata(pericopeQuest.metadata)?.pericopeId;
          if (!pericopeId) {
            return;
          }

          const existing = pericopeVariantsById.get(pericopeId) || [];
          existing.push(pericopeQuest);
          pericopeVariantsById.set(pericopeId, existing);
        });
      });

      return [...bookPericopes.pericopes]
        .sort((a, b) => a.sequence - b.sequence)
        .map((pericope, index) => {
          const pericopeVariants = pericopeVariantsById.get(pericope.id) || [];
          const pericopeQuest = getLatestQuest(pericopeVariants);
          const displayNumber = index + 1;
          const pericopeName = getPericopeNameFromId(pericope.id);

          return {
            key: `${contextNode.book?.id}:${pericope.id}`,
            title: `Pericope ${displayNumber} (${pericopeName})`,
            subtitle: pericope.verseRange,
            questId: pericopeQuest?.id || null,
            quest: pericopeQuest,
            variants: pericopeVariants,
            versionName: getQuestVersionName(pericopeQuest),
            kind: 'pericope' as const,
            book: contextNode.book,
            pericopeId: pericope.id,
            pericopeSequence: displayNumber,
            pericopeVerseRange: pericope.verseRange,
            disabled: getQuestDisabledFlag(pericopeQuest)
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
  ) => {
    if (!quest?.metadata) {
      return [];
    }

    const metadata = getFiaMetadata(quest.metadata);
    const bookId = metadata?.bookId;
    const verseRange = metadata?.verseRange;
    if (!bookId || !verseRange) {
      return [];
    }

    const parsedRange = parseFiaVerseRange(verseRange);
    if (!parsedRange) {
      return [];
    }

    const book = BIBLE_BOOKS.find((item) => item.id === bookId);
    if (!book) {
      return [];
    }

    const totalVerses = countVersesInRange(
      book.verses,
      parsedRange.startChapter,
      parsedRange.startVerse,
      parsedRange.endChapter,
      parsedRange.endVerse
    );
    if (totalVerses < 1) {
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

        return {
          start: Math.min(from, to),
          end: Math.max(from, to)
        };
      })
      .filter(
        (range): range is { start: number; end: number } => range !== null
      )
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

    const labels: Array<{
      name: string;
      inUse: boolean;
      metadata: {
        verse: {
          from: number;
          to: number;
        };
      };
    }> = [];

    let verse = 1;
    for (const range of mergedUsedRanges) {
      while (verse < range.start) {
        labels.push({
          name: formatSequentialVerseRangeLabel(
            book.verses,
            parsedRange.startChapter,
            parsedRange.startVerse,
            verse,
            verse
          ),
          inUse: false,
          metadata: {
            verse: { from: verse, to: verse }
          }
        });
        verse += 1;
      }

      labels.push({
        name: formatSequentialVerseRangeLabel(
          book.verses,
          parsedRange.startChapter,
          parsedRange.startVerse,
          range.start,
          range.end
        ),
        inUse: true,
        metadata: {
          verse: { from: range.start, to: range.end }
        }
      });

      verse = range.end + 1;
    }

    while (verse <= totalVerses) {
      labels.push({
        name: formatSequentialVerseRangeLabel(
          book.verses,
          parsedRange.startChapter,
          parsedRange.startVerse,
          verse,
          verse
        ),
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

    const questMetadata = getFiaMetadata(
      (questNode?.quest?.metadata as Record<string, unknown> | null) || null
    );
    const verseRange = questMetadata?.verseRange;
    const bookId = questMetadata?.bookId || questNode?.book?.id;

    if (!verseRange || !bookId) {
      if (typeof to === 'number') {
        return `${from}-${to}`;
      }
      return `${from}`;
    }

    const parsedRange = parseFiaVerseRange(verseRange);
    if (!parsedRange) {
      if (typeof to === 'number') {
        return `${from}-${to}`;
      }
      return `${from}`;
    }

    const book = BIBLE_BOOKS.find((item) => item.id === bookId);
    if (!book) {
      if (typeof to === 'number') {
        return `${from}-${to}`;
      }
      return `${from}`;
    }

    const fromReference = resolveSequentialVerseToReference(
      book.verses,
      parsedRange.startChapter,
      parsedRange.startVerse,
      from
    );
    const toReference = resolveSequentialVerseToReference(
      book.verses,
      parsedRange.startChapter,
      parsedRange.startVerse,
      typeof to === 'number' ? to : from
    );

    if (!fromReference || !toReference) {
      if (typeof to === 'number') {
        return `${from}-${to}`;
      }
      return `${from}`;
    }

    if (
      fromReference.chapter === toReference.chapter &&
      fromReference.verse === toReference.verse
    ) {
      return `${fromReference.chapter}:${fromReference.verse}`;
    }

    return `${fromReference.chapter}:${fromReference.verse}-${toReference.chapter}:${toReference.verse}`;
  }
};
