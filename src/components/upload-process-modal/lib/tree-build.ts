import type { NodeModel } from '@minoru/react-dnd-treeview';

import { lookupFiaLanguageCode } from '@/app/db/languoid';
import { createBrowserClient } from '@/lib/supabase/client';
import { BIBLE_BOOKS } from '@/components/QuestExplorer/template-strategies/bible.template';
import { BIBLE_BOOKS as FIA_BIBLE_BOOKS } from '@/components/QuestExplorer/template-strategies/fia.template';

import type {
  CsvDataAsset,
  CsvDataBuildResult,
  CsvDataQuest
} from './csv-data-build';

type TemplateTreeType = 'bible' | 'fia' | 'unstructured' | string;

type TemplateTreeNodeData = {
  type: 'book' | 'chapter' | 'pericope';
  lockedToDrop: boolean;
  lockedToDrag: boolean;
  hasContent?: boolean;
  validationStatus?: 'error' | 'warning' | 'valid';
  validationMessage?: string;
  flag?: null | 'warning' | 'error';
  bookId?: string;
  chapterNumber?: number;
  verseCount?: number;
  pericopeId?: string;
  pericopeSequence?: number;
  pericopeVerseRange?: string;
  pericopeStartChapter?: number;
  pericopeStartVerse?: number;
  pericopeEndChapter?: number;
  pericopeEndVerse?: number;
};

type TemplateTreeNode = NodeModel<TemplateTreeNodeData>;

type InitialTreeAssetData = {
  type: 'asset';
  lockedToDrop: boolean;
  lockedToDrag: boolean;
  hasContent: boolean;
  isExistingAsset?: boolean;
  existingAssetId?: string;
  validationStatus?: 'error' | 'warning' | 'valid';
  validationMessage?: string;
  flag?: null | 'warning' | 'error';
  questName: string;
  parentQuestName: string;
  asset: CsvDataAsset;
};

type InitialTreeQuestData = {
  type: 'quest';
  lockedToDrop: boolean;
  lockedToDrag: boolean;
  hasContent?: boolean;
  validationStatus?: 'error' | 'warning' | 'valid';
  validationMessage?: string;
  flag?: null | 'warning' | 'error';
  questName: string;
  parentQuestName: string;
  description: string;
  tags: string[];
  rowNumbers: number[];
};

type InitialTreeNodeData =
  | TemplateTreeNodeData
  | InitialTreeAssetData
  | InitialTreeQuestData;

type InitialTreeNode = NodeModel<InitialTreeNodeData>;

type BuildTemplateTreeParams = {
  template: TemplateTreeType;
  language?: string | null;
};

type BuildInitialTreeDataParams = {
  template: TemplateTreeType;
  templateTree: TemplateTreeNode[];
  csvData: CsvDataBuildResult;
};

type InitialTreeDataResult = {
  projectStructure: InitialTreeNode[];
  undefinedItems: InitialTreeNode[];
};

type FiaPericope = {
  id: string;
  sequence: number;
  verseRange: string;
  startChapter?: number;
  startVerse?: number;
  endChapter?: number;
  endVerse?: number;
};

type FiaBookPericopes = {
  id: string;
  title: string;
  pericopes: FiaPericope[];
};

type FiaPericopesResponse = {
  books: FiaBookPericopes[];
};

const ROOT_ID = 0;
const BIBLE_BOOK_ORDER = new Map(
  FIA_BIBLE_BOOKS.map((book, index) => [book.id, index])
);

async function buildTemplateTree({
  template,
  language
}: BuildTemplateTreeParams): Promise<TemplateTreeNode[]> {
  switch (template) {
    case 'bible':
      return buildBible();
    case 'fia':
      return buildFIA(language);
    case 'unstructured':
    default:
      return [];
  }
}

function buildInitialTreeData({
  template,
  templateTree,
  csvData
}: BuildInitialTreeDataParams): InitialTreeDataResult {
  switch (template) {
    case 'bible':
      return buildInitialBibleTreeData(templateTree, csvData);
    case 'fia':
      return buildInitialFiaTreeData(templateTree, csvData);
    case 'unstructured':
    default:
      return buildInitialUnstructuredTreeData(csvData);
  }
}

