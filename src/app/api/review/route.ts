import { NextRequest } from 'next/server';
import { createReviewClient, reviewResponse } from '@/lib/review/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const reviewId = request.nextUrl.searchParams.get('review_id')?.trim() ?? '';
  const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';

  if (!reviewId || !token) {
    return reviewResponse({ error: 'review_id and token are required' }, 400);
  }

  const supabase = createReviewClient();

  const { data, error } = await supabase.rpc('fetch_quest_review_data', {
    review_id: reviewId,
    token
  });

  if (error) {
    return reviewResponse({ error: error.message }, 500);
  }

  if (!isRecord(data)) {
    return reviewResponse(
      { error: 'The review data could not be retrieved' },
      500
    );
  }

  if (data.valid === false) {
    return reviewResponse({ valid: false }, 404);
  }

  if (typeof data.error === 'string') {
    return reviewResponse({ error: data.error }, 422);
  }

  if (data.valid === true) {
    return reviewResponse(data);
  }

  return reviewResponse(data, 500);
}
