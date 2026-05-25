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

    const profileId = request.nextUrl.searchParams.get('profile_id');
    if (!profileId) {
      return NextResponse.json(
        { error: 'Missing required query param: profile_id' },
        { status: 400 }
      );
    }

    const overview: DashboardOverviewResponse = {
      profile_id: profileId,
      total_projects: 12,
      total_active_projects: 8,
      total_members: 27,
      total_quests: 154,
      total_quests_completed: 101,
      total_source_languages: 9,
      total_target_languages: 14,
      total_assets: 986,
      total_text_assets: 702,
      total_image_assets: 201,
      total_audio_assets: 83
    };

    return NextResponse.json(overview, { status: 200 });
  } catch (error) {
    console.error('dashboard overview route error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
