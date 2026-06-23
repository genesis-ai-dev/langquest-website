import { BIBLE_BOOKS } from '@/components/QuestExplorer/template-strategies/bible.template';
import { BIBLE_BOOKS as FIA_BIBLE_BOOKS } from '@/components/QuestExplorer/template-strategies/fia.template';

import type { InitialTreeNode, InitialTreeNodeData } from './tree-build';

type NormalizeContentTreeParams<TNode extends InitialTreeNode> = {
  tree: TNode[];
  template: string;
};

type NormalizeAssetUploadContentTreeParams<TNode extends InitialTreeNode> = {
  tree: TNode[];
  template: string;
  selectedQuestMetadata?: Record<string, unknown> | null;
};

type ValidationSummary = {
  errors: number;
  warnings: number;
};

type NormalizeContentTreeResult<TNode extends InitialTreeNode> = {
  tree: TNode[];
  summary: ValidationSummary;
};

type ValidationSeverity = 'error' | 'warning';

type ValidationContext<TNode extends InitialTreeNode> = {
  tree: TNode[];
  nodesById: Map<InitialTreeNode['id'], TNode>;
  childrenByParent: Map<InitialTreeNode['id'], TNode[]>;
  issuesByNodeId: Map<InitialTreeNode['id'], string[]>;
  severitiesByNodeId: Map<InitialTreeNode['id'], ValidationSeverity>;
  flagsByNodeId: Map<InitialTreeNode['id'], ValidationSeverity>;
};

type BibleVerseRange = {
  start: number;
  end: number;
};

type FiaVerseRef = {
  chapter: number;
  verse: number;
};

type FiaVerseRange = {
  start: FiaVerseRef;
  end: FiaVerseRef;
};

type ComparableAssetRange<TNode extends InitialTreeNode> = {
  node: TNode;
  start: number;
  end: number;
};

function normalizeContentTree<TNode extends InitialTreeNode>({
  tree,
  template
}: NormalizeContentTreeParams<TNode>): TNode[] {
  return normalizeContentTreeWithSummary({ tree, template }).tree;
}

function normalizeContentTreeWithSummary<TNode extends InitialTreeNode>({
  tree,
  template
}: NormalizeContentTreeParams<TNode>): NormalizeContentTreeResult<TNode> {
  const treeWithContent = clearValidationState(recomputeHasContent(tree));

  switch (template) {
    case 'bible':
      return normalizeBibleContentTree(treeWithContent);
    case 'fia':
      return normalizeFiaContentTree(treeWithContent);
    case 'unstructured':
    default:
      return normalizeUnstructuredContentTree(treeWithContent);
  }
}

function normalizeAssetUploadContentTreeWithSummary<
  TNode extends InitialTreeNode
>({
  tree,
  template,
  selectedQuestMetadata
}: NormalizeAssetUploadContentTreeParams<TNode>): NormalizeContentTreeResult<TNode> {
  const treeWithContent = clearValidationState(recomputeHasContent(tree));

  switch (template) {
    case 'bible':
      return normalizeBibleAssetUploadTree(
        treeWithContent,
        selectedQuestMetadata
      );
    case 'fia':
      return normalizeFiaAssetUploadTree(
        treeWithContent,
        selectedQuestMetadata
      );
    case 'unstructured':
    default:
      return normalizeUnstructuredAssetUploadTree(treeWithContent);
  }
}

function recomputeHasContent<TNode extends InitialTreeNode>(
  tree: TNode[]
): TNode[] {
  const childrenByParent = new Map<InitialTreeNode['id'], TNode[]>();
  const hasContentByNodeId = new Map<InitialTreeNode['id'], boolean>();

  tree.forEach((node) => {
    const siblings = childrenByParent.get(node.parent) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parent, siblings);
  });

  function hasNodeContent(node: TNode): boolean {
    const cachedValue = hasContentByNodeId.get(node.id);

    if (typeof cachedValue === 'boolean') {
      return cachedValue;
    }

    const hasOwnContent = node.data?.type === 'asset';
    const children = childrenByParent.get(node.id) ?? [];
    const hasChildContent = children.some(hasNodeContent);
    const hasContent = hasOwnContent || hasChildContent;

    hasContentByNodeId.set(node.id, hasContent);

    return hasContent;
  }

  return tree.map((node) => ({
    ...node,
    data: node.data
      ? {
          ...node.data,
          hasContent: hasNodeContent(node)
        }
      : node.data
  })) as TNode[];
}

