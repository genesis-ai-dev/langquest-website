import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { Database } from '../../../../../../../database.types';

type MergeQuestRequest = {
  assetIds?: string[];
};

type AssetRow = {
  id: string;
  name: string;
  order_index: number | null;
  created_at: string;
};

type AssetContentLinkRow = {
  id: string;
  asset_id: string;
  audio: string[] | string | null;
  order_index: number | null;
  created_at: string;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const maxDuration = 300;

function parseAudioPaths(audio: string[] | string | null): string[] {
  if (!audio) return [];

  if (Array.isArray(audio)) {
    return audio.filter(
      (path): path is string => typeof path === 'string' && path.trim() !== ''
    );
  }

  const trimmed = audio.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (path): path is string => typeof path === 'string' && path.trim() !== ''
      );
    }
  } catch {
    // Fall back to semicolon parsing below.
  }

  return trimmed
    .split(';')
    .map((path) => path.trim())
    .filter(Boolean);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString('base64');
}

function getFormatFromPath(path: string) {
  return path.split('.').pop()?.toLowerCase() || 'mp3';
}

function isProjectPrivate(project: { private?: boolean; visible?: boolean }) {
  if (typeof project.private === 'boolean') {
    return project.private;
  }

  return project.visible !== true;
}

async function downloadStoragePath(
  supabase: ReturnType<typeof createClient<Database>>,
  bucketName: string,
  audioPath: string
) {
  if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
    const response = await fetch(audioPath);
    if (!response.ok) {
      throw new Error(`Failed to download audio URL: ${response.statusText}`);
    }

    return {
      buffer: await response.arrayBuffer(),
      path: audioPath
    };
  }

  const basePath = audioPath.replace(/\.(wav|mp3|m4a|ogg|webm)$/i, '');
  const pathVariants = [
    audioPath,
    `local/${audioPath}`,
    `shared_attachments/${audioPath}`,
    `shared_attachments/${basePath}.wav`,
    `shared_attachments/${basePath}.mp3`,
    `audio/${audioPath}`,
    audioPath.replace(/^local\//, '')
  ];

  let lastError: unknown = null;
  for (const variantPath of [...new Set(pathVariants)]) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(variantPath);

    if (!error && data) {
      return {
        buffer: await data.arrayBuffer(),
        path: variantPath
      };
    }

    lastError = error;
  }

  throw new Error(
    `Failed to download audio from storage: ${
      lastError instanceof Error ? lastError.message : 'file not found'
    }`
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; questId: string }> }
) {
  try {
    const { projectId, questId } = await params;

    if (!uuidRegex.test(projectId) || !uuidRegex.test(questId)) {
      return NextResponse.json(
        { error: 'Invalid project or quest ID format' },
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

    const body = (await request.json().catch(() => ({}))) as MergeQuestRequest;
    const assetIds = [...new Set(body.assetIds ?? [])].filter((id) =>
      uuidRegex.test(id)
    );

    if (!assetIds.length) {
      return NextResponse.json(
        { error: 'assetIds must include at least one valid asset ID' },
        { status: 400 }
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

    const supabaseAdmin = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false }
      }
    );

    const [
      { data: project, error: projectError },
      { data: quest, error: questError }
    ] = await Promise.all([
      supabaseAdmin
        .from('project')
        .select('*')
        .eq('id', projectId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('quest')
        .select('id,name,project_id')
        .eq('id', questId)
        .eq('project_id', projectId)
        .eq('active', true)
        .limit(1)
        .maybeSingle()
    ]);

    if (projectError || questError) {
      console.error('download quest merge route project query error:', {
        projectError,
        questError
      });
      return NextResponse.json(
        { error: 'Failed to load project or quest' },
        { status: 500 }
      );
    }

    if (!project || !quest) {
      return NextResponse.json(
        { error: 'Project or quest not found' },
        { status: 404 }
      );
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
      console.error(
        'download quest merge route membership error:',
        membershipError
      );
      return NextResponse.json(
        { error: 'Failed to load project permissions' },
        { status: 500 }
      );
    }

    if (isProjectPrivate(project) && !membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: links, error: linksError } = await supabaseAdmin
      .from('quest_asset_link')
      .select('asset_id')
      .eq('quest_id', questId)
      .eq('active', true)
      .in('asset_id', assetIds);

    if (linksError) {
      console.error('download quest merge route links error:', linksError);
      return NextResponse.json(
        { error: 'Failed to validate quest assets' },
        { status: 500 }
      );
    }

    const linkedAssetIds = new Set((links ?? []).map((link) => link.asset_id));
    const validAssetIds = assetIds.filter((assetId) =>
      linkedAssetIds.has(assetId)
    );

    if (!validAssetIds.length) {
      return NextResponse.json(
        { error: 'No selected assets belong to this quest' },
        { status: 400 }
      );
    }

    const [
      { data: assets, error: assetsError },
      { data: contentLinks, error: contentLinksError }
    ] = await Promise.all([
      supabaseAdmin
        .from('asset')
        .select('id,name,order_index,created_at')
        .eq('project_id', projectId)
        .eq('active', true)
        .in('id', validAssetIds),
      supabaseAdmin
        .from('asset_content_link')
        .select('id,asset_id,audio,order_index,created_at')
        .eq('active', true)
        .in('asset_id', validAssetIds)
    ]);

    if (assetsError || contentLinksError) {
      console.error('download quest merge route asset query error:', {
        assetsError,
        contentLinksError
      });
      return NextResponse.json(
        { error: 'Failed to load quest audio assets' },
        { status: 500 }
      );
    }

    const sortedAssets = ((assets ?? []) as AssetRow[]).sort((a, b) => {
      const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    const contentLinksByAssetId = new Map<string, AssetContentLinkRow[]>();
    ((contentLinks ?? []) as AssetContentLinkRow[]).forEach((contentLink) => {
      const current = contentLinksByAssetId.get(contentLink.asset_id) ?? [];
      current.push(contentLink);
      contentLinksByAssetId.set(contentLink.asset_id, current);
    });

    const audioData: Array<{ data: string; format: string }> = [];
    const bucketName = env.NEXT_PUBLIC_SUPABASE_BUCKET || 'local';

    for (const asset of sortedAssets) {
      const sortedContentLinks = (
        contentLinksByAssetId.get(asset.id) ?? []
      ).sort((a, b) => {
        const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      for (const contentLink of sortedContentLinks) {
        for (const audioPath of parseAudioPaths(contentLink.audio)) {
          const audio = await downloadStoragePath(
            supabase,
            bucketName,
            audioPath
          );
          audioData.push({
            data: arrayBufferToBase64(audio.buffer),
            format: getFormatFromPath(audio.path)
          });
        }
      }
    }

    if (!audioData.length) {
      return NextResponse.json(
        { error: 'No valid audio files found for this quest' },
        { status: 400 }
      );
    }

    const workerUrl =
      env.AUDIO_CONCAT_WORKER_URL ||
      process.env.AUDIO_CONCAT_WORKER_URL ||
      'https://langquest-audio-concat.blue-darkness-7674.workers.dev';
    const concatUrl = `${workerUrl.replace(/\/$/, '')}/concat`;
    const inputFormats = audioData.map((audio) => audio.format);
    const allWav = inputFormats.every((format) => format === 'wav');
    const outputFormat = allWav ? 'wav' : 'mp3';
    const filename = `${quest.name || questId}-merged.${outputFormat}`;

    const workerHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const workerToken =
      env.AUDIO_CONCAT_WORKER_TOKEN || process.env.AUDIO_CONCAT_WORKER_TOKEN;
    if (workerToken) {
      workerHeaders.Authorization = `Bearer ${workerToken}`;
    }

    const workerResponse = await fetch(concatUrl, {
      method: 'POST',
      headers: workerHeaders,
      body: JSON.stringify({
        audioData,
        outputKey: filename,
        format: outputFormat,
        returnData: true
      })
    });

    if (!workerResponse.ok) {
      const text = await workerResponse.text();
      console.error('download quest merge route worker error:', {
        status: workerResponse.status,
        body: text
      });
      return NextResponse.json(
        { error: `Audio merge failed: ${workerResponse.status}` },
        { status: 500 }
      );
    }

    const result = (await workerResponse.json()) as {
      success?: boolean;
      audioBase64?: string;
      contentType?: string;
      durationMs?: number;
      error?: string;
    };

    if (!result.success || !result.audioBase64) {
      return NextResponse.json(
        { error: result.error || 'Audio merge failed' },
        { status: 500 }
      );
    }

    return new Response(Buffer.from(result.audioBase64, 'base64'), {
      headers: {
        'Content-Type':
          result.contentType ||
          (outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg'),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          filename
        )}"`,
        'X-Duration-Ms': String(result.durationMs ?? '')
      }
    });
  } catch (error) {
    console.error('download quest merge route unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error creating merged quest audio' },
      { status: 500 }
    );
  }
}