function buildBible(): TemplateTreeNode[] {
  return BIBLE_BOOKS.flatMap((book) => {
    const bookNode: TemplateTreeNode = {
      id: getBookNodeId(book.id),
      parent: ROOT_ID,
      text: book.name,
      droppable: true,
      data: {
        type: 'book',
        lockedToDrop: true,
        lockedToDrag: true,
        bookId: book.id
      }
    };

    const chapterNodes = book.verses.map((verseCount, index) => {
      const chapterNumber = index + 1;

      return {
        id: getChapterNodeId(book.id, chapterNumber),
        parent: bookNode.id,
        text: `${book.name} ${chapterNumber}`,
        droppable: true,
        data: {
          type: 'chapter',
          lockedToDrop: false,
          lockedToDrag: true,
          bookId: book.id,
          chapterNumber,
          verseCount
        }
      } satisfies TemplateTreeNode;
    });

    return [bookNode, ...chapterNodes];
  });
}

async function buildFIA(language?: string | null): Promise<TemplateTreeNode[]> {
  if (!language) {
    throw new Error('Language is required to build the FIA template tree.');
  }

  const fiaPericopes = await fetchFiaPericopes(language);

  return [...fiaPericopes.books].sort(sortBooksByBibleOrder).flatMap((book) => {
    if (!book.pericopes.length) {
      return [];
    }

    const bookNode: TemplateTreeNode = {
      id: getBookNodeId(book.id),
      parent: ROOT_ID,
      text: book.title,
      droppable: true,
      data: {
        type: 'book',
        lockedToDrop: true,
        lockedToDrag: true,
        bookId: book.id
      }
    };

    const pericopeNodes = book.pericopes
      .sort((a, b) => a.sequence - b.sequence)
      .map((pericope, index) => {
        const pericopeSequence = index + 1;

        return {
          id: getPericopeNodeId(book.id, pericope.id),
          parent: bookNode.id,
          text: `Pericope ${pericopeSequence} (${getPericopeLabel(pericope)})`,
          droppable: true,
          data: {
            type: 'pericope',
            lockedToDrop: false,
            lockedToDrag: true,
            bookId: book.id,
            pericopeId: pericope.id,
            pericopeSequence,
            pericopeVerseRange: pericope.verseRange,
            pericopeStartChapter: pericope.startChapter,
            pericopeStartVerse: pericope.startVerse,
            pericopeEndChapter: pericope.endChapter,
            pericopeEndVerse: pericope.endVerse
          }
        } satisfies TemplateTreeNode;
      });

    return [bookNode, ...pericopeNodes];
  });
}

