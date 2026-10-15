import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  isUuid,
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
  PARTNER_UNKNOWN_REVIEWER_NAME,
  authenticatePartner
} from '@/lib/review/partner';
import {
  createServiceReviewClient,
  findMissingReviewAudio,
  reviewResponse
} from '@/lib/review/server';

const requestSchema = z.object({
  external_id: z.string().trim().min(1).max(200),
  quest_id: z.string().refine(isUuid, 'Invalid quest id'),
  reviewer: z
    .object({
      name: z.string().trim().max(200).default(''),
      email: z
        .union([z.literal(''), z.string().trim().email().max(320)])
        .default('')
    })
    .default({}),
  overall: z.object({
    status: reviewStatusSchema,
    comment: z.string().max(MAX_REVIEW_TEXT_LENGTH).default(''),
    audio: reviewAudioSchema.default(null)
  }),
  assets: reviewAssetsSchema.default([])
});

/**
 * Step 2 of a partner submission: creates a complete, already-submitted review.
 * Idempotent on `external_id`: resending one that exists returns the stored
 * review (200, `duplicate: true`) without writing anything.
 */
export async function POST(request: NextRequest) {
  const auth = authenticatePartner(request);
  if ('response' in auth) return auth.response;
  const { origin } = auth.partner;

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return reviewResponse(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      400
    );
  }

  const {
    external_id: externalId,
    quest_id: questId,
    reviewer,
    overall
  } = parsed.data;

  if (!reviewStatusToResult(overall.status)) {
    return reviewResponse(
      { error: 'overall.status must be "approved" or "suggested_changes".' },
      400
    );
  }

  const problems = reviewSubmissionProblems({
    reviewerName: reviewer.name,
    overallStatus: overall.status,
    overallComment: overall.comment,
    hasOverallAudio: overall.audio !== null,
    requireReviewerName: false
  });
  if (problems.length > 0) {
    return reviewResponse({ error: problems.join(' ') }, 400);
  }

  const supabase = createServiceReviewClient();

  // Checked before the recordings so a retry of a stored review succeeds even
  // if the partner did not upload the files again. The RPC re-checks this
  // atomically for concurrent requests.
  const { data: existing, error: existingError } = await supabase
    .from('review')
    .select('id')
    .eq('origin', origin)
    .eq('external_id', externalId)
    .maybeSingle();

  if (existingError) {
    return reviewResponse({ error: existingError.message }, 500);
  }
  if (existing) {
    return reviewResponse({ id: existing.id, duplicate: true });
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
      name: nullableText(reviewer.name) ?? PARTNER_UNKNOWN_REVIEWER_NAME,
      email: nullableText(reviewer.email)
    },
    overall,
    assets
  });

  const { data, error } = await supabase.rpc('create_partner_review', {
    p_origin: origin,
    p_external_id: externalId,
    p_quest_id: questId,
    p_payload: payload
  });

  if (error) {
    const status =
      error.code === 'P0002' ? 404 : error.code === '22023' ? 422 : 500;
    if (status === 500) console.error('create_partner_review error', error);
    return reviewResponse(
      {
        error:
          status === 500 ? 'The review could not be created' : error.message
      },
      status
    );
  }

  if (!isRecord(data) || typeof data.id !== 'string') {
    return reviewResponse({ error: 'The review could not be created' }, 500);
  }

  if (data.duplicate === true) {
    return reviewResponse({ id: data.id, duplicate: true });
  }

  // Assets not linked to the quest are skipped by the RPC, not rejected.
  const ignoredAssets = Array.isArray(data.ignored_assets)
    ? data.ignored_assets.filter((id) => typeof id === 'string')
    : [];
  return reviewResponse(
    { id: data.id, duplicate: false, ignored_assets: ignoredAssets },
    201
  );
}
