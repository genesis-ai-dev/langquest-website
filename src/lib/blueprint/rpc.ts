import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlueprintStructure, TemplateBlueprintRow } from './types';

type RpcResult<T = unknown> = { ok: true } & T | { ok: false; reason: string };

export async function acquireBlueprintLock(
  client: SupabaseClient,
  blueprintId: string
): Promise<RpcResult<{ structure_version: number }>> {
  const { data, error } = await client.rpc('acquire_blueprint_lock', {
    p_blueprint_id: blueprintId
  });
  if (error) throw error;
  return data as RpcResult<{ structure_version: number }>;
}

export async function heartbeatBlueprintLock(
  client: SupabaseClient,
  blueprintId: string
): Promise<RpcResult> {
  const { data, error } = await client.rpc('heartbeat_blueprint_lock', {
    p_blueprint_id: blueprintId
  });
  if (error) throw error;
  return data as RpcResult;
}

export async function releaseBlueprintLock(
  client: SupabaseClient,
  blueprintId: string
): Promise<RpcResult> {
  const { data, error } = await client.rpc('release_blueprint_lock', {
    p_blueprint_id: blueprintId
  });
  if (error) throw error;
  return data as RpcResult;
}

export async function forceReleaseStaleLock(
  client: SupabaseClient,
  blueprintId: string
): Promise<RpcResult> {
  const { data, error } = await client.rpc('force_release_stale_lock', {
    p_blueprint_id: blueprintId
  });
  if (error) throw error;
  return data as RpcResult;
}

export async function publishBlueprint(
  client: SupabaseClient,
  blueprintId: string,
  baseVersion: number,
  newStructure: BlueprintStructure,
  targetLinkIds: string[]
): Promise<
  RpcResult<{
    forked?: boolean;
    new_blueprint_id?: string;
    new_version: number;
  }>
> {
  const { data, error } = await client.rpc('publish_blueprint', {
    p_blueprint_id: blueprintId,
    p_base_version: baseVersion,
    p_new_structure: newStructure as unknown as Record<string, unknown>,
    p_target_link_ids: targetLinkIds
  });
  if (error) throw error;
  return data as RpcResult<{
    forked?: boolean;
    new_blueprint_id?: string;
    new_version: number;
  }>;
}

export async function createBlueprint(
  client: SupabaseClient,
  params: {
    structure: BlueprintStructure;
    name: string;
    icon?: string;
    sourceLanguageId?: string;
    shared?: boolean;
  }
): Promise<RpcResult<{ blueprint_id: string }>> {
  const { data, error } = await client.rpc('create_blueprint', {
    p_structure: params.structure as unknown as Record<string, unknown>,
    p_name: params.name,
    p_icon: params.icon ?? null,
    p_source_language_id: params.sourceLanguageId ?? null,
    p_shared: params.shared ?? false
  });
  if (error) throw error;
  return data as RpcResult<{ blueprint_id: string }>;
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