async function fetchFiaPericopes(
  language: string
): Promise<FiaPericopesResponse> {
  const supabase = createBrowserClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error('Authentication is required to fetch FIA pericopes.');
  }

  const fiaLanguageCode =
    (await lookupFiaLanguageCode(supabase, language)) || language;

  const response = await fetch('/api/fia-pericopes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ fiaLanguageCode })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch FIA pericopes (${response.status}): ${
        errorText || 'Unknown error'
      }`
    );
  }

  const payload = (await response.json()) as unknown;
  return normalizeFiaPericopesResponse(payload);
}

function normalizeFiaPericopesResponse(payload: unknown): FiaPericopesResponse {
  const booksInput =
    payload && typeof payload === 'object' && 'books' in payload
      ? (payload as { books?: unknown }).books
      : null;

  if (!Array.isArray(booksInput)) {
    return { books: [] };
  }

  return {
    books: booksInput
      .map((book): FiaBookPericopes | null => {
        if (!book || typeof book !== 'object') {
          return null;
        }

        const bookObj = book as {
          id?: unknown;
          title?: unknown;
          pericopes?: unknown;
        };

        if (typeof bookObj.id !== 'string') {
          return null;
        }

        const pericopes = Array.isArray(bookObj.pericopes)
          ? bookObj.pericopes
              .map((pericope): FiaPericope | null => {
                if (!pericope || typeof pericope !== 'object') {
                  return null;
                }

                const pericopeObj = pericope as {
                  id?: unknown;
                  sequence?: unknown;
                  verseRange?: unknown;
                  startChapter?: unknown;
                  startVerse?: unknown;
                  endChapter?: unknown;
                  endVerse?: unknown;
                };

                if (
                  typeof pericopeObj.id !== 'string' ||
                  typeof pericopeObj.sequence !== 'number' ||
                  typeof pericopeObj.verseRange !== 'string'
                ) {
                  return null;
                }

                return {
                  id: pericopeObj.id,
                  sequence: pericopeObj.sequence,
                  verseRange: pericopeObj.verseRange,
                  startChapter:
                    typeof pericopeObj.startChapter === 'number'
                      ? pericopeObj.startChapter
                      : undefined,
                  startVerse:
                    typeof pericopeObj.startVerse === 'number'
                      ? pericopeObj.startVerse
                      : undefined,
                  endChapter:
                    typeof pericopeObj.endChapter === 'number'
                      ? pericopeObj.endChapter
                      : undefined,
                  endVerse:
                    typeof pericopeObj.endVerse === 'number'
                      ? pericopeObj.endVerse
                      : undefined
                };
              })
              .filter((value): value is FiaPericope => Boolean(value))
          : [];

        return {
          id: bookObj.id,
          title: typeof bookObj.title === 'string' ? bookObj.title : bookObj.id,
          pericopes
        };
      })
      .filter((value): value is FiaBookPericopes => Boolean(value))
  };
}

function sortBooksByBibleOrder(
  bookA: FiaBookPericopes,
  bookB: FiaBookPericopes
) {
  const orderA = BIBLE_BOOK_ORDER.get(bookA.id) ?? Number.MAX_SAFE_INTEGER;
  const orderB = BIBLE_BOOK_ORDER.get(bookB.id) ?? Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return bookA.title.localeCompare(bookB.title);
}

function buildInitialBibleTreeData(
  templateTree: TemplateTreeNode[],
  csvData: CsvDataBuildResult
): InitialTreeDataResult {
  const projectStructure = cloneTemplateTree(templateTree);
  const undefinedItems: InitialTreeNode[] = [];
  const bookNodes = getTemplateNodesByType(templateTree, 'book');
  const processedQuests = new Set<CsvDataQuest>();

  console.log('CSV', csvData);

  function processQuest(quest: CsvDataQuest) {
    if (processedQuests.has(quest)) {
      return;
    }

    const bookNode = findTemplateBookNode(bookNodes, quest.parentName);
    const chapterNode = bookNode
      ? findBibleChapterNode(templateTree, bookNode, quest.name)
      : null;

    if (chapterNode) {
      processedQuests.add(quest);

      if (quest.assets.length > 0) {
        markNodeAndAncestorsWithContent(projectStructure, chapterNode.id);
      }

      projectStructure.push(
        ...buildAssetNodes({
          assets: quest.assets,
          parentId: chapterNode.id,
          quest,
          context: `bible:${chapterNode.id}`
        })
      );
      quest.quests.forEach(processQuest);
      return;
    }

    const containerBookNode = !quest.parentName
      ? findTemplateBookNode(bookNodes, quest.name)
      : null;

    if (containerBookNode) {
      processedQuests.add(quest);

      if (quest.assets.length > 0) {
        undefinedItems.push(...buildCsvQuestTree([quest], { shallow: true }));
      }

      quest.quests.forEach(processQuest);
      return;
    }

    processedQuests.add(quest);
    undefinedItems.push(...buildCsvQuestTree([quest]));
    markQuestBranchAsProcessed(quest, processedQuests);
  }

  csvData.quests.forEach(processQuest);
  undefinedItems.push(...buildCsvQuestTree(csvData.orphanQuests));

  //   console.log('projectStructure', projectStructure);
  //   console.log('undefinedItems', undefinedItems);

  return {
    projectStructure,
    undefinedItems: sortTreeByFirstRow(undefinedItems)
  };
}

function buildInitialFiaTreeData(
  templateTree: TemplateTreeNode[],
  csvData: CsvDataBuildResult
): InitialTreeDataResult {
  const projectStructure = cloneTemplateTree(templateTree);
  const undefinedItems: InitialTreeNode[] = [];
  const bookNodes = getTemplateNodesByType(templateTree, 'book');
  const processedQuests = new Set<CsvDataQuest>();

  function processQuest(quest: CsvDataQuest) {
    if (processedQuests.has(quest)) {
      return;
    }

    const bookNode = findTemplateBookNode(bookNodes, quest.parentName);
    const pericopeNode = bookNode
      ? findFiaPericopeNode(templateTree, bookNode, quest.name)
      : null;

    if (pericopeNode) {
      processedQuests.add(quest);

      if (quest.assets.length > 0) {
        markNodeAndAncestorsWithContent(projectStructure, pericopeNode.id);
      }

      projectStructure.push(
        ...buildAssetNodes({
          assets: quest.assets,
          parentId: pericopeNode.id,
          quest,
          context: `fia:${pericopeNode.id}`
        })
      );
      quest.quests.forEach(processQuest);
      return;
    }

    const containerBookNode = !quest.parentName
      ? findTemplateBookNode(bookNodes, quest.name)
      : null;

    if (containerBookNode) {
      processedQuests.add(quest);

      if (quest.assets.length > 0) {
        undefinedItems.push(...buildCsvQuestTree([quest], { shallow: true }));
      }

      quest.quests.forEach(processQuest);
      return;
    }

    processedQuests.add(quest);
    undefinedItems.push(...buildCsvQuestTree([quest]));
    markQuestBranchAsProcessed(quest, processedQuests);
  }

  csvData.quests.forEach(processQuest);
  undefinedItems.push(...buildCsvQuestTree(csvData.orphanQuests));

  return {
    projectStructure,
    undefinedItems: sortTreeByFirstRow(undefinedItems)
  };
}

function buildInitialUnstructuredTreeData(
  csvData: CsvDataBuildResult
): InitialTreeDataResult {
  const orphanQuests = new Set(csvData.orphanQuests);
  const projectQuests = csvData.quests.filter(
    (quest) => !orphanQuests.has(quest)
  );

  return {
    projectStructure: buildCsvQuestTree(projectQuests),
    undefinedItems: buildCsvQuestTree(csvData.orphanQuests)
  };
}

function cloneTemplateTree(
  templateTree: TemplateTreeNode[]
): InitialTreeNode[] {
  return templateTree.map((node) => ({
    ...node,
    data: node.data ? { ...node.data } : undefined
  }));
}

function getTemplateNodesByType(
  templateTree: TemplateTreeNode[],
  type: TemplateTreeNodeData['type']
) {
  return templateTree.filter((node) => node.data?.type === type);
}

function findTemplateBookNode(bookNodes: TemplateTreeNode[], bookName: string) {
  const normalizedBookName = normalizeMatchName(bookName);

  if (!normalizedBookName) {
    return null;
  }

  return (
    bookNodes.find(
      (node) =>
        normalizeMatchName(node.text) === normalizedBookName ||
        normalizeMatchName(node.data?.bookId) === normalizedBookName
    ) ?? null
  );
}

function findBibleChapterNode(
  templateTree: TemplateTreeNode[],
  bookNode: TemplateTreeNode,
  questName: string
) {
  const chapterNumber = getBibleChapterNumber(questName, bookNode.text);

  if (!chapterNumber) {
    return null;
  }

  return (
    templateTree.find(
      (node) =>
        node.parent === bookNode.id &&
        node.data?.type === 'chapter' &&
        node.data.chapterNumber === chapterNumber
    ) ?? null
  );
}

function findFiaPericopeNode(
  templateTree: TemplateTreeNode[],
  bookNode: TemplateTreeNode,
  questName: string
) {
  const pericopeSequence = getFiaPericopeSequence(questName);

  if (pericopeSequence) {
    const sequenceMatch =
      templateTree.find(
        (node) =>
          node.parent === bookNode.id &&
          node.data?.type === 'pericope' &&
          node.data.pericopeSequence === pericopeSequence
      ) ?? null;

    if (sequenceMatch) {
      return sequenceMatch;
    }
  }

  const normalizedQuestRange = getNormalizedFiaRangeFromQuestName(
    questName,
    bookNode.text
  );

  if (!normalizedQuestRange) {
    return null;
  }

  return (
    templateTree.find(
      (node) =>
        node.parent === bookNode.id &&
        node.data?.type === 'pericope' &&
        normalizeFiaVerseRange(node.data.pericopeVerseRange) ===
          normalizedQuestRange
    ) ?? null
  );
}

function getBibleChapterNumber(questName: string, bookName: string) {
  const normalizedQuestName = normalizeMatchName(questName);
  const normalizedBookName = normalizeMatchName(bookName);

  if (!normalizedQuestName) {
    return null;
  }

  if (/^\d+$/.test(normalizedQuestName)) {
    return Number(normalizedQuestName);
  }

  if (!normalizedQuestName.startsWith(normalizedBookName)) {
    return null;
  }

  const chapterCandidate = normalizedQuestName.slice(normalizedBookName.length);
  const chapterNumber = Number(chapterCandidate.match(/\d+/)?.[0]);

  return Number.isInteger(chapterNumber) && chapterNumber > 0
    ? chapterNumber
    : null;
}

function getFiaPericopeSequence(questName: string) {
  const trimmedQuestName = questName.trim();
  const normalizedQuestName = normalizeMatchName(questName);

  if (!normalizedQuestName) {
    return null;
  }

  if (/^\d+$/.test(trimmedQuestName)) {
    return Number(trimmedQuestName);
  }

  if (
    !normalizedQuestName.startsWith('p') &&
    !normalizedQuestName.startsWith('pericope')
  ) {
    return null;
  }

  const pericopeNumber = Number(normalizedQuestName.match(/\d+/)?.[0]);

  return Number.isInteger(pericopeNumber) && pericopeNumber > 0
    ? pericopeNumber
    : null;
}

function getNormalizedFiaRangeFromQuestName(
  questName: string,
  bookName: string
) {
  const trimmedQuestName = questName.trim();
  const rangeMatch = trimmedQuestName.match(
    /(?:^|\s)(\d+)\s*:\s*(\d+)\s*-\s*(?:(\d+)\s*:\s*)?(\d+)(?:\s|$)/
  );

  if (!rangeMatch) {
    return null;
  }

  const prefix = trimmedQuestName.slice(0, rangeMatch.index).trim();

  if (prefix && normalizeMatchName(prefix) !== normalizeMatchName(bookName)) {
    return null;
  }

  return normalizeFiaVerseRange(rangeMatch[0]);
}

function normalizeFiaVerseRange(value: string | undefined) {
  const match = value
    ?.trim()
    .match(/^(\d+)\s*:\s*(\d+)\s*-\s*(?:(\d+)\s*:\s*)?(\d+)$/);

  if (!match) {
    return null;
  }

  const startChapter = Number(match[1]);
  const startVerse = Number(match[2]);
  const endChapter = Number(match[3] ?? match[1]);
  const endVerse = Number(match[4]);

  if (
    !Number.isInteger(startChapter) ||
    !Number.isInteger(startVerse) ||
    !Number.isInteger(endChapter) ||
    !Number.isInteger(endVerse)
  ) {
    return null;
  }

  return `${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
}

