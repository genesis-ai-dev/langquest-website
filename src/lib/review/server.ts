import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../database.types';
import { env } from '@/lib/env';
import {
  REVIEW_AUDIO_MAX_BYTES,
  buildReviewAudioPath,
  reviewAudioExtension
} from '@/lib/review/submission';

export function reviewResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

export function createReviewClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

export type ReviewClient = ReturnType<typeof createReviewClient>;

/** Service-role client; only for server routes that authenticate the caller themselves. */
export function createServiceReviewClient(): ReviewClient {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

/** True when the token is valid and the review can still receive feedback. */
export async function validateReviewToken(
  supabase: ReviewClient,
  reviewId: string,
  token: string
) {
  const { data, error } = await supabase.rpc('validate_review_token', {
    review_id: reviewId,
    token
  });

  if (error) throw new Error(error.message);
  return data === true;
}

export function reviewAudioBucket() {
  return env.NEXT_PUBLIC_SUPABASE_BUCKET;
}

/** Generates one signed upload URL per file, each with a fresh `{uuid}.{ext}` path. */
export async function createReviewAudioUploads<
  T extends { content_type: string }
>(supabase: ReviewClient, files: T[]) {
  const bucket = supabase.storage.from(reviewAudioBucket());
  const results = await Promise.all(
    files.map(async (file) => {
      const path = buildReviewAudioPath(
        randomUUID(),
        reviewAudioExtension(file.content_type) ?? 'bin'
      );
      const { data, error } = await bucket.createSignedUploadUrl(path);
      if (error || !data) {
        console.error('review upload url error', path, error);
        return null;
      }
      return { file, path, upload_url: data.signedUrl };
    })
  );

  return results.every((result) => result !== null)
    ? results.filter((result) => result !== null)
    : null;
}

/** Confirms the uploaded object exists in the (public) bucket and fits the size limit. */
async function audioObjectExists(supabase: ReviewClient, path: string) {
  const { data } = supabase.storage
    .from(reviewAudioBucket())
    .getPublicUrl(path);

  try {
    const response = await fetch(data.publicUrl, {
      method: 'HEAD',
      cache: 'no-store'
    });
    if (!response.ok) return false;
    const size = Number(response.headers.get('content-length') ?? '0');
    return size > 0 && size <= REVIEW_AUDIO_MAX_BYTES;
  } catch {
    return false;
  }
}

/** Returns the targets whose recordings are not in storage. */
export async function findMissingReviewAudio(
  supabase: ReviewClient,
  refs: Array<{ target: string; path: string }>
) {
  const existence = await Promise.all(
    refs.map((ref) => audioObjectExists(supabase, ref.path))
  );
  return refs.filter((_, index) => !existence[index]).map((ref) => ref.target);
}
