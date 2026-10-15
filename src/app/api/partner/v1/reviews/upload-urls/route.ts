import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isPartnerAudioType } from '@/lib/review/submission';
import { reviewUploadFileFields } from '@/lib/review/schemas';
import { authenticatePartner } from '@/lib/review/partner';
import {
  createReviewAudioUploads,
  createServiceReviewClient,
  reviewResponse
} from '@/lib/review/server';

const requestSchema = z.object({
  files: z
    .array(z.object(reviewUploadFileFields(isPartnerAudioType)))
    .min(1)
    .max(1000)
});

/**
 * Step 1 of a partner submission: returns one signed URL per recording.
 * The partner PUTs each file to its `upload_url`, then sends the returned
 * `path` values to POST /api/partner/v1/reviews.
 */
export async function POST(request: NextRequest) {
  const auth = authenticatePartner(request);
  if ('response' in auth) return auth.response;

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return reviewResponse(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      400
    );
  }

  const uploads = await createReviewAudioUploads(
    createServiceReviewClient(),
    parsed.data.files
  );
  if (!uploads) {
    return reviewResponse({ error: 'Failed to generate upload URL' }, 500);
  }

  return reviewResponse({
    uploads: uploads.map((upload, index) => ({
      index,
      content_type: upload.file.content_type,
      path: upload.path,
      upload_url: upload.upload_url
    }))
  });
}