function buildAssetNodes({
  assets,
  parentId,
  quest,
  context
}: {
  assets: CsvDataAsset[];
  parentId: InitialTreeNode['id'];
  quest: CsvDataQuest;
  context: string;
}): InitialTreeNode[] {
  return assets.map((asset, index) => ({
    id: getCsvAssetNodeId(context, asset, index),
    parent: parentId,
    text: asset.name,
    droppable: false,
    data: {
      type: 'asset',
      lockedToDrop: false,
      lockedToDrag: false,
      hasContent: true,
      questName: quest.name,
      parentQuestName: quest.parentName,
      asset
    }
  }));
}

function buildCsvQuestTree(
  quests: CsvDataQuest[],
  options: { parentId?: InitialTreeNode['id']; shallow?: boolean } = {}
): InitialTreeNode[] {
  const parentId = options.parentId ?? ROOT_ID;

  return sortQuestsByFirstRow(quests).flatMap((quest) => {
    const questNodeId = getCsvQuestNodeId(quest, parentId);
    const hasContent = hasQuestContent(quest, options.shallow);
    const questNode: InitialTreeNode = {
      id: questNodeId,
      parent: parentId,
      text: quest.name,
      droppable: true,
      data: {
        type: 'quest',
        lockedToDrop: false,
        lockedToDrag: false,
        hasContent,
        questName: quest.name,
        parentQuestName: quest.parentName,
        description: quest.description,
        tags: quest.tags,
        rowNumbers: quest.rowNumbers
      }
    };
    const assetNodes = buildAssetNodes({
      assets: quest.assets,
      parentId: questNodeId,
      quest,
      context: `csv:${questNodeId}`
    });
    const childQuestNodes = options.shallow
      ? []
      : buildCsvQuestTree(quest.quests, { parentId: questNodeId });

    return [questNode, ...assetNodes, ...childQuestNodes];
  });
}

