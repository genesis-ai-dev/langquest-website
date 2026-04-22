import { produce } from 'immer';
import { nanoid } from 'nanoid';
import type { BlueprintNode, BlueprintStructure } from './types';
import { BLUEPRINT_NODE_ID_LENGTH } from './types';

export type BlueprintActionType =
  | 'add_node'
  | 'remove_node'
  | 'rename_node'
  | 'move_node'
  | 'update_node_props'
  | 'set_structure';

export interface BlueprintAction {
  type: BlueprintActionType;
  payload: Record<string, unknown>;
  timestamp: number;
  /** Actions sharing a groupId are undone/redone as a single step. */
  groupId?: string;
}

export function generateNodeId(): string {
  return nanoid(BLUEPRINT_NODE_ID_LENGTH);
}

function findNodeAndParent(
  root: BlueprintNode,
  nodeId: string
): { node: BlueprintNode; parent: BlueprintNode | null; index: number } | null {
  if (root.id === nodeId) return { node: root, parent: null, index: -1 };

  function search(
    parent: BlueprintNode
  ): { node: BlueprintNode; parent: BlueprintNode; index: number } | null {
    if (!parent.children) return null;
    for (let i = 0; i < parent.children.length; i++) {
      if (parent.children[i].id === nodeId) {
        return { node: parent.children[i], parent, index: i };
      }
      const found = search(parent.children[i]);
      if (found) return found;
    }
    return null;
  }

  return search(root);
}

function findNode(
  root: BlueprintNode,
  nodeId: string
): BlueprintNode | null {
  const result = findNodeAndParent(root, nodeId);
  return result?.node ?? null;
}

export function findNodeById(
  root: BlueprintNode,
  nodeId: string
): BlueprintNode | null {
  return findNode(root, nodeId);
}

export function applyAction(
  structure: BlueprintStructure,
  action: BlueprintAction
): BlueprintStructure {
  return produce(structure, (draft) => {
    switch (action.type) {
      case 'add_node': {
        const { parentId, node, insertIndex } = action.payload as {
          parentId: string;
          node: BlueprintNode;
          insertIndex?: number;
        };
        const parent = findNode(draft.root, parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          const list = parent.children;
          const idx =
            typeof insertIndex === 'number' && insertIndex >= 0
              ? Math.min(insertIndex, list.length)
              : list.length;
          list.splice(idx, 0, node);
        }
        break;
      }
      case 'remove_node': {
        const { nodeId } = action.payload as { nodeId: string };
        const result = findNodeAndParent(draft.root, nodeId);
        if (result?.parent?.children) {
          result.parent.children.splice(result.index, 1);
        }
        break;
      }
      case 'rename_node': {
        const { nodeId, name } = action.payload as {
          nodeId: string;
          name: string;
        };
        const node = findNode(draft.root, nodeId);
        if (node) node.name = name;
        break;
      }
      case 'move_node': {
        const { nodeId, newParentId, newIndex } = action.payload as {
          nodeId: string;
          newParentId: string;
          newIndex: number;
        };
        const result = findNodeAndParent(draft.root, nodeId);
        if (result?.parent?.children) {
          const [removed] = result.parent.children.splice(result.index, 1);
          const newParent = findNode(draft.root, newParentId);
          if (newParent) {
            if (!newParent.children) newParent.children = [];
            newParent.children.splice(newIndex, 0, removed);
          }
        }
        break;
      }
      case 'update_node_props': {
        const { nodeId, props } = action.payload as {
          nodeId: string;
          props: Partial<BlueprintNode>;
        };
        const node = findNode(draft.root, nodeId);
        if (node) {
          Object.assign(node, props);
        }
        break;
      }
      case 'set_structure': {
        const { structure: newStructure } = action.payload as {
          structure: BlueprintStructure;
        };
        draft.root = newStructure.root;
        draft.format_version = newStructure.format_version;
        break;
      }
    }
  });
}

export function applyActions(
  baseStructure: BlueprintStructure,
  actions: BlueprintAction[]
): BlueprintStructure {
  return actions.reduce(
    (structure, action) => applyAction(structure, action),
    baseStructure
  );
}

export function createAddNodeAction(
  parentId: string,
  name: string,
  options?: {
    nodeType?: string;
    insertIndex?: number;
    linkableType?: BlueprintNode['linkable_type'];
  }
): BlueprintAction {
  const node: BlueprintNode = {
    id: generateNodeId(),
    name,
    node_type: options?.nodeType,
    children: []
  };
  if (options?.linkableType !== undefined) {
    node.linkable_type = options.linkableType;
  }
  return {
    type: 'add_node',
    payload: {
      parentId,
      insertIndex: options?.insertIndex,
      node
    },
    timestamp: Date.now()
  };
}

export function createRemoveNodeAction(nodeId: string): BlueprintAction {
  return {
    type: 'remove_node',
    payload: { nodeId },
    timestamp: Date.now()
  };
}

export function createRenameNodeAction(
  nodeId: string,
  name: string
): BlueprintAction {
  return {
    type: 'rename_node',
    payload: { nodeId, name },
    timestamp: Date.now()
  };
}

export function createMoveNodeAction(
  nodeId: string,
  newParentId: string,
  newIndex: number
): BlueprintAction {
  return {
    type: 'move_node',
    payload: { nodeId, newParentId, newIndex },
    timestamp: Date.now()
  };
}

export function createUpdatePropsAction(
  nodeId: string,
  props: Partial<BlueprintNode>
): BlueprintAction {
  return {
    type: 'update_node_props',
    payload: { nodeId, props },
    timestamp: Date.now()
  };
}

export function createHideNodeAction(nodeId: string): BlueprintAction {
  return {
    type: 'update_node_props',
    payload: { nodeId, props: { deleted: true } },
    timestamp: Date.now()
  };
}

export function createUnhideNodeAction(nodeId: string): BlueprintAction {
  return {
    type: 'update_node_props',
    payload: { nodeId, props: { deleted: false } },
    timestamp: Date.now()
  };
}

/** All descendant node ids under `node` (not including `node`), depth-first, non-deleted only. */
export function collectNonDeletedDescendantNodeIds(
  node: BlueprintNode
): string[] {
  const ids: string[] = [];
  const walk = (children: BlueprintNode[] | undefined) => {
    if (!children) return;
    for (const child of children) {
      if (child.deleted) continue;
      ids.push(child.id);
      walk(child.children);
    }
  };
  walk(node.children);
  return ids;
}
