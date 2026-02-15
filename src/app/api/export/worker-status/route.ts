import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * GET /api/export/worker-status
 * Check if the audio concatenation worker is reachable and ready
 */
export async function GET() {
  try {
    const workerUrl =
      process.env.AUDIO_CONCAT_WORKER_URL ||
      (env.NEXT_PUBLIC_ENVIRONMENT === 'development'
        ? 'http://127.0.0.1:8787'
        : 'https://langquest-audio-concat.blue-darkness-7674.workers.dev');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${workerUrl}/health`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { ready: false, error: `Worker returned ${res.status}` },
        { status: 200 }
      );
    }

    const data = (await res.json()) as { ok?: boolean };
    const ready = data?.ok === true;

    return NextResponse.json({ ready });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Worker unreachable';
    return NextResponse.json({ ready: false, error: message }, { status: 200 });
  }
}
