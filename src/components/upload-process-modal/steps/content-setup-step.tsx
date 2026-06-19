import * as React from 'react';
import {
  Tree,
  type DropOptions,
  type NodeModel
} from '@minoru/react-dnd-treeview';
import type { AssetSummary } from '@/app/db/questExplorer';
import {
  ChevronDown,
  ChevronRight,
  CircleX,
  FileText,
  Folder,
  MoveLeft,
  MoveRight,
  Pencil,
  TriangleAlert
} from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { Spinner } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BIBLE_BOOKS as FIA_BIBLE_BOOKS } from '@/components/QuestExplorer/template-strategies/fia.template';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import { createBrowserClient } from '@/lib/supabase/client';

import {
  ModalEditAsset,
  type ModalEditAssetValues
} from '../components/modal-edit-asset';
import { buildCsvFromProjectTree } from '../lib/csv-data-build';
import type { CsvDataAsset } from '../lib/csv-data-build';
import type { UploadProcessStepProps } from '../lib/types';
import {
  buildInitialTreeData,
  buildTemplateTree,
  type InitialTreeNodeData
} from '../lib/tree-build';
import {
  normalizeAssetUploadContentTreeWithSummary,
  normalizeContentTreeWithSummary,
  recomputeHasContent
} from '../lib/tree-validation';

type ContentNodeData = InitialTreeNodeData & {
  locked?: boolean;
  validationStatus?: 'error' | 'warning' | 'valid';
};

type ContentNode = NodeModel<ContentNodeData>;

type EditingAssetNode = {
  nodeId: ContentNode['id'];
  source: 'project' | 'undefined';
  asset: CsvDataAsset;
};

const ROOT_ID = 0;
const EMPTY_EXISTING_QUEST_ASSETS: AssetSummary[] = [];

function normalizeQuestMetadata(
  metadata: unknown
): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }

  if (typeof metadata === 'string') {
    try {
      const parsedMetadata = JSON.parse(metadata);
      return normalizeQuestMetadata(parsedMetadata);
    } catch {
      return null;
    }
  }

  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  return null;
}

