import { BIBLE_BOOKS as BIBLE_TEMPLATE_BOOKS } from '@/components/QuestExplorer/template-strategies/bible.template';
import { BIBLE_BOOKS as FIA_TEMPLATE_BOOKS } from '@/components/QuestExplorer/template-strategies/fia.template';

export type TemplateQuest = {
  name: string | null;
  metadata: unknown;
  children?: TemplateQuest[];
};

export type TemplateAsset = {
  metadata: unknown;
};

export function parseMetadata(
  metadata: unknown
): Record<string, unknown> | null {
  if (!metadata) return null;

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (typeof metadata === 'object') {
    return metadata as Record<string, unknown>;
  }

  return null;
}

export function getVerseMetadata(metadata: unknown) {
  return parseMetadata(metadata)?.verse as
    | { from?: number; to?: number }
    | undefined;
}

export function getBibleMetadata(metadata: unknown) {
  return parseMetadata(metadata)?.bible as
    | { book?: string; chapter?: number }
    | undefined;
}

export function getFiaMetadata(metadata: unknown) {
  return parseMetadata(metadata)?.fia as
    | { bookId?: string; verseRange?: string }
    | undefined;
}

export function parseFiaVerseRange(verseRange: string) {
  const match = verseRange.trim().match(/^(\d+):(\d+)-(?:(\d+):)?(\d+)$/);
  if (!match) return null;

  return {
    startChapter: Number(match[1]),
    startVerse: Number(match[2]),
    endChapter: match[3] ? Number(match[3]) : Number(match[1]),
    endVerse: Number(match[4])
  };
}

export function resolveSequentialVerseToReference(
  bookVerses: number[],
  startChapter: number,
  startVerse: number,
  sequence: number
) {
  if (sequence < 1) return null;

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

export function resolveBibleAssetLabel(
  quest: TemplateQuest,
  asset: TemplateAsset
) {
  const verse = getVerseMetadata(asset.metadata);
  let from = verse?.from;
  let to = verse?.to;

  if (typeof from !== 'number') {
    return null;
  }

  const bible = getBibleMetadata(quest.metadata);
  const book = BIBLE_TEMPLATE_BOOKS.find((item) => item.id === bible?.book);
  const totalVerses =
    typeof bible?.chapter === 'number'
      ? book?.verses?.[bible.chapter - 1]
      : null;

  if (totalVerses && totalVerses > 0) {
    from = Math.max(1, Math.min(totalVerses, Math.floor(from)));
    to =
      typeof to === 'number'
        ? Math.max(1, Math.min(totalVerses, Math.floor(to)))
        : from;
  }

  const baseLabel = quest.name || 'Verse';
  if (from === to || typeof to !== 'number') {
    return `${baseLabel}:${from}`;
  }

  return `${baseLabel}:${from}-${to}`;
}

export function resolveFiaAssetLabel(
  quest: TemplateQuest,
  asset: TemplateAsset
) {
  const verse = getVerseMetadata(asset.metadata);
  const from = verse?.from;

  if (typeof from !== 'number') {
    return null;
  }

  const to = typeof verse?.to === 'number' ? verse.to : from;

  const fia = getFiaMetadata(quest.metadata);
  if (!fia?.bookId || !fia?.verseRange) {
    return typeof to === 'number' && to !== from ? `${from}-${to}` : `${from}`;
  }

  const parsedRange = parseFiaVerseRange(fia.verseRange);
  const book = FIA_TEMPLATE_BOOKS.find((item) => item.id === fia.bookId);
  if (!parsedRange || !book) {
    return typeof to === 'number' && to !== from ? `${from}-${to}` : `${from}`;
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
    to
  );

  if (!fromReference || !toReference) {
    return typeof to === 'number' && to !== from ? `${from}-${to}` : `${from}`;
  }

  if (
    fromReference.chapter === toReference.chapter &&
    fromReference.verse === toReference.verse
  ) {
    return `${fromReference.chapter}:${fromReference.verse}`;
  }

  return `${fromReference.chapter}:${fromReference.verse}-${toReference.chapter}:${toReference.verse}`;
}

export function resolveAssetLabel(
  projectTemplate: string | null,
  quest: TemplateQuest,
  asset: TemplateAsset
) {
  if (projectTemplate === 'fia') {
    return resolveFiaAssetLabel(quest, asset);
  }

  if (projectTemplate === 'bible') {
    return resolveBibleAssetLabel(quest, asset);
  }

  return null;
}

function getQuestBookId(projectTemplate: string | null, quest: TemplateQuest) {
  if (projectTemplate === 'fia') {
    return getFiaMetadata(quest.metadata)?.bookId;
  }

  if (projectTemplate === 'bible') {
    return getBibleMetadata(quest.metadata)?.book;
  }

  return undefined;
}

function getBookOrder(projectTemplate: string | null, bookId?: string) {
  if (!bookId) {
    return Number.MAX_SAFE_INTEGER;
  }

  const books =
    projectTemplate === 'fia'
      ? FIA_TEMPLATE_BOOKS
      : projectTemplate === 'bible'
        ? BIBLE_TEMPLATE_BOOKS
        : [];
  const index = books.findIndex((book) => book.id === bookId);

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function sortQuestByTemplate<TQuest extends TemplateQuest>(
  quests: TQuest[],
  projectTemplate: string | null
): TQuest[] {
  if (projectTemplate !== 'bible' && projectTemplate !== 'fia') {
    return quests;
  }

  const collator = new Intl.Collator('en', {
    numeric: true,
    sensitivity: 'base'
  });

  return quests
    .map((quest) => ({
      ...quest,
      children: quest.children
        ? [...quest.children].sort((a, b) =>
            collator.compare(a.name || '', b.name || '')
          )
        : quest.children
    }))
    .sort((a, b) => {
      const aBookOrder = getBookOrder(
        projectTemplate,
        getQuestBookId(projectTemplate, a)
      );
      const bBookOrder = getBookOrder(
        projectTemplate,
        getQuestBookId(projectTemplate, b)
      );

      if (aBookOrder !== bBookOrder) {
        return aBookOrder - bBookOrder;
      }

      return collator.compare(a.name || '', b.name || '');
    }) as TQuest[];
}
