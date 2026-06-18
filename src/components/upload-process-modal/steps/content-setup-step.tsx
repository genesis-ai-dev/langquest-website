import * as React from 'react';
import {
  Tree,
  type DropOptions,
  type NodeModel
} from '@minoru/react-dnd-treeview';
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';

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
  projectSetup,
  validationResult,
  onGeneratedCsvContentChange,
  onValidityChange
}: UploadProcessStepProps) {
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
  const template = projectSetup?.template || 'unstructured';
  const selectedProjectNode = React.useMemo(
    () =>
      selectedProjectNodeId
        ? projectStructure.find((node) => node.id === selectedProjectNodeId)
        : null,
    [projectStructure, selectedProjectNodeId]
  );
  const canMoveSelectedProjectNode =
    Boolean(selectedProjectNode) &&
    selectedProjectNode?.data?.lockedToDrag !== true;
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
    template
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

    const language = projectSetup?.fiaContentLanguage || null;
    const csvData = validationResult?.csvData;
    let isCancelled = false;

    setIsBuildingTree(true);
    setTreeBuildError(null);
    setSelectedProjectNodeId(null);
    setSelectedUndefinedNodeId(null);

    buildTemplateTree({ template, language })
      .then((tree) => {
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
      })
      .catch((error) => {
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
      })
      .finally(() => {
        if (!isCancelled) {
          setIsBuildingTree(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    projectSetup?.fiaContentLanguage,
    projectSetup?.template,
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
    const normalizedTree = normalizeContentTreeWithSummary({
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
            {/* Organize the validated {uploadType} content before processing. Drag
            items inside each tree or use the buttons to move selected items
            between lists. */}
            Review how the uploaded assets were matched to the selected project
            template. Move items between Project Structure and Undefined Items,
            place assets into the correct folders, and edit labels when needed.
            Fix all errors before continuing.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 overflow-hidden">
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
            title="Undefined items"
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
                  onEdit={() => onEditAsset?.(node)}
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

  return (
    <div
      className={getTreeRowClassName(isSelected, node.data?.hasContent)}
      style={{ paddingLeft: depth * 18 + 8 }}
      onClick={onSelect}
      // title={node.data?.validationMessage}
    >
      <span className="w-5" />
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.text}</span>
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

function getTreeRowClassName(isSelected: boolean, hasContent?: boolean) {
  return `group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
    isSelected
      ? 'bg-primary text-primary-foreground'
      : 'hover:bg-muted text-foreground'
  } ${hasContent ? 'opacity-100' : 'opacity-50'}`;
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
  template
}: {
  movingNode?: ContentNode | null;
  targetNode?: ContentNode | null;
  template: string;
}) {
  if (!movingNode) {
    return false;
  }

  const isMovingAsset = movingNode.data?.type === 'asset';
  const isMovingFolder = Boolean(movingNode.droppable);

  if (isMovingAsset) {
    return canReceiveMovedNode(targetNode);
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
