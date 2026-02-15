import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../../database.types';
import { getSupabaseCredentials, SupabaseEnvironment } from '@/lib/supabase';
import { env } from '@/lib/env';
import crypto from 'crypto';

interface ExportRequest {
  quest_id: string;
  export_type: 'feedback' | 'distribution';
  environment?: SupabaseEnvironment;
}

interface LanguoidSource {
  name: string;
  unique_identifier: string | null;
  version: string | null;
  url: string | null;
}

interface LanguoidAlias {
  name: string;
  alias_type: 'endonym' | 'exonym';
  source_names: string[];
  label_languoid_id: string;
}

interface LanguoidProperty {
  key: string;
  value: string;
}

interface LanguoidData {
  id: string;
  name: string | null;
  parent_id: string | null;
  level: 'family' | 'language' | 'dialect' | null;
  ui_ready: boolean | null;
  download_profiles: string[] | null;
  creator_id: string | null;
  sources: LanguoidSource[]; // ISO codes, ROLV codes, BCP-47 tags, etc.
  aliases: LanguoidAlias[]; // Language aliases (endonyms/exonyms)
  properties: LanguoidProperty[]; // Key-value properties
}

interface Manifest {
  project_id: string;
  language_id: string | null; // Deprecated - use languoid instead
  languoid: LanguoidData | null; // Languoid data for the target language
  total_duration_ms: number;
  source_asset_ids: string[];
  exported_at: string;
}

interface BibleMetadata {
  book_id: string;
  chapter_num: number;
  chapter_ref: string;
  verses: Record<string, { start_ms: number; end_ms: number }>; // Object with verse numbers as keys
}

interface ExportMetadata {
  manifest: Manifest;
  bible?: BibleMetadata; // Optional - only if Bible-related
}

/**
 * Compute SHA256 checksum of audio content for idempotency
 * This ensures we detect changes even if asset IDs are the same but audio content differs
 */
