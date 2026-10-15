import {
  normalizeReviewAudioType,
  type ReviewSubmitRequest,
  type ReviewUploadUrlsResponse
} from '@/lib/review/submission';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
  });
  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      result &&
      typeof result === 'object' &&
      'error' in result &&
      typeof result.error === 'string'
        ? result.error
        : response.status === 404
          ? 'This review link is no longer valid.'
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return result as T;
}

export function requestReviewUploadUrls(
  reviewId: string,
  token: string,
  files: Array<{ target: string; blob: Blob }>
) {
  return postJson<ReviewUploadUrlsResponse>('/api/review/upload-urls', {
    review_id: reviewId,
    token,
    files: files.map((file) => ({
      target: file.target,
      content_type: normalizeReviewAudioType(file.blob.type) ?? file.blob.type,
      size: file.blob.size
    }))
  });
}

export function uploadReviewAudio(
  uploadUrl: string,
  blob: Blob,
  onProgress: (loaded: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl);
    xhr.timeout = 5 * 60 * 1000;
    xhr.setRequestHeader(
      'Content-Type',
      normalizeReviewAudioType(blob.type) ?? blob.type
    );
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(blob.size);
        resolve();
        return;
      }
      reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.onabort = () => reject(new Error('Upload was cancelled'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(blob);
  });
}

export function submitReview(body: ReviewSubmitRequest) {
  return postJson<{ ok: true }>('/api/review/submit', body);
}

/** Runs `task` over `items` with at most `limit` in flight. */
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>
) {
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++];
        await task(item);
      }
    }
  );
  await Promise.all(workers);
}
