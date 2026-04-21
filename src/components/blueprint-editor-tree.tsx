'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Tree,
  type DeleteHandler,
  type NodeApi,
  type NodeRendererProps,
  type RenameHandler,
  type RowRendererProps,
  type TreeApi
} from 'react-arborist';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { BlueprintNode } from '@/lib/blueprint/types';
import {
  createAddNodeAction,
  createMoveNodeAction,
  createRemoveNodeAction,
  createRenameNodeAction,
  type BlueprintAction
} from '@/lib/blueprint/actions';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Download,
  EllipsisVertical,
  FileAudio,
  Folder,
  FolderInput,
  FolderPlus,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface TreeActionsContextValue {
  canEdit: boolean;
  onAddChild: (parentId: string, parentDisplayName: string) => void;
  onAddSibling: (node: NodeApi<BlueprintNode>) => void;
  moveTarget: string | null;
  onPickMoveTarget: (nodeId: string) => void;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
}

const TreeActionsContext = createContext<TreeActionsContextValue | null>(null);

function filterDeletedDeep(nodes: BlueprintNode[]): BlueprintNode[] {
  return (nodes ?? [])
    .filter((n) => !n.deleted)
    .map((n) => ({
      ...n,
      children: n.children?.length
        ? filterDeletedDeep(n.children)
        : n.children
    }));
}

export function toTreeData(root: BlueprintNode): BlueprintNode[] {
  return filterDeletedDeep(root.children ?? []);
}

function collectDirectChildIds(node: NodeApi<BlueprintNode>): string[] {
  return (node.children ?? []).map((c) => c.id);
}

export interface BlueprintEditorTreeProps {
  root: BlueprintNode;
  canEdit: boolean;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onBatchActions: (actions: BlueprintAction[]) => void;
}