function normalizeBibleContentTree<TNode extends InitialTreeNode>(
  tree: TNode[]
): NormalizeContentTreeResult<TNode> {
  const context = createValidationContext(tree);
  const chapterNodes = tree.filter((node) => node.data?.type === 'chapter');

  chapterNodes.forEach((chapterNode) => {
    if (!chapterNode.data?.hasContent || chapterNode.data.type !== 'chapter') {
      return;
    }

    const verseCount = chapterNode.data.verseCount;
    if (!verseCount) {
      validateAssetLabelsInContainer(context, chapterNode, () => ({
        error: 'Chapter verse count is missing.'
      }));
      return;
    }

    validateAssetLabelsInContainer(context, chapterNode, (assetNode) => {
      const label =
        assetNode.data?.type === 'asset' ? assetNode.data.asset.label : '';
      const parsedRange = parseBibleVerseRange(label);

      if (!parsedRange) {
        return {
          error:
            'Bible label must be a verse number or range, for example 1 or 1-3.'
        };
      }

      if (parsedRange.start > parsedRange.end) {
        return { error: 'Bible label range must start before it ends.' };
      }

      if (parsedRange.start < 1 || parsedRange.end > verseCount) {
        return {
          error: `Bible label must be within verses 1-${verseCount}.`
        };
      }

      return {
        range: {
          node: assetNode,
          start: parsedRange.start,
          end: parsedRange.end
        }
      };
    });
  });

  return applyValidationContext(context);
}

function normalizeFiaContentTree<TNode extends InitialTreeNode>(
  tree: TNode[]
): NormalizeContentTreeResult<TNode> {
  const context = createValidationContext(tree);
  const pericopeNodes = tree.filter((node) => node.data?.type === 'pericope');

  pericopeNodes.forEach((pericopeNode) => {
    if (
      !pericopeNode.data?.hasContent ||
      pericopeNode.data.type !== 'pericope'
    ) {
      return;
    }

    const pericopeData = pericopeNode.data;
    const book = FIA_BIBLE_BOOKS.find(
      (item) => item.id === pericopeData.bookId
    );
    const pericopeRange = getPericopeVerseRange(pericopeNode);

    if (!book) {
      validateAssetLabelsInContainer(context, pericopeNode, () => ({
        error: 'FIA book metadata is missing.'
      }));
      return;
    }

    if (
      !pericopeRange ||
      !isFiaVerseRangeInsideBook(book.verses, pericopeRange)
    ) {
      validateAssetLabelsInContainer(context, pericopeNode, () => ({
        error: 'FIA pericope range is invalid.'
      }));
      return;
    }

    const pericopeStart = toAbsoluteVerse(book.verses, pericopeRange.start);
    const pericopeEnd = toAbsoluteVerse(book.verses, pericopeRange.end);

    if (pericopeStart > pericopeEnd) {
      validateAssetLabelsInContainer(context, pericopeNode, () => ({
        error: 'FIA pericope range must start before it ends.'
      }));
      return;
    }

    validateAssetLabelsInContainer(context, pericopeNode, (assetNode) => {
      const label =
        assetNode.data?.type === 'asset' ? assetNode.data.asset.label : '';
      const parsedRange = parseFiaVerseRange(label);

      if (!parsedRange) {
        return {
          error:
            'FIA label must use chapter:verse, for example 3:33 or 3:33-4:2.'
        };
      }

      if (!isFiaVerseRangeInsideBook(book.verses, parsedRange)) {
        return {
          error:
            'FIA label references a verse that does not exist in this book.'
        };
      }

      const assetStart = toAbsoluteVerse(book.verses, parsedRange.start);
      const assetEnd = toAbsoluteVerse(book.verses, parsedRange.end);

      if (assetStart > assetEnd) {
        return { error: 'FIA label range must start before it ends.' };
      }

      if (assetStart < pericopeStart || assetEnd > pericopeEnd) {
        return {
          error: 'FIA label must be inside the pericope verse range.'
        };
      }

      return {
        range: {
          node: assetNode,
          start: assetStart,
          end: assetEnd
        }
      };
    });
  });

  return applyValidationContext(context);
}

