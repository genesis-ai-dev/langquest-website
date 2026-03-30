import { bibleStrategy } from './bible.strategy';
import { unstructuredStrategy } from './unstructured.strategy';
import { QuestTemplate, TemplateStrategy } from './types';

const templateStrategies: Record<string, TemplateStrategy> = {
  bible: bibleStrategy,
  unstructured: unstructuredStrategy
};

export function getTemplateStrategy(template: QuestTemplate): TemplateStrategy {
  return templateStrategies[template] || unstructuredStrategy;
}

export type {
  DisplayNode,
  QuestTemplate,
  TemplateBehavior,
  TemplateCopy,
  TemplateStrategy
} from './types';
