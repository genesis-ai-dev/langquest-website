import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  reviewStatusToResult,
  reviewSubmissionProblems
} from '@/lib/review/submission';
import {
  MAX_REVIEW_TEXT_LENGTH,
  buildReviewPayload,
  isRecord,
  nullableText,
  reviewAssetsSchema,
  reviewAudioRefs,
  reviewAudioSchema,
  reviewStatusSchema,
  reviewedAssets
} from '@/lib/review/schemas';
import {
  createReviewClient,
  findMissingReviewAudio,
  reviewResponse,
  validateReviewToken
} from '@/lib/review/server';

const requestSchema = z.object({
  review_id: z.string().trim().min(1),
  token: z.string().trim().min(1),
  reviewer: z.object({
    name: z.string().trim().max(200),
    email: z.union([z.literal(''), z.string().trim().email().max(320)])
  }),
  overall: z.object({
    status: reviewStatusSchema,
    comment: z.string().max(MAX_REVIEW_TEXT_LENGTH),
    audio: reviewAudioSchema
  }),
  assets: reviewAssetsSchema
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return reviewResponse(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      400
    );
  }

  const { review_id: reviewId, token, reviewer, overall } = parsed.data;

  const questResult = reviewStatusToResult(overall.status);
  if (!questResult) {
    return reviewResponse(
      {
        error: 'Overall status must be Approved or Suggested Changes to submit.'
      },
      400
    );
  }

  const problems = reviewSubmissionProblems({
    reviewerName: reviewer.name,
    overallStatus: overall.status,
    overallComment: overall.comment,
    hasOverallAudio: overall.audio !== null
  });
  if (problems.length > 0) {
    return reviewResponse({ error: problems.join(' ') }, 400);
  }
  const supabase = createReviewClient();

  try {
    if (!(await validateReviewToken(supabase, reviewId, token))) {
      return reviewResponse({ valid: false }, 404);
    }
  } catch (err) {
    return reviewResponse(
      { error: err instanceof Error ? err.message : 'Token validation failed' },
      500
    );
  }

  const assets = reviewedAssets(parsed.data.assets);

  const missing = await findMissingReviewAudio(
    supabase,
    reviewAudioRefs(overall.audio, assets)
  );
  if (missing.length > 0) {
    return reviewResponse(
      { error: 'Some recordings were not uploaded', missing },
      422
    );
  }

  const payload = buildReviewPayload({
    reviewer: {
      name: nullableText(reviewer.name),
      email: nullableText(reviewer.email)
    },
    overall,
    assets
  });

  const { data, error } = await supabase.rpc('submit_quest_review', {
    review_id: reviewId,
    token,
    payload
  });

  if (error) {
    const status =
      error.code === '22023' ? 422 : error.code === '28000' ? 404 : 500;
    return reviewResponse({ error: error.message }, status);
  }

  if (!isRecord(data)) {
    return reviewResponse({ error: 'The review could not be submitted' }, 500);
  }

  if (data.valid === false) {
    return reviewResponse({ valid: false }, 404);
  }

  if (typeof data.error === 'string') {
    return reviewResponse({ error: data.error }, 422);
  }

  if (data.ok === true || data.status === 'submitted') {
    return reviewResponse(data);
  }

  return reviewResponse(data, 500);
}