function normalizeUnstructuredContentTree<TNode extends InitialTreeNode>(
  tree: TNode[]
): NormalizeContentTreeResult<TNode> {
  return {
    tree,
    summary: createEmptyValidationSummary()
  };
}

function normalizeUnstructuredAssetUploadTree<TNode extends InitialTreeNode>(
  tree: TNode[]
): NormalizeContentTreeResult<TNode> {
  const context = createValidationContext(tree);
  validateDuplicateAssetNamesForUpload(
    context,
    tree.filter((node) => node.data?.type === 'asset')
  );
  return applyValidationContext(context);
}

function normalizeBibleAssetUploadTree<TNode extends InitialTreeNode>(
  tree: TNode[],
  selectedQuestMetadata?: Record<string, unknown> | null
): NormalizeContentTreeResult<TNode> {
  const context = createValidationContext(tree);
  const assetNodes = tree.filter((node) => node.data?.type === 'asset');
  const bibleMetadata = getBibleQuestMetadata(selectedQuestMetadata);
  const book = BIBLE_BOOKS.find((item) => item.id === bibleMetadata?.book);
  const verseCount =
    book && bibleMetadata?.chapter
      ? book.verses[bibleMetadata.chapter - 1]
      : undefined;
  const comparableRanges: ComparableAssetRange<TNode>[] = [];

  assetNodes.forEach((assetNode) => {
    if (assetNode.data?.type !== 'asset' || !assetNode.data.asset.label) {
      return;
    }

    const parsedRange = parseBibleVerseRange(assetNode.data.asset.label);

    if (!parsedRange) {
      addUploadAssetIssue(
        context,
        assetNode,
        'Bible label must be a verse number or range, for example 1 or 1-3.'
      );
      return;
    }

    if (parsedRange.start > parsedRange.end) {
      addUploadAssetIssue(
        context,
        assetNode,
        'Bible label range must start before it ends.'
      );
      return;
    }

    if (!verseCount) {
      addUploadAssetIssue(
        context,
        assetNode,
        'Selected quest chapter metadata is missing.'
      );
      return;
    }

    if (parsedRange.start < 1 || parsedRange.end > verseCount) {
      addUploadAssetIssue(
        context,
        assetNode,
        `Bible label must be within verses 1-${verseCount}.`
      );
      return;
    }

    comparableRanges.push({
      node: assetNode,
      start: parsedRange.start,
      end: parsedRange.end
    });
  });

  validateDuplicateAssetNamesForUpload(context, assetNodes);
  validateInterleavedRangesForUpload(context, comparableRanges);

  return applyValidationContext(context);
}

function normalizeFiaAssetUploadTree<TNode extends InitialTreeNode>(
  tree: TNode[],
  selectedQuestMetadata?: Record<string, unknown> | null
): NormalizeContentTreeResult<TNode> {
  const context = createValidationContext(tree);
  const assetNodes = tree.filter((node) => node.data?.type === 'asset');
  const fiaMetadata = getFiaQuestMetadata(selectedQuestMetadata);
  const book = FIA_BIBLE_BOOKS.find((item) => item.id === fiaMetadata?.bookId);
  const pericopeRange = fiaMetadata?.verseRange
    ? parseFiaVerseRange(fiaMetadata.verseRange)
    : null;
  const comparableRanges: ComparableAssetRange<TNode>[] = [];

  assetNodes.forEach((assetNode) => {
    if (assetNode.data?.type !== 'asset' || !assetNode.data.asset.label) {
      return;
    }

    const parsedRange = parseFiaVerseRange(assetNode.data.asset.label);

    if (!parsedRange) {
      addUploadAssetIssue(
        context,
        assetNode,
        'FIA label must use chapter:verse, for example 3:33 or 3:33-4:2.'
      );
      return;
    }

    if (!book || !pericopeRange) {
      addUploadAssetIssue(
        context,
        assetNode,
        'Selected quest FIA metadata is missing.'
      );
      return;
    }

    if (!isFiaVerseRangeInsideBook(book.verses, parsedRange)) {
      addUploadAssetIssue(
        context,
        assetNode,
        'FIA label references a verse that does not exist in this book.'
      );
      return;
    }

    const assetStart = toAbsoluteVerse(book.verses, parsedRange.start);
    const assetEnd = toAbsoluteVerse(book.verses, parsedRange.end);
    const pericopeStart = toAbsoluteVerse(book.verses, pericopeRange.start);
    const pericopeEnd = toAbsoluteVerse(book.verses, pericopeRange.end);

    if (assetStart > assetEnd) {
      addUploadAssetIssue(
        context,
        assetNode,
        'FIA label range must start before it ends.'
      );
      return;
    }

    if (assetStart < pericopeStart || assetEnd > pericopeEnd) {
      addUploadAssetIssue(
        context,
        assetNode,
        'FIA label must be inside the selected pericope verse range.'
      );
      return;
    }

    comparableRanges.push({
      node: assetNode,
      start: assetStart,
      end: assetEnd
    });
  });

  validateDuplicateAssetNamesForUpload(context, assetNodes);
  validateInterleavedRangesForUpload(context, comparableRanges);

  return applyValidationContext(context);
}

