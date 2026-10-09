import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  REVIEW_AUDIO_MAX_BYTES,
  REVIEW_OVERALL_TARGET,
  REVIEW_STATUS_OPTIONS,
  isReviewAudioPath,
  isUuid,
  reviewStatusToResult,
  type ReviewSubmitRequest
} from '@/lib/review/submission';
import {
  createReviewClient,
  reviewAudioBucket,
  reviewResponse,
  validateReviewToken,
  type ReviewClient
} from '@/lib/review/server';

const MAX_TEXT_LENGTH = 20_000;

const statusSchema = z.enum(
  REVIEW_STATUS_OPTIONS.map((option) => option.value) as [
    ReviewSubmitRequest['overall']['status'],
    ...ReviewSubmitRequest['overall']['status'][]
  ]
);

const requestSchema = z.object({
  review_id: z.string().trim().min(1),
  token: z.string().trim().min(1),
  reviewer: z.object({
    name: z.string().trim().max(200),
    email: z.union([z.literal(''), z.string().trim().email().max(320)])
  }),
  overall: z.object({
    status: statusSchema,
    comment: z.string().max(MAX_TEXT_LENGTH),
    audio_path: z.string().nullable()
  }),
  assets: z
    .array(
      z.object({
        asset_id: z.string().refine(isUuid, 'Invalid asset id'),
        status: statusSchema,
        comment: z.string().max(MAX_TEXT_LENGTH),
        audio_path: z.string().nullable()
      })
    )
    .max(1000)
    .refine(
      (assets) =>
        new Set(assets.map((asset) => asset.asset_id)).size === assets.length,
      'Duplicate assets'
    )
});

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

  // Only assets with a status, comment or recording become review_asset rows.
  const assets = parsed.data.assets.filter(
    (asset) =>
      asset.status !== 'no_status' ||
      asset.comment.trim().length > 0 ||
      asset.audio_path !== null
  );

  const audioChecks = [
    { target: REVIEW_OVERALL_TARGET, path: overall.audio_path },
    ...assets.map((asset) => ({
      target: asset.asset_id,
      path: asset.audio_path
    }))
  ].filter(
    (check): check is { target: string; path: string } => check.path !== null
  );

  const invalidPath = audioChecks.find(
    (check) => !isReviewAudioPath(check.path, reviewId, check.target)
  );
  if (invalidPath) {
    return reviewResponse(
      { error: `Invalid audio path for ${invalidPath.target}` },
      400
    );
  }

  const existence = await Promise.all(
    audioChecks.map((check) => audioObjectExists(supabase, check.path))
  );
  const missing = audioChecks.filter((_, index) => !existence[index]);
  if (missing.length > 0) {
    return reviewResponse(
      {
        error: 'Some recordings were not uploaded',
        missing: missing.map((check) => check.target)
      },
      422
    );
  }

  const audioUploadedAt = new Date().toISOString();
  const payload = {
    metadata: {
      reviewer: {
        name: nullableText(reviewer.name),
        email: nullableText(reviewer.email)
      }
    },
    quest_result: reviewStatusToResult(overall.status),
    conclusion: nullableText(overall.comment),
    audio: overall.audio_path ? [overall.audio_path] : null,
    audio_uploaded_at: overall.audio_path ? audioUploadedAt : null,
    assets: assets.map((asset) => ({
      asset_id: asset.asset_id,
      asset_result: reviewStatusToResult(asset.status),
      comment: nullableText(asset.comment),
      audio: asset.audio_path ? [asset.audio_path] : null,
      audio_uploaded_at: asset.audio_path ? audioUploadedAt : null
    }))
  };

  // TODO: replace with the real RPC once `submit_quest_review` exists. It must
  // revalidate the token, check the assets belong to the review's quest, upsert
  // review_asset, update review (status/concluded_at) and invalidate the token
  // in a single transaction.
  //
  // const { data, error } = await supabase.rpc('submit_quest_review', {
  //   review_id: reviewId,
  //   token,
  //   payload
  // });
  // if (error) {
  //   return reviewResponse({ error: error.message }, 500);
  // }
  console.log(
    '[review/submit] submit_quest_review payload',
    JSON.stringify({ review_id: reviewId, payload }, null, 2)
  );

  return reviewResponse({ ok: true });
}
