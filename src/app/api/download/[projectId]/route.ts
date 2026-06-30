import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { Database } from '../../../../../database.types';

type QuestRow = {
  id: string;
  name: string | null;
  parent_id: string | null;
  metadata: string | null;
  created_at: string;
};

type DownloadQuestNode = {
  id: string;
  name: string | null;
  metadata: string | null;
  createdAt: string;
  assetCount: number;
  children: DownloadQuestNode[];
  assets: [];
};

type ProjectAccessRow = {
  id: string;
  template: string | null;
  private?: boolean | null;
  visible?: boolean | null;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QUEST_PAGE_SIZE = 1000;
const ASSET_COUNT_BATCH_SIZE = 10;

function isProjectPrivate(project: ProjectAccessRow): boolean {
  if (typeof project.private === 'boolean') {
    return project.private;
  }

  return project.visible !== true;
}

function buildQuestTree(
  quests: QuestRow[],
  assetCountsByQuestId: Map<string, number>
): DownloadQuestNode[] {
  const nodesById = new Map<string, DownloadQuestNode>();
  const roots: DownloadQuestNode[] = [];

  quests.forEach((quest) => {
    nodesById.set(quest.id, {
      id: quest.id,
      name: quest.name,
      metadata: quest.metadata,
      createdAt: quest.created_at,
      assetCount: assetCountsByQuestId.get(quest.id) ?? 0,
      children: [],
      assets: []
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

async function loadProjectQuests(
  supabase: ReturnType<typeof createClient<Database>>,
  projectId: string
) {
  const quests: QuestRow[] = [];

  for (let from = 0; ; from += QUEST_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('quest')
      .select('id,name,parent_id,metadata,created_at')
      .eq('project_id', projectId)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .range(from, from + QUEST_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as QuestRow[];
    quests.push(...rows);

    if (rows.length < QUEST_PAGE_SIZE) {
      return quests;
    }
  }
}

async function countQuestAssets(
  supabase: ReturnType<typeof createClient<Database>>,
  projectId: string,
  questId: string
) {
  const { count, error } = await supabase
    .from('quest_asset_link')
    .select('asset_id,asset:asset_id!inner(id)', {
      count: 'exact',
      head: true
    })
    .eq('quest_id', questId)
    .eq('active', true)
    .eq('asset.active', true)
    .eq('asset.project_id', projectId)
    .eq('asset.content_type', 'source');

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function loadQuestAssetCounts(
  supabase: ReturnType<typeof createClient<Database>>,
  projectId: string,
  questIds: string[]
) {
  const countsByQuestId = new Map<string, number>();

  for (let index = 0; index < questIds.length; index += ASSET_COUNT_BATCH_SIZE) {
    const batch = questIds.slice(index, index + ASSET_COUNT_BATCH_SIZE);
    const counts = await Promise.all(
      batch.map(async (questId) => ({
        questId,
        count: await countQuestAssets(supabase, projectId, questId)
      }))
    );

    counts.forEach(({ questId, count }) => {
      countsByQuestId.set(questId, count);
    });
  }

  return countsByQuestId;
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

    let questRows: QuestRow[];
    try {
      questRows = await loadProjectQuests(supabase, projectId);
    } catch (questsError) {
      console.error('download route query error:', {
        questsError
      });
      return NextResponse.json(
        { error: 'Failed to load project download tree' },
        { status: 500 }
      );
    }

    const questIds = questRows.map((quest) => quest.id);
    let assetCountsByQuestId = new Map<string, number>();

    try {
      assetCountsByQuestId = await loadQuestAssetCounts(
        supabase,
        projectId,
        questIds
      );
    } catch (questAssetCountsError) {
      console.error(
        'download route quest-asset-counts error:',
        questAssetCountsError
      );
      return NextResponse.json(
        { error: 'Failed to load project asset counts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      projectId,
      projectTemplate: project.template,
      tree: buildQuestTree(questRows, assetCountsByQuestId)
    });
  } catch (error) {
    console.error('download route unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error loading project download tree' },
      { status: 500 }
    );
  }
}
