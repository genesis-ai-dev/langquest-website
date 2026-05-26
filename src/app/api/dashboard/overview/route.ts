import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

type DashboardOverviewResponse = {
  profile_id: string;
  total_projects: number;
  total_active_projects: number;
  total_members: number;
  total_quests: number;
  total_quests_completed: number;
  total_source_languages: number;
  total_target_languages: number;
  total_assets: number;
  total_text_assets: number;
  total_image_assets: number;
  total_audio_assets: number;
};

type OwnerProjectLinkRow = {
  project_id: string;
};

type ProjectDashboardCurrentRow = {
  project_id: string;
  project_status: 'active' | 'inactive' | null;
  total_members: number | null;
  total_owners: number | null;
  total_quests: number | null;
  completed_quests: number | null;
  total_source_languages: number | null;
  total_target_languages: number | null;
  total_assets: number | null;
  assets_with_text: number | null;
  assets_with_image: number | null;
  assets_with_audio: number | null;
};

const asNumber = (value: number | null | undefined) => value ?? 0;

/**
 * GET /api/dashboard/overview?profile_id=<uuid>
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

    const requestedProfileId = request.nextUrl.searchParams.get('profile_id');
    if (requestedProfileId && requestedProfileId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    const { data: ownerLinks, error: ownerLinksError } = await supabase
      .from('profile_project_link')
      .select('project_id')
      .eq('profile_id', user.id)
      .eq('active', true)
      .eq('membership', 'owner');

    if (ownerLinksError) {
      console.error(
        'dashboard overview route owner-links error:',
        ownerLinksError
      );
      return NextResponse.json(
        { error: 'Failed to load owner projects' },
        { status: 500 }
      );
    }

    const ownerProjectIds = [
      ...new Set(
        ((ownerLinks ?? []) as OwnerProjectLinkRow[]).map(
          (link) => link.project_id
        )
      )
    ];

    if (!ownerProjectIds.length) {
      const emptyOverview: DashboardOverviewResponse = {
        profile_id: user.id,
        total_projects: 0,
        total_active_projects: 0,
        total_members: 0,
        total_quests: 0,
        total_quests_completed: 0,
        total_source_languages: 0,
        total_target_languages: 0,
        total_assets: 0,
        total_text_assets: 0,
        total_image_assets: 0,
        total_audio_assets: 0
      };
      return NextResponse.json(emptyOverview, { status: 200 });
    }

    const { data: dashboardRows, error: dashboardRowsError } = await supabase
      .from('project_dashboard_current')
      .select(
        'project_id,project_status,total_members,total_owners,total_quests,completed_quests,total_source_languages,total_target_languages,total_assets,assets_with_text,assets_with_image,assets_with_audio'
      )
      .in('project_id', ownerProjectIds);

    if (dashboardRowsError) {
      console.error(
        'dashboard overview route dashboard-rows error:',
        dashboardRowsError
      );
      return NextResponse.json(
        { error: 'Failed to load dashboard overview data' },
        { status: 500 }
      );
    }

    const activeRows = ((dashboardRows ?? []) as ProjectDashboardCurrentRow[])
      .filter((row) => row.project_status === 'active');

    const totals = activeRows.reduce(
      (acc, row) => ({
        total_members:
          acc.total_members +
          asNumber(row.total_members) +
          asNumber(row.total_owners),
        total_quests: acc.total_quests + asNumber(row.total_quests),
        total_quests_completed:
          acc.total_quests_completed + asNumber(row.completed_quests),
        total_source_languages:
          acc.total_source_languages + asNumber(row.total_source_languages),
        total_target_languages:
          acc.total_target_languages + asNumber(row.total_target_languages),
        total_assets: acc.total_assets + asNumber(row.total_assets),
        total_text_assets: acc.total_text_assets + asNumber(row.assets_with_text),
        total_image_assets:
          acc.total_image_assets + asNumber(row.assets_with_image),
        total_audio_assets:
          acc.total_audio_assets + asNumber(row.assets_with_audio)
      }),
      {
        total_members: 0,
        total_quests: 0,
        total_quests_completed: 0,
        total_source_languages: 0,
        total_target_languages: 0,
        total_assets: 0,
        total_text_assets: 0,
        total_image_assets: 0,
        total_audio_assets: 0
      }
    );

    const overview: DashboardOverviewResponse = {
      profile_id: user.id,
      total_projects: ownerProjectIds.length,
      total_active_projects: activeRows.length,
      ...totals
    };

    return NextResponse.json(overview, { status: 200 });
  } catch (error) {
    console.error('dashboard overview route error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
