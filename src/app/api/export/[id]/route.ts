import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../../database.types';
import { getSupabaseCredentials, SupabaseEnvironment } from '@/lib/supabase';
import { env } from '@/lib/env';

/**
 * GET /api/export/[id]
 * Get export status and details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    // Authenticate request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const environment =
      (request.nextUrl.searchParams.get(
        'environment'
      ) as SupabaseEnvironment) ||
      (env.NEXT_PUBLIC_ENVIRONMENT as SupabaseEnvironment);
    const { url, key } = getSupabaseCredentials(environment);

    const supabaseAuth = createClient<Database>(url, key);
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

    const supabase = createClient<Database>(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    // Fetch export record
    const { data: exportRecord, error: exportError } = (await (supabase
      .from('export_quest_artifact' as any)
      .select('*')
      .eq('id', id)
      .single() as any)) as {
      data: {
        id: string;
        quest_id: string;
        project_id: string;
        export_type: string;
        status: string;
        audio_url: string | null;
        metadata: any;
        error_message: string | null;
        share_token: string | null;
        created_at: string;
        updated_at: string;
      } | null;
      error: any;
    };

    if (exportError || !exportRecord) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    // Check project membership
    const { data: membership } = await supabase
      .from('profile_project_link')
      .select('membership')
      .eq('project_id', exportRecord.project_id)
      .eq('profile_id', user.id)
      .eq('active', true)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this export' },
        { status: 403 }
      );
    }

    const shareUrl =
      exportRecord.export_type === 'feedback' && exportRecord.share_token
        ? `${env.NEXT_PUBLIC_SITE_URL}/api/export/share/${exportRecord.share_token}`
        : undefined;

    return NextResponse.json({
      id: exportRecord.id,
      quest_id: exportRecord.quest_id,
      project_id: exportRecord.project_id,
      export_type: exportRecord.export_type,
      status: exportRecord.status,
      audio_url: exportRecord.audio_url,
      metadata: exportRecord.metadata,
      error_message: exportRecord.error_message,
      share_url: shareUrl,
      created_at: exportRecord.created_at,
      updated_at: exportRecord.updated_at
    });
  } catch (error: any) {
    console.error('Export fetch error:', error);
    return NextResponse.json(
      { error: `Failed to fetch export: ${error.message}` },
      { status: 500 }
    );
  }
}
