import { generateNodeId } from './actions';
import { saveDraft } from './draft-store';
import type { TemplateRow, PublishIntent } from './types';
import { TEMPLATE_FORMAT_VERSION } from './types';

export async function createBlankDraft(): Promise<string> {
  const draftId = generateNodeId();
  await saveDraft({
    draftId,
    sourceTemplateId: null,
    publishIntent: 'starting_point',
    structure: {
      format_version: TEMPLATE_FORMAT_VERSION,
      root: { id: 'root', name: 'New template', node_type: 'root', linkable_type: 'quest', children: [] }
    },
    actionLog: [],
    actionIndex: -1,
    metadata: { name: 'New template', description: null, icon: null, shared: false },
    savedAt: Date.now()
  });
  return draftId;
}

/**
 * Creates a draft from an existing published template.
 * The publishIntent is just the default for the publish dialog — it does NOT
 * affect the editing experience. Both entry points produce the same editor.
 */
export async function createDraftFromTemplate(
  template: TemplateRow,
  publishIntent: PublishIntent
): Promise<string> {
  const draftId = generateNodeId();
  await saveDraft({
    draftId,
    sourceTemplateId: template.id,
    publishIntent,
    structure: template.structure,
    actionLog: [],
    actionIndex: -1,
    metadata: {
      name: template.name,
      description: template.description,
      icon: template.icon,
      shared: template.shared
    },
    savedAt: Date.now()
  });
  return draftId;
}
