import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../../../database.types';
import { getSupabaseCredentials, SupabaseEnvironment } from '@/lib/supabase';
import { env } from '@/lib/env';

/**
 * GET /api/export/share/[token]
 * Public shareable page for feedback exports
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Await params in Next.js 15
    const { token } = await params;

    const environment =
      (request.nextUrl.searchParams.get(
        'environment'
      ) as SupabaseEnvironment) ||
      (env.NEXT_PUBLIC_ENVIRONMENT as SupabaseEnvironment);
    const { url, key } = getSupabaseCredentials(environment);

    // Use service role key for public access (or anon key if RLS allows)
    const supabase = createClient<Database>(url, key);

    // Fetch export by share token
    const { data: exportRecord, error: exportError } = (await (supabase
      .from('export_quest_artifact' as any)
      .select('*')
      .eq('share_token', token)
      .eq('export_type', 'feedback')
      .single() as any)) as {
      data: {
        id: string;
        quest_id: string;
        project_id: string;
        export_type: string;
        status: string;
        audio_url: string | null;
        metadata: any;
        share_token: string | null;
        share_expires_at: string | null;
      } | null;
      error: any;
    };

    if (exportError || !exportRecord) {
      return NextResponse.json(
        { error: 'Export not found or invalid token' },
        { status: 404 }
      );
    }

    // Check if token has expired
    if (exportRecord.share_expires_at) {
      const expiresAt = new Date(exportRecord.share_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Share link has expired' },
          { status: 410 }
        );
      }
    }

    // Fetch quest and project info for display
    const { data: quest } = await supabase
      .from('quest')
      .select('name, metadata')
      .eq('id', exportRecord.quest_id)
      .single();

    const { data: project } = await supabase
      .from('project')
      .select('name')
      .eq('id', exportRecord.project_id)
      .single();

    // Return HTML page for sharing
    const metadata = exportRecord.metadata as {
      manifest: {
        total_duration_ms: number;
      };
      bible?: {
        chapter_ref: string;
        book_id: string;
        chapter_num: number;
      };
    };

    const manifest = metadata.manifest;
    const bibleMetadata = metadata.bible;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quest Export${bibleMetadata ? ` - ${bibleMetadata.chapter_ref}` : ''}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { margin-top: 0; }
    .audio-player {
      margin: 2rem 0;
    }
    audio {
      width: 100%;
    }
    .info {
      color: #666;
      margin: 1rem 0;
    }
    .feedback-form {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #eee;
    }
    textarea {
      width: 100%;
      min-height: 100px;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
    }
    button {
      background: #0070f3;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      margin-top: 1rem;
    }
    button:hover {
      background: #0051cc;
    }
    .status {
      padding: 0.5rem;
      border-radius: 4px;
      margin: 1rem 0;
    }
    .status.success {
      background: #d4edda;
      color: #155724;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${quest?.name || (bibleMetadata ? bibleMetadata.chapter_ref : 'Quest Export')}</h1>
    ${project ? `<p class="info">Project: ${project.name}</p>` : ''}
    ${bibleMetadata ? `<p class="info">Chapter: ${bibleMetadata.chapter_ref}</p>` : ''}
    <p class="info">Duration: ${Math.floor(manifest.total_duration_ms / 1000 / 60)}:${String(Math.floor((manifest.total_duration_ms / 1000) % 60)).padStart(2, '0')}</p>
    
    ${
      exportRecord.status === 'ready' && exportRecord.audio_url
        ? `
      <div class="audio-player">
        <audio controls>
          <source src="${exportRecord.audio_url}" type="audio/mpeg">
          Your browser does not support the audio element.
        </audio>
      </div>
    `
        : `
      <p>Audio is still processing. Please check back later.</p>
    `
    }
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  } catch (error: any) {
    console.error('Share page error:', error);
    return NextResponse.json(
      { error: `Failed to load share page: ${error.message}` },
      { status: 500 }
    );
  }
}
