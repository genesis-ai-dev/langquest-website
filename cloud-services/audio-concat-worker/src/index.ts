import { concatenateAudio } from './ffmpeg';
import type { ConcatRequest, ConcatResponse, Env } from './types';

/**
 * Cloudflare Worker for concatenating audio segments
 *
 * POST /concat
 * Body: { audioUrls: string[], outputKey: string, format?: 'mp3' | 'wav' }
 *
 * Returns: { success: boolean, audioUrl?: string, durationMs?: number, error?: string }
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Health check for readiness probes (unauthenticated)
    if (
      request.method === 'GET' &&
      (url.pathname === '/health' || url.pathname === '/')
    ) {
      return jsonResponse({ ok: true }, 200);
    }

    // Only allow POST for /concat
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    // Authenticate via bearer token
    const authHeader = request.headers.get('Authorization');
    const expectedToken = env.AUDIO_CONCAT_WORKER_TOKEN;
    if (
      !expectedToken ||
      !authHeader ||
      authHeader !== `Bearer ${expectedToken}`
    ) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    try {
      const body = (await request.json()) as ConcatRequest;

      // Validate request
      if (
        (!body.audioUrls || body.audioUrls.length === 0) &&
        (!body.audioData || body.audioData.length === 0)
      ) {
        return jsonResponse(
          { success: false, error: 'audioUrls or audioData is required' },
          400
        );
      }

      if (!body.outputKey || typeof body.outputKey !== 'string') {
        return jsonResponse(
          { success: false, error: 'outputKey is required' },
          400
        );
      }

      const segmentCount =
        body.audioData?.length || body.audioUrls?.length || 0;

      // Limit number of segments to prevent timeout
      if (segmentCount > 100) {
        return jsonResponse(
          { success: false, error: 'Maximum 100 audio segments allowed' },
          400
        );
      }

      // Concatenate audio
      // If audioData is provided (base64), decode it first
      let audioUrls: string[] = [];
      if (body.audioData && body.audioData.length > 0) {
        // Convert base64 data to data URLs for processing
        audioUrls = body.audioData.map((item) => {
          const mimeType = item.format === 'wav' ? 'audio/wav' : 'audio/mpeg';
          return `data:${mimeType};base64,${item.data}`;
        });
      } else if (body.audioUrls && body.audioUrls.length > 0) {
        audioUrls = body.audioUrls;
      } else {
        return jsonResponse(
          { success: false, error: 'No audio data provided' },
          400
        );
      }

      // Determine format from input files if not specified
      const inputFormat = body.audioData?.[0]?.format || 'wav';
      const outputFormat =
        body.format || (inputFormat === 'wav' ? 'wav' : 'mp3');

      const { buffer, durationMs } = await concatenateAudio(
        audioUrls,
        outputFormat
      );

      const contentType =
        outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';

      // Always upload to R2 (primary storage)
      const outputKey = body.outputKey.endsWith(`.${outputFormat}`)
        ? body.outputKey
        : body.outputKey.replace(/\.(mp3|wav)$/i, '') + `.${outputFormat}`;
      const r2Key = `exports/${outputKey}`;

      try {
        await env.R2_EXPORTS.put(r2Key, buffer, {
          httpMetadata: { contentType },
          customMetadata: {
            durationMs: durationMs.toString(),
            segmentCount: segmentCount.toString()
          }
        });
      } catch (r2Err) {
        // R2 write failure is non-fatal when returnData is requested
        // (caller will get the audio inline anyway)
        console.error('R2 put failed:', r2Err);
        if (!body.returnData) throw r2Err;
      }

      const response: ConcatResponse = {
        success: true,
        audioUrl: r2Key,
        durationMs
      };

      // If caller asked for inline data, also include base64 audio
      if (body.returnData) {
        response.audioBase64 = arrayBufferToBase64(buffer);
        response.contentType = contentType;
      }

      return jsonResponse(response, 200);
    } catch (error) {
      console.error('Audio concatenation error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return jsonResponse(
        { success: false, error: `Concatenation failed: ${errorMessage}` },
        500
      );
    }
  }
};

/** Convert ArrayBuffer to base64 string (works in Cloudflare Workers) */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Process in chunks to avoid call stack overflow on large buffers
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
