import * as React from 'react';
import {
  Tree,
  type DropOptions,
  type NodeModel
} from '@minoru/react-dnd-treeview';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  MoveLeft,
  MoveRight
} from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { Spinner } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { UploadProcessStepProps } from '../lib/types';
import {
  buildInitialTreeData,
  buildTemplateTree,
  type InitialTreeNodeData
} from '../lib/tree-build';
import { normalizeContentTree } from '../lib/tree-validation';

type ContentNodeData = InitialTreeNodeData & {
  locked?: boolean;
  validationStatus?: 'error' | 'warning' | 'valid';
};

type ContentNode = NodeModel<ContentNodeData>;

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
  validationResult
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

  React.useEffect(() => {
    if (uploadType === 'project' && !projectSetup) {
      setProjectStructure([]);
      setUndefinedItems([]);
      setTreeBuildError(null);
      setIsBuildingTree(false);
      return;
    }

    const template = projectSetup?.template || 'unstructured';
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
          return;
        }

        const initialTreeData = buildInitialTreeData({
          template,
          templateTree: tree,
          csvData
        });

        setProjectStructure(
          normalizeContentTree({
            tree: initialTreeData.projectStructure,
            template
          })
        );
        setUndefinedItems(initialTreeData.undefinedItems);
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
    if (!selectedUndefinedNodeId) {
      return;
    }

    const movingNodes = collectNodeBranch(
      undefinedItems,
      selectedUndefinedNodeId
    );

    setUndefinedItems((currentItems) =>
      currentItems.filter(
        (item) => !movingNodes.some((movingNode) => movingNode.id === item.id)
      )
    );
    setProjectStructure((currentItems) => [
      ...currentItems,
      ...movingNodes.map((node) =>
        node.id === selectedUndefinedNodeId
          ? {
              ...node,
              parent: ROOT_ID
            }
          : node
      )
    ]);
    setSelectedUndefinedNodeId(null);
  }

  function handleMoveToRight() {
    if (!selectedProjectNodeId) {
      return;
    }

    const movingNodes = collectNodeBranch(
      projectStructure,
      selectedProjectNodeId
    );

    setProjectStructure((currentItems) =>
      currentItems.filter(
        (item) => !movingNodes.some((movingNode) => movingNode.id === item.id)
      )
    );
    setUndefinedItems((currentItems) => [
      ...currentItems,
      ...movingNodes.map((node) =>
        node.id === selectedProjectNodeId
          ? {
              ...node,
              parent: ROOT_ID
            }
          : node
      )
    ]);
    setSelectedProjectNodeId(null);
  }

  function handleProjectStructureDrop(tree: ContentNode[]) {
    setProjectStructure(
      normalizeContentTree({
        tree,
        template: projectSetup?.template || 'unstructured'
      })
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
        <div className="shrink-0 space-y-2">
          <h3 className="text-xl font-semibold">Content Setup</h3>
          <p className="text-sm text-muted-foreground">
            Organize the validated {uploadType} content before processing. Drag
            items inside each tree or use the buttons to move selected items
            between lists.
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
          />

          <div className="flex flex-col items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMoveToLeft}
              disabled={!selectedUndefinedNodeId}
            >
              <MoveLeft className="h-4 w-4" />
              Mover para esquerda
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMoveToRight}
              disabled={!canMoveSelectedProjectNode}
            >
              Mover para direita
              <MoveRight className="h-4 w-4" />
            </Button>
          </div>

          <TreePanel
            title="Undefined items"
            tree={undefinedItems}
            selectedNodeId={selectedUndefinedNodeId}
            onSelectNode={setSelectedUndefinedNodeId}
            onDrop={setUndefinedItems}
          />
        </div>
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
  onDrop
}: {
  title: string;
  tree: ContentNode[];
  isLoading?: boolean;
  error?: string | null;
  selectedNodeId: ContentNode['id'] | null;
  onSelectNode: (nodeId: ContentNode['id']) => void;
  onDrop: (tree: ContentNode[], options: DropOptions<ContentNodeData>) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
      <h4 className="shrink-0 text-sm font-medium">{title}</h4>
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
                  onSelect={() => onSelectNode(node.id)}
                />
              ) : (
                <TreeNode
                  node={node}
                  depth={depth}
                  isOpen={isOpen}
                  isSelected={selectedNodeId === node.id}
                  onToggle={onToggle}
                  onSelect={() => onSelectNode(node.id)}
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
      <TreeNodeFlagIcon flag={node.data?.flag} />
    </div>
  );
}

function TreeLeaf({
  node,
  depth,
  isSelected,
  onSelect
}: {
  node: ContentNode;
  depth: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const assetLabel =
    node.data?.type === 'asset' ? node.data.asset.label : undefined;
  const badgeVariant =
    node.data?.validationStatus === 'error' ? 'destructive' : 'secondary';

  return (
    <div
      className={getTreeRowClassName(isSelected, node.data?.hasContent)}
      style={{ paddingLeft: depth * 18 + 8 }}
      onClick={onSelect}
      title={node.data?.validationMessage}
    >
      <span className="w-5" />
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.text}</span>
      {assetLabel ? (
        <Badge variant={badgeVariant} className="rounded-sm text-[10px]">
          {assetLabel}
        </Badge>
      ) : null}
    </div>
  );
}

function TreeNodeFlagIcon({
  flag
}: {
  flag?: null | 'warning' | 'error';
}) {
  if (!flag) {
    return null;
  }

  return (
    <AlertCircle
      className={`ml-auto h-4 w-4 shrink-0 ${
        flag === 'error' ? 'text-destructive' : 'text-yellow-500'
      }`}
    />
  );
}

function getTreeRowClassName(isSelected: boolean, hasContent?: boolean) {
  return `flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
    isSelected
      ? 'bg-primary text-primary-foreground'
      : 'hover:bg-muted text-foreground'
  } ${hasContent ? 'opacity-100' : 'opacity-50'}`;
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
