import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  isReviewAudioTarget,
  reviewAudioExtension,
  type ReviewUploadUrlsResponse
} from '@/lib/review/submission';
import { reviewUploadFileFields } from '@/lib/review/schemas';
import {
  createReviewAudioUploads,
  createReviewClient,
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
        ...reviewUploadFileFields(
          (value) => reviewAudioExtension(value) !== null
        )
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

  const uploads = await createReviewAudioUploads(supabase, files);
  if (!uploads) {
    return reviewResponse({ error: 'Failed to generate upload URL' }, 500);
  }

  return reviewResponse({
    uploads: uploads.map((upload) => ({
      target: upload.file.target,
      path: upload.path,
      upload_url: upload.upload_url
    }))
  } satisfies ReviewUploadUrlsResponse);
}
