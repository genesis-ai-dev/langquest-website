import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

type AssetRow = {
  id: string;
  name: string;
  metadata: string | null;
  images: unknown;
  created_at: string;
  content?: Array<{
    audio: unknown;
  }> | null;
};

type QuestAssetLinkRow = {
  asset: AssetRow | AssetRow[] | null;
};

type DownloadAsset = {
  id: string;
  name: string;
  metadata: string | null;
  created_At: string;
  imageCount: number;
  audioFileCount: number;
};

type ProjectAccessRow = {
  id: string;
  private?: boolean | null;
  visible?: boolean | null;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSET_LINK_PAGE_SIZE = 1000;

function isProjectPrivate(project: ProjectAccessRow): boolean {
  if (typeof project.private === 'boolean') {
    return project.private;
  }

  return project.visible !== true;
}

function countTextArrayItems(value: unknown): number {
  if (!value) return 0;

  if (Array.isArray(value)) {
    return value.filter(
      (item) => typeof item === 'string' && item.trim() !== ''
    ).length;
  }

  if (typeof value !== 'string') return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) => typeof item === 'string' && item.trim() !== ''
      ).length;
    }
  } catch {
    // Fall back to semicolon parsing below.
  }

  return trimmed
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function normalizeAsset(asset: AssetRow): DownloadAsset {
  return {
    id: asset.id,
    name: asset.name,
    metadata: asset.metadata,
    created_At: asset.created_at,
    imageCount: countTextArrayItems(asset.images),
    audioFileCount: (asset.content ?? []).reduce(
      (total, contentLink) => total + countTextArrayItems(contentLink.audio),
      0
    )
  };
}

async function loadQuestAssets(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  questId: string
) {
  const assets: DownloadAsset[] = [];

  for (let from = 0; ; from += ASSET_LINK_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('quest_asset_link')
      .select(
        'asset:asset_id!inner(id,name,metadata,images,created_at,content:asset_content_link(audio))'
      )
      .eq('quest_id', questId)
      .eq('active', true)
      .eq('asset.active', true)
      .eq('asset.project_id', projectId)
      .eq('asset.content_type', 'source')
      .order('created_at', { ascending: true })
      .range(from, from + ASSET_LINK_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as QuestAssetLinkRow[];
    rows.forEach((link) => {
      const asset = Array.isArray(link.asset) ? link.asset[0] : link.asset;
      if (asset) {
        assets.push(normalizeAsset(asset));
      }
    });

    if (rows.length < ASSET_LINK_PAGE_SIZE) {
      return assets;
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; questId: string }> }
) {
  try {
    const { projectId, questId } = await params;

    if (
      !projectId ||
      !questId ||
      !uuidRegex.test(projectId) ||
      !uuidRegex.test(questId)
    ) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
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
    const supabaseAuth = createClient(
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

    const supabase = createClient(
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
      .select('id,private,visible')
      .eq('id', projectId)
      .limit(1)
      .maybeSingle();

    if (projectError) {
      console.error('download assets route project error:', projectError);
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
      console.error('download assets route membership error:', membershipError);
      return NextResponse.json(
        { error: 'Failed to load project permissions' },
        { status: 500 }
      );
    }

    if (isProjectPrivate(project as ProjectAccessRow) && !membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: quest, error: questError } = await supabase
      .from('quest')
      .select('id')
      .eq('id', questId)
      .eq('project_id', projectId)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (questError) {
      console.error('download assets route quest error:', questError);
      return NextResponse.json(
        { error: 'Failed to load quest' },
        { status: 500 }
      );
    }

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    const assets = await loadQuestAssets(supabase, projectId, questId);

    return NextResponse.json({
      projectId,
      questId,
      assets
    });
  } catch (error) {
    console.error('download assets route unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error loading quest assets' },
      { status: 500 }
    );
  }
}