function validateAssetLabelsInContainer<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>,
  containerNode: TNode,
  validateAsset: (
    assetNode: TNode
  ) => { error: string } | { range: ComparableAssetRange<TNode> } | null
) {
  const assetNodes = getDescendantAssetNodes(context, containerNode);
  const comparableRanges: ComparableAssetRange<TNode>[] = [];

  assetNodes.forEach((assetNode) => {
    if (assetNode.data?.type !== 'asset' || !assetNode.data.asset.label) {
      return;
    }

    const validationResult = validateAsset(assetNode);

    if (!validationResult) {
      return;
    }

    if ('error' in validationResult) {
      addNodeIssue(context, assetNode, validationResult.error);
      return;
    }

    comparableRanges.push(validationResult.range);
  });

  validateDuplicateAssetNames(context, assetNodes);
  validateInterleavedRanges(context, comparableRanges);
}

function validateDuplicateAssetNames<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>,
  assetNodes: TNode[]
) {
  const assetsByName = new Map<string, TNode[]>();

  assetNodes.forEach((assetNode) => {
    if (assetNode.data?.type !== 'asset') {
      return;
    }

    const normalizedAssetName = normalizeAssetName(assetNode.data.asset.name);

    if (!normalizedAssetName) {
      return;
    }

    const matchingAssets = assetsByName.get(normalizedAssetName) ?? [];
    matchingAssets.push(assetNode);
    assetsByName.set(normalizedAssetName, matchingAssets);
  });

  assetsByName.forEach((matchingAssets) => {
    if (matchingAssets.length < 2) {
      return;
    }

    matchingAssets.forEach((assetNode) => {
      addNodeIssue(
        context,
        assetNode,
        'Another asset in this container has the same name.',
        'warning'
      );
    });
  });
}

function validateDuplicateAssetNamesForUpload<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>,
  assetNodes: TNode[]
) {
  const assetsByName = new Map<string, TNode[]>();

  assetNodes.forEach((assetNode) => {
    if (assetNode.data?.type !== 'asset') {
      return;
    }

    const normalizedAssetName = normalizeAssetName(assetNode.data.asset.name);

    if (!normalizedAssetName) {
      return;
    }

    const matchingAssets = assetsByName.get(normalizedAssetName) ?? [];
    matchingAssets.push(assetNode);
    assetsByName.set(normalizedAssetName, matchingAssets);
  });

  assetsByName.forEach((matchingAssets) => {
    if (matchingAssets.length < 2) {
      return;
    }

    matchingAssets.forEach((assetNode) => {
      addUploadAssetIssue(
        context,
        assetNode,
        'Another asset in this quest has the same name.',
        'warning'
      );
    });
  });
}

function validateInterleavedRanges<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>,
  ranges: ComparableAssetRange<TNode>[]
) {
  ranges.forEach((rangeA, index) => {
    ranges.slice(index + 1).forEach((rangeB) => {
      if (rangeA.start === rangeB.start && rangeA.end === rangeB.end) {
        return;
      }

      if (rangeA.start <= rangeB.end && rangeB.start <= rangeA.end) {
        addNodeIssue(
          context,
          rangeA.node,
          'Asset label overlaps another asset label in the same container.'
        );
        addNodeIssue(
          context,
          rangeB.node,
          'Asset label overlaps another asset label in the same container.'
        );
      }
    });
  });
}

