import type {
  DashboardJsonPayload,
  DashboardMetrics,
  DashboardSubquestItem,
  JsonRecord,
  MemberStats,
  ProjectDashboardContext
} from './types.ts';

interface BibleBook {
  id: string;
  name: string;
  chapters: number;
  verses: number[];
}


// const BIBLE_BOOKS: BibleBook[] = [
//   {
//     id: 'gen',
//     name: 'Genesis',
//     chapters: 50,
//     verses: [
//       31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33,
//       38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43,
//       36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26
//     ]
//   },
//   {
//     id: 'exo',
//     name: 'Exodus',
//     chapters: 40,
//     verses: [
//       22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27,
//       25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38,
//       29, 31, 43, 38
//     ]
//   },
//   {
//     id: 'lev',
//     name: 'Leviticus',
//     chapters: 27,
//     verses: [
//       17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37,
//       27, 24, 33, 44, 23, 55, 46, 34
//     ]
//   },
//   {
//     id: 'num',
//     name: 'Numbers',
//     chapters: 36,
//     verses: [
//       54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32,
//       22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13
//     ]
//   },
//   {
//     id: 'deu',
//     name: 'Deuteronomy',
//     chapters: 34,
//     verses: [
//       46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22,
//       21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12
//     ]
//   },
//   {
//     id: 'jos',
//     name: 'Joshua',
//     chapters: 24,
//     verses: [
//       18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28,
//       51, 9, 45, 34, 16, 33
//     ]
//   },
//   {
//     id: 'jdg',
//     name: 'Judges',
//     chapters: 21,
//     verses: [
//       36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31,
//       30, 48, 25
//     ]
//   },
//   { id: 'rut', name: 'Ruth', chapters: 4, verses: [22, 23, 18, 22] },
//   {
//     id: '1sa',
//     name: '1 Samuel',
//     chapters: 31,
//     verses: [
//       28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30,
//       24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13
//     ]
//   },
//   {
//     id: '2sa',
//     name: '2 Samuel',
//     chapters: 24,
//     verses: [
//       27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33,
//       43, 26, 22, 51, 39, 25
//     ]
//   },
//   {
//     id: '1ki',
//     name: '1 Kings',
//     chapters: 22,
//     verses: [
//       53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46,
//       21, 43, 29, 53
//     ]
//   },
//   {
//     id: '2ki',
//     name: '2 Kings',
//     chapters: 25,
//     verses: [
//       18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37,
//       37, 21, 26, 20, 37, 20, 30
//     ]
//   },
//   {
//     id: '1ch',
//     name: '1 Chronicles',
//     chapters: 29,
//     verses: [
//       54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17,
//       19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30
//     ]
//   },
//   {
//     id: '2ch',
//     name: '2 Chronicles',
//     chapters: 36,
//     verses: [
//       17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34,
//       11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23
//     ]
//   },
//   {
//     id: 'ezr',
//     name: 'Ezra',
//     chapters: 10,
//     verses: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44]
//   },
//   {
//     id: 'neh',
//     name: 'Nehemiah',
//     chapters: 13,
//     verses: [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31]
//   },
//   {
//     id: 'est',
//     name: 'Esther',
//     chapters: 10,
//     verses: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3]
//   },
//   {
//     id: 'job',
//     name: 'Job',
//     chapters: 42,
//     verses: [
//       22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21,
//       29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24,
//       41, 30, 24, 34, 17
//     ]
//   },
//   {
//     id: 'psa',
//     name: 'Psalms',
//     chapters: 150,
//     verses: [
//       6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13,
//       31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17,
//       13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12,
//       8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13,
//       19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9,
//       5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176,
//       7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7,
//       12, 15, 21, 10, 20, 14, 9, 6
//     ]
//   },
//   {
//     id: 'pro',
//     name: 'Proverbs',
//     chapters: 31,
//     verses: [
//       33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24,
//       29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31
//     ]
//   },
//   {
//     id: 'ecc',
//     name: 'Ecclesiastes',
//     chapters: 12,
//     verses: [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14]
//   },
//   {
//     id: 'sng',
//     name: 'Song of Solomon',
//     chapters: 8,
//     verses: [17, 17, 11, 16, 16, 13, 13, 14]
//   },
//   {
//     id: 'isa',
//     name: 'Isaiah',
//     chapters: 66,
//     verses: [
//       31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6,
//       17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8,
//       31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21,
//       14, 21, 22, 11, 12, 19, 12, 25, 24
//     ]
//   },
//   {
//     id: 'jer',
//     name: 'Jeremiah',
//     chapters: 52,
//     verses: [
//       19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23,
//       15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32,
//       21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34
//     ]
//   },
//   {
//     id: 'lam',
//     name: 'Lamentations',
//     chapters: 5,
//     verses: [22, 22, 66, 22, 22]
//   },
//   {
//     id: 'ezk',
//     name: 'Ezekiel',
//     chapters: 48,
//     verses: [
//       28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14,
//       49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28,
//       23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35
//     ]
//   },
//   {
//     id: 'dan',
//     name: 'Daniel',
//     chapters: 12,
//     verses: [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13]
//   },
//   {
//     id: 'hos',
//     name: 'Hosea',
//     chapters: 14,
//     verses: [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9]
//   },
//   { id: 'joe', name: 'Joel', chapters: 3, verses: [20, 32, 21] },
//   {
//     id: 'amo',
//     name: 'Amos',
//     chapters: 9,
//     verses: [15, 16, 15, 13, 27, 14, 17, 14, 15]
//   },
//   { id: 'oba', name: 'Obadiah', chapters: 1, verses: [21] },
//   { id: 'jon', name: 'Jonah', chapters: 4, verses: [17, 10, 10, 11] },
//   {
//     id: 'mic',
//     name: 'Micah',
//     chapters: 7,
//     verses: [16, 13, 12, 13, 15, 16, 20]
//   },
//   { id: 'nah', name: 'Nahum', chapters: 3, verses: [15, 13, 19] },
//   { id: 'hab', name: 'Habakkuk', chapters: 3, verses: [17, 20, 19] },
//   { id: 'zep', name: 'Zephaniah', chapters: 3, verses: [18, 15, 20] },
//   { id: 'hag', name: 'Haggai', chapters: 2, verses: [15, 23] },
//   {
//     id: 'zec',
//     name: 'Zechariah',
//     chapters: 14,
//     verses: [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21]
//   },
//   { id: 'mal', name: 'Malachi', chapters: 4, verses: [14, 17, 18, 6] },
//   {
//     id: 'mat',
//     name: 'Matthew',
//     chapters: 28,
//     verses: [
//       25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35,
//       30, 34, 46, 46, 39, 51, 46, 75, 66, 20
//     ]
//   },
//   {
//     id: 'mar',
//     name: 'Mark',
//     chapters: 16,
//     verses: [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20]
//   },
//   {
//     id: 'luk',
//     name: 'Luke',
//     chapters: 24,
//     verses: [
//       80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43,
//       48, 47, 38, 71, 56, 53
//     ]
//   },
//   {
//     id: 'joh',
//     name: 'John',
//     chapters: 21,
//     verses: [
//       51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40,
//       42, 31, 25
//     ]
//   },
//   {
//     id: 'act',
//     name: 'Acts',
//     chapters: 28,
//     verses: [
//       26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28,
//       41, 38, 40, 30, 35, 27, 27, 32, 44, 31
//     ]
//   },
//   {
//     id: 'rom',
//     name: 'Romans',
//     chapters: 16,
//     verses: [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27]
//   },
//   {
//     id: '1co',
//     name: '1 Corinthians',
//     chapters: 16,
//     verses: [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24]
//   },
//   {
//     id: '2co',
//     name: '2 Corinthians',
//     chapters: 13,
//     verses: [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14]
//   },
//   {
//     id: 'gal',
//     name: 'Galatians',
//     chapters: 6,
//     verses: [24, 21, 29, 31, 26, 18]
//   },
//   {
//     id: 'eph',
//     name: 'Ephesians',
//     chapters: 6,
//     verses: [23, 22, 21, 32, 33, 24]
//   },
//   { id: 'phi', name: 'Philippians', chapters: 4, verses: [30, 30, 21, 23] },
//   { id: 'col', name: 'Colossians', chapters: 4, verses: [29, 23, 25, 18] },
//   {
//     id: '1th',
//     name: '1 Thessalonians',
//     chapters: 5,
//     verses: [10, 20, 13, 18, 28]
//   },
//   { id: '2th', name: '2 Thessalonians', chapters: 3, verses: [12, 17, 18] },
//   {
//     id: '1ti',
//     name: '1 Timothy',
//     chapters: 6,
//     verses: [20, 15, 16, 16, 25, 21]
//   },
//   { id: '2ti', name: '2 Timothy', chapters: 4, verses: [18, 26, 17, 22] },
//   { id: 'tit', name: 'Titus', chapters: 3, verses: [16, 15, 15] },
//   { id: 'phm', name: 'Philemon', chapters: 1, verses: [25] },
//   {
//     id: 'heb',
//     name: 'Hebrews',
//     chapters: 13,
//     verses: [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25]
//   },
//   { id: 'jas', name: 'James', chapters: 5, verses: [27, 26, 18, 17, 20] },
//   { id: '1pe', name: '1 Peter', chapters: 5, verses: [25, 25, 22, 19, 14] },
//   { id: '2pe', name: '2 Peter', chapters: 3, verses: [21, 22, 18] },
//   { id: '1jn', name: '1 John', chapters: 5, verses: [10, 29, 24, 21, 21] },
//   { id: '2jn', name: '2 John', chapters: 1, verses: [13] },
//   { id: '3jn', name: '3 John', chapters: 1, verses: [14] },
//   { id: 'jud', name: 'Jude', chapters: 1, verses: [25] },
//   {
//     id: 'rev',
//     name: 'Revelation',
//     chapters: 22,
//     verses: [
//       20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21,
//       15, 27, 21
//     ]
//   }
// ];

