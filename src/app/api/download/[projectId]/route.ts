import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { env } from '@/lib/env';
import { Database } from '../../../../../database.types';

type QuestRow = {
  id: string;
  name: string | null;
  parent_id: string | null;
  metadata: string | null;
  created_at: string;
};

type AssetRow = {
  id: string;
  name: string;
  metadata: string | null;
  created_at: string;
};

type QuestAssetLinkRow = {
  quest_id: string;
  asset: AssetRow | AssetRow[] | null;
};

type DownloadAsset = {
  id: string;
  name: string;
  metadata: string | null;
  created_At: string;
};

type DownloadQuestNode = {
  id: string;
  name: string | null;
  metadata: string | null;
  createdAt: string;
  children: DownloadQuestNode[];
  assets: DownloadAsset[];
};

type ProjectAccessRow = {
  id: string;
  template: string | null;
  private?: boolean | null;
  visible?: boolean | null;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DownloadJobRequest = {
  questIds: string[];
  assetIds: string[];
  includeCsv: boolean;
  combineAudioByQuest: boolean;
};

function isUuidArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => uuidRegex.test(item));
}

function normalizeDownloadJobRequest(body: unknown): DownloadJobRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const value = body as Record<string, unknown>;
  if (!isUuidArray(value.questIds) || !isUuidArray(value.assetIds)) {
    return null;
  }

  if (
    typeof value.includeCsv !== 'boolean' ||
    typeof value.combineAudioByQuest !== 'boolean'
  ) {
    return null;
  }

  if (value.includeCsv && value.combineAudioByQuest) {
    return null;
  }

  const questIds = [...new Set(value.questIds)];
  const assetIds = [...new Set(value.assetIds)];
  if (!questIds.length || !assetIds.length) {
    return null;
  }

  return {
    questIds,
    assetIds,
    includeCsv: value.includeCsv,
    combineAudioByQuest: value.combineAudioByQuest
  };
}

function createRequestChecksum(projectId: string, payload: DownloadJobRequest) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        projectId,
        questIds: [...payload.questIds].sort(),
        assetIds: [...payload.assetIds].sort(),
        includeCsv: payload.includeCsv,
        combineAudioByQuest: payload.combineAudioByQuest
      })
    )
    .digest('hex');
}

async function triggerDownloadWorker(jobId: string, accessToken: string) {
  const functionUrl = `${env.NEXT_PUBLIC_SUPABASE_URL.replace(
    /\/$/,
    ''
  )}/functions/v1/project-download-job`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobId })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('download job route worker trigger failed:', {
        jobId,
        status: response.status,
        body: errorText
      });
    }
  } catch (error) {
    console.error('download job route worker trigger error:', {
      jobId,
      error
    });
  }
}

function normalizeAsset(asset: AssetRow): DownloadAsset {
  return {
    id: asset.id,
    name: asset.name,
    metadata: asset.metadata,
    created_At: asset.created_at
  };
}

function isProjectPrivate(project: ProjectAccessRow): boolean {
  if (typeof project.private === 'boolean') {
    return project.private;
  }

  return project.visible !== true;
}

function buildQuestTree(
  quests: QuestRow[],
  assetsByQuestId: Map<string, DownloadAsset[]>
): DownloadQuestNode[] {
  const nodesById = new Map<string, DownloadQuestNode>();
  const roots: DownloadQuestNode[] = [];

  quests.forEach((quest) => {
    nodesById.set(quest.id, {
      id: quest.id,
      name: quest.name,
      metadata: quest.metadata,
      createdAt: quest.created_at,
      children: [],
      assets: assetsByQuestId.get(quest.id) ?? []
    });
  });

  quests.forEach((quest) => {
    const node = nodesById.get(quest.id);
    if (!node) return;

    const parent = quest.parent_id ? nodesById.get(quest.parent_id) : null;
    if (parent) {
      parent.children.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId || !uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7);
    const supabaseAuth = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const {
      data: { user },
      error: authError
    } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const supabase = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    const { data: project, error: projectError } = await supabase
      .from('project')
      .select('*')
      .eq('id', projectId)
      .limit(1)
      .maybeSingle();

    if (projectError) {
      console.error('download route project error:', projectError);
      return NextResponse.json(
        { error: 'Failed to load project permissions' },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('profile_project_link')
      .select('project_id')
      .eq('profile_id', user.id)
      .eq('project_id', projectId)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error('download route membership error:', membershipError);
      return NextResponse.json(
        { error: 'Failed to load project permissions' },
        { status: 500 }
      );
    }

    if (isProjectPrivate(project) && !membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: quests, error: questsError } = await supabase
      .from('quest')
      .select('id,name,parent_id,metadata,created_at')
      .eq('project_id', projectId)
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (questsError) {
      console.error('download route query error:', {
        questsError
      });
      return NextResponse.json(
        { error: 'Failed to load project download tree' },
        { status: 500 }
      );
    }

    const questRows = (quests ?? []) as QuestRow[];
    const questIds = questRows.map((quest) => quest.id);
    let questAssetLinks: QuestAssetLinkRow[] = [];

    if (questIds.length) {
      const { data: links, error: questAssetLinksError } = await supabase
        .from('quest_asset_link')
        .select('quest_id,asset:asset_id!inner(id,name,metadata,created_at)')
        .in('quest_id', questIds)
        .eq('active', true)
        .eq('asset.active', true)
        .eq('asset.project_id', projectId)
        .eq('asset.content_type', 'source')
        .order('created_at', { ascending: true });

      if (questAssetLinksError) {
        console.error(
          'download route quest-asset-links error:',
          questAssetLinksError
        );
        return NextResponse.json(
          { error: 'Failed to load project assets' },
          { status: 500 }
        );
      }

      questAssetLinks = (links ?? []) as QuestAssetLinkRow[];
    }

    const assetsByQuestId = new Map<string, DownloadAsset[]>();
    questAssetLinks.forEach((link) => {
      const asset = Array.isArray(link.asset) ? link.asset[0] : link.asset;
      if (!asset) return;

      const currentAssets = assetsByQuestId.get(link.quest_id) ?? [];
      currentAssets.push(normalizeAsset(asset));
      assetsByQuestId.set(link.quest_id, currentAssets);
    });

    return NextResponse.json({
      projectId,
      projectTemplate: project.template,
      tree: buildQuestTree(questRows, assetsByQuestId)
    });
  } catch (error) {
    console.error('download route unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error loading project download tree' },
      { status: 500 }
    );
  }
}