export function BlueprintEditorTree({
  root,
  canEdit,
  selectedNodeId,
  onNodeSelect,
  onBatchActions
}: BlueprintEditorTreeProps) {
  const treeRef = useRef<TreeApi<BlueprintNode>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 520 });
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [selectionCount, setSelectionCount] = useState(0);

  const handleSelectionChange = useCallback(
    (nodes: NodeApi<BlueprintNode>[]) => {
      setSelectionCount(nodes.length);
    },
    []
  );

  const data = useMemo(() => toTreeData(root), [root]);

  const onAddChild = useCallback(
    (parentId: string, parentDisplayName: string) => {
      const name = window.prompt(
        `Add a sub-item inside “${parentDisplayName}”\n\nName for the new row:`
      );
      if (!name?.trim()) return;
      const trimmed = name.trim();
      onBatchActions([createAddNodeAction(parentId, trimmed)]);
      toast.success(
        `“${trimmed}” was added inside “${parentDisplayName}”. If you don’t see it, expand “${parentDisplayName}” using the arrow on the left.`
      );
    },
    [onBatchActions]
  );

  const onAddSibling = useCallback(
    (node: NodeApi<BlueprintNode>) => {
      const d = node.data;
      const name = window.prompt(
        `Add a row below “${d.name}”\n\nName for the new row:`
      );
      if (!name?.trim()) return;
      const trimmed = name.trim();
      const parent = node.parent;
      const blueprintParentId = parent?.isRoot ? root.id : parent?.id;
      if (!blueprintParentId || node.childIndex < 0) {
        toast.error('Could not determine where to insert the new row');
        return;
      }
      const insertIndex = node.childIndex + 1;
      onBatchActions([
        createAddNodeAction(blueprintParentId, trimmed, {
          insertIndex,
          ...(d.linkable_type !== undefined
            ? { linkableType: d.linkable_type }
            : {})
        })
      ]);
      toast.success(`“${trimmed}” was added below “${d.name}”.`);
    },
    [onBatchActions, root.id]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      setSize({
        width: Math.max(280, el.clientWidth),
        height: Math.max(280, el.clientHeight)
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleRename = useCallback<RenameHandler<BlueprintNode>>(
    ({ id, name }) => {
      if (!name.trim()) return;
      onBatchActions([createRenameNodeAction(id, name.trim())]);
    },
    [onBatchActions]
  );

  const handleDelete = useCallback<DeleteHandler<BlueprintNode>>(
    ({ ids }) => {
      onBatchActions(ids.map((id) => createRemoveNodeAction(id)));
    },
    [onBatchActions]
  );

  const selectedNodes = useCallback(
    () => treeRef.current?.selectedNodes ?? [],
    []
  );

  const getActionableNodes = useCallback((): NodeApi<BlueprintNode>[] => {
    const checked = selectedNodes();
    if (checked.length > 0) return checked;
    if (selectedNodeId) {
      const node = treeRef.current?.get(selectedNodeId);
      if (node) return [node];
    }
    return [];
  }, [selectedNodes, selectedNodeId]);

  const handleMoveUp = useCallback(() => {
    const nodes = getActionableNodes();
    if (nodes.length === 0) return;
    const actions: BlueprintAction[] = [];
    for (const node of nodes) {
      const parent = node.parent;
      if (!parent) continue;
      const siblings = parent.children ?? [];
      const idx = siblings.findIndex((s) => s.id === node.id);
      if (idx <= 0) continue;
      const parentId = parent.isRoot ? root.id : parent.id;
      actions.push(createMoveNodeAction(node.id, parentId, idx - 1));
    }
    if (actions.length === 0) return;
    onBatchActions(actions);
  }, [onBatchActions, root.id, getActionableNodes]);

  const handleMoveDown = useCallback(() => {
    const nodes = getActionableNodes();
    if (nodes.length === 0) return;
    const actions: BlueprintAction[] = [];
    for (const node of [...nodes].reverse()) {
      const parent = node.parent;
      if (!parent) continue;
      const siblings = parent.children ?? [];
      const idx = siblings.findIndex((s) => s.id === node.id);
      if (idx < 0 || idx >= siblings.length - 1) continue;
      const parentId = parent.isRoot ? root.id : parent.id;
      actions.push(createMoveNodeAction(node.id, parentId, idx + 1));
    }
    if (actions.length === 0) return;
    onBatchActions(actions);
  }, [onBatchActions, root.id, getActionableNodes]);

  const handleStartMoveInto = useCallback(() => {
    const nodes = getActionableNodes();
    if (nodes.length === 0) return;
    setMoveTarget('__pending__');
    toast.message('Click a destination node to move selection into it');
  }, [getActionableNodes]);

  const handlePickMoveTarget = useCallback(
    (targetId: string) => {
      if (moveTarget !== '__pending__') return;
      const nodes = getActionableNodes();
      if (nodes.length === 0) {
        setMoveTarget(null);
        return;
      }
      const movingIds = new Set(nodes.map((n) => n.id));
      if (movingIds.has(targetId)) {
        toast.error('Cannot move a node into itself');
        return;
      }
      const actions = nodes.map((node, i) =>
        createMoveNodeAction(node.id, targetId, i)
      );
      onBatchActions(actions);
      setMoveTarget(null);
      toast.success(`Moved ${nodes.length} item(s)`);
    },
    [moveTarget, getActionableNodes, onBatchActions]
  );

  const handleSelectAllChildren = useCallback(() => {
    const api = treeRef.current;
    if (!api) return;
    const node =
      api.focusedNode ?? api.mostRecentNode ?? api.selectedNodes[0] ?? null;
    if (!node || node.isRoot) {
      toast.message('Select a folder first');
      return;
    }
    const childIds = collectDirectChildIds(node);
    if (childIds.length === 0) {
      toast.message('No child items to select');
      return;
    }
    api.setSelection({
      ids: childIds,
      anchor: null,
      mostRecent: null
    });
    toast.success(`Selected ${childIds.length} item(s)`);
  }, []);

  const ctxValue = useMemo<TreeActionsContextValue>(
    () => ({
      canEdit,
      onAddChild,
      onAddSibling,
      moveTarget,
      onPickMoveTarget: handlePickMoveTarget,
      selectedNodeId,
      onNodeSelect
    }),
    [
      canEdit,
      onAddChild,
      onAddSibling,
      moveTarget,
      handlePickMoveTarget,
      selectedNodeId,
      onNodeSelect
    ]
  );

  const hasChecked = selectionCount > 0;
  const hasActionable = hasChecked || !!selectedNodeId;

  function disabledReason(
    ...conditions: [boolean, string][]
  ): string | undefined {
    for (const [test, msg] of conditions) {
      if (test) return msg;
    }
    return undefined;
  }

  const uncheckReason = disabledReason(
    [!canEdit, 'Lock the blueprint for editing first'],
    [!hasChecked, 'No items are checked']
  );
  const selectChildrenReason = disabledReason(
    [!canEdit, 'Lock the blueprint for editing first']
  );
  const moveReason = disabledReason(
    [!canEdit, 'Lock the blueprint for editing first'],
    [!hasActionable, 'Click a row or check items to move']
  );
  const moveIntoReason = disabledReason(
    [!canEdit, 'Lock the blueprint for editing first'],
    [!hasActionable, 'Click a row or check items to move']
  );

  return (
    <TreeActionsContext.Provider value={ctxValue}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span title={uncheckReason}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!uncheckReason}
              onClick={() => treeRef.current?.deselectAll()}
            >
              Uncheck all
            </Button>
          </span>
          <span title={selectChildrenReason}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!selectChildrenReason}
              onClick={handleSelectAllChildren}
            >
              Select all children
            </Button>
          </span>
          <span title={moveReason}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!moveReason}
              onClick={handleMoveUp}
            >
              <ArrowUp className="mr-1 h-3.5 w-3.5" />
              Move up
            </Button>
          </span>
          <span title={moveReason}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!moveReason}
              onClick={handleMoveDown}
            >
              <ArrowDown className="mr-1 h-3.5 w-3.5" />
              Move down
            </Button>
          </span>
          {moveTarget === '__pending__' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMoveTarget(null)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cancel move
            </Button>
          ) : (
            <span title={moveIntoReason}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!!moveIntoReason}
                onClick={handleStartMoveInto}
              >
                <FolderInput className="mr-1 h-3.5 w-3.5" />
                Move into…
              </Button>
            </span>
          )}
          {moveTarget === '__pending__' && (
            <span className="text-xs text-muted-foreground">
              Click a destination node…
            </span>
          )}
        </div>
        <div
          ref={containerRef}
          className="h-[min(70vh,560px)] w-full min-h-[280px] rounded-md border"
        >
          <Tree<BlueprintNode>
            ref={treeRef}
            data={data}
            width={size.width}
            height={size.height}
            rowHeight={38}
            indent={20}
            openByDefault={false}
            overscanCount={8}
            disableMultiSelection={false}
            disableDrag
            disableDrop
            disableEdit={!canEdit}
            onRename={handleRename}
            onDelete={canEdit ? handleDelete : undefined}
            onSelect={handleSelectionChange}
            renderRow={BlueprintRow}
          >
            {BlueprintArboristNode}
          </Tree>
        </div>
      </div>
    </TreeActionsContext.Provider>
  );
}