type BibleMetadata = {
  book: string;
  chapter?: number;
};

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function getContentType(value: unknown): 'source' | 'translation' | 'transcription' | null {
  const normalized = asString(value)?.toLowerCase();
  if (
    normalized === 'source' ||
    normalized === 'translation' ||
    normalized === 'transcription'
  ) {
    return normalized;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function asPositiveInteger(value: unknown): number | null {
  const parsed = asNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return Math.floor(parsed);
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asPositiveInteger(item))
    .filter((item): item is number => item !== null);
}

function buildBibleBooksMapFromTemplateStructure(
  rows: JsonRecord[]
): Map<string, BibleBook> {
  // const map = new Map<string, BibleBook>(
  //   BIBLE_BOOKS.map((book) => [book.id, book])
  // );

  for (const row of rows) {
    const itemId = asString(row.item_id)?.toLowerCase();
    if (!itemId) continue;

    const chapters = asPositiveInteger(row.item_count);
    if (chapters === null) continue;

    const metadata = parseJsonRecord(row.metadata);
    const verses = toNumberArray(metadata?.verses);

    map.set(itemId, {
      id: itemId,
      name: asString(row.title) ?? itemId,
      chapters,
      verses
    });
  }

  return map;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter((item): item is string => item !== null);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => asString(item))
          .filter((item): item is string => item !== null);
      }
    } catch {
      return [trimmed];
    }
  }

  return [];
}