function markNodeAndAncestorsWithContent(
  tree: InitialTreeNode[],
  nodeId: InitialTreeNode['id']
) {
  const node = tree.find((item) => item.id === nodeId);

  if (!node) {
    return;
  }

  node.data = {
    ...node.data,
    hasContent: true
  } as InitialTreeNodeData;

  if (node.parent !== ROOT_ID) {
    markNodeAndAncestorsWithContent(tree, node.parent);
  }
}

function hasQuestContent(quest: CsvDataQuest, shallow?: boolean): boolean {
  return Boolean(
    quest.assets.length > 0 ||
      (!shallow &&
        quest.quests.some((childQuest) => hasQuestContent(childQuest)))
  );
}

function markQuestBranchAsProcessed(
  quest: CsvDataQuest,
  processedQuests: Set<CsvDataQuest>
) {
  quest.quests.forEach((childQuest) => {
    processedQuests.add(childQuest);
    markQuestBranchAsProcessed(childQuest, processedQuests);
  });
}

function sortQuestsByFirstRow(quests: CsvDataQuest[]) {
  return [...quests].sort(
    (questA, questB) => getQuestFirstRow(questA) - getQuestFirstRow(questB)
  );
}

function sortTreeByFirstRow(tree: InitialTreeNode[]) {
  return [...tree].sort((nodeA, nodeB) => {
    if (nodeA.parent !== ROOT_ID || nodeB.parent !== ROOT_ID) {
      return 0;
    }

    return getNodeFirstRow(nodeA) - getNodeFirstRow(nodeB);
  });
}

