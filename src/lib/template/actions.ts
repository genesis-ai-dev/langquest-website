import { produce } from 'immer';
import { nanoid } from 'nanoid';
import type { TemplateNode, TemplateStructure } from './types';
import { TEMPLATE_NODE_ID_LENGTH } from './types';

export type TemplateActionType =
  | 'add_node'
  | 'remove_node'
  | 'rename_node'
  | 'move_node'
  | 'update_node_props'
  | 'set_structure';

export interface TemplateAction {
  type: TemplateActionType;
  payload: Record<string, unknown>;
  timestamp: number;
  /** Actions sharing a groupId are undone/redone as a single step. */
  groupId?: string;
}

export function generateNodeId(): string {
  return nanoid(TEMPLATE_NODE_ID_LENGTH);
}

function findNodeAndParent(
  root: TemplateNode,
  nodeId: string
): { node: TemplateNode; parent: TemplateNode | null; index: number } | null {
  if (root.id === nodeId) return { node: root, parent: null, index: -1 };

  function search(
    parent: TemplateNode
  ): { node: TemplateNode; parent: TemplateNode; index: number } | null {
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
  root: TemplateNode,
  nodeId: string
): TemplateNode | null {
  const result = findNodeAndParent(root, nodeId);
  return result?.node ?? null;
}

export function findNodeById(
  root: TemplateNode,
  nodeId: string
): TemplateNode | null {
  return findNode(root, nodeId);
}

export function applyAction(
  structure: TemplateStructure,
  action: TemplateAction
): TemplateStructure {
  return produce(structure, (draft) => {
    switch (action.type) {
      case 'add_node': {
        const { parentId, node, insertIndex } = action.payload as {
          parentId: string;
          node: TemplateNode;
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
          props: Partial<TemplateNode>;
        };
        const node = findNode(draft.root, nodeId);
        if (node) {
          Object.assign(node, props);
        }
        break;
      }
      case 'set_structure': {
        const { structure: newStructure } = action.payload as {
          structure: TemplateStructure;
        };
        draft.root = newStructure.root;
        draft.format_version = newStructure.format_version;
        break;
      }
    }
  });
}

export function applyActions(
  baseStructure: TemplateStructure,
  actions: TemplateAction[]
): TemplateStructure {
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
    linkableType?: TemplateNode['linkable_type'];
  }
): TemplateAction {
  const node: TemplateNode = {
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

export function createRemoveNodeAction(nodeId: string): TemplateAction {
  return {
    type: 'remove_node',
    payload: { nodeId },
    timestamp: Date.now()
  };
}

export function createRenameNodeAction(
  nodeId: string,
  name: string
): TemplateAction {
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
): TemplateAction {
  return {
    type: 'move_node',
    payload: { nodeId, newParentId, newIndex },
    timestamp: Date.now()
  };
}

export function createUpdatePropsAction(
  nodeId: string,
  props: Partial<TemplateNode>
): TemplateAction {
  return {
    type: 'update_node_props',
    payload: { nodeId, props },
    timestamp: Date.now()
  };
}

export function createHideNodeAction(nodeId: string): TemplateAction {
  return {
    type: 'update_node_props',
    payload: { nodeId, props: { deleted: true } },
    timestamp: Date.now()
  };
}

export function createUnhideNodeAction(nodeId: string): TemplateAction {
  return {
    type: 'update_node_props',
    payload: { nodeId, props: { deleted: false } },
    timestamp: Date.now()
  };
}

/** All descendant node ids under `node` (not including `node`), depth-first, non-deleted only. */
export function collectNonDeletedDescendantNodeIds(
  node: TemplateNode
): string[] {
  const ids: string[] = [];
  const walk = (children: TemplateNode[] | undefined) => {
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
