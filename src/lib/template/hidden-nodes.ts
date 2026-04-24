import type { TemplateNode } from './types';

export function countHiddenNodes(root: TemplateNode): number {
  let count = root.deleted ? 1 : 0;
  for (const child of root.children ?? []) {
    count += countHiddenNodes(child);
  }
  return count;
}

export function hasHiddenNodes(root: TemplateNode): boolean {
  if (root.deleted) return true;
  for (const child of root.children ?? []) {
    if (hasHiddenNodes(child)) return true;
  }
  return false;
}

export function stripHiddenNodes(root: TemplateNode): TemplateNode {
  if (root.deleted) {
    return { ...root, deleted: undefined, children: [] };
  }

  const children = (root.children ?? [])
    .filter((child) => !child.deleted)
    .map(stripHiddenNodes);

  return { ...root, children: children.length ? children : undefined };
}
