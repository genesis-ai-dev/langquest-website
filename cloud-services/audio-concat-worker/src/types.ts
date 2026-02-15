/// <reference types="@cloudflare/workers-types" />

export interface ConcatRequest {
  audioUrls?: string[]; // URLs to download (if provided)
  audioData?: Array<{ data: string; format: string }>; // Base64 encoded audio data (alternative to URLs)
  outputKey: string;
  format?: 'mp3' | 'wav';
  returnData?: boolean; // If true, return audio as base64 in response instead of storing in R2
}

export interface ConcatResponse {
  success: boolean;
  audioUrl?: string;
  audioBase64?: string; // Base64 encoded audio (when returnData is true)
  contentType?: string; // MIME type of audio (when returnData is true)
  durationMs?: number;
  error?: string;
}

export interface Env {
  R2_EXPORTS: R2Bucket | any; // R2Bucket from @cloudflare/workers-types
  AUDIO_CONCAT_WORKER_TOKEN: string; // Bearer token for authenticating requests from the Next.js backend
  LANGQUEST_SUPABASE_URL?: string;
  LANGQUEST_SUPABASE_SERVICE_KEY?: string;
}
