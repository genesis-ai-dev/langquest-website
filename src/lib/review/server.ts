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
