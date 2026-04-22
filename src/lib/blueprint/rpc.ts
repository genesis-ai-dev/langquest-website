import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlueprintStructure, TemplateBlueprintRow } from './types';

type RpcResult<T = unknown> = { ok: true } & T | { ok: false; reason: string };

export async function publishBlueprint(
  client: SupabaseClient,
  params: {
    sourceBlueprintId: string | null;
    structure: BlueprintStructure;
    name: string;
    icon?: string;
    shared?: boolean;
    targetLinkIds?: string[];
    actions?: unknown;
  }
): Promise<RpcResult<{ blueprint_id: string }>> {
  const { data, error } = await client.rpc('publish_blueprint', {
    p_source_blueprint_id: params.sourceBlueprintId,
    p_structure: params.structure as unknown as Record<string, unknown>,
    p_name: params.name,
    p_icon: params.icon ?? null,
    p_shared: params.shared ?? false,
    p_target_link_ids: params.targetLinkIds ?? [],
    p_actions: params.actions ?? null
  });
  if (error) throw error;
  return data as RpcResult<{ blueprint_id: string }>;
}

export async function fetchProjectsForBlueprint(
  client: SupabaseClient,
  blueprintId: string
): Promise<{ linkId: string; projectId: string; projectName: string }[]> {
  const { data, error } = await client
    .from('project_blueprint_link')
    .select('id, project_id, project:project_id(name)')
    .eq('blueprint_id', blueprintId)
    .eq('active', true);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    linkId: row.id,
    projectId: row.project_id,
    projectName: row.project?.name ?? 'Unknown project'
  }));
}

export async function forkBlueprint(
  client: SupabaseClient,
  sourceId: string
): Promise<RpcResult<{ blueprint_id: string }>> {
  const { data, error } = await client.rpc('fork_blueprint', {
    p_source_id: sourceId
  });
  if (error) throw error;
  return data as RpcResult<{ blueprint_id: string }>;
}

export async function saveBlueprintMetadata(
  client: SupabaseClient,
  blueprintId: string,
  metadata: { name?: string; icon?: string; shared?: boolean }
): Promise<RpcResult> {
  const { data, error } = await client.rpc('save_blueprint_metadata', {
    p_blueprint_id: blueprintId,
    p_name: metadata.name ?? null,
    p_icon: metadata.icon ?? null,
    p_shared: metadata.shared ?? null
  });
  if (error) throw error;
  return data as RpcResult;
}

export async function fetchBlueprints(
  client: SupabaseClient,
  options?: { shared?: boolean; creatorId?: string }
): Promise<TemplateBlueprintRow[]> {
  let query = client
    .from('template_blueprint')
    .select('*')
    .eq('active', true)
    .order('project_count', { ascending: false });

  if (options?.shared !== undefined) {
    query = query.eq('shared', options.shared);
  }
  if (options?.creatorId) {
    query = query.eq('creator_id', options.creatorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TemplateBlueprintRow[];
}

export async function fetchBlueprintById(
  client: SupabaseClient,
  blueprintId: string
): Promise<TemplateBlueprintRow | null> {
  const { data, error } = await client
    .from('template_blueprint')
    .select('*')
    .eq('id', blueprintId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as TemplateBlueprintRow;
}
