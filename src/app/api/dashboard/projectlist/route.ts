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

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;

  return parsed;
}

/**
 * GET /api/dashboard/projectlist?limit=<number>&offset=<number>
 * Returns mocked owner projects for authenticated users.
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

    // TODO: replace with real owner-project query from Supabase.
    const mockedOwnerProjects: ProjectListItem[] = [
      {
        id: 'proj-001',
        project_name: 'Bible Core',
        description: 'Main translation pipeline for core books.',
        target_languages: ['Portuguese', 'Spanish'],
        last_updated_at: '2026-04-19T10:15:00.000Z',
        total_members: 8,
        total_quests_created: 24,
        total_quests_completed: 18,
        total_assets: 312
      },
      {
        id: 'proj-002',
        project_name: 'Community Launch',
        description: 'Community rollout and validation.',
        target_languages: ['English'],
        last_updated_at: '2026-04-18T14:20:00.000Z',
        total_members: 5,
        total_quests_created: 12,
        total_quests_completed: 7,
        total_assets: 119
      },
      {
        id: 'proj-003',
        project_name: 'Audio Drafts',
        description: 'Audio-first assets and QA.',
        target_languages: ['French', 'German'],
        last_updated_at: '2026-04-17T08:40:00.000Z',
        total_members: 6,
        total_quests_created: 15,
        total_quests_completed: 10,
        total_assets: 221
      }
    ];

    const total = mockedOwnerProjects.length;
    const items = mockedOwnerProjects.slice(offset, offset + limit);

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