function getQuestFirstRow(quest: CsvDataQuest): number {
  const questRows = quest.rowNumbers.length ? quest.rowNumbers : [Infinity];
  const assetRows = quest.assets.map((asset) => asset.rowNumber);
  const childRows: number[] = quest.quests.map(getQuestFirstRow);

  return Math.min(...questRows, ...assetRows, ...childRows);
}

function getNodeFirstRow(node: InitialTreeNode) {
  if (node.data?.type === 'asset') {
    return node.data.asset.rowNumber;
  }

  if (node.data?.type === 'quest') {
    return node.data.rowNumbers[0] ?? Infinity;
  }

  return Infinity;
}

function getCsvQuestNodeId(
  quest: CsvDataQuest,
  parentId: InitialTreeNode['id']
) {
  return `csv-quest:${parentId}:${getQuestFirstRow(quest)}:${normalizeIdPart(
    quest.name
  )}`;
}

function getCsvAssetNodeId(
  context: string,
  asset: CsvDataAsset,
  index: number
) {
  return `csv-asset:${context}:${asset.rowNumber}:${index}:${normalizeIdPart(
    asset.name
  )}`;
}

function normalizeMatchName(value: string | undefined) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeIdPart(value: string) {
  return normalizeMatchName(value) || 'unnamed';
}

function getBookNodeId(bookId: string) {
  return `book:${bookId}`;
}

function getChapterNodeId(bookId: string, chapterNumber: number) {
  return `chapter:${bookId}:${chapterNumber}`;
}

function getPericopeNodeId(bookId: string, pericopeId: string) {
  return `pericope:${bookId}:${pericopeId}`;
}

function getPericopeNameFromId(pericopeId: string): string {
  const separatorIndex = pericopeId.indexOf('-');

  if (separatorIndex === -1 || separatorIndex === pericopeId.length - 1) {
    return pericopeId;
  }

  return pericopeId.slice(separatorIndex + 1);
}

function getPericopeLabel(pericope: FiaPericope): string {
  return `${getPericopeNameFromId(pericope.id)} ${pericope.verseRange}`;
}

export { buildBible, buildFIA, buildInitialTreeData, buildTemplateTree };
export type {
  BuildInitialTreeDataParams,
  BuildTemplateTreeParams,
  InitialTreeDataResult,
  InitialTreeNode,
  InitialTreeNodeData,
  TemplateTreeNode,
  TemplateTreeNodeData
};