function distinct(values: Iterable<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    if (value && value.trim()) set.add(value);
  }
  return [...set];
}

function countWhere<T>(list: T[], predicate: (item: T) => boolean): number {
  let count = 0;
  for (const item of list) {
    if (predicate(item)) count += 1;
  }
  return count;
}

function hasText(value: unknown): boolean {
  return asString(value) !== null;
}

function hasAudio(row: JsonRecord): boolean {
  if (toStringArray(row.audio).length > 0) return true;
  return asString(row.audio_id) !== null;
}

function hasImage(row: JsonRecord): boolean {
  if (asString(row.image) !== null) return true;
  return toStringArray(row.images).length > 0;
}

function parseBibleMetadata(rawMetadata: unknown): BibleMetadata | null {
  const metadata = parseJsonRecord(rawMetadata);
  if (!metadata) return null;

  const bible = parseJsonRecord(metadata.bible);
  if (!bible) return null;

  const book = asString(bible.book)?.toLowerCase();
  if (!book) return null;

  const chapter = asNumber(bible.chapter);
  return {
    book,
    chapter:
      chapter !== null && chapter > 0 ? Math.floor(chapter) : undefined
  };
}

function parseVerseRange(
  rawMetadata: unknown
): { from: number; to: number } | null {
  const metadata = parseJsonRecord(rawMetadata);
  if (!metadata) return null;

  const verse = parseJsonRecord(metadata.verse);
  if (!verse) return null;

  const from = asNumber(verse.from);
  if (from === null || from <= 0) return null;

  const to = asNumber(verse.to);
  const start = Math.floor(from);
  const end = Math.floor(to ?? from);
  return {
    from: Math.min(start, end),
    to: Math.max(start, end)
  };
}