function computeChecksum(
  audioData: Array<{ data: string; format: string }>
): string {
  // Sort by asset order and hash the concatenated audio data
  const audioHashes = audioData.map((audio) => {
    const buffer = Buffer.from(audio.data, 'base64');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  });
  const combined = audioHashes.join(',');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Generate share token for feedback exports
 */
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * POST /api/export/chapter
 * Initiate chapter export
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const body = (await request.json()) as ExportRequest;
    console.log(
      '[Export API] Received export request:',
      JSON.stringify(body, null, 2)
    );

    // Validate request
    if (!body.quest_id || !body.export_type) {
      return NextResponse.json(
        { error: 'quest_id and export_type are required' },
        { status: 400 }
      );
    }

    if (!['feedback', 'distribution'].includes(body.export_type)) {
      return NextResponse.json(
        { error: 'export_type must be "feedback" or "distribution"' },
        { status: 400 }
      );
    }

    const environment =
      body.environment || (env.NEXT_PUBLIC_ENVIRONMENT as SupabaseEnvironment);
    console.log('[Export API] Using environment:', environment);
    console.log('[Export API] Request environment:', body.environment);
    console.log(
      '[Export API] Default environment:',
      env.NEXT_PUBLIC_ENVIRONMENT
    );
    const { url, key } = getSupabaseCredentials(environment);
    console.log('[Export API] Supabase URL:', url);

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

    // Fetch quest and project data
    const { data: quest, error: questError } = await supabase
      .from('quest')
      .select('id, name, project_id, metadata')
      .eq('id', body.quest_id)
      .single();

    if (questError || !quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    // Check project membership
    const { data: membership } = await supabase
      .from('profile_project_link')
      .select('membership')
      .eq('project_id', quest.project_id)
      .eq('profile_id', user.id)
      .eq('active', true)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a member of this project to export' },
        { status: 403 }
      );
    }

    // Check permissions for distribution exports
    if (
      body.export_type === 'distribution' &&
      membership.membership !== 'owner'
    ) {
      return NextResponse.json(
        { error: 'Only project owners can export for distribution' },
        { status: 403 }
      );
    }

    // Fetch project data
    const { data: project } = await supabase
      .from('project')
      .select('id, target_language_id')
      .eq('id', quest.project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch target languoid data from project_language_link
    // Try multiple strategies to find languoid_id:
    // 1. Target language link with languoid_id (preferred)
    // 2. Any language link matching target_language_id with languoid_id
    // 3. Direct lookup via language_id if we have a language->languoid mapping
    let languoidData: LanguoidData | null = null;
    let languoidId: string | null = null;

    // Strategy 1: Try target language link with languoid_id
    const { data: targetLanguageLink } = (await (supabase
      .from('project_language_link' as any)
      .select('languoid_id')
      .eq('project_id', quest.project_id)
      .eq('language_type', 'target')
      .not('languoid_id', 'is', null)
      .limit(1)
      .single() as any)) as { data: { languoid_id: string } | null };

    if (targetLanguageLink?.languoid_id) {
      languoidId = targetLanguageLink.languoid_id;
    } else if (project.target_language_id) {
      // Strategy 2: Try to find any language link matching target_language_id with languoid_id
      const { data: languageLink } = (await (supabase
        .from('project_language_link' as any)
        .select('languoid_id')
        .eq('project_id', quest.project_id)
        .eq('language_id', project.target_language_id)
        .not('languoid_id', 'is', null)
        .limit(1)
        .single() as any)) as { data: { languoid_id: string } | null };

      if (languageLink?.languoid_id) {
        languoidId = languageLink.languoid_id;
      }
    }

    if (languoidId) {
      console.log(
        `[Export API] Found languoid_id: ${languoidId} for project ${quest.project_id}`
      );
      const { data: languoid } = (await (supabase
        .from('languoid' as any)
        .select(
          'id, name, parent_id, level, ui_ready, download_profiles, creator_id'
        )
        .eq('id', languoidId)
        .single() as any)) as {
        data: {
          id: string;
          name: string | null;
          parent_id: string | null;
          level: string | null;
          ui_ready: boolean | null;
          download_profiles: string[] | null;
          creator_id: string | null;
        } | null;
      };

      if (languoid) {
        console.log(
          `[Export API] Successfully fetched languoid data: ${languoid.name} (${languoid.id})`
        );
        // Fetch languoid sources (ISO codes, ROLV codes, BCP-47 tags, etc.)
        const { data: sources } = (await (supabase
          .from('languoid_source' as any)
          .select('name, unique_identifier, version, url')
          .eq('languoid_id', languoid.id)
          .eq('active', true) as any)) as {
          data: Array<{
            name: string;
            unique_identifier: string | null;
            version: string | null;
            url: string | null;
          }> | null;
        };

        // Fetch languoid aliases (endonyms/exonyms)
        const { data: aliases } = (await (supabase
          .from('languoid_alias' as any)
          .select('name, alias_type, source_names, label_languoid_id')
          .eq('subject_languoid_id', languoid.id)
          .eq('active', true) as any)) as {
          data: Array<{
            name: string;
            alias_type: string;
            source_names: string[] | null;
            label_languoid_id: string;
          }> | null;
        };

        // Fetch languoid properties (key-value pairs)
        const { data: properties } = (await (supabase
          .from('languoid_property' as any)
          .select('key, value')
          .eq('languoid_id', languoid.id)
          .eq('active', true) as any)) as {
          data: Array<{
            key: string;
            value: string;
          }> | null;
        };

        languoidData = {
          id: languoid.id,
          name: languoid.name,
          parent_id: languoid.parent_id,
          level: languoid.level as 'family' | 'language' | 'dialect' | null,
          ui_ready: languoid.ui_ready,
          download_profiles: languoid.download_profiles as string[] | null,
          creator_id: languoid.creator_id,
          sources: (sources || []).map((s) => ({
            name: s.name,
            unique_identifier: s.unique_identifier,
            version: s.version || null,
            url: s.url || null
          })),
          aliases: (aliases || []).map((a) => ({
            name: a.name,
            alias_type: a.alias_type as 'endonym' | 'exonym',
            source_names: (a.source_names as string[]) || [],
            label_languoid_id: a.label_languoid_id
          })),
          properties: (properties || []).map((p) => ({
            key: p.key,
            value: p.value
          }))
        };
      } else {
        console.warn(
          `[Export API] Languoid ${languoidId} not found in database`
        );
      }
    } else {
      console.warn(
        `[Export API] No languoid_id found for project ${quest.project_id}, target_language_id: ${project.target_language_id}. Manifest will have languoid: null`
      );
    }

    // Parse quest metadata to get bible chapter info (optional)
    // Metadata is stored as TEXT in the database, so Supabase returns it as a string
    // We need to parse it if it's a string
    let metadata: {
      bible?: { book: string; chapter?: number | string };
    } | null = null;

    if (quest.metadata) {
      if (typeof quest.metadata === 'string') {
        try {
          metadata = JSON.parse(quest.metadata);
        } catch (e) {
          console.error('[Export API] Failed to parse metadata string:', e);
          metadata = null;
        }
      } else {
        metadata = quest.metadata as {
          bible?: { book: string; chapter?: number | string };
        } | null;
      }
    }

    console.log('[Export API] Quest metadata raw:', quest.metadata);
    console.log('[Export API] Quest metadata type:', typeof quest.metadata);
    console.log(
      '[Export API] Parsed metadata:',
      JSON.stringify(metadata, null, 2)
    );
    console.log('[Export API] Has bible?', !!metadata?.bible);
    console.log('[Export API] Has chapter?', !!metadata?.bible?.chapter);
    console.log('[Export API] Chapter value:', metadata?.bible?.chapter);
    console.log('[Export API] Chapter type:', typeof metadata?.bible?.chapter);

    // Handle chapter as either number or string (optional)
    const chapter = metadata?.bible?.chapter;
    const chapterNumber =
      chapter != null
        ? typeof chapter === 'string'
          ? parseInt(chapter, 10)
          : chapter
        : null;

    // Validate chapter number if provided
    if (chapter != null && (chapterNumber == null || isNaN(chapterNumber))) {
      return NextResponse.json(
        {
          error: 'Invalid bible chapter metadata',
          debug: {
            rawMetadata: quest.metadata,
            rawMetadataType: typeof quest.metadata,
            hasMetadata: !!metadata,
            hasBible: !!metadata?.bible,
            hasChapter: !!metadata?.bible?.chapter,
            chapterValue: chapter,
            chapterNumber: chapterNumber,
            parsedMetadata: metadata
          }
        },
        { status: 400 }
      );
    }

    // Fetch assets for this quest
    const { data: questAssetLinks, error: questAssetLinksError } =
      await supabase
        .from('quest_asset_link')
        .select('asset_id')
        .eq('quest_id', body.quest_id);

    if (questAssetLinksError || !questAssetLinks) {
      console.error(
        '[Export API] Error fetching quest asset links:',
        questAssetLinksError
      );
      return NextResponse.json(
        { error: 'Failed to fetch assets for this chapter' },
        { status: 500 }
      );
    }

    if (questAssetLinks.length === 0) {
      return NextResponse.json(
        { error: 'No assets found for this chapter' },
        { status: 400 }
      );
    }

    const assetIds = questAssetLinks.map((link) => link.asset_id);

    // Fetch asset details to get order_index and filter out translation assets
    // Translation assets have source_asset_id set (they are translations of other assets)
    const { data: assets, error: assetsError } = await supabase
      .from('asset')
      .select('id, order_index, source_asset_id')
      .in('id', assetIds);

    if (assetsError) {
      console.error('[Export API] Error fetching assets:', assetsError);
      return NextResponse.json(
        { error: 'Failed to fetch asset details' },
        { status: 500 }
      );
    }

    // Filter out translation assets (only include top-level assets where source_asset_id is null)
    const topLevelAssets = (assets || [])
      .filter((asset) => asset.source_asset_id === null)
      .map((asset) => ({
        asset_id: asset.id,
        order_index: asset.order_index ?? 0
      }));

    if (topLevelAssets.length === 0) {
      return NextResponse.json(
        { error: 'No top-level assets found for this chapter' },
        { status: 400 }
      );
    }

    // Sort assets by order_index to maintain proper sequence
    topLevelAssets.sort((a, b) => {
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      return 0; // If order_index is the same, maintain original order
    });

    const topLevelAssetIds = topLevelAssets.map((asset) => asset.asset_id);

    console.log(
      `[Export API] Found ${topLevelAssets.length} top-level assets (filtered from ${questAssetLinks.length} total)`
    );
    console.log(
      `[Export API] Asset order:`,
      topLevelAssets.map((a) => ({
        id: a.asset_id.slice(0, 8),
        order_index: a.order_index
      }))
    );

    // Fetch asset content links to get audio URLs
    // Only fetch content links for top-level assets (excluding translations)
    // Note: For published chapters, we need to query the synced table
    // Check if we're in development and need to query synced tables
    const tableName =
      environment === 'development'
        ? 'asset_content_link'
        : 'asset_content_link';
    console.log(
      `[Export API] Querying table: ${tableName} for ${topLevelAssetIds.length} top-level assets`
    );

    const { data: assetContentLinks, error: contentLinksError } = await supabase
      .from(tableName)
      .select('asset_id, audio, created_at')
      .in('asset_id', topLevelAssetIds)
      .order('created_at', { ascending: true });

    console.log(
      `[Export API] Found ${assetContentLinks?.length || 0} content links, error:`,
      contentLinksError
    );
    if (assetContentLinks) {
      assetContentLinks.forEach((link, idx) => {
        console.log(
          `[Export API] Content link ${idx}: asset_id=${link.asset_id}, audio=`,
          link.audio
        );
      });
    }

    if (!assetContentLinks || assetContentLinks.length === 0) {
      return NextResponse.json(
        { error: 'No audio content found for this chapter' },
        { status: 400 }
      );
    }

    // Collect audio files from asset_content_link records
    // Download them directly since the worker may not be able to access localhost URLs
    const audioData: Array<{ data: string; format: string }> = [];
    const sourceAssetIds: string[] = [];

    // Get Supabase storage client for downloading files
    const storageClient = supabase.storage;
    const bucketName =
      env.NEXT_PUBLIC_SUPABASE_BUCKET ||
      process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
      'local';

    // In development, files might be in 'public' bucket with 'local/' prefix
    const bucketsToTry =
      environment === 'development'
        ? ['public', bucketName].filter((b, i, arr) => arr.indexOf(b) === i) // unique buckets
        : [bucketName];

    // Debug: List what's actually in storage
    console.log(`[Export API] Will try buckets:`, bucketsToTry);
    let anyBucketHasContents = false;
    let totalBucketContents = 0;
    for (const bucket of bucketsToTry) {
      console.log(`[Export API] Listing storage bucket: ${bucket}`);
      const { data: bucketContents, error: listError } = await storageClient
        .from(bucket)
        .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
      console.log(
        `[Export API] Bucket ${bucket} contents (first 100):`,
        bucketContents?.slice(0, 10)
      );
      if (bucketContents && bucketContents.length > 0) {
        anyBucketHasContents = true;
        totalBucketContents += bucketContents.length;
      }
      if (listError) {
        console.error(
          `[Export API] Error listing bucket ${bucket}:`,
          listError
        );
      }
    }

    // Group content links by asset_id for ordered processing
    const contentLinksByAsset = new Map<string, typeof assetContentLinks>();
    for (const contentLink of assetContentLinks || []) {
      if (!contentLinksByAsset.has(contentLink.asset_id)) {
        contentLinksByAsset.set(contentLink.asset_id, []);
      }
      contentLinksByAsset.get(contentLink.asset_id)!.push(contentLink);
    }

    // Process assets in order (by order_index)
    // Within each asset, process content links by created_at
    for (const asset of topLevelAssets) {
      const assetContentLinksForAsset =
        contentLinksByAsset.get(asset.asset_id) || [];

      // Sort content links by created_at to maintain order within asset
      assetContentLinksForAsset.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });

      for (const contentLink of assetContentLinksForAsset) {
        if (contentLink.audio && Array.isArray(contentLink.audio)) {
          for (const audioPath of contentLink.audio) {
            if (typeof audioPath === 'string' && audioPath.trim()) {
              try {
                let audioBuffer: ArrayBuffer | null = null;
                let format = 'mp3';

                if (
                  audioPath.startsWith('http://') ||
                  audioPath.startsWith('https://')
                ) {
                  // Already a full URL - download it
                  console.log(
                    `[Export API] Downloading from URL: ${audioPath}`
                  );
                  const response = await fetch(audioPath);
                  if (!response.ok) {
                    console.error(
                      `[Export API] Failed to download from URL: ${response.status} ${response.statusText}`
                    );
                    throw new Error(
                      `Failed to download audio: ${response.statusText}`
                    );
                  }
                  audioBuffer = await response.arrayBuffer();
                  format = audioPath.split('.').pop()?.toLowerCase() || 'mp3';
                } else {
                  // Storage path - download from Supabase storage
                  // Try multiple buckets and path variants
                  const basePath = audioPath.replace(/\.(wav|mp3|m4a)$/i, ''); // Remove extension if present
                  const pathVariants = [
                    audioPath, // Direct path (with extension if present)
                    `local/${audioPath}`, // local/ prefix (for development - files in public bucket)
                    `shared_attachments/${audioPath}`, // PowerSync attachment directory with extension
                    `shared_attachments/${basePath}.wav`, // PowerSync attachment directory, add .wav
                    `shared_attachments/${basePath}.mp3`, // PowerSync attachment directory, add .mp3
                    `audio/${audioPath}`, // With audio/ prefix
                    audioPath.replace(/^local\//, '') // Remove local/ if present
                  ];

                  let downloadSuccess = false;
                  let lastError: any = null;

                  // Try each bucket
                  for (const bucket of bucketsToTry) {
                    if (downloadSuccess) break;

                    const storageBaseUrl = `${url}/storage/v1/object/${bucket}`;
                    console.log(
                      `[Export API] Trying bucket: ${bucket} for ${audioPath} (base URL: ${storageBaseUrl})`
                    );

                    // Try each path variant
                    for (const variantPath of pathVariants) {
                      try {
                        console.log(
                          `[Export API] Trying bucket ${bucket}, path: ${variantPath}`
                        );
                        const { data, error: downloadError } =
                          await storageClient
                            .from(bucket)
                            .download(variantPath);

                        if (!downloadError && data) {
                          audioBuffer = await data.arrayBuffer();
                          format =
                            variantPath.split('.').pop()?.toLowerCase() ||
                            'mp3';
                          downloadSuccess = true;
                          console.log(
                            `[Export API] Successfully downloaded from bucket ${bucket}, path: ${variantPath}`
                          );
                          break;
                        } else {
                          lastError = downloadError;
                          console.log(
                            `[Export API] Failed bucket ${bucket}, path ${variantPath}:`,
                            downloadError?.message || 'No error message'
                          );
                        }
                      } catch (err) {
                        lastError = err;
                        console.log(
                          `[Export API] Exception bucket ${bucket}, path ${variantPath}:`,
                          err
                        );
                      }
                    }
                  }

                  if (!downloadSuccess || !audioBuffer) {
                    const errorMsg =
                      lastError?.message || 'File not found in storage';
                    console.error(
                      `[Export API] All buckets and path variants failed. Last error:`,
                      lastError
                    );
                    console.error(`[Export API] Tried buckets:`, bucketsToTry);
                    console.error(`[Export API] Tried paths:`, pathVariants);
                    throw new Error(
                      `Failed to download audio from storage: ${errorMsg}. Tried buckets: ${bucketsToTry.join(', ')}, paths: ${pathVariants.join(', ')}`
                    );
                  }
                }

                if (!audioBuffer) {
                  throw new Error(
                    'Failed to download audio: audioBuffer is null'
                  );
                }

                // Convert to base64 for passing to worker
                const base64 = Buffer.from(audioBuffer).toString('base64');
                audioData.push({ data: base64, format });
                console.log(
                  `[Export API] Downloaded ${audioBuffer.byteLength} bytes, format: ${format}`
                );

                if (!sourceAssetIds.includes(contentLink.asset_id)) {
                  sourceAssetIds.push(contentLink.asset_id);
                }
              } catch (error) {
                console.error(
                  `[Export API] Error processing audio ${audioPath}:`,
                  error
                );
                // Continue with other files rather than failing completely
              }
            }
          }
        }
      }
    } // End of for (const asset of topLevelAssets)

    if (audioData.length === 0) {
      // Check if bucket is empty - files might not be uploaded yet
      const audioPathsFound =
        assetContentLinks
          ?.flatMap((link) => link.audio || [])
          .filter(Boolean) || [];

      const storageUrls = bucketsToTry
        .map((b) => `${url}/storage/v1/object/${b}`)
        .join(', ');

      return NextResponse.json(
        {
          error: 'No valid audio files found for this chapter',
          debug: {
            bucketsTried: bucketsToTry,
            storageUrls,
            bucketEmpty: !anyBucketHasContents,
            audioPathsFound,
            bucketContentsCount: totalBucketContents,
            supabaseUrl: url,
            message: !anyBucketHasContents
              ? `Checked storage buckets: ${bucketsToTry.join(', ')} at ${storageUrls}. All buckets are empty. ` +
                `The database references ${audioPathsFound.length} audio file(s), but none exist in storage. ` +
                `This usually means: 1) The chapter hasn't been published yet (publishing triggers PowerSync uploads), ` +
                `2) PowerSync hasn't finished syncing the files, or 3) The files are stored locally on the device only. ` +
                `To fix: Publish the chapter in the mobile app and wait for PowerSync to sync, or ensure files are uploaded to Supabase storage.`
              : `Audio files exist in database (${audioPathsFound.length} paths) but could not be downloaded from storage. ` +
                `Tried buckets: ${bucketsToTry.join(', ')}, tried path variants including local/ prefix. ` +
                `Check if files are in a different bucket or path format.`
          }
        },
        { status: 400 }
      );
    }

    console.log(
      `[Export API] Prepared ${audioData.length} audio files for concatenation`
    );

    // Compute checksum for idempotency based on audio content
    const checksum = computeChecksum(audioData);

    // Check for existing export with same checksum
    const { data: existingExport } = (await supabase
      .from('export_quest_artifact' as any)
      .select('id, status, audio_url, share_token')
      .eq('quest_id', body.quest_id)
      .eq('checksum', checksum)
      .eq('export_type', body.export_type)
      .single()) as {
      data: {
        id: string;
        status: string;
        audio_url: string | null;
        share_token: string | null;
      } | null;
    };

    if (existingExport) {
      // Return existing export (ready, processing, or failed - caller can poll)
      const shareUrl =
        body.export_type === 'feedback' && existingExport.share_token
          ? `${env.NEXT_PUBLIC_SITE_URL}/api/export/share/${existingExport.share_token}`
          : undefined;

      return NextResponse.json({
        id: existingExport.id,
        status: existingExport.status,
        audio_url: existingExport.audio_url ?? undefined,
        share_url: shareUrl
      });
    }

    // Create export record
    // Extract bible chapter info if available (optional)
    let bookId: string | null = null;
    let chapterNum: number | null = null;
    let chapterRef: string | null = null;

    if (metadata?.bible?.book && chapterNumber != null) {
      // Normalize book ID: 'joh' -> 'jhn' (OSIS standard for backward compatibility)
      bookId = metadata.bible.book.toLowerCase().trim();
      if (bookId === 'joh') {
        bookId = 'jhn';
        console.log('[Export API] Normalized book ID from "joh" to "jhn"');
      }
      chapterNum = chapterNumber;
      chapterRef = `${bookId.toUpperCase()}.${chapterNum}`;
    }

    // Create initial manifest
    const manifest: Manifest = {
      project_id: quest.project_id,
      language_id: project.target_language_id,
      languoid: languoidData,
      total_duration_ms: 0, // Will be updated after concatenation
      source_asset_ids: sourceAssetIds,
      exported_at: new Date().toISOString()
    };

    // Build metadata with optional Bible metadata
    const exportMetadata: ExportMetadata = {
      manifest
    };

    // Add Bible metadata if available (verses will be populated after concatenation)
    if (bookId && chapterNum != null && chapterRef) {
      exportMetadata.bible = {
        book_id: bookId,
        chapter_num: chapterNum,
        chapter_ref: chapterRef,
        verses: {} // Empty object initially, will be populated with verse timings after concatenation
      };
    }

    const shareToken =
      body.export_type === 'feedback' ? generateShareToken() : null;
    const shareExpiresAt =
      body.export_type === 'feedback'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        : null;

    const { data: exportRecord, error: insertError } = (await supabase
      .from('export_quest_artifact' as any)
      .insert({
        quest_id: body.quest_id,
        project_id: quest.project_id,
        metadata: exportMetadata,
        export_type: body.export_type,
        status: 'pending',
        checksum,
        share_token: shareToken,
        share_expires_at: shareExpiresAt,
        created_by: user.id
      })
      .select('id, share_token')
      .single()) as {
      data: { id: string; share_token: string | null } | null;
      error: any;
    };

    if (insertError || !exportRecord) {
      // Unique violation: another request created the same export; return existing
      if (insertError?.code === '23505') {
        const { data: conflictExport } = (await supabase
          .from('export_quest_artifact' as any)
          .select('id, status, audio_url, share_token')
          .eq('quest_id', body.quest_id)
          .eq('checksum', checksum)
          .maybeSingle()) as {
          data: {
            id: string;
            status: string;
            audio_url: string | null;
            share_token: string | null;
          } | null;
        };
        if (conflictExport) {
          const shareUrl =
            body.export_type === 'feedback' && conflictExport.share_token
              ? `${env.NEXT_PUBLIC_SITE_URL}/api/export/share/${conflictExport.share_token}`
              : undefined;
          return NextResponse.json({
            id: conflictExport.id,
            status: conflictExport.status,
            audio_url: conflictExport.audio_url ?? undefined,
            share_url: shareUrl
          });
        }
      }
      console.error('Failed to create export record:', insertError);
      return NextResponse.json(
        { error: 'Failed to create export record' },
        { status: 500 }
      );
    }

    // Call audio concatenation worker asynchronously
    // In production, you might want to use a queue system
    // For local dev, use http://localhost:8787 if wrangler dev is running
    const workerUrl =
      process.env.AUDIO_CONCAT_WORKER_URL ||
      (env.NEXT_PUBLIC_ENVIRONMENT === 'development'
        ? 'http://localhost:8787'
        : 'https://langquest-audio-concat.blue-darkness-7674.workers.dev');
    console.log('[Export API] Using worker URL:', workerUrl);
    const outputKey = `export-${exportRecord.id}.mp3`;

    // Update status to processing
    await (supabase
      .from('export_quest_artifact' as any)
      .update({ status: 'processing' })
      .eq('id', exportRecord.id) as any);

    // Determine output format based on input files
    // If all inputs are WAV, output WAV (since we can't convert without FFmpeg)
    // Otherwise default to MP3
    const inputFormats = audioData.map((a) => a.format);
    const allWav = inputFormats.every((f) => f === 'wav');
    const outputFormat = allWav ? 'wav' : 'mp3';

    // Update output key extension to match format
    const formatOutputKey = outputKey.endsWith(`.${outputFormat}`)
      ? outputKey
      : outputKey.replace(/\.(mp3|wav)$/i, '') + `.${outputFormat}`;

    console.log(
      `[Export API] Sending ${audioData.length} audio files (formats: ${inputFormats.join(', ')}) to worker, requesting ${outputFormat} output`
    );

    // Call worker (fire and forget - worker will update status)
    fetch(`${workerUrl}/concat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioData,
        outputKey: formatOutputKey,
        format: outputFormat
      })
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          console.error(
            `[Export API] Worker responded with ${response.status}: ${text}`
          );
          throw new Error(`Worker error: ${response.status} ${text}`);
        }
        const result = (await response.json()) as {
          success?: boolean;
          audioUrl?: string;
          durationMs?: number;
          error?: string;
        };
        console.log('[Export API] Worker result:', result);

        if (result.success && result.audioUrl && result.durationMs) {
          // Update manifest with duration
          exportMetadata.manifest.total_duration_ms = result.durationMs;

          // Update Bible verses if present (verse timings would come from concatenation result)
          // For now, we'll leave it empty as the user mentioned it should be empty initially
          // In the future, result.verseTimings could populate this object

          // Generate full URL for the audio file
          // In development, use local API endpoint
          // In production, would use Cloudflare R2 public URL or CDN
          const audioUrl =
            env.NEXT_PUBLIC_ENVIRONMENT === 'development'
              ? `${env.NEXT_PUBLIC_SITE_URL}/api/export/audio/${result.audioUrl}`
              : result.audioUrl; // TODO: Generate proper R2/CDN URL for production

          // Update export record
          await (supabase
            .from('export_quest_artifact' as any)
            .update({
              status: 'ready',
              audio_url: audioUrl,
              metadata: exportMetadata
            })
            .eq('id', exportRecord.id) as any);
        } else {
          // Update with error
          await (supabase
            .from('export_quest_artifact' as any)
            .update({
              status: 'failed',
              error_message: result.error || 'Concatenation failed'
            })
            .eq('id', exportRecord.id) as any);
        }
      })
      .catch(async (error) => {
        console.error('Worker call failed:', error);
        await (supabase
          .from('export_quest_artifact' as any)
          .update({
            status: 'failed',
            error_message:
              error.message || 'Failed to call concatenation worker'
          })
          .eq('id', exportRecord.id) as any);
      });

    const shareUrl =
      body.export_type === 'feedback' && shareToken
        ? `${env.NEXT_PUBLIC_SITE_URL}/api/export/share/${shareToken}`
        : undefined;

    return NextResponse.json({
      id: exportRecord.id,
      status: 'processing',
      share_url: shareUrl
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: `Export failed: ${error.message}` },
      { status: 500 }
    );
  }
}