function validateInterleavedRangesForUpload<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>,
  ranges: ComparableAssetRange<TNode>[]
) {
  ranges.forEach((rangeA, index) => {
    ranges.slice(index + 1).forEach((rangeB) => {
      if (rangeA.start === rangeB.start && rangeA.end === rangeB.end) {
        return;
      }

      if (rangeA.start <= rangeB.end && rangeB.start <= rangeA.end) {
        addUploadAssetIssue(
          context,
          rangeA.node,
          'Asset label overlaps another asset label in this quest.'
        );
        addUploadAssetIssue(
          context,
          rangeB.node,
          'Asset label overlaps another asset label in this quest.'
        );
      }
    });
  });
}

function createValidationContext<TNode extends InitialTreeNode>(
  tree: TNode[]
): ValidationContext<TNode> {
  const nodesById = new Map<InitialTreeNode['id'], TNode>();
  const childrenByParent = new Map<InitialTreeNode['id'], TNode[]>();

  tree.forEach((node) => {
    nodesById.set(node.id, node);

    const siblings = childrenByParent.get(node.parent) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parent, siblings);
  });

  return {
    tree,
    nodesById,
    childrenByParent,
    issuesByNodeId: new Map(),
    severitiesByNodeId: new Map(),
    flagsByNodeId: new Map()
  };
}

function addNodeIssue<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>,
  node: TNode,
  issue: string,
  severity: ValidationSeverity = 'error'
) {
  const nodeIssues = context.issuesByNodeId.get(node.id) ?? [];

  if (!nodeIssues.includes(issue)) {
    nodeIssues.push(issue);
  }

  context.issuesByNodeId.set(node.id, nodeIssues);
  context.severitiesByNodeId.set(
    node.id,
    getPrioritizedSeverity(context.severitiesByNodeId.get(node.id), severity)
  );
  markParentFlags(context, node.parent, severity);
}

function addUploadAssetIssue<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>,
  node: TNode,
  issue: string,
  severity: ValidationSeverity = 'error'
) {
  if (node.data?.type === 'asset' && node.data.isExistingAsset) {
    return;
  }

  addNodeIssue(context, node, issue, severity);
}

function markParentFlags<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>,
  nodeId: InitialTreeNode['id'],
  severity: ValidationSeverity
) {
  const node = context.nodesById.get(nodeId);

  if (!node) {
    return;
  }

  context.flagsByNodeId.set(
    node.id,
    getPrioritizedSeverity(context.flagsByNodeId.get(node.id), severity)
  );
  markParentFlags(context, node.parent, severity);
}

function applyValidationContext<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>
): NormalizeContentTreeResult<TNode> {
  const summary = createEmptyValidationSummary();
  const tree = context.tree.map((node) => {
    const issues = context.issuesByNodeId.get(node.id) ?? [];
    const severity = context.severitiesByNodeId.get(node.id);
    const flag = context.flagsByNodeId.get(node.id) ?? null;

    if (issues.length > 0 && severity === 'error') {
      summary.errors += 1;
    }

    if (issues.length > 0 && severity === 'warning') {
      summary.warnings += 1;
    }

    return {
      ...node,
      data: node.data
        ? ({
            ...node.data,
            validationStatus: issues.length > 0 ? severity : undefined,
            validationMessage: issues.length > 0 ? issues.join(' ') : undefined,
            flag
          } as InitialTreeNodeData)
        : node.data
    };
  }) as TNode[];

  return {
    tree,
    summary
  };
}

function createEmptyValidationSummary(): ValidationSummary {
  return {
    errors: 0,
    warnings: 0
  };
}

function clearValidationState<TNode extends InitialTreeNode>(
  tree: TNode[]
): TNode[] {
  return tree.map((node) => ({
    ...node,
    data: node.data
      ? ({
          ...node.data,
          validationStatus: undefined,
          validationMessage: undefined,
          flag: null
        } as InitialTreeNodeData)
      : node.data
  })) as TNode[];
}

