import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

type ProjectListItem = {
  id: string;
  project_name: string;
  description: string | null;
  target_languages: string[];
  last_updated_at: string;
  total_members: number;
  // total_owners: number;
  expected_quests: number;
  total_quests_created: number;
  total_quests_completed: number;
  total_assets: number;
};

type ProjectListResponse = {
  profile_id: string;
  items: ProjectListItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
};

type OwnerProjectLinkRow = {
  project_id: string;
};

type ProjectRow = {
  id: string;
  name: string | null;
  description: string | null;
};

type ProjectDashboardCurrentRow = {
  project_id: string;
  total_members: number | null;
  total_owners: number | null;
  expected_quests: number | null;
  total_quests: number | null;
  completed_quests: number | null;
  total_assets: number | null;
  updated_at: string | null;
};

type ProjectLanguageLinkRow = {
  project_id: string;
  language_type: string | null;
  languoid:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
};

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;

  return parsed;
}

const toNumber = (value: number | null | undefined) => value ?? 0;
const unwrapLanguoid = (languoid: ProjectLanguageLinkRow['languoid']) =>
  Array.isArray(languoid) ? (languoid[0] ?? null) : languoid;

/**
 * GET /api/dashboard/projectlist?limit=<number>&offset=<number>
 * Returns owner projects for authenticated users.
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

    const limit = parsePositiveInt(request.nextUrl.searchParams.get('limit'), 30);
    const offset = parsePositiveInt(request.nextUrl.searchParams.get('offset'), 0);

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
      console.error('dashboard projectlist route owner-links error:', ownerLinksError);
      return NextResponse.json(
        { error: 'Failed to load owner projects' },
        { status: 500 }
      );
    }

    const ownerProjectIds = [
      ...new Set(
        ((ownerLinks ?? []) as OwnerProjectLinkRow[]).map((link) => link.project_id)
      )
    ];

    if (!ownerProjectIds.length) {
      const emptyResponse: ProjectListResponse = {
        profile_id: user.id,
        items: [],
        pagination: {
          limit,
          offset,
          total: 0,
          has_more: false
        }
      };
      return NextResponse.json(emptyResponse, { status: 200 });
    }

    const [{ data: projects, error: projectsError }, { data: dashboardRows, error: dashboardRowsError }, { data: languageRows, error: languageRowsError }] =
      await Promise.all([
        supabase
          .from('project')
          .select('id,name,description')
          .in('id', ownerProjectIds),
        supabase
          .from('project_dashboard_current')
          .select(
            'project_id,total_members,total_owners,expected_quests,total_quests,completed_quests,total_assets,updated_at'
          )
          .in('project_id', ownerProjectIds),
        supabase
          .from('project_language_link')
          .select('project_id,language_type,languoid:languoid_id(name)')
          .in('project_id', ownerProjectIds)
          .eq('active', true)
      ]);

    if (projectsError || dashboardRowsError || languageRowsError) {
      console.error('dashboard projectlist route base-query error:', {
        projectsError,
        dashboardRowsError,
        languageRowsError
      });
      return NextResponse.json(
        { error: 'Failed to load project list data' },
        { status: 500 }
      );
    }

    const projectById = new Map(
      ((projects ?? []) as ProjectRow[]).map((project) => [project.id, project])
    );

    const dashboardByProjectId = new Map(
      ((dashboardRows ?? []) as ProjectDashboardCurrentRow[]).map((row) => [
        row.project_id,
        row
      ])
    );

    const targetLanguagesByProjectId = new Map<string, string[]>();
    ((languageRows ?? []) as ProjectLanguageLinkRow[]).forEach((row) => {
      if (row.language_type !== 'target') return;
      const languoid = unwrapLanguoid(row.languoid);
      const languageName = languoid?.name?.trim();
      if (!languageName) return;
      const current = targetLanguagesByProjectId.get(row.project_id) ?? [];
      if (!current.includes(languageName)) {
        current.push(languageName);
      }
      targetLanguagesByProjectId.set(row.project_id, current);
    });

    const mergedItems: ProjectListItem[] = ownerProjectIds.map((projectId) => {
      const project = projectById.get(projectId);
      const dashboard = dashboardByProjectId.get(projectId);

      return {
        id: projectId,
        project_name: project?.name ?? 'Untitled project',
        description: project?.description ?? null,
        target_languages: targetLanguagesByProjectId.get(projectId) ?? [],
        last_updated_at: dashboard?.updated_at ?? new Date(0).toISOString(),
        total_members: toNumber(dashboard?.total_members) + toNumber(dashboard?.total_owners),
        expected_quests: toNumber(dashboard?.expected_quests),
        total_quests_created: toNumber(dashboard?.total_quests),
        total_quests_completed: toNumber(dashboard?.completed_quests),
        total_assets: toNumber(dashboard?.total_assets)
      };
    });

    mergedItems.sort((a, b) =>
      b.last_updated_at.localeCompare(a.last_updated_at)
    );

    const total = mergedItems.length;
    const items = mergedItems.slice(offset, offset + limit);

    const response: ProjectListResponse = {
      profile_id: user.id,
      items,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + items.length < total
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('dashboard projectlist route error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
