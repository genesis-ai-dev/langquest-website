import type { BlueprintNode } from './types';

export function countHiddenNodes(root: BlueprintNode): number {
  let count = root.deleted ? 1 : 0;
  for (const child of root.children ?? []) {
    count += countHiddenNodes(child);
  }
  return count;
}

export function hasHiddenNodes(root: BlueprintNode): boolean {
  if (root.deleted) return true;
  for (const child of root.children ?? []) {
    if (hasHiddenNodes(child)) return true;
  }
  return false;
}

export function stripHiddenNodes(root: BlueprintNode): BlueprintNode {
  if (root.deleted) {
    return { ...root, deleted: undefined, children: [] };
  }

  const children = (root.children ?? [])
    .filter((child) => !child.deleted)
    .map(stripHiddenNodes);

  return { ...root, children: children.length ? children : undefined };
}
