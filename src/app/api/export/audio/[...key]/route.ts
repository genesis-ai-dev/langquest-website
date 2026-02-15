import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';

/**
 * GET /api/export/audio/[...key]
 * Proxy endpoint to serve audio files from R2 storage
 *
 * Tries local Wrangler R2 storage first (for dev), then falls back to
 * production R2 (TODO).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const r2Key = key.join('/');

    // Always try local Wrangler R2 first (works in dev when wrangler dev is running)
    const localResult = await tryLocalR2(r2Key);
    if (localResult) return localResult;

    // TODO: Production Cloudflare R2 fetching
    console.error(
      `[Audio Proxy] No local R2 storage found for key "${r2Key}". ` +
        `Make sure wrangler dev is running, or implement production R2 access.`
    );
    return NextResponse.json(
      {
        error:
          'Audio file not available. If running locally, make sure wrangler dev is running in cloud-services/audio-concat-worker.',
        r2Key
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Audio proxy error:', error);
    return NextResponse.json(
      { error: `Failed to fetch audio: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Attempt to read an audio file from local Wrangler R2 storage (miniflare SQLite).
 * Returns a Response if found, or null if local R2 is not available.
 */
async function tryLocalR2(r2Key: string): Promise<NextResponse | null> {
  try {
    const workerDir = join(
      process.cwd(),
      'cloud-services',
      'audio-concat-worker'
    );
    const r2StateDir = join(workerDir, '.wrangler', 'state', 'v3', 'r2');
    const bucketDir = join(r2StateDir, 'langquest-exports');
    const sqliteDir = join(r2StateDir, 'miniflare-R2BucketObject');

    if (!existsSync(sqliteDir)) return null;

    const fs = await import('fs');
    const sqliteFiles = await fs.promises.readdir(sqliteDir).catch(() => []);
    if (sqliteFiles.length === 0) return null;

    const sqliteFile = join(sqliteDir, sqliteFiles[0]);

    // Use execFileSync to safely query SQLite without shell injection
    const escapedKey = r2Key.replace(/'/g, "''");
    const query = `SELECT blob_id, http_metadata FROM _mf_objects WHERE key = '${escapedKey}';`;
    const result = execFileSync('sqlite3', [sqliteFile, query], {
      encoding: 'utf-8',
      cwd: workerDir
    }).trim();

    if (!result) return null;

    const [blobId, httpMetadata] = result.split('|');
    const blobPath = join(bucketDir, 'blobs', blobId);

    if (!existsSync(blobPath)) return null;

    const fileBuffer = await readFile(blobPath);
    const contentType = httpMetadata
      ? JSON.parse(httpMetadata).contentType || 'audio/mpeg'
      : 'audio/mpeg';

    const uint8Array = new Uint8Array(
      fileBuffer.buffer,
      fileBuffer.byteOffset,
      fileBuffer.byteLength
    );
    const arrayBuffer = new ArrayBuffer(uint8Array.length);
    new Uint8Array(arrayBuffer).set(uint8Array);

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes'
      }
    });
  } catch {
    // Local R2 not available (e.g. wrangler not running, no SQLite, etc.)
    return null;
  }
}
