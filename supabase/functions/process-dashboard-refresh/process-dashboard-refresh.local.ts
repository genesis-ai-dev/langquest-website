#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import {
  processQueue,
  resolveLimit,
  type QueueRow
} from './core.ts';
import type { JsonRecord, ProjectDashboardContext, ProjectDashboardPayload } from './types.ts';

type QueueCandidateRow = {
  id: string;
  project_id: string;
  status: 'pending' | 'failed';
  retry_count: number | null;
};

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://127.0.0.1:54321';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
if (!serviceRoleKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) precisa estar definido.'
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function throwIfError(error: { message?: string } | null, context: string): void {
  if (!error) return;
  throw new Error(`${context}: ${error.message ?? 'unknown error'}`);
}

async function fetchTableRows(
  tableName: string,
  projectId: string,
  projectColumn = 'project_id'
): Promise<JsonRecord[]> {
  const { data, error } = await (supabase.from(tableName as any).select('*') as any).eq(
    projectColumn,
    projectId
  );
  throwIfError(error, `failed querying ${tableName}`);
  return (data ?? []) as JsonRecord[];
}

async function claimQueueRows(limit: number): Promise<QueueRow[]> {
  const nowIso = new Date().toISOString();
  const claimedRows: QueueRow[] = [];

  const { data: pendingRows, error: pendingError } = await supabase
    .from('dashboard_refresh_queue')
    .select('id,project_id,status,retry_count')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  throwIfError(pendingError, 'failed querying pending queue rows');

  const pending = (pendingRows ?? []) as QueueCandidateRow[];
  const remaining = Math.max(limit - pending.length, 0);

  let failedDue: QueueCandidateRow[] = [];
  if (remaining > 0) {
    const { data: failedRows, error: failedError } = await supabase
      .from('dashboard_refresh_queue')
      .select('id,project_id,status,retry_count')
      .eq('status', 'failed')
      .lt('next_attempt_at', nowIso)
      .order('created_at', { ascending: true })
      .limit(remaining);
    throwIfError(failedError, 'failed querying failed queue rows');
    failedDue = (failedRows ?? []) as QueueCandidateRow[];
  }

  const candidates = [...pending, ...failedDue];

  for (const row of candidates) {
    const { data, error } = await supabase
      .from('dashboard_refresh_queue')
      .update({
        status: 'processing',
        processing_at: nowIso
      })
      .eq('id', row.id)
      .eq('status', row.status)
      .select('id,project_id,status,retry_count')
      .limit(1);
    throwIfError(error, `failed claiming queue row ${row.id}`);

    const claimed = (data ?? [])[0] as QueueRow | undefined;
    if (!claimed) continue;
    claimedRows.push({
      ...claimed,
      retry_count: claimed.retry_count ?? 0
    });
  }

  return claimedRows;
}

