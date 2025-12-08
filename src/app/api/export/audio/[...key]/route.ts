import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/export/audio/[...key]
 * Proxy endpoint to serve audio files from R2 storage
 *
 * In development: Fetches from local Wrangler R2 storage by querying SQLite
 * In production: Would fetch from Cloudflare R2 (needs implementation)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const r2Key = key.join('/'); // Reconstruct the full key path (e.g., "exports/export-{id}.mp3")

    if (env.NEXT_PUBLIC_ENVIRONMENT === 'development') {
      // In development, fetch from local Wrangler R2 storage
      // Find the SQLite database and blob file
      const workerDir = join(
        process.cwd(),
        'cloud-services',
        'audio-concat-worker'
      );
      const r2StateDir = join(workerDir, '.wrangler', 'state', 'v3', 'r2');
      const bucketDir = join(r2StateDir, 'langquest-exports');
      const sqliteDir = join(r2StateDir, 'miniflare-R2BucketObject');

      // Find SQLite database file
      const sqliteFiles = await import('fs').then((fs) =>
        fs.promises.readdir(sqliteDir).catch(() => [])
      );

      if (sqliteFiles.length === 0) {
        return NextResponse.json(
          { error: 'R2 storage not found. Make sure wrangler dev is running.' },
          { status: 404 }
        );
      }

      // Query SQLite to find blob_id for this key
      const { execSync } = await import('child_process');
      const sqliteFile = join(sqliteDir, sqliteFiles[0]);

      try {
        // Escape single quotes for SQL
        const escapedKey = r2Key.replace(/'/g, "''");
        const query = `SELECT blob_id, http_metadata FROM _mf_objects WHERE key = '${escapedKey}';`;
        const result = execSync(
          `sqlite3 "${sqliteFile}" "${query.replace(/"/g, '\\"')}"`,
          { encoding: 'utf-8', cwd: workerDir }
        ).trim();

        if (!result) {
          return NextResponse.json(
            { error: 'Audio file not found in R2 storage', r2Key },
            { status: 404 }
          );
        }

        const [blobId, httpMetadata] = result.split('|');
        const blobPath = join(bucketDir, 'blobs', blobId);

        if (!existsSync(blobPath)) {
          return NextResponse.json(
            { error: 'Blob file not found', blobId },
            { status: 404 }
          );
        }

        // Read and serve the file
        const fileBuffer = await readFile(blobPath);
        const contentType = httpMetadata
          ? JSON.parse(httpMetadata).contentType || 'audio/mpeg'
          : 'audio/mpeg';

        // Convert Buffer to ArrayBuffer for NextResponse
        // Create a new ArrayBuffer by copying the data to ensure it's not a SharedArrayBuffer
        const uint8Array = new Uint8Array(
          fileBuffer.buffer,
          fileBuffer.byteOffset,
          fileBuffer.byteLength
        );
        // Create a new ArrayBuffer and copy the data
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
      } catch (error: any) {
        console.error('Error reading from local R2:', error);
        return NextResponse.json(
          { error: `Failed to read audio file: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Production: Fetch from Cloudflare R2
    // TODO: Implement Cloudflare R2 fetching using R2 API
    return NextResponse.json(
      {
        error: 'Production R2 access not yet implemented',
        r2Key
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('Audio proxy error:', error);
    return NextResponse.json(
      { error: `Failed to fetch audio: ${error.message}` },
      { status: 500 }
    );
  }
}