function getPrioritizedSeverity(
  currentSeverity: ValidationSeverity | undefined,
  nextSeverity: ValidationSeverity
) {
  if (currentSeverity === 'error' || nextSeverity === 'error') {
    return 'error';
  }

  return 'warning';
}

function getDescendantAssetNodes<TNode extends InitialTreeNode>(
  context: ValidationContext<TNode>,
  node: TNode
): TNode[] {
  const children = context.childrenByParent.get(node.id) ?? [];

  return children.flatMap((childNode) => {
    if (childNode.data?.type === 'asset') {
      return [childNode];
    }

    return getDescendantAssetNodes(context, childNode);
  });
}

function normalizeAssetName(assetName: string) {
  return assetName.trim().toLowerCase();
}

function getBibleQuestMetadata(metadata?: Record<string, unknown> | null) {
  return (metadata?.bible || null) as {
    book?: string;
    chapter?: number;
  } | null;
}

function getFiaQuestMetadata(metadata?: Record<string, unknown> | null) {
  return (metadata?.fia || null) as {
    bookId?: string;
    pericopeId?: string;
    verseRange?: string;
  } | null;
}

function parseBibleVerseRange(label: string): BibleVerseRange | null {
  const match = label.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);

  if (!match) {
    return null;
  }

  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);

  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return null;
  }

  return { start, end };
}

function parseFiaVerseRange(label: string): FiaVerseRange | null {
  const match = label.trim().match(/^(\d+):(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?$/);

  if (!match) {
    return null;
  }

  const startChapter = Number(match[1]);
  const startVerse = Number(match[2]);
  const endChapter = Number(match[3] ?? match[1]);
  const endVerse = Number(match[4] ?? match[2]);

  if (
    !Number.isInteger(startChapter) ||
    !Number.isInteger(startVerse) ||
    !Number.isInteger(endChapter) ||
    !Number.isInteger(endVerse)
  ) {
    return null;
  }

  return {
    start: {
      chapter: startChapter,
      verse: startVerse
    },
    end: {
      chapter: endChapter,
      verse: endVerse
    }
  };
}

function getPericopeVerseRange(
  pericopeNode: InitialTreeNode
): FiaVerseRange | null {
  if (pericopeNode.data?.type !== 'pericope') {
    return null;
  }

  const {
    pericopeStartChapter,
    pericopeStartVerse,
    pericopeEndChapter,
    pericopeEndVerse,
    pericopeVerseRange
  } = pericopeNode.data;

  if (
    typeof pericopeStartChapter === 'number' &&
    typeof pericopeStartVerse === 'number' &&
    typeof pericopeEndChapter === 'number' &&
    typeof pericopeEndVerse === 'number'
  ) {
    return {
      start: {
        chapter: pericopeStartChapter,
        verse: pericopeStartVerse
      },
      end: {
        chapter: pericopeEndChapter,
        verse: pericopeEndVerse
      }
    };
  }

  return pericopeVerseRange ? parseFiaVerseRange(pericopeVerseRange) : null;
}

function isFiaVerseRangeInsideBook(
  versesPerChapter: number[],
  range: FiaVerseRange
) {
  return (
    isFiaVerseRefInsideBook(versesPerChapter, range.start) &&
    isFiaVerseRefInsideBook(versesPerChapter, range.end)
  );
}

function isFiaVerseRefInsideBook(
  versesPerChapter: number[],
  reference: FiaVerseRef
) {
  const verseCount = versesPerChapter[reference.chapter - 1];

  return Boolean(
    verseCount && reference.verse >= 1 && reference.verse <= verseCount
  );
}

function toAbsoluteVerse(versesPerChapter: number[], reference: FiaVerseRef) {
  const previousChaptersVerseCount = versesPerChapter
    .slice(0, reference.chapter - 1)
    .reduce((sum, verseCount) => sum + verseCount, 0);

  return previousChaptersVerseCount + reference.verse;
}

export {
  normalizeContentTree,
  normalizeAssetUploadContentTreeWithSummary,
  normalizeContentTreeWithSummary,
  recomputeHasContent
};
export type {
  NormalizeAssetUploadContentTreeParams,
  NormalizeContentTreeParams,
  NormalizeContentTreeResult,
  ValidationSummary
};
