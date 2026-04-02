import { QuestRecord } from '@/app/db/questExplorer';
import {
  DisplayNode,
  QuestTemplate,
  TemplateStrategyContext,
  getTemplateStrategy
} from './template-strategies';

export function getRootNodes(
  template: QuestTemplate,
  roots: QuestRecord[],
  strategyContext?: TemplateStrategyContext
): DisplayNode[] {
  return getTemplateStrategy(template).getRootNodes(roots, strategyContext);
}

export function getChildrenNodes(
  template: QuestTemplate,
  contextNode: DisplayNode | null,
  strategyContext?: TemplateStrategyContext
): DisplayNode[] {
  return getTemplateStrategy(template).getChildrenNodes(
    contextNode,
    strategyContext
  );
}

export function getNodeTitle(node: DisplayNode | null): string {
  if (!node) {
    return 'Select a quest';
  }
  return node.title;
}

export type { DisplayNode, QuestTemplate };
