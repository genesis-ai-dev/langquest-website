import type { SupabaseClient } from '@supabase/supabase-js';
import type { TemplateStructure, TemplateRow } from './types';

type RpcResult<T = unknown> = { ok: true } & T | { ok: false; reason: string };

export async function publishTemplate(
  client: SupabaseClient,
  params: {
    sourceTemplateId: string | null;
    structure: TemplateStructure;
    name: string;
    description?: string;
    icon?: string;
    shared?: boolean;
    targetLinkIds?: string[];
    actions?: unknown;
  }
): Promise<RpcResult<{ template_id: string }>> {
  const { data, error } = await client.rpc('publish_template', {
    p_source_template_id: params.sourceTemplateId,
    p_structure: params.structure as unknown as Record<string, unknown>,
    p_name: params.name,
    p_description: params.description ?? null,
    p_icon: params.icon ?? null,
    p_shared: params.shared ?? false,
    p_target_link_ids: params.targetLinkIds ?? [],
    p_actions: params.actions ?? null
  });
  if (error) throw error;
  return data as RpcResult<{ template_id: string }>;
}

export async function fetchProjectsForTemplate(
  client: SupabaseClient,
  templateId: string
): Promise<{ linkId: string; projectId: string; projectName: string; frozen: boolean }[]> {
  const { data, error } = await client
    .from('project_template_link')
    .select('id, project_id, frozen, project:project_id(name)')
    .eq('template_id', templateId)
    .eq('active', true);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    linkId: row.id,
    projectId: row.project_id,
    projectName: row.project?.name ?? 'Unknown project',
    frozen: row.frozen ?? false
  }));
}

export async function forkTemplate(
  client: SupabaseClient,
  sourceId: string,
  name: string
): Promise<RpcResult<{ template_id: string }>> {
  const { data, error } = await client.rpc('fork_template', {
    p_source_id: sourceId,
    p_name: name
  });
  if (error) throw error;
  return data as RpcResult<{ template_id: string }>;
}

export async function saveTemplateMetadata(
  client: SupabaseClient,
  templateId: string,
  metadata: { name?: string; description?: string; icon?: string; shared?: boolean }
): Promise<RpcResult> {
  const { data, error } = await client.rpc('save_template_metadata', {
    p_template_id: templateId,
    p_name: metadata.name ?? null,
    p_description: metadata.description ?? null,
    p_icon: metadata.icon ?? null,
    p_shared: metadata.shared ?? null
  });
  if (error) throw error;
  return data as RpcResult;
}

export async function fetchTemplates(
  client: SupabaseClient,
  options?: { shared?: boolean; creatorId?: string; sourceLanguoidId?: string }
): Promise<TemplateRow[]> {
  let query = client
    .from('template')
    .select('*')
    .eq('active', true)
    .order('project_count', { ascending: false });

  if (options?.sourceLanguoidId) {
    query = query.eq('source_languoid_id', options.sourceLanguoidId);
  }
  if (options?.shared !== undefined) {
    query = query.eq('shared', options.shared);
  }
  if (options?.creatorId) {
    query = query.eq('creator_id', options.creatorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TemplateRow[];
}

export async function fetchTemplateById(
  client: SupabaseClient,
  templateId: string
): Promise<TemplateRow | null> {
  const { data, error } = await client
    .from('template')
    .select('*')
    .eq('id', templateId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as TemplateRow;
}

export type LineageNode = {
  id: string;
  name: string;
  creator_id: string | null;
  copied_from_template_id: string | null;
  created_at: string;
  project_count: number;
};

export async function fetchTemplateLineage(
  client: SupabaseClient,
  templateId: string
): Promise<LineageNode[]> {
  const { data, error } = await client.rpc('get_template_lineage', {
    p_template_id: templateId
  });
  if (error) throw error;
  return (data ?? []) as LineageNode[];
}

export type RevisionEntry = {
  id: string;
  saved_at: string;
  saved_by: string | null;
  actions: Record<string, unknown> | null;
};

export async function fetchTemplateRevisions(
  client: SupabaseClient,
  templateId: string
): Promise<RevisionEntry[]> {
  const { data, error } = await client.rpc('get_template_revisions', {
    p_template_id: templateId
  });
  if (error) throw error;
  return (data ?? []) as RevisionEntry[];
}

export async function adoptTemplateFork(
  client: SupabaseClient,
  linkId: string,
  targetTemplateId: string
): Promise<RpcResult> {
  const { data, error } = await client.rpc('adopt_template_fork', {
    p_link_id: linkId,
    p_target_template_id: targetTemplateId
  });
  if (error) throw error;
  return data as RpcResult;
}

export async function linkTemplateToProject(
  client: SupabaseClient,
  projectId: string,
  templateId: string
): Promise<RpcResult> {
  const { data, error } = await client.rpc('link_template_to_project', {
    p_project_id: projectId,
    p_template_id: templateId
  });
  if (error) throw error;
  return data as RpcResult;
}

export type CompatibilityResult = {
  compatible: boolean;
  missing_node_ids: string[];
};

export async function checkTemplateCompatibility(
  client: SupabaseClient,
  templateId: string,
  targetLinkIds: string[],
  nodeIds: string[]
): Promise<CompatibilityResult> {
  const { data, error } = await client.rpc('check_template_compatibility', {
    p_template_id: templateId,
    p_target_link_ids: targetLinkIds,
    p_node_ids: nodeIds
  });
  if (error) throw error;
  return data as CompatibilityResult;
}