async function fetchProjectContext(
  projectId: string
): Promise<ProjectDashboardContext | null> {
  const { data: projectRows, error: projectError } = await supabase
    .from('project')
    .select('*')
    .eq('id', projectId)
    .limit(1);
  throwIfError(projectError, 'failed querying project');

  const project = (projectRows ?? [])[0] as JsonRecord | undefined;
  if (!project) return null;

  const quests = await fetchTableRows('quest', projectId, 'project_id');
  const questIds = quests
    .map((quest) => asString(quest.id))
    .filter((id): id is string => id !== null);

  let questAssetLinks: JsonRecord[] = [];
  if (questIds.length > 0) {
    const { data, error } = await supabase
      .from('quest_asset_link')
      .select('*')
      .in('quest_id', questIds);
    throwIfError(error, 'failed querying quest_asset_link');
    questAssetLinks = (data ?? []) as JsonRecord[];
  }

  const linkedAssetIds = questAssetLinks
    .map((link) => asString(link.asset_id))
    .filter((id): id is string => id !== null);

  const { data: projectAssetsRows, error: projectAssetsError } = await supabase
    .from('asset')
    .select('*')
    .eq('project_id', projectId);
  throwIfError(projectAssetsError, 'failed querying project assets');
  const projectAssets = (projectAssetsRows ?? []) as JsonRecord[];

  let linkedAssets: JsonRecord[] = [];
  if (linkedAssetIds.length > 0) {
    const { data, error } = await supabase
      .from('asset')
      .select('*')
      .in('id', linkedAssetIds);
    throwIfError(error, 'failed querying linked assets');
    linkedAssets = (data ?? []) as JsonRecord[];
  }

  const assetsById = new Map<string, JsonRecord>();
  for (const asset of [...projectAssets, ...linkedAssets]) {
    const assetId = asString(asset.id);
    if (!assetId) continue;
    assetsById.set(assetId, asset);
  }
  const assets = [...assetsById.values()];

  const profileProjectLinks = await fetchTableRows(
    'profile_project_link',
    projectId,
    'project_id'
  );
  const projectLanguageLinks = await fetchTableRows(
    'project_language_link',
    projectId,
    'project_id'
  );

  const assetIds = assets
    .map((asset) => asString(asset.id))
    .filter((id): id is string => id !== null);

  let assetContentLinks: JsonRecord[] = [];
  if (assetIds.length > 0) {
    const { data, error } = await supabase
      .from('asset_content_link')
      .select('*')
      .in('asset_id', assetIds);
    throwIfError(error, 'failed querying asset_content_link');
    assetContentLinks = (data ?? []) as JsonRecord[];
  }

  const projectTemplate = asString(project.template);
  let templateStructureRows: JsonRecord[] = [];
  if (projectTemplate) {
    const { data: templateStructureData, error: templateStructureError } = await supabase
      .from('template_structure')
      .select('*')
      .eq('template', projectTemplate)
      .eq('language', 'any')
      .not('item_id', 'is', null);
    throwIfError(templateStructureError, 'failed querying template_structure');
    templateStructureRows = (templateStructureData ?? []) as JsonRecord[];
  }

  return {
    project,
    quests,
    assets,
    assetContentLinks,
    questAssetLinks,
    profileProjectLinks,
    projectLanguageLinks,
    templateStructureRows
  };
}

async function upsertDashboard(payload: ProjectDashboardPayload): Promise<void> {
  const { template: _template, ...dashboardRow } = payload;

  const { error } = await supabase.from('project_dashboard_current').upsert(
    {
      ...dashboardRow,
      dashboard_json: dashboardRow.dashboard_json,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'project_id' }
  );
  throwIfError(error, `failed upserting dashboard for project ${payload.project_id}`);
}

async function markQueueSuccess(queueId: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_refresh_queue')
    .delete()
    .eq('id', queueId);
  throwIfError(error, `failed deleting queue row ${queueId}`);
}

async function markQueueFailure(
  queueId: string,
  currentRetryCount: number,
  errorMessage: string
): Promise<void> {
  const nextRetryCount = currentRetryCount + 1;
  const nextAttemptAt = new Date(
    Date.now() + nextRetryCount * 10 * 60_000
  ).toISOString();

  const { error } = await supabase
    .from('dashboard_refresh_queue')
    .update({
      status: 'failed',
      retry_count: nextRetryCount,
      last_error: errorMessage,
      processing_at: null,
      next_attempt_at: nextAttemptAt
    })
    .eq('id', queueId);
  throwIfError(error, `failed marking queue row ${queueId} as failed`);
}

function resolveLimitArg(): number {
  const args = process.argv.slice(2);
  const limitFlag = args.find((value) => value.startsWith('--limit='));
  const rawLimit =
    limitFlag?.split('=')[1] ?? args.find((value) => !value.startsWith('--')) ?? null;
  return resolveLimit(rawLimit);
}

async function main(): Promise<void> {
  const limit = resolveLimitArg();

  const result = await processQueue({
    limit,
    claimQueueRows,
    fetchProjectContext,
    upsertDashboard,
    markQueueSuccess,
    markQueueFailure
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        limit_used: limit,
        ...result
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