function getLatestByCreatedAt(rows: JsonRecord[]): JsonRecord | null {
  if (rows.length === 0) return null;

  return [...rows].sort((a, b) => {
    const aTime = new Date(asString(a.created_at) ?? 0).getTime();
    const bTime = new Date(asString(b.created_at) ?? 0).getTime();
    return bTime - aTime;
  })[0];
}

export function buildBibleDashboard(
  context: ProjectDashboardContext
): DashboardMetrics {
  const quests = context.quests;
  const assets = context.assets;
  const questAssetLinks = context.questAssetLinks;
  const assetContentLinks = context.assetContentLinks;
  const profileProjectLinks = context.profileProjectLinks;
  const projectLanguageLinks = context.projectLanguageLinks;
  const bibleBooksMap = buildBibleBooksMapFromTemplateStructure(
    context.templateStructureRows
  );

  const activeQuests = quests.filter((q) => asBoolean(q.active, true));
  const inactiveQuests = quests.filter((q) => !asBoolean(q.active, true));
  const activeQuestIds = new Set(
    activeQuests
      .map((q) => asString(q.id))
      .filter((id): id is string => id !== null)
  );

  const activeAssets = assets.filter((a) => asBoolean(a.active, true));
  const sourceAssets = assets.filter((a) => getContentType(a.content_type) === 'source');
  const activeSourceAssets = sourceAssets.filter((a) => asBoolean(a.active, true));
  const inactiveSourceAssets = sourceAssets.filter((a) => !asBoolean(a.active, true));
  const activeSourceAssetIds = new Set(
    activeSourceAssets
      .map((a) => asString(a.id))
      .filter((id): id is string => id !== null)
  );

  const activeSourceAssetById = new Map<string, JsonRecord>();
  for (const asset of activeSourceAssets) {
    const id = asString(asset.id);
    if (id) activeSourceAssetById.set(id, asset);
  }

  const sourceHasTranslation = new Map<string, boolean>();
  const sourceHasTranscription = new Map<string, boolean>();
  const sourceTranslationCount = new Map<string, number>();
  const sourceTranscriptionCount = new Map<string, number>();
  for (const asset of activeAssets) {
    const contentType = getContentType(asset.content_type);
    if (contentType !== 'translation' && contentType !== 'transcription') {
      continue;
    }

    const sourceAssetId = asString(asset.source_asset_id);
    if (!sourceAssetId || !activeSourceAssetIds.has(sourceAssetId)) continue;

    if (contentType === 'translation') {
      sourceHasTranslation.set(sourceAssetId, true);
      sourceTranslationCount.set(
        sourceAssetId,
        (sourceTranslationCount.get(sourceAssetId) ?? 0) + 1
      );
    }
    if (contentType === 'transcription') {
      sourceHasTranscription.set(sourceAssetId, true);
      sourceTranscriptionCount.set(
        sourceAssetId,
        (sourceTranscriptionCount.get(sourceAssetId) ?? 0) + 1
      );
    }
  }

  const activeQuestAssetLinks = questAssetLinks.filter(
    (qal) =>
      asBoolean(qal.active, true) &&
      activeQuestIds.has(asString(qal.quest_id) ?? '') &&
      activeSourceAssetIds.has(asString(qal.asset_id) ?? '')
  );

  const questToAssetIds = new Map<string, Set<string>>();
  for (const link of activeQuestAssetLinks) {
    const questId = asString(link.quest_id);
    const assetId = asString(link.asset_id);
    if (!questId || !assetId) continue;

    if (!questToAssetIds.has(questId)) {
      questToAssetIds.set(questId, new Set<string>());
    }
    questToAssetIds.get(questId)?.add(assetId);
  }

  const activeAssetContentLinks = assetContentLinks.filter(
    (acl) =>
      asBoolean(acl.active, true) &&
      activeSourceAssetIds.has(asString(acl.asset_id) ?? '')
  );

  const aclByAssetId = new Map<string, JsonRecord[]>();
  for (const acl of activeAssetContentLinks) {
    const assetId = asString(acl.asset_id);
    if (!assetId) continue;
    if (!aclByAssetId.has(assetId)) aclByAssetId.set(assetId, []);
    aclByAssetId.get(assetId)?.push(acl);
  }

  const assetHasText = new Map<string, boolean>();
  const assetHasAudio = new Map<string, boolean>();
  for (const [assetId, aclRows] of aclByAssetId.entries()) {
    assetHasText.set(assetId, aclRows.some((row) => hasText(row.text)));
    assetHasAudio.set(assetId, aclRows.some((row) => hasAudio(row)));
  }

  const members: Record<string, MemberStats> = {};
  const addMemberQuest = (profileId: string | null) => {
    if (!profileId) return;
    if (!members[profileId]) {
      members[profileId] = { questsCreated: 0, assetsCreated: 0 };
    }
    members[profileId].questsCreated += 1;
  };
  const addMemberAsset = (profileId: string | null) => {
    if (!profileId) return;
    if (!members[profileId]) {
      members[profileId] = { questsCreated: 0, assetsCreated: 0 };
    }
    members[profileId].assetsCreated += 1;
  };

  for (const quest of activeQuests) addMemberQuest(asString(quest.creator_id));
  for (const asset of activeSourceAssets) addMemberAsset(asString(asset.creator_id));

  const activeRootQuests = activeQuests.filter(
    (quest) => asString(quest.parent_id) === null
  );
  const activeSubquests = activeQuests.filter(
    (quest) => asString(quest.parent_id) !== null
  );

  const rootGroupsByBook = new Map<string, JsonRecord[]>();
  for (const root of activeRootQuests) {
    const metadata = parseBibleMetadata(root.metadata);
    if (!metadata?.book) continue;
    if (!rootGroupsByBook.has(metadata.book)) {
      rootGroupsByBook.set(metadata.book, []);
    }
    rootGroupsByBook.get(metadata.book)?.push(root);
  }

  const questsJson: DashboardJsonPayload['quests'] = {};

  for (const [bookId, rootVersions] of rootGroupsByBook.entries()) {
    const bookDef = bibleBooksMap.get(bookId);
    const latestRoot = getLatestByCreatedAt(rootVersions);
    const rootIds = new Set(
      rootVersions
        .map((root) => asString(root.id))
        .filter((id): id is string => id !== null)
    );
    if (rootIds.size === 0) continue;

    const groupedSubquestRows = new Map<
      string,
      { chapter: number; rows: JsonRecord[] }
    >();

    for (const subquest of activeSubquests) {
      const parentId = asString(subquest.parent_id);
      if (!parentId || !rootIds.has(parentId)) continue;

      const metadata = parseBibleMetadata(subquest.metadata);
      if (!metadata?.book || !metadata.chapter) continue;
      if (metadata.book !== bookId) continue;

      const groupKey = `${metadata.book}:${metadata.chapter}`;
      const existing = groupedSubquestRows.get(groupKey);
      if (!existing) {
        groupedSubquestRows.set(groupKey, {
          chapter: metadata.chapter,
          rows: [subquest]
        });
      } else {
        existing.rows.push(subquest);
      }
    }

    const subquestGroups = [...groupedSubquestRows.values()].sort(
      (a, b) => a.chapter - b.chapter
    );

    const subquests: DashboardSubquestItem[] = subquestGroups.map((group) => {
      const subquestIds = group.rows
        .map((row) => asString(row.id))
        .filter((id): id is string => id !== null);
      const subquestAssetIds = new Set<string>();
      for (const subquestId of subquestIds) {
        const linkedAssetIds = questToAssetIds.get(subquestId);
        if (!linkedAssetIds) continue;
        for (const assetId of linkedAssetIds) {
          subquestAssetIds.add(assetId);
        }
      }

      const subquestAssets = [...subquestAssetIds]
        .map((assetId) => activeSourceAssetById.get(assetId))
        .filter((asset): asset is JsonRecord => asset !== undefined);

      const expectedVerses = bookDef?.verses?.[group.chapter - 1] ?? 0;
      const completedFlags = expectedVerses > 0 ? new Array<boolean>(expectedVerses).fill(false) : [];
      const uniqueRanges = new Set<string>();

      if (expectedVerses > 0) {
        for (const asset of subquestAssets) {
          const verseRange = parseVerseRange(asset.metadata);
          if (!verseRange) continue;

          const clampedStart = Math.max(1, Math.min(expectedVerses, verseRange.from));
          const clampedEnd = Math.max(1, Math.min(expectedVerses, verseRange.to));
          const start = Math.min(clampedStart, clampedEnd);
          const end = Math.max(clampedStart, clampedEnd);

          const rangeKey = `${start}:${end}`;
          if (uniqueRanges.has(rangeKey)) continue;
          uniqueRanges.add(rangeKey);

          for (let verse = start; verse <= end; verse += 1) {
            completedFlags[verse - 1] = true;
          }
        }
      }

      const completedVerses = completedFlags.reduce(
        (sum, isCompleted) => sum + (isCompleted ? 1 : 0),
        0
      );

      const latestSubquest = getLatestByCreatedAt(group.rows);
      const creatorIds = distinct(group.rows.map((row) => asString(row.creator_id)));
      const languoids = distinct(
        subquestAssets.map(
          (asset) => asString(asset.languoid_id) ?? asString(asset.source_language_id)
        )
      );

      return {
        name: asString(latestSubquest?.name ?? null),
        creatorsId: creatorIds,
        languoids,
        itemsExpected: expectedVerses,
        itemsCompleted: completedVerses,
        totalVersions: group.rows.length,
        totalAssets: subquestAssets.length,
        totalTranscriptions: [...subquestAssetIds].reduce(
          (sum, assetId) => sum + (sourceTranscriptionCount.get(assetId) ?? 0),
          0
        ),
        totalTranslations: [...subquestAssetIds].reduce(
          (sum, assetId) => sum + (sourceTranslationCount.get(assetId) ?? 0),
          0
        ),
        totalAssetsWithTranscription: countWhere(
          [...subquestAssetIds],
          (assetId) => sourceHasTranscription.get(assetId) === true
        ),
        totalAssetsWithTranslation: countWhere(
          [...subquestAssetIds],
          (assetId) => sourceHasTranslation.get(assetId) === true
        ),
        totalImages: countWhere(subquestAssets, (asset) => hasImage(asset)),
        totalText: countWhere(
          [...subquestAssetIds],
          (assetId) => assetHasText.get(assetId) === true
        ),
        totalAudio: countWhere(
          [...subquestAssetIds],
          (assetId) => assetHasAudio.get(assetId) === true
        )
      };
    });

    const allQuestIdsForBook = new Set<string>([
      ...rootIds,
      ...subquestGroups.flatMap((group) =>
        group.rows
          .map((row) => asString(row.id))
          .filter((id): id is string => id !== null)
      )
    ]);

    const hierarchyAssetIds = new Set<string>();
    for (const questId of allQuestIdsForBook) {
      const linkedAssetIds = questToAssetIds.get(questId);
      if (!linkedAssetIds) continue;
      for (const assetId of linkedAssetIds) hierarchyAssetIds.add(assetId);
    }

    const hierarchyAssets = [...hierarchyAssetIds]
      .map((assetId) => activeSourceAssetById.get(assetId))
      .filter((asset): asset is JsonRecord => asset !== undefined);

    const totalSubquestsCompleted = countWhere(
      subquests,
      (subquest) =>
        subquest.itemsExpected > 0 &&
        subquest.itemsCompleted === subquest.itemsExpected
    );

    const totalSubquestsExpected = bookDef?.chapters ?? 0;
    const questCompleted =
      totalSubquestsExpected > 0 &&
      totalSubquestsCompleted === totalSubquestsExpected;

    const questKey = asString(latestRoot?.id) ?? bookId;
    const questName = asString(latestRoot?.name ?? null) ?? bookDef?.name ?? bookId;
    const creators = distinct([
      ...rootVersions.map((root) => asString(root.creator_id)),
      ...subquests.flatMap((subquest) => subquest.creatorsId),
      ...hierarchyAssets.map((asset) => asString(asset.creator_id))
    ]);
    const questLanguoids = distinct(
      hierarchyAssets.map(
        (asset) => asString(asset.languoid_id) ?? asString(asset.source_language_id)
      )
    );

    questsJson[questKey] = {
      name: questName,
      questCompleted: questCompleted,
      totalSubquestsCreated: subquests.length,
      totalSubquestsExpected: totalSubquestsExpected,
      totalSubquestsCompleted: totalSubquestsCompleted,
      totalAssets: hierarchyAssets.length,
      languoids: questLanguoids,
      creatorsId: creators,
      subquests
    };
  }

  const questEntries = Object.values(questsJson);
  const totalTargetLanguages = countWhere(
    projectLanguageLinks,
    (pll) => asBoolean(pll.active, true) && asString(pll.language_type) === 'target'
  );

  const totalMembers = countWhere(
    profileProjectLinks,
    (ppl) => asBoolean(ppl.active, true) && asString(ppl.membership) === 'member'
  );
  const totalOwners = countWhere(
    profileProjectLinks,
    (ppl) => asBoolean(ppl.active, true) && asString(ppl.membership) === 'owner'
  );

  return {
    total_quests: questEntries.length,
    total_subquests: questEntries.reduce(
      (sum, quest) => sum + quest.totalSubquestsCreated,
      0
    ),
    expected_quests: context.templateStructureRows.length,
    total_assets: activeSourceAssets.length,
    total_quests_versions: quests.length,
    completed_quests: countWhere(questEntries, (quest) => quest.questCompleted),
    completed_subquests: questEntries.reduce(
      (sum, quest) => sum + quest.totalSubquestsCompleted,
      0
    ),
    inactive_quests: inactiveQuests.length,
    inactive_assets: inactiveSourceAssets.length,
    assets_with_text: countWhere(
      activeSourceAssets,
      (asset) => assetHasText.get(asString(asset.id) ?? '') === true
    ),
    assets_with_audio: countWhere(
      activeSourceAssets,
      (asset) => assetHasAudio.get(asString(asset.id) ?? '') === true
    ),
    assets_with_image: countWhere(activeSourceAssets, (asset) => hasImage(asset)),
    assets_with_transcription: countWhere(
      activeSourceAssets,
      (asset) => sourceHasTranscription.get(asString(asset.id) ?? '') === true
    ),
    assets_with_translation: countWhere(
      activeSourceAssets,
      (asset) => sourceHasTranslation.get(asString(asset.id) ?? '') === true
    ),
    total_source_languages: distinct(
      activeSourceAssets.map(
        (asset) => asString(asset.languoid_id) ?? asString(asset.source_language_id)
      )
    ).length,
    total_target_languages: totalTargetLanguages,
    total_members: totalMembers,
    total_owners: totalOwners,
    dashboard_json: {
      members,
      quests: questsJson
    }
  };
}