async function fetchProjectSourceLanguageId(
  projectId: string,
  supabase: ReturnType<typeof createBrowserClient>
) {
  const { data, error } = await supabase
    .from('project_language_link')
    .select('languoid_id')
    .eq('project_id', projectId)
    .eq('language_type', 'source')
    .not('languoid_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.languoid_id ?? null;
}

function buildAssetUploadTree({
  csvAssets,
  existingAssets,
  selectedQuestMetadata,
  template
}: {
  csvAssets: CsvDataAsset[];
  existingAssets: AssetSummary[];
  selectedQuestMetadata?: Record<string, unknown> | null;
  template: string;
}): ContentNode[] {
  const existingNodes: ContentNode[] = existingAssets.map((asset, index) => ({
    id: `existing-asset:${asset.id}`,
    parent: ROOT_ID,
    text: asset.name || `Existing asset ${index + 1}`,
    droppable: false,
    data: {
      type: 'asset',
      lockedToDrop: true,
      lockedToDrag: true,
      hasContent: true,
      isExistingAsset: true,
      existingAssetId: asset.id,
      questName: '',
      parentQuestName: '',
      asset: {
        type: 'asset',
        name: asset.name || `Existing asset ${index + 1}`,
        tags: [],
        label: getExistingAssetLabel(asset, selectedQuestMetadata, template),
        sourceLanguage: '',
        sourceImages: asset.images ?? [],
        sourceContent: asset.content?.[0]?.text ?? '',
        sourceAudio: [],
        rowNumber: 0
      }
    }
  }));

  const uploadedNodes: ContentNode[] = csvAssets.map((asset, index) => ({
    id: `csv-asset:${asset.rowNumber}:${index}`,
    parent: ROOT_ID,
    text: asset.name,
    droppable: false,
    data: {
      type: 'asset',
      lockedToDrop: true,
      lockedToDrag: false,
      hasContent: true,
      questName: '',
      parentQuestName: '',
      asset
    }
  }));

  return sortAssetUploadTree([...existingNodes, ...uploadedNodes]);
}

function sortAssetUploadTree(tree: ContentNode[]) {
  return [...tree].sort((nodeA, nodeB) => {
    const nodeAIsExisting =
      nodeA.data?.type === 'asset' && nodeA.data.isExistingAsset;
    const nodeBIsExisting =
      nodeB.data?.type === 'asset' && nodeB.data.isExistingAsset;

    if (nodeAIsExisting !== nodeBIsExisting) {
      return nodeAIsExisting ? -1 : 1;
    }

    return 0;
  });
}

function getExistingAssetLabel(
  asset: AssetSummary,
  selectedQuestMetadata: Record<string, unknown> | null | undefined,
  template: string
) {
  const verse = (
    asset.metadata as { verse?: { from?: number; to?: number } } | null
  )?.verse;

  if (typeof verse?.from !== 'number') {
    return '';
  }

  const to = typeof verse.to === 'number' ? verse.to : verse.from;

  if (template === 'fia') {
    return getExistingFiaAssetLabel(verse.from, to, selectedQuestMetadata);
  }

  return verse.from === to ? `${verse.from}` : `${verse.from}-${to}`;
}

function getExistingFiaAssetLabel(
  from: number,
  to: number,
  selectedQuestMetadata: Record<string, unknown> | null | undefined
) {
  const fiaMetadata = (selectedQuestMetadata?.fia || null) as {
    bookId?: string;
    verseRange?: string;
  } | null;
  const book = FIA_BIBLE_BOOKS.find((item) => item.id === fiaMetadata?.bookId);
  const pericopeRange = fiaMetadata?.verseRange
    ? parseFiaVerseRange(fiaMetadata.verseRange)
    : null;

  if (!book || !pericopeRange) {
    return from === to ? `${from}` : `${from}-${to}`;
  }

  const fromReference = resolveSequentialVerseToReference(
    book.verses,
    pericopeRange.start.chapter,
    pericopeRange.start.verse,
    from
  );
  const toReference = resolveSequentialVerseToReference(
    book.verses,
    pericopeRange.start.chapter,
    pericopeRange.start.verse,
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

function parseFiaVerseRange(label: string) {
  const match = label
    .trim()
    .match(/^(\d+):(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?$/);

  if (!match) {
    return null;
  }

  return {
    start: {
      chapter: Number(match[1]),
      verse: Number(match[2])
    },
    end: {
      chapter: Number(match[3] ?? match[1]),
      verse: Number(match[4] ?? match[2])
    }
  };
}

function resolveSequentialVerseToReference(
  versesPerChapter: number[],
  startChapter: number,
  startVerse: number,
  offset: number
) {
  let remaining = offset - 1;

  for (
    let chapterIndex = Math.max(startChapter - 1, 0);
    chapterIndex < versesPerChapter.length;
    chapterIndex += 1
  ) {
    const chapter = chapterIndex + 1;
    const firstVerse = chapter === startChapter ? startVerse : 1;
    const verseCount = versesPerChapter[chapterIndex];
    const versesAvailable = verseCount - firstVerse + 1;

    if (remaining < versesAvailable) {
      return {
        chapter,
        verse: firstVerse + remaining
      };
    }

    remaining -= versesAvailable;
  }

  return null;
}

// const initialProjectStructure: ContentNode[] = [
//   {
//     id: 1,
//     parent: ROOT_ID,
//     text: 'Genesis',
//     droppable: true,
//     data: { type: 'quest', locked: true }
//   },
//   {
//     id: 2,
//     parent: 1,
//     text: 'Genesis 1',
//     droppable: true,
//     data: { type: 'quest' }
//   },
//   {
//     id: 3,
//     parent: 2,
//     text: 'Genesis 1 verses 1-3',
//     droppable: false,
//     data: { type: 'asset' }
//   }
// ];

// const initialUndefinedItems: ContentNode[] = [
//   {
//     id: 101,
//     parent: ROOT_ID,
//     text: 'Genesis 1 verse 4',
//     droppable: false,
//     data: { type: 'asset' }
//   },
//   {
//     id: 102,
//     parent: ROOT_ID,
//     text: 'Genesis 2',
//     droppable: true,
//     data: { type: 'quest' }
//   },
//   {
//     id: 103,
//     parent: ROOT_ID,
//     text: 'Genesis 2 reflection',
//     droppable: false,
//     data: { type: 'asset' }
//   }
// ];

function ContentSetupStep({
  uploadType,
  projectId,
  projectTemplate,
  projectFiaContentLanguage,
  selectedQuest,
  existingQuestAssets,
  projectSetup,
  validationResult,
  onGeneratedCsvContentChange,
  onValidityChange
}: UploadProcessStepProps) {
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const stableExistingQuestAssets =
    existingQuestAssets ?? EMPTY_EXISTING_QUEST_ASSETS;
  const [projectStructure, setProjectStructure] = React.useState<ContentNode[]>(
    []
  );
  const [undefinedItems, setUndefinedItems] = React.useState<ContentNode[]>([]);
  const [isBuildingTree, setIsBuildingTree] = React.useState(false);
  const [treeBuildError, setTreeBuildError] = React.useState<string | null>(
    null
  );
  const [selectedProjectNodeId, setSelectedProjectNodeId] = React.useState<
    ContentNode['id'] | null
  >(null);
  const [selectedUndefinedNodeId, setSelectedUndefinedNodeId] = React.useState<
    ContentNode['id'] | null
  >(null);
  const [editingAssetNode, setEditingAssetNode] =
    React.useState<EditingAssetNode | null>(null);
  const [discardUndefinedItems, setDiscardUndefinedItems] =
    React.useState(false);
  const [validationCounts, setValidationCounts] = React.useState({
    errors: 0,
    warnings: 0
  });
  const template = projectSetup?.template || projectTemplate || 'unstructured';
  const isAssetUpload = uploadType === 'asset';
  const selectedQuestMetadata = React.useMemo(
    () => normalizeQuestMetadata(selectedQuest?.metadata),
    [selectedQuest?.metadata]
  );
  const questAssetsTitle = selectedQuest?.name
    ? `Quest Assets: ${selectedQuest.name}`
    : 'Quest Assets';
  const selectedProjectNode = React.useMemo(
    () =>
      selectedProjectNodeId
        ? projectStructure.find((node) => node.id === selectedProjectNodeId)
        : null,
    [projectStructure, selectedProjectNodeId]
  );
  const selectedUndefinedNode = React.useMemo(
    () =>
      selectedUndefinedNodeId
        ? undefinedItems.find((node) => node.id === selectedUndefinedNodeId)
        : null,
    [undefinedItems, selectedUndefinedNodeId]
  );
  const canMoveToLeft = canMoveUndefinedNodeToProject({
    movingNode: selectedUndefinedNode,
    targetNode: selectedProjectNode,
    template,
    allowRootAssetTarget: isAssetUpload
  });
  const canMoveToRight = canMoveProjectNodeToUndefined({
    movingNode: selectedProjectNode,
    targetNode: selectedUndefinedNode
  });
  const isContentSetupValid =
    validationCounts.errors === 0 &&
    (undefinedItems.length === 0 || discardUndefinedItems);

  React.useEffect(() => {
    onValidityChange?.(isContentSetupValid);
  }, [isContentSetupValid, onValidityChange]);

  React.useEffect(() => {
    if (!onGeneratedCsvContentChange) {
      return;
    }

    if (projectStructure.length === 0) {
      onGeneratedCsvContentChange('');
      return;
    }

    onGeneratedCsvContentChange(
      buildCsvFromProjectTree({
        tree: projectStructure,
        uploadType,
        projectSetup
      })
    );
  }, [onGeneratedCsvContentChange, projectSetup, projectStructure, uploadType]);

  React.useEffect(() => {
    if (uploadType === 'project' && !projectSetup) {
      setProjectStructure([]);
      setUndefinedItems([]);
      setValidationCounts(createEmptyValidationCounts());
      setTreeBuildError(null);
      setIsBuildingTree(false);
      return;
    }

    const csvData = validationResult?.csvData;

    if (uploadType === 'asset') {
      const assetTree = buildAssetUploadTree({
        csvAssets: csvData?.assets ?? [],
        existingAssets: stableExistingQuestAssets,
        selectedQuestMetadata,
        template
      });
      const normalizedAssetTree = normalizeAssetUploadContentTreeWithSummary({
        tree: assetTree,
        template,
        selectedQuestMetadata
      });

      setProjectStructure(normalizedAssetTree.tree);
      setUndefinedItems([]);
      setValidationCounts(normalizedAssetTree.summary);
      setTreeBuildError(null);
      setIsBuildingTree(false);
      setSelectedProjectNodeId(null);
      setSelectedUndefinedNodeId(null);
      return;
    }

    let isCancelled = false;

    setIsBuildingTree(true);
    setTreeBuildError(null);
    setSelectedProjectNodeId(null);
    setSelectedUndefinedNodeId(null);

    async function buildTree() {
      try {
        const language =
          projectSetup?.fiaContentLanguage ||
          projectFiaContentLanguage ||
          (template === 'fia' && projectId
            ? await fetchProjectSourceLanguageId(projectId, supabase)
            : null);
        const tree = await buildTemplateTree({ template, language });

        if (isCancelled) {
          return;
        }

        if (!csvData) {
          setProjectStructure(tree);
          setUndefinedItems([]);
          setValidationCounts(createEmptyValidationCounts());
          return;
        }

        const initialTreeData = buildInitialTreeData({
          template,
          templateTree: tree,
          csvData
        });

        const normalizedProjectTree = normalizeContentTreeWithSummary({
          tree: initialTreeData.projectStructure,
          template
        });

        setProjectStructure(normalizedProjectTree.tree);
        setValidationCounts(normalizedProjectTree.summary);
        setUndefinedItems(recomputeHasContent(initialTreeData.undefinedItems));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Unable to build the selected template tree.';

        setProjectStructure([]);
        setUndefinedItems([]);
        setValidationCounts(createEmptyValidationCounts());
        setTreeBuildError(message);
      } finally {
        if (!isCancelled) {
          setIsBuildingTree(false);
        }
      }
    }

    buildTree();

    return () => {
      isCancelled = true;
    };
  }, [
    projectFiaContentLanguage,
    projectId,
    projectSetup,
    selectedQuestMetadata,
    stableExistingQuestAssets,
    supabase,
    template,
    uploadType,
    validationResult?.csvData
  ]);

  function handleMoveToLeft() {
    if (!selectedUndefinedNodeId || !canMoveToLeft) {
      return;
    }

    const targetParentId =
      selectedProjectNode && canReceiveMovedNode(selectedProjectNode)
        ? selectedProjectNode.id
        : ROOT_ID;
    const movingNodes = collectNodeBranch(
      undefinedItems,
      selectedUndefinedNodeId
    );

    setUndefinedItems((currentItems) =>
      recomputeHasContent(
        currentItems.filter(
          (item) => !movingNodes.some((movingNode) => movingNode.id === item.id)
        )
      )
    );
    setProjectStructure((currentItems) =>
      normalizeProjectStructure({
        tree: [
          ...currentItems,
          ...movingNodes.map((node) =>
            node.id === selectedUndefinedNodeId
              ? {
                  ...node,
                  parent: targetParentId
                }
              : node
          )
        ]
      })
    );
    setSelectedUndefinedNodeId(null);
  }

  function handleMoveToRight() {
    if (!selectedProjectNodeId || !canMoveToRight) {
      return;
    }

    const targetParentId =
      selectedUndefinedNode && canReceiveMovedNode(selectedUndefinedNode)
        ? selectedUndefinedNode.id
        : ROOT_ID;
    const movingNodes = collectNodeBranch(
      projectStructure,
      selectedProjectNodeId
    );

    setProjectStructure((currentItems) =>
      normalizeProjectStructure({
        tree: currentItems.filter(
          (item) => !movingNodes.some((movingNode) => movingNode.id === item.id)
        )
      })
    );
    setUndefinedItems((currentItems) =>
      recomputeHasContent([
        ...currentItems,
        ...movingNodes.map((node) => {
          const cleanNode = clearTreeNodeValidation(node);

          return cleanNode.id === selectedProjectNodeId
            ? {
                ...cleanNode,
                parent: targetParentId
              }
            : cleanNode;
        })
      ])
    );
    setSelectedProjectNodeId(null);
  }

  function handleProjectStructureDrop(tree: ContentNode[]) {
    setProjectStructure(normalizeProjectStructure({ tree }));
  }

  function handleOpenAssetEdit(
    source: EditingAssetNode['source'],
    node: ContentNode
  ) {
    if (node.data?.type !== 'asset') {
      return;
    }

    setEditingAssetNode({
      nodeId: node.id,
      source,
      asset: node.data.asset
    });
  }

  function handleSaveAssetEdit(values: ModalEditAssetValues) {
    if (!editingAssetNode) {
      return;
    }

    if (editingAssetNode.source === 'project') {
      setProjectStructure((currentTree) =>
        normalizeProjectStructure({
          tree: updateAssetNode(currentTree, editingAssetNode.nodeId, values)
        })
      );
    } else {
      setUndefinedItems((currentTree) =>
        recomputeHasContent(
          updateAssetNode(currentTree, editingAssetNode.nodeId, values)
        )
      );
    }

    setEditingAssetNode(null);
  }

  function normalizeProjectStructure({
    tree
  }: {
    tree: ContentNode[];
  }): ContentNode[] {
    const normalizedTree =
      uploadType === 'asset'
        ? normalizeAssetUploadContentTreeWithSummary({
            tree: sortAssetUploadTree(tree),
            template,
            selectedQuestMetadata
          })
        : normalizeContentTreeWithSummary({
            tree,
            template
          });

    setValidationCounts(normalizedTree.summary);

    return normalizedTree.tree;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
        <div className="shrink-0 space-y-2">
          <h3 className="text-xl font-semibold">Content Setup</h3>
          <p className="text-sm text-muted-foreground">
            {isAssetUpload
              ? 'Review the assets from the CSV before processing. Existing assets from the selected quest are shown with lower opacity and are used to validate names and labels, but they will not be uploaded again.'
              : 'Review how the uploaded assets were matched to the selected project template. Move items between Project Structure and Undefined Items, place assets into the correct folders, and edit labels when needed. Fix all errors before continuing.'}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 overflow-hidden">
          {isAssetUpload ? (
            <TreePanel
              title={questAssetsTitle}
              tree={projectStructure}
              isLoading={isBuildingTree}
              error={treeBuildError}
              selectedNodeId={selectedProjectNodeId}
              onSelectNode={setSelectedProjectNodeId}
              onDrop={handleProjectStructureDrop}
              onEditAsset={(node) => handleOpenAssetEdit('project', node)}
            />
          ) : (
            <TreePanel
              title="Project Structure"
              tree={projectStructure}
              isLoading={isBuildingTree}
              error={treeBuildError}
              selectedNodeId={selectedProjectNodeId}
              onSelectNode={setSelectedProjectNodeId}
              onDrop={handleProjectStructureDrop}
              onEditAsset={(node) => handleOpenAssetEdit('project', node)}
            />
          )}

          <div className="flex flex-col items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMoveToLeft}
              disabled={!canMoveToLeft}
            >
              <MoveLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMoveToRight}
              disabled={!canMoveToRight}
            >
              <MoveRight className="h-4 w-4" />
            </Button>
          </div>

          <TreePanel
            title="Undefined Items"
            tree={undefinedItems}
            selectedNodeId={selectedUndefinedNodeId}
            onSelectNode={setSelectedUndefinedNodeId}
            onDrop={recomputeHasContent}
            onEditAsset={(node) => handleOpenAssetEdit('undefined', node)}
            headerAction={
              <label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                Discard Items
                <Checkbox
                  checked={discardUndefinedItems}
                  onCheckedChange={(checked) =>
                    setDiscardUndefinedItems(checked === true)
                  }
                />
              </label>
            }
          />
        </div>

        <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CircleX className="h-4 w-4 text-destructive" />
            {validationCounts.errors} Errors
          </span>
          <span className="flex items-center gap-1.5">
            <TriangleAlert className="h-4 w-4 text-yellow-500" />
            {validationCounts.warnings} Warnings
          </span>
        </div>

        <ModalEditAsset
          open={Boolean(editingAssetNode)}
          asset={editingAssetNode?.asset ?? null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAssetNode(null);
            }
          }}
          onSave={handleSaveAssetEdit}
        />
      </div>
    </DndProvider>
  );
}

function TreePanel({
  title,
  tree,
  isLoading = false,
  error,
  selectedNodeId,
  onSelectNode,
  onDrop,
  onEditAsset,
  headerAction
}: {
  title: string;
  tree: ContentNode[];
  isLoading?: boolean;
  error?: string | null;
  selectedNodeId: ContentNode['id'] | null;
  onSelectNode: (nodeId: ContentNode['id'] | null) => void;
  onDrop: (tree: ContentNode[], options: DropOptions<ContentNodeData>) => void;
  onEditAsset?: (node: ContentNode) => void;
  headerAction?: React.ReactNode;
}) {
  const treeNodeIds = React.useMemo(
    () => new Set(tree.map((node) => node.id)),
    [tree]
  );

  function handleSelectNode(nodeId: ContentNode['id']) {
    onSelectNode(selectedNodeId === nodeId ? null : nodeId);
  }

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h4 className="text-sm font-medium">{title}</h4>
        {headerAction}
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card p-2">
        {isLoading ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
            <Spinner className="mr-2 h-4 w-4" />
            Building template tree...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        ) : tree.length > 0 ? (
          <Tree
            tree={tree}
            rootId={ROOT_ID}
            sort={false}
            insertDroppableFirst={false}
            canDrag={(node) => node?.data?.lockedToDrag !== true}
            canDrop={(_tree, options) => {
              if (
                options.dragSource &&
                !treeNodeIds.has(options.dragSource.id)
              ) {
                return false;
              }

              if (
                options.dropTarget?.data?.locked ||
                options.dropTarget?.data?.lockedToDrop
              ) {
                return false;
              }
              if (!options.dropTarget) {
                return options.dropTargetId === ROOT_ID;
              }

              return Boolean(options.dropTarget.droppable);
            }}
            onDrop={onDrop}
            render={(node, { depth, isOpen, onToggle }) =>
              node.data?.type === 'asset' ? (
                <TreeLeaf
                  node={node}
                  depth={depth}
                  isSelected={selectedNodeId === node.id}
                  onSelect={() => handleSelectNode(node.id)}
                  onEdit={
                    node.data.isExistingAsset
                      ? undefined
                      : () => onEditAsset?.(node)
                  }
                />
              ) : (
                <TreeNode
                  node={node}
                  depth={depth}
                  isOpen={isOpen}
                  isSelected={selectedNodeId === node.id}
                  onToggle={onToggle}
                  onSelect={() => handleSelectNode(node.id)}
                />
              )
            }
            classes={{
              root: 'space-y-1',
              draggingSource: 'opacity-40',
              dropTarget: 'bg-primary/10 rounded-md'
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
            No items.
          </div>
        )}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  isOpen,
  isSelected,
  onToggle,
  onSelect
}: {
  node: ContentNode;
  depth: number;
  isOpen: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const validationFlag = node.data?.flag;
  const validationMessage =
    validationFlag === 'error'
      ? 'There are errors in this container.'
      : validationFlag === 'warning'
        ? 'There are warnings in this container.'
        : undefined;

  return (
    <div
      className={getTreeRowClassName(isSelected, node.data?.hasContent)}
      style={{ paddingLeft: depth * 18 + 8 }}
      onClick={onSelect}
    >
      {node.droppable ? (
        <button
          type="button"
          className="rounded-sm p-0.5"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <span className="w-5" />
      )}
      <Folder className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.text}</span>
      <div className="ml-auto flex shrink-0 items-center">
        <TreeValidationFlagHover
          flag={validationFlag}
          message={validationMessage}
        />
      </div>
    </div>
  );
}

function TreeLeaf({
  node,
  depth,
  isSelected,
  onSelect,
  onEdit
}: {
  node: ContentNode;
  depth: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}) {
  const assetLabel =
    node.data?.type === 'asset' ? node.data.asset.label : undefined;
  const validationFlag =
    node.data?.validationStatus === 'error' ||
    node.data?.validationStatus === 'warning'
      ? node.data.validationStatus
      : null;
  const badgeVariant =
    node.data?.validationStatus === 'error' ? 'destructive' : 'secondary';
  const validationMessage = node.data?.validationMessage;
  const isExistingAsset =
    node.data?.type === 'asset' && node.data.isExistingAsset;

  return (
    <div
      className={getTreeRowClassName(
        isSelected,
        node.data?.hasContent,
        isExistingAsset
      )}
      style={{ paddingLeft: depth * 18 + 8 }}
      onClick={onSelect}
      // title={node.data?.validationMessage}
    >
      <span className="w-5" />
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.text}</span>
      {isExistingAsset ? (
        <Badge variant="outline" className="rounded-sm text-[10px]">
          Existing
        </Badge>
      ) : null}
      {assetLabel ? (
        <Badge variant={badgeVariant} className="rounded-sm text-[10px]">
          {assetLabel}
        </Badge>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {onEdit ? (
          <button
            type="button"
            className="rounded-full p-0.5 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-70 focus:opacity-50"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit asset</span>
          </button>
        ) : null}
        <TreeValidationFlagHover
          flag={validationFlag}
          message={validationMessage}
        />
      </div>
    </div>
  );
}

function TreeValidationFlagHover({
  flag,
  message
}: {
  flag?: null | 'warning' | 'error';
  message?: string;
}) {
  if (!flag) {
    return null;
  }

  if (!message) {
    return <TreeNodeFlagIcon flag={flag} />;
  }

  const isError = flag === 'error';

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className="inline-flex"
          onClick={(event) => event.stopPropagation()}
        >
          <TreeNodeFlagIcon flag={flag} />
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="end"
        className={`w-72 ${
          isError
            ? 'border-destructive bg-destructive text-destructive'
            : 'border-yellow-600 bg-yellow-600 text-white'
        }`}
      >
        <div className="space-y-1">
          {/* <p className="text-sm font-semibold text-white">
            {isError ? 'Validation error' : 'Validation warning'}
          </p> */}
          <p className="text-sm leading-snug text-white">{message}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function TreeNodeFlagIcon({ flag }: { flag?: null | 'warning' | 'error' }) {
  if (!flag) {
    return null;
  }

  const Icon = flag === 'error' ? CircleX : TriangleAlert;

  return (
    <Icon
      className={`h-4 w-4 shrink-0 ${
        flag === 'error' ? 'text-destructive' : 'text-yellow-500'
      }`}
    />
  );
}

function getTreeRowClassName(
  isSelected: boolean,
  hasContent?: boolean,
  isExistingAsset?: boolean
) {
  return `group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
    isSelected
      ? 'bg-primary text-primary-foreground'
      : 'hover:bg-muted text-foreground'
  } ${isExistingAsset ? 'opacity-60' : hasContent ? 'opacity-100' : 'opacity-50'}`;
}

function updateAssetNode(
  tree: ContentNode[],
  nodeId: ContentNode['id'],
  values: ModalEditAssetValues
) {
  return tree.map((node) => {
    if (node.id !== nodeId || node.data?.type !== 'asset') {
      return node;
    }

    return {
      ...node,
      text: values.name,
      data: {
        ...node.data,
        asset: {
          ...node.data.asset,
          name: values.name,
          label: values.label
        }
      }
    };
  });
}

function createEmptyValidationCounts() {
  return {
    errors: 0,
    warnings: 0
  };
}

function clearTreeNodeValidation(node: ContentNode): ContentNode {
  if (!node.data) {
    return node;
  }

  return {
    ...node,
    data: {
      ...node.data,
      validationStatus: undefined,
      validationMessage: undefined,
      flag: null
    }
  };
}

function canMoveUndefinedNodeToProject({
  movingNode,
  targetNode,
  template,
  allowRootAssetTarget = false
}: {
  movingNode?: ContentNode | null;
  targetNode?: ContentNode | null;
  template: string;
  allowRootAssetTarget?: boolean;
}) {
  if (!movingNode) {
    return false;
  }

  const isMovingAsset = movingNode.data?.type === 'asset';
  const isMovingFolder = Boolean(movingNode.droppable);

  if (isMovingAsset) {
    return allowRootAssetTarget ? true : canReceiveMovedNode(targetNode);
  }

  if (!isMovingFolder || template !== 'unstructured') {
    return false;
  }

  return !targetNode || canReceiveMovedNode(targetNode);
}

function canMoveProjectNodeToUndefined({
  movingNode,
  targetNode
}: {
  movingNode?: ContentNode | null;
  targetNode?: ContentNode | null;
}) {
  if (!movingNode || movingNode.data?.lockedToDrag) {
    return false;
  }

  return !targetNode || canReceiveMovedNode(targetNode);
}

function canReceiveMovedNode(node?: ContentNode | null) {
  return Boolean(
    node && node.droppable && !node.data?.locked && !node.data?.lockedToDrop
  );
}

function collectNodeBranch(tree: ContentNode[], nodeId: ContentNode['id']) {
  const branch: ContentNode[] = [];
  const visit = (id: ContentNode['id']) => {
    tree
      .filter((node) => node.id === id || node.parent === id)
      .forEach((node) => {
        if (branch.some((branchNode) => branchNode.id === node.id)) {
          return;
        }

        branch.push(node);
        visit(node.id);
      });
  };

  visit(nodeId);

  return branch;
}

export { ContentSetupStep };
