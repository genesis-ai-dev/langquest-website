import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import {
  REVIEW_AUDIO_MAX_BYTES,
  buildReviewAudioPath,
  isReviewAudioTarget,
  reviewAudioExtension,
  type ReviewUploadUrlsResponse
} from '@/lib/review/submission';
import {
  createReviewClient,
  reviewAudioBucket,
  reviewResponse,
  validateReviewToken
} from '@/lib/review/server';

const requestSchema = z.object({
  review_id: z.string().trim().min(1),
  token: z.string().trim().min(1),
  files: z
    .array(
      z.object({
        target: z.string().refine(isReviewAudioTarget, 'Invalid target'),
        content_type: z
          .string()
          .refine((value) => reviewAudioExtension(value) !== null, {
            message: 'Unsupported audio format'
          }),
        size: z.number().int().positive().max(REVIEW_AUDIO_MAX_BYTES)
      })
    )
    .min(1)
    .max(1000)
    .refine(
      (files) =>
        new Set(files.map((file) => file.target)).size === files.length,
      'Duplicate targets'
    )
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

  const { review_id: reviewId, token, files } = parsed.data;
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

  const bucket = supabase.storage.from(reviewAudioBucket());
  const results = await Promise.all(
    files.map(async (file) => {
      const path = buildReviewAudioPath(
        randomUUID(),
        reviewAudioExtension(file.content_type) ?? 'bin'
      );
      const { data, error } = await bucket.createSignedUploadUrl(path);
      if (error || !data) {
        console.error('review upload-urls error', path, error);
        return null;
      }
      return {
        target: file.target,
        path,
        upload_url: data.signedUrl
      };
    })
  );

  const uploads = results.filter((upload) => upload !== null);
  if (uploads.length !== files.length) {
    return reviewResponse({ error: 'Failed to generate upload URL' }, 500);
  }

  return reviewResponse({ uploads } satisfies ReviewUploadUrlsResponse);
}
