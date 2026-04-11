import { bibleStrategy } from './bible.strategy';
import { fiaStrategy } from './fia.strategy';
import { unstructuredStrategy } from './unstructured.strategy';
import { QuestTemplate, TemplateStrategy } from './types';

const templateStrategies: Record<string, TemplateStrategy> = {
  bible: bibleStrategy,
  fia: fiaStrategy,
  unstructured: unstructuredStrategy
};

export function getTemplateStrategy(template: QuestTemplate): TemplateStrategy {
  return templateStrategies[template] || unstructuredStrategy;
}

export type {
  DisplayNode,
  FiaPericopesResponse,
  QuestTemplate,
  TemplateStrategyContext,
  TemplateBehavior,
  TemplateCopy,
  TemplateStrategy
} from './types';
