import type { TemplateNode, TemplateStructure } from './types';

export type DiffEntryType =
  | 'add'
  | 'remove'
  | 'rename'
  | 'move'
  | 'hide'
  | 'unhide'
  | 'property_change';

export interface DiffEntry {
  type: DiffEntryType;
  nodeId: string;
  nodeName: string;
  details?: Record<string, unknown>;
}

export interface TemplateDiff {
  entries: DiffEntry[];
  summary: {
    added: number;
    removed: number;
    renamed: number;
    moved: number;
    hidden: number;
    unhidden: number;
    propertyChanges: number;
  };
}

interface IndexedNode {
  node: TemplateNode;
  parentId: string | null;
  index: number;
  path: string[];
}

function indexTree(root: TemplateNode): Map<string, IndexedNode> {
  const map = new Map<string, IndexedNode>();

  function walk(
    node: TemplateNode,
    parentId: string | null,
    index: number,
    path: string[]
  ) {
    map.set(node.id, { node, parentId, index, path: [...path, node.id] });
    for (let i = 0; i < (node.children?.length ?? 0); i++) {
      walk(node.children![i], node.id, i, [...path, node.id]);
    }
  }

  walk(root, null, 0, []);
  return map;
}

const TRACKED_PROPS: (keyof TemplateNode)[] = [
  'linkable_type',
  'is_download_unit',
  'is_version_anchor',
  'allows_spanning',
  'short_label',
  'label_template',
  'node_type',
  'metadata'
];

export function computeTreeDiff(
  before: TemplateStructure,
  after: TemplateStructure
): TemplateDiff {
  const oldIndex = indexTree(before.root);
  const newIndex = indexTree(after.root);

  const entries: DiffEntry[] = [];

  // Nodes in new but not old → added
  for (const [id, info] of newIndex) {
    if (!oldIndex.has(id)) {
      entries.push({
        type: 'add',
        nodeId: id,
        nodeName: info.node.name,
        details: { parentId: info.parentId, index: info.index }
      });
    }
  }

  // Nodes in old but not new → removed
  for (const [id, info] of oldIndex) {
    if (!newIndex.has(id)) {
      entries.push({
        type: 'remove',
        nodeId: id,
        nodeName: info.node.name
      });
    }
  }

  // Shared nodes → check for changes
  for (const [id, oldInfo] of oldIndex) {
    const newInfo = newIndex.get(id);
    if (!newInfo) continue;

    const oldNode = oldInfo.node;
    const newNode = newInfo.node;

    // Rename
    if (oldNode.name !== newNode.name) {
      entries.push({
        type: 'rename',
        nodeId: id,
        nodeName: newNode.name,
        details: { from: oldNode.name, to: newNode.name }
      });
    }

    // Move (parent changed or index changed within same parent)
    if (oldInfo.parentId !== newInfo.parentId) {
      entries.push({
        type: 'move',
        nodeId: id,
        nodeName: newNode.name,
        details: {
          fromParent: oldInfo.parentId,
          toParent: newInfo.parentId,
          newIndex: newInfo.index
        }
      });
    } else if (oldInfo.index !== newInfo.index) {
      entries.push({
        type: 'move',
        nodeId: id,
        nodeName: newNode.name,
        details: {
          fromIndex: oldInfo.index,
          toIndex: newInfo.index,
          parentId: newInfo.parentId
        }
      });
    }

    // Hidden/unhidden
    if (!oldNode.deleted && newNode.deleted) {
      entries.push({ type: 'hide', nodeId: id, nodeName: newNode.name });
    } else if (oldNode.deleted && !newNode.deleted) {
      entries.push({ type: 'unhide', nodeId: id, nodeName: newNode.name });
    }

    // Property changes
    for (const prop of TRACKED_PROPS) {
      const oldVal = oldNode[prop];
      const newVal = newNode[prop];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        entries.push({
          type: 'property_change',
          nodeId: id,
          nodeName: newNode.name,
          details: { property: prop, from: oldVal, to: newVal }
        });
      }
    }
  }

  return {
    entries,
    summary: {
      added: entries.filter((e) => e.type === 'add').length,
      removed: entries.filter((e) => e.type === 'remove').length,
      renamed: entries.filter((e) => e.type === 'rename').length,
      moved: entries.filter((e) => e.type === 'move').length,
      hidden: entries.filter((e) => e.type === 'hide').length,
      unhidden: entries.filter((e) => e.type === 'unhide').length,
      propertyChanges: entries.filter((e) => e.type === 'property_change')
        .length
    }
  };
}

/** Human-readable one-line summary of a diff. */
export function summarizeDiff(diff: TemplateDiff): string {
  const parts: string[] = [];
  const { summary } = diff;

  if (summary.added > 0)
    parts.push(`${summary.added} added`);
  if (summary.removed > 0)
    parts.push(`${summary.removed} removed`);
  if (summary.renamed > 0)
    parts.push(`${summary.renamed} renamed`);
  if (summary.moved > 0)
    parts.push(`${summary.moved} moved`);
  if (summary.hidden > 0)
    parts.push(`${summary.hidden} hidden`);
  if (summary.unhidden > 0)
    parts.push(`${summary.unhidden} unhidden`);
  if (summary.propertyChanges > 0)
    parts.push(`${summary.propertyChanges} property change${summary.propertyChanges === 1 ? '' : 's'}`);

  return parts.length > 0 ? parts.join(', ') : 'No changes';
}

/**
 * Collect all node IDs present in a structure (non-deleted only).
 * Used for compatibility checking.
 */
export function collectNodeIds(root: TemplateNode): Set<string> {
  const ids = new Set<string>();
  function walk(node: TemplateNode) {
    if (!node.deleted) ids.add(node.id);
    for (const child of node.children ?? []) {
      walk(child);
    }
  }
  walk(root);
  return ids;
}

/**
 * Check if a new template structure is compatible with a project that
 * was using an older template. Returns IDs present in `requiredIds` but
 * missing from `newStructure`.
 */
export function findMissingNodeIds(
  newStructureRoot: TemplateNode,
  requiredIds: Set<string>
): string[] {
  const available = collectNodeIds(newStructureRoot);
  const missing: string[] = [];
  for (const id of requiredIds) {
    if (!available.has(id)) missing.push(id);
  }
  return missing;
}
