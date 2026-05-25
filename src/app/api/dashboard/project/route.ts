import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

type DashboardCreator = {
  id: string;
  name: string;
};

type DashboardSubquest = {
  name: string | null;
  creatorsId?: string[];
  creators: DashboardCreator[];
  languoids: string[];
  itemsExpected: number;
  itemsCompleted: number;
  totalVersions: number;
  totalAssets: number;
  totalTranscriptions: number;
  totalTranslations: number;
  totalAssetsWithTranscription: number;
  totalAssetsWithTranslation: number;
  totalImages: number;
  totalText: number;
  totalAudio: number;
};

type DashboardQuest = {
  name: string | null;
  creatorsId?: string[];
  creators: DashboardCreator[];
  questCompleted: boolean;
  totalSubquestsCreated: number;
  totalSubquestsExpected: number;
  totalSubquestsCompleted: number;
  totalAssets: number;
  languoids: string[];
  subquests: DashboardSubquest[];
};

type DashboardMemberStats = {
  questsCreated: number;
  assetsCreated: number;
  name?: string;
};

type DashboardJson = {
  members: Record<string, DashboardMemberStats>;
  quests: Record<string, DashboardQuest>;
};

type DashboardProjectResponse = {
  project_id: string;
  project_status: 'active' | 'inactive';
  template: 'bible' | 'fia' | 'unstructured';
  project_name: string;
  project_description: string | null;
  total_quests: number;
  expected_quests: number;
  total_subquests: number;
  total_assets: number;
  total_quests_versions: number;
  completed_quests: number;
  completed_subquests: number;
  inactive_quests: number;
  inactive_assets: number;
  assets_with_text: number;
  assets_with_audio: number;
  assets_with_image: number;
  assets_with_transcription: number;
  assets_with_translation: number;
  total_source_languages: number;
  total_target_languages: number;
  total_members: number;
  total_owners: number;
  dashboard_json: DashboardJson;
  updated_at: string;
};

type ProjectRow = {
  id: string;
  name: string | null;
  description: string | null;
  template: 'bible' | 'fia' | 'unstructured' | null;
  active: boolean | null;
};

type ProjectDashboardCurrentRow = {
  project_id: string;
  project_status: 'active' | 'inactive' | null;
  total_quests: number | null;
  expected_quests: number | null;
  total_subquests: number | null;
  total_assets: number | null;
  total_quests_versions: number | null;
  completed_quests: number | null;
  completed_subquests: number | null;
  inactive_quests: number | null;
  inactive_assets: number | null;
  assets_with_text: number | null;
  assets_with_audio: number | null;
  assets_with_image: number | null;
  assets_with_transcription: number | null;
  assets_with_translation: number | null;
  total_source_languages: number | null;
  total_target_languages: number | null;
  total_members: number | null;
  total_owners: number | null;
  dashboard_json: DashboardJson | null;
  updated_at: string | null;
};

const asNumber = (value: number | null | undefined) => value ?? 0;
const resolveTemplate = (
  value: ProjectRow['template']
): 'bible' | 'fia' | 'unstructured' =>
  value === 'bible' || value === 'fia' || value === 'unstructured'
    ? value
    : 'unstructured';

function normalizeDashboardJson(
  value: DashboardJson | null | undefined
): DashboardJson {
  return {
    members: value?.members ?? {},
    quests: value?.quests ?? {}
  };
}

async function enrichDashboardMemberNames(
  supabase: any,
  dashboardJson: DashboardJson
): Promise<DashboardJson> {
  const memberIds = Object.keys(dashboardJson.members);
  if (memberIds.length === 0) return dashboardJson;

  const { data: profiles, error: profilesError } = await supabase
    .from('profile')
    .select('id,username')
    .in('id', memberIds);

  if (profilesError) {
    console.error(
      'dashboard project route profile lookup error:',
      profilesError
    );
    return dashboardJson;
  }

  const profileNameById = new Map(
    ((profiles ?? []) as Array<{ id: string; username: string | null }>).map(
      (profile) => [
        profile.id,
        profile.username || `Member ${profile.id.slice(0, 8)}`
      ]
    )
  );

  const enrichedMembers: DashboardJson['members'] = {};
  for (const [memberId, memberStats] of Object.entries(dashboardJson.members)) {
    enrichedMembers[memberId] = {
      ...memberStats,
      name: profileNameById.get(memberId) ?? `Member ${memberId.slice(0, 8)}`
    };
  }

  return {
    ...dashboardJson,
    members: enrichedMembers
  };
}

function toDashboardCreator(
  creatorId: string,
  members: DashboardJson['members']
): DashboardCreator {
  return {
    id: creatorId,
    name: members[creatorId]?.name ?? `Member ${creatorId.slice(0, 8)}`
  };
}

