import { QuestRecord } from '@/app/db/questExplorer';
import {
  DisplayNode,
  QuestTemplate,
  getTemplateStrategy
} from './template-strategies';

export function getRootNodes(
  template: QuestTemplate,
  roots: QuestRecord[]
): DisplayNode[] {
  return getTemplateStrategy(template).getRootNodes(roots);
}

export function getChildrenNodes(
  template: QuestTemplate,
  contextNode: DisplayNode | null
): DisplayNode[] {
  return getTemplateStrategy(template).getChildrenNodes(contextNode);
}

export function getNodeTitle(node: DisplayNode | null): string {
  if (!node) {
    return 'Select a quest';
  }
  return node.title;
}

export type { DisplayNode, QuestTemplate };
