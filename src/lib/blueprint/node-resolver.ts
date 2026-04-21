/**
 * Bridge layer: resolves blueprint JSONB nodes into DisplayNode objects
 * that the existing QuestExplorer UI components can render.
 */

import type { BlueprintNode, BlueprintStructure } from './types';
import type { QuestRecord, QuestTreeResult } from '@/app/db/questExplorer';
import type { DisplayNode } from '@/components/QuestExplorer/template-strategies/types';

export interface BlueprintResolverContext {
  structure: BlueprintStructure;
  questTree: QuestTreeResult;
  blueprintLinkId: string;
}

function questsForNode(nodeId: string, questTree: QuestTreeResult): QuestRecord[] {
  return questTree.flat.filter((q) => q.blueprint_node_id === nodeId);
}

function blueprintNodeToDisplayNode(
  node: BlueprintNode,
  questTree: QuestTreeResult
): DisplayNode {
  const matchingQuests = questsForNode(node.id, questTree);

  const latestQuest =
    matchingQuests.length > 0
      ? matchingQuests.reduce((a, b) =>
          new Date(a.created_at) > new Date(b.created_at) ? a : b
        )
      : null;

  return {
    key: node.id,
    title: node.name,
    subtitle: node.short_label && node.short_label !== node.name ? node.short_label : undefined,
    icon: undefined,
    questId: latestQuest?.id ?? null,
    quest: latestQuest,
    variants: matchingQuests.length > 1 ? matchingQuests : undefined,
    kind: mapNodeTypeToKind(node.node_type),
    disabled: node.deleted ?? false
  };
}

function mapNodeTypeToKind(
  nodeType: string | undefined
): 'quest' | 'book' | 'chapter' | 'pericope' {
  switch (nodeType) {
    case 'book':
      return 'book';
    case 'chapter':
      return 'chapter';
    case 'pericope':
      return 'pericope';
    default:
      return 'quest';
  }
}

/**
 * Get root-level display nodes from a blueprint structure.
 * These are the direct children of the root node (e.g., books for Bible).
 */
export function getRootNodesFromBlueprint(
  ctx: BlueprintResolverContext
): DisplayNode[] {
  const rootChildren = ctx.structure.root.children ?? [];
  return rootChildren
    .filter((node) => !node.deleted)
    .map((node) => blueprintNodeToDisplayNode(node, ctx.questTree));
}

/**
 * Get child display nodes for a selected parent node.
 * Used for column 2 (e.g., chapters when a book is selected).
 */
export function getChildNodesFromBlueprint(
  parentNodeId: string,
  ctx: BlueprintResolverContext
): DisplayNode[] {
  const parentNode = findNodeById(ctx.structure.root, parentNodeId);
  if (!parentNode) return [];

  const children = parentNode.children ?? [];
  return children
    .filter((node) => !node.deleted)
    .map((node) => blueprintNodeToDisplayNode(node, ctx.questTree));
}

/**
 * Get the blueprint node definition for a given node ID.
 */
export function getBlueprintNode(
  structure: BlueprintStructure,
  nodeId: string
): BlueprintNode | null {
  return findNodeById(structure.root, nodeId);
}

/**
 * Get the depth of the blueprint tree (excluding root).
 * Used to determine how many columns the explorer should show.
 */
export function getBlueprintDepth(structure: BlueprintStructure): number {
  return getMaxDepth(structure.root, 0) - 1;
}

function getMaxDepth(node: BlueprintNode, current: number): number {
  const children = (node.children ?? []).filter((n) => !n.deleted);
  if (children.length === 0) return current;
  return Math.max(...children.map((c) => getMaxDepth(c, current + 1)));
}

function findNodeById(
  node: BlueprintNode,
  targetId: string
): BlueprintNode | null {
  if (node.id === targetId) return node;
  for (const child of node.children ?? []) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }
  return null;
}