function BlueprintRow({
  innerRef,
  attrs,
  children
}: RowRendererProps<BlueprintNode>) {
  return (
    <div {...attrs} ref={innerRef} onFocus={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

function BlueprintArboristNode({
  node,
  style
}: NodeRendererProps<BlueprintNode>) {
  const ctx = useContext(TreeActionsContext);
  const d = node.data;
  const isSection = d.linkable_type !== 'asset';
  const showToggle = isSection;
  const isMoveTarget = ctx?.moveTarget === '__pending__';
  const isActive = ctx?.selectedNodeId === node.id;

  return (
    <div
      style={style}
      className={cn(
        'flex min-h-[38px] w-full select-none items-center gap-1 border-b border-border/40 px-1 text-sm',
        node.state.isSelected && 'bg-accent/60',
        isActive && !node.state.isSelected && 'bg-primary/[0.06] ring-2 ring-inset ring-primary/50',
        isMoveTarget && !node.state.isSelected && 'cursor-pointer hover:bg-primary/10'
      )}
      onClick={() => {
        if (isMoveTarget && ctx) {
          ctx.onPickMoveTarget(node.id);
        } else {
          ctx?.onNodeSelect(node.id);
        }
      }}
    >
      <button
        type="button"
        className="flex h-7 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation();
          if (showToggle) node.toggle();
        }}
        aria-label={node.isOpen ? 'Collapse' : 'Expand'}
        disabled={!showToggle}
      >
        {showToggle ? (
          node.isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )
        ) : (
          <span className="inline-block w-4" />
        )}
      </button>
      <input
        type="checkbox"
        className="h-3.5 w-3.5 shrink-0 rounded border"
        checked={node.state.isSelected}
        onChange={(e) => {
          e.stopPropagation();
          if (e.target.checked) {
            node.selectMulti();
          } else {
            node.deselect();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
      <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
        {isSection && (
          <span title="Section">
            <Folder className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
        {(d.linkable_type === 'asset' || d.linkable_type === 'both') && (
          <span title="Recording">
            <FileAudio className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>
      {node.isEditing ? (
        <Input
          className="h-7 flex-1 cursor-text text-sm"
          defaultValue={node.data.name}
          autoFocus
          onBlur={(e) => {
            void node.submit(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void node.submit((e.target as HTMLInputElement).value);
            }
            if (e.key === 'Escape') {
              node.reset();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="min-w-0 flex-1 truncate"
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (node.isEditable) void node.edit();
          }}
        >
          {node.data.name}
        </span>
      )}
      <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
        {d.is_download_unit && (
          <span title="Downloadable section">
            <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </span>
        )}
        {d.allows_spanning && (
          <span title="Range recordings allowed">
            <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </span>
        )}
        {d.node_type ? (
          <span className="max-w-[4.5rem] truncate text-[10px] capitalize">
            {d.node_type}
          </span>
        ) : null}
      </div>
      {ctx?.canEdit && !isMoveTarget ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Actions for ${d.name}`}
            >
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            {isSection ? (
              <DropdownMenuItem
                onSelect={() => {
                  ctx.onAddChild(node.id, d.name);
                }}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Add inside
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={() => {
                ctx.onAddSibling(node);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add below
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                if (
                  window.confirm(
                    'Remove this row from the outline? Sub-items under it are removed too.'
                  )
                ) {
                  void node.tree.delete(node.id);
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
