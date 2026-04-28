import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

type DashboardJson = {
  members: Record<
    string,
    {
      QuestsCreated: number;
      AssetsCreated: number;
    }
  >;
  quests: Record<string, unknown>;
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

/**
 * GET /api/dashboard/project?project_id=<uuid>
 * Returns mocked project dashboard payload following process-dashboard-refresh format.
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

    // TODO: replace with real project_dashboard_current query.
    const mockedPayload: DashboardProjectResponse = {
      project_id: projectId,
      project_status: 'active',
      template: 'bible',
      project_name: 'Bible Core',
      project_description: 'Main translation pipeline for core books.',
      total_quests: 24,
      expected_quests: 66,
      total_subquests: 68,
      total_assets: 312,
      total_quests_versions: 32,
      completed_quests: 18,
      completed_subquests: 43,
      inactive_quests: 2,
      inactive_assets: 11,
      assets_with_text: 210,
      assets_with_audio: 83,
      assets_with_image: 144,
      assets_with_transcription: 0,
      assets_with_translation: 0,
      total_source_languages: 3,
      total_target_languages: 2,
      total_members: 8,
      total_owners: 2,
      dashboard_json: {
        members: {
          'profile-001': { QuestsCreated: 9, AssetsCreated: 120 },
          'profile-002': { QuestsCreated: 7, AssetsCreated: 96 },
          'profile-003': { QuestsCreated: 6, AssetsCreated: 84 },
          'profile-004': { QuestsCreated: 5, AssetsCreated: 67 }
        },
        quests: {
          'quest-root-001': {
            name: 'Genesis',
            QuestCompleted: true,
            TotalSubquestsCreated: 12,
            TotalSubquestsExpected: 16,
            TotalSubquestsCompleted: 9,
            TotalAssets: 71,
            languoids: ['por', 'spa'],
            Creators: ['profile-001', 'profile-002'],
            subquests: [
              {
                name: 'Genesis 01',
                creator_id: ['profile-001'],
                languoids: ['por'],
                TotalAssets: 12,
                TotalImages: 4,
                TotalText: 8,
                TotalAudio: 6,
                ItemsExpected: 10,
                ItemsCompleted: 8
              },
              {
                name: 'Genesis 02',
                creator_id: ['profile-002'],
                languoids: ['por', 'spa'],
                TotalAssets: 11,
                TotalImages: 3,
                TotalText: 7,
                TotalAudio: 5,
                ItemsExpected: 9,
                ItemsCompleted: 7
              },
              {
                name: 'Genesis 03',
                creator_id: ['profile-003'],
                languoids: ['spa'],
                TotalAssets: 9,
                TotalImages: 2,
                TotalText: 6,
                TotalAudio: 4,
                ItemsExpected: 8,
                ItemsCompleted: 6
              }
            ]
          },
          'quest-root-002': {
            name: 'Exodus',
            QuestCompleted: false,
            TotalSubquestsCreated: 7,
            TotalSubquestsExpected: 10,
            TotalSubquestsCompleted: 5,
            TotalAssets: 59,
            languoids: ['por', 'fra'],
            Creators: ['profile-001', 'profile-004'],
            subquests: [
              {
                name: 'Exodus 01',
                creator_id: ['profile-004'],
                languoids: ['fra'],
                TotalAssets: 8,
                TotalImages: 2,
                TotalText: 5,
                TotalAudio: 3,
                ItemsExpected: 7,
                ItemsCompleted: 5
              },
              {
                name: 'Exodus 02',
                creator_id: ['profile-001'],
                languoids: ['por'],
                TotalAssets: 10,
                TotalImages: 3,
                TotalText: 7,
                TotalAudio: 4,
                ItemsExpected: 9,
                ItemsCompleted: 7
              },
              {
                name: 'Exodus 03',
                creator_id: ['profile-002'],
                languoids: ['por', 'fra'],
                TotalAssets: 7,
                TotalImages: 1,
                TotalText: 4,
                TotalAudio: 2,
                ItemsExpected: 6,
                ItemsCompleted: 4
              }
            ]
          },
          'quest-root-003': {
            name: 'Acts',
            QuestCompleted: false,
            TotalSubquestsCreated: 8,
            TotalSubquestsExpected: 10,
            TotalSubquestsCompleted: 4,
            TotalAssets: 44,
            languoids: ['deu', 'eng'],
            Creators: ['profile-003', 'profile-004'],
            subquests: [
              {
                name: 'Acts 01',
                creator_id: ['profile-003'],
                languoids: ['deu'],
                TotalAssets: 6,
                TotalImages: 2,
                TotalText: 4,
                TotalAudio: 2,
                ItemsExpected: 6,
                ItemsCompleted: 4
              },
              {
                name: 'Acts 02',
                creator_id: ['profile-004'],
                languoids: ['eng'],
                TotalAssets: 5,
                TotalImages: 1,
                TotalText: 3,
                TotalAudio: 2,
                ItemsExpected: 5,
                ItemsCompleted: 3
              },
              {
                name: 'Acts 03',
                creator_id: ['profile-001'],
                languoids: ['deu', 'eng'],
                TotalAssets: 7,
                TotalImages: 2,
                TotalText: 4,
                TotalAudio: 3,
                ItemsExpected: 6,
                ItemsCompleted: 4
              }
            ]
          }
        }
      },
      updated_at: new Date().toISOString()
    };

    return NextResponse.json(mockedPayload, { status: 200 });
  } catch (error) {
    console.error('dashboard project route error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