function enrichDashboardQuestCreators(
  dashboardJson: DashboardJson
): DashboardJson {
  const enrichedQuests: DashboardJson['quests'] = {};

  for (const [questId, quest] of Object.entries(dashboardJson.quests)) {
    const questCreatorIds = quest.creatorsId ?? [];
    const subquests = quest.subquests ?? [];

    enrichedQuests[questId] = {
      ...quest,
      creatorsId: questCreatorIds,
      creators: questCreatorIds.map((creatorId) =>
        toDashboardCreator(creatorId, dashboardJson.members)
      ),
      subquests: subquests.map((subquest) => {
        const subquestCreatorIds = subquest.creatorsId ?? [];

        return {
          ...subquest,
          creatorsId: subquestCreatorIds,
          creators: subquestCreatorIds.map((creatorId) =>
            toDashboardCreator(creatorId, dashboardJson.members)
          )
        };
      })
    };
  }

  return {
    ...dashboardJson,
    quests: enrichedQuests
  };
}

/**
 * GET /api/dashboard/project?project_id=<uuid>
 * Returns dashboard payload from project_dashboard_current for authenticated users.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
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

    const projectId = request.nextUrl.searchParams.get('project_id');
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required query param: project_id' },
        { status: 400 }
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

    const { data: membershipRow, error: membershipError } = await supabase
      .from('profile_project_link')
      .select('project_id')
      .eq('profile_id', user.id)
      .eq('project_id', projectId)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(
        'dashboard project route membership error:',
        membershipError
      );
      return NextResponse.json(
        { error: 'Failed to load project permissions' },
        { status: 500 }
      );
    }

    if (!membershipRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [
      { data: project, error: projectError },
      { data: dashboard, error: dashboardError }
    ] = await Promise.all([
      supabase
        .from('project')
        .select('id,name,description,template,active')
        .eq('id', projectId)
        .limit(1)
        .maybeSingle<ProjectRow>(),
      supabase
        .from('project_dashboard_current')
        .select(
          'project_id,project_status,total_quests,expected_quests,total_subquests,total_assets,total_quests_versions,completed_quests,completed_subquests,inactive_quests,inactive_assets,assets_with_text,assets_with_audio,assets_with_image,assets_with_transcription,assets_with_translation,total_source_languages,total_target_languages,total_members,total_owners,dashboard_json,updated_at'
        )
        .eq('project_id', projectId)
        .limit(1)
        .maybeSingle<ProjectDashboardCurrentRow>()
    ]);

    if (projectError || dashboardError) {
      console.error('dashboard project route base-query error:', {
        projectError,
        dashboardError
      });
      return NextResponse.json(
        { error: 'Failed to load project dashboard' },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const normalizedDashboardJson = normalizeDashboardJson(
      dashboard?.dashboard_json
    );
    const enrichedDashboardJson = await enrichDashboardMemberNames(
      supabase,
      normalizedDashboardJson
    );
    const enrichedDashboardWithCreators = enrichDashboardQuestCreators(
      enrichedDashboardJson
    );

    const response: DashboardProjectResponse = {
      project_id: project.id,
      project_status:
        dashboard?.project_status ??
        (project.active === true ? 'active' : 'inactive'),
      template: resolveTemplate(project.template),
      project_name: project.name ?? 'Untitled project',
      project_description: project.description ?? null,
      total_quests: asNumber(dashboard?.total_quests),
      expected_quests: asNumber(dashboard?.expected_quests),
      total_subquests: asNumber(dashboard?.total_subquests),
      total_assets: asNumber(dashboard?.total_assets),
      total_quests_versions: asNumber(dashboard?.total_quests_versions),
      completed_quests: asNumber(dashboard?.completed_quests),
      completed_subquests: asNumber(dashboard?.completed_subquests),
      inactive_quests: asNumber(dashboard?.inactive_quests),
      inactive_assets: asNumber(dashboard?.inactive_assets),
      assets_with_text: asNumber(dashboard?.assets_with_text),
      assets_with_audio: asNumber(dashboard?.assets_with_audio),
      assets_with_image: asNumber(dashboard?.assets_with_image),
      assets_with_transcription: asNumber(dashboard?.assets_with_transcription),
      assets_with_translation: asNumber(dashboard?.assets_with_translation),
      total_source_languages: asNumber(dashboard?.total_source_languages),
      total_target_languages: asNumber(dashboard?.total_target_languages),
      total_members: asNumber(dashboard?.total_members),
      total_owners: asNumber(dashboard?.total_owners),
      dashboard_json: enrichedDashboardWithCreators,
      updated_at: dashboard?.updated_at ?? new Date(0).toISOString()
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('dashboard project route error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
