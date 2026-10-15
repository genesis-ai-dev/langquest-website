import { z } from 'zod';
import {
  REVIEW_AUDIO_MAX_BYTES,
  REVIEW_STATUS_OPTIONS,
  isReviewAudioPath,
  isUuid,
  reviewStatusToResult,
  type ReviewStatus
} from '@/lib/review/submission';

export const MAX_REVIEW_TEXT_LENGTH = 20_000;

export const reviewStatusSchema = z.enum(
  REVIEW_STATUS_OPTIONS.map((option) => option.value) as [
    ReviewStatus,
    ...ReviewStatus[]
  ]
);

export const reviewAudioSchema = z
  .object({
    path: z.string().refine(isReviewAudioPath, 'Invalid audio path')
  })
  .nullable();

export const reviewAssetsSchema = z
  .array(
    z.object({
      asset_id: z.string().refine(isUuid, 'Invalid asset id'),
      status: reviewStatusSchema.default('no_status'),
      comment: z.string().max(MAX_REVIEW_TEXT_LENGTH).default(''),
      audio: reviewAudioSchema.default(null)
    })
  )
  .max(1000)
  .refine(
    (assets) =>
      new Set(assets.map((asset) => asset.asset_id)).size === assets.length,
    'Duplicate assets'
  );

/** Fields describing one file in an upload-urls request. */
export function reviewUploadFileFields(
  isAllowedType: (type: string) => boolean
) {
  return {
    content_type: z.string().refine(isAllowedType, {
      message: 'Unsupported audio format'
    }),
    size: z.number().int().positive().max(REVIEW_AUDIO_MAX_BYTES)
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

type ReviewAssetInput = z.infer<typeof reviewAssetsSchema>[number];

/** Only assets with a status, comment or recording become review_asset rows. */
export function reviewedAssets(assets: ReviewAssetInput[]) {
  return assets.filter(
    (asset) =>
      asset.status !== 'no_status' ||
      asset.comment.trim().length > 0 ||
      asset.audio !== null
  );
}

/** Audio references to check in storage, labelled by overall/asset id. */
export function reviewAudioRefs(
  overallAudio: { path: string } | null,
  assets: ReviewAssetInput[]
) {
  return [
    { target: 'overall', audio: overallAudio },
    ...assets.map((asset) => ({ target: asset.asset_id, audio: asset.audio }))
  ].flatMap(({ target, audio }) =>
    audio ? [{ target, path: audio.path }] : []
  );
}

/** Payload shape shared by submit_quest_review and create_partner_review. */
export function buildReviewPayload({
  reviewer,
  overall,
  assets
}: {
  reviewer: { name: string | null; email: string | null };
  overall: {
    status: ReviewStatus;
    comment: string;
    audio: { path: string } | null;
  };
  assets: ReviewAssetInput[];
}) {
  return {
    metadata: { reviewer },
    quest_result: reviewStatusToResult(overall.status),
    conclusion: nullableText(overall.comment),
    audio: overall.audio ? [overall.audio.path] : null,
    assets: assets.map((asset) => ({
      asset_id: asset.asset_id,
      asset_result: reviewStatusToResult(asset.status),
      comment: nullableText(asset.comment),
      audio: asset.audio ? [asset.audio.path] : null
    }))
  };
}
