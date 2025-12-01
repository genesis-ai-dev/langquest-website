/// <reference types="@cloudflare/workers-types" />

export interface ConcatRequest {
  audioUrls?: string[]; // URLs to download (if provided)
  audioData?: Array<{ data: string; format: string }>; // Base64 encoded audio data (alternative to URLs)
  outputKey: string;
  format?: 'mp3' | 'wav';
}

export interface ConcatResponse {
  success: boolean;
  audioUrl?: string;
  durationMs?: number;
  error?: string;
}

export interface Env {
  R2_EXPORTS: R2Bucket | any; // R2Bucket from @cloudflare/workers-types
  LANGQUEST_SUPABASE_URL?: string;
  LANGQUEST_SUPABASE_SERVICE_KEY?: string;
}
