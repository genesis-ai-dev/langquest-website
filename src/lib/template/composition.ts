import type { TemplateNode, TemplateStructure } from './types';
import { generateNodeId } from './actions';

/**
 * Deep-copy a subtree, assigning fresh IDs to every node.
 * Preserves all other properties (name, linkable_type, metadata, etc.)
 * but breaks identity — the copied nodes share no IDs with the source.
 */
export function copySubtreeWithFreshIds(node: TemplateNode): TemplateNode {
  return {
    ...node,
    id: generateNodeId(),
    children: node.children?.map(copySubtreeWithFreshIds)
  };
}

/**
 * Get a flat list of top-level importable sections from a template.
 * Returns direct children of the root (e.g. books in a Bible template).
 */
export function getImportableSections(
  structure: TemplateStructure
): { id: string; name: string; childCount: number }[] {
  return (structure.root.children ?? [])
    .filter((node) => !node.deleted)
    .map((node) => ({
      id: node.id,
      name: node.name,
      childCount: countDescendants(node)
    }));
}

function countDescendants(node: TemplateNode): number {
  let count = 0;
  for (const child of node.children ?? []) {
    if (!child.deleted) {
      count += 1 + countDescendants(child);
    }
  }
  return count;
}

/**
 * Extract and deep-copy specific nodes from a source template.
 * Returns new nodes with fresh IDs, ready for insertion into a draft.
 */
export function extractNodesFromTemplate(
  structure: TemplateStructure,
  nodeIds: string[]
): TemplateNode[] {
  const idSet = new Set(nodeIds);
  const found: TemplateNode[] = [];

  function search(node: TemplateNode) {
    if (idSet.has(node.id)) {
      found.push(copySubtreeWithFreshIds(node));
      return;
    }
    for (const child of node.children ?? []) {
      search(child);
    }
  }

  search(structure.root);
  return found;
}
