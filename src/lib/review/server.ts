import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../database.types';
import { env } from '@/lib/env';

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

/** Ticket proving `path` was issued by upload-urls for this review and target. */
export function signReviewAudio(
  reviewId: string,
  target: string,
  path: string
) {
  return createHmac('sha256', env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`review-audio:${reviewId}:${target}:${path}`)
    .digest('base64url');
}

export function verifyReviewAudio(
  reviewId: string,
  target: string,
  path: string,
  ticket: string
) {
  const expected = Buffer.from(signReviewAudio(reviewId, target, path));
  const received = Buffer.from(ticket);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
