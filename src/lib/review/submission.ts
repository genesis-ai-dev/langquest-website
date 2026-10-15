export const REVIEW_STATUS_OPTIONS = [
  { value: 'no_status', label: 'No Status' },
  { value: 'suggested_changes', label: 'Suggested Changes' },
  { value: 'approved', label: 'Approved' }
] as const;

export type ReviewStatus = (typeof REVIEW_STATUS_OPTIONS)[number]['value'];

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return REVIEW_STATUS_OPTIONS.some((option) => option.value === value);
}

export function reviewStatusLabel(status: ReviewStatus) {
  return (
    REVIEW_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

/** `no_status` is stored as NULL in review.quest_result / review_asset.asset_result. */
export function reviewStatusToResult(status: ReviewStatus) {
  return status === 'no_status' ? null : status;
}

/** Rules that block a submission. Shared by the submit dialog and the API. */
export function reviewSubmissionProblems({
  reviewerName,
  overallStatus,
  overallComment,
  hasOverallAudio
}: {
  reviewerName: string;
  overallStatus: ReviewStatus;
  overallComment: string;
  hasOverallAudio: boolean;
}) {
  const problems: string[] = [];
  if (!reviewerName.trim()) problems.push('Name is required.');
  if (
    overallStatus === 'suggested_changes' &&
    !overallComment.trim() &&
    !hasOverallAudio
  ) {
    problems.push(
      'Overall Feedback with "Suggested Changes" needs a comment or a recording.'
    );
  }
  return problems;
}

export const REVIEW_AUDIO_MAX_BYTES = 20 * 1024 * 1024;

const REVIEW_AUDIO_EXTENSIONS: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg'
};

/** Strips codec parameters (`audio/webm;codecs=opus` → `audio/webm`). */
export function normalizeReviewAudioType(contentType: string) {
  const base = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return base in REVIEW_AUDIO_EXTENSIONS ? base : null;
}

export function reviewAudioExtension(contentType: string) {
  const normalized = normalizeReviewAudioType(contentType);
  return normalized ? REVIEW_AUDIO_EXTENSIONS[normalized] : null;
}

/** Validates a recording before upload. Returns an error message or null. */
export function reviewAudioProblem(contentType: string, size: number) {
  if (!normalizeReviewAudioType(contentType)) {
    return `Unsupported audio format (${contentType || 'unknown'})`;
  }
  if (size <= 0) return 'Recording is empty';
  if (size > REVIEW_AUDIO_MAX_BYTES) {
    return `Recording exceeds ${REVIEW_AUDIO_MAX_BYTES / 1024 / 1024} MB`;
  }
  return null;
}

/** Upload target for the overall feedback recording; assets use their id. */
export const REVIEW_OVERALL_TARGET = 'overall';

const UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID_REGEX = new RegExp(`^${UUID_PATTERN}$`, 'i');

export function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

export function isReviewAudioTarget(value: string) {
  return value === REVIEW_OVERALL_TARGET || isUuid(value);
}

/**
 * Recordings are stored at the bucket root as `{name}.{ext}` (no subfolders).
 * Each upload uses a fresh UUID name so retries never collide.
 */
export function buildReviewAudioPath(name: string, extension: string) {
  return `${name}.${extension}`;
}

export function isReviewAudioPath(path: string) {
  if (path.includes('/') || path.includes('..')) return false;
  const extensions = [...new Set(Object.values(REVIEW_AUDIO_EXTENSIONS))];
  const pattern = new RegExp(
    `^${UUID_PATTERN}\\.(${extensions.join('|')})$`,
    'i'
  );
  return pattern.test(path);
}

export type ReviewUploadUrlsRequest = {
  review_id: string;
  token: string;
  files: Array<{ target: string; content_type: string; size: number }>;
};

/** Uploaded recording in the review bucket (`{name}.{ext}` at bucket root). */
export type ReviewAudioRef = { path: string };

export type ReviewUploadUrlsResponse = {
  uploads: Array<ReviewAudioRef & { target: string; upload_url: string }>;
};

export type ReviewSubmitRequest = {
  review_id: string;
  token: string;
  reviewer: { name: string; email: string };
  overall: {
    status: ReviewStatus;
    comment: string;
    audio: ReviewAudioRef | null;
  };
  assets: Array<{
    asset_id: string;
    status: ReviewStatus;
    comment: string;
    audio: ReviewAudioRef | null;
  }>;
};
