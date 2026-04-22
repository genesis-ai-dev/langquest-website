import type { SupabaseClient } from '@supabase/supabase-js';
import { generateNodeId } from './actions';
import { saveDraft, type BlueprintDraft } from './draft-store';
import { hasHiddenNodes, stripHiddenNodes, countHiddenNodes } from './hidden-nodes';
import { fetchProjectsForBlueprint } from './rpc';
import type { BlueprintStructure, DraftMode, TemplateBlueprintRow } from './types';
import { BLUEPRINT_FORMAT_VERSION } from './types';

type ConfirmFn = {
  confirm: (opts: { title: string; description?: string; body?: React.ReactNode; confirmLabel?: string; cancelLabel?: string; variant?: 'default' | 'destructive' }) => Promise<boolean>;
  choice: <T extends string>(opts: { title: string; description?: string; body?: React.ReactNode; choices: { value: T; label: string; description?: string; variant?: 'default' | 'destructive' }[]; cancelLabel?: string }) => Promise<T | null>;
};

export async function createBlankDraft(): Promise<string> {
  const draftId = generateNodeId();
  await saveDraft({
    draftId,
    sourceBlueprintId: null,
    mode: 'starting_point',
    structure: {
      format_version: BLUEPRINT_FORMAT_VERSION,
      root: { id: 'root', name: 'New template', node_type: 'root', children: [] }
    },
    actionLog: [],
    actionIndex: -1,
    metadata: { name: 'New template', icon: null, shared: false },
    targetLinkIds: [],
    savedAt: Date.now()
  });
  return draftId;
}

/**
 * Creates a draft from an existing published blueprint.
 * Handles hidden-node prompts via the confirm API.
 * Returns the draftId, or null if the user cancelled.
 */
export async function createDraftFromBlueprint(
  blueprint: TemplateBlueprintRow,
  mode: DraftMode,
  dialogs: ConfirmFn,
  supabase: SupabaseClient
): Promise<string | null> {
  let structure: BlueprintStructure = blueprint.structure;

  if (mode === 'starting_point' && hasHiddenNodes(structure.root)) {
    const count = countHiddenNodes(structure.root);
    const strip = await dialogs.confirm({
      title: 'Hidden items found',
      description:
        `This template has ${count} hidden item${count === 1 ? '' : 's'}. ` +
        `Since you're creating a new starting point, these items serve no purpose. ` +
        `Would you like to remove them?`,
      confirmLabel: 'Remove hidden items',
      cancelLabel: 'Keep them',
    });
    if (strip) {
      structure = { ...structure, root: stripHiddenNodes(structure.root) };
    }
  }

  let targetLinkIds: string[] = [];
  if (mode === 'update') {
    const projects = await fetchProjectsForBlueprint(supabase, blueprint.id);
    targetLinkIds = projects.map((p) => p.linkId);
  }

  const draftId = generateNodeId();
  await saveDraft({
    draftId,
    sourceBlueprintId: blueprint.id,
    mode,
    structure,
    actionLog: [],
    actionIndex: -1,
    metadata: {
      name: blueprint.name,
      icon: blueprint.icon,
      shared: mode === 'update' ? blueprint.shared : false
    },
    targetLinkIds,
    savedAt: Date.now()
  });
  return draftId;
}
