'use client';

import { createBrowserClient } from '@/lib/supabase/client';
import { env } from '@/lib/env';
import type { SupabaseEnvironment } from '@/lib/supabase';
import type { AclWithAudio } from './useAclAudioPlayer';

export interface ConcatProgress {
  phase: 'downloading' | 'decoding' | 'encoding';
  current: number;
  total: number;
}

export type OnProgress = (progress: ConcatProgress) => void;

/**
 * Resolve a storage path to a fetchable URL (mirrors useAclAudioPlayer logic).
 */
function resolveAudioUrl(
  path: string,
  environment: SupabaseEnvironment
): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const bucket =
    env.NEXT_PUBLIC_SUPABASE_BUCKET ||
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
    'local';
  const supabase = createBrowserClient(environment);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Concatenate audio from ordered ACLs using the browser's Web Audio API.
 *
 * Handles any format the browser can decode: wav, mp3, webm/opus, mp4/aac,
 * ogg/vorbis, etc. All audio is decoded to raw PCM at the browser's native
 * sample rate, concatenated, then encoded as a 16-bit WAV file.
 */
export async function concatAclAudio(
  acls: AclWithAudio[],
  environment: SupabaseEnvironment,
  onProgress?: OnProgress
): Promise<Blob> {
  // Collect audio paths in ACL order
  const audioPaths: string[] = [];
  for (const acl of acls) {
    if (acl.audio && Array.isArray(acl.audio)) {
      for (const p of acl.audio) {
        if (typeof p === 'string' && p.trim()) {
          audioPaths.push(p.trim());
        }
      }
    }
  }

  if (audioPaths.length === 0) {
    throw new Error('No audio files to concatenate');
  }

  const audioContext = new AudioContext();

  try {
    const decodedBuffers: AudioBuffer[] = [];

    for (let i = 0; i < audioPaths.length; i++) {
      onProgress?.({
        phase: 'downloading',
        current: i + 1,
        total: audioPaths.length
      });

      const url = resolveAudioUrl(audioPaths[i], environment);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to download audio file ${i + 1}/${audioPaths.length} (${response.status})`
        );
      }
      const arrayBuffer = await response.arrayBuffer();

      onProgress?.({
        phase: 'decoding',
        current: i + 1,
        total: audioPaths.length
      });

      // decodeAudioData handles wav, mp3, webm, mp4, ogg, etc.
      const decoded = await audioContext.decodeAudioData(arrayBuffer);
      decodedBuffers.push(decoded);
    }

    onProgress?.({ phase: 'encoding', current: 0, total: 1 });

    // Use first buffer's sample rate (AudioContext normalises all to the same rate)
    const sampleRate = decodedBuffers[0].sampleRate;
    const numberOfChannels = Math.max(
      ...decodedBuffers.map((b) => b.numberOfChannels)
    );
    const totalLength = decodedBuffers.reduce((sum, b) => sum + b.length, 0);

    // Merge into per-channel Float32Arrays
    const merged: Float32Array[] = [];
    for (let ch = 0; ch < numberOfChannels; ch++) {
      merged.push(new Float32Array(totalLength));
    }

    let offset = 0;
    for (const buf of decodedBuffers) {
      for (let ch = 0; ch < numberOfChannels; ch++) {
        // If buffer has fewer channels, duplicate channel 0 (mono → stereo)
        const src = ch < buf.numberOfChannels ? ch : 0;
        merged[ch].set(buf.getChannelData(src), offset);
      }
      offset += buf.length;
    }

    const wavBlob = encodeWav(merged, sampleRate, numberOfChannels);

    onProgress?.({ phase: 'encoding', current: 1, total: 1 });
    return wavBlob;
  } finally {
    await audioContext.close();
  }
}

// ---------------------------------------------------------------------------
// WAV encoder
// ---------------------------------------------------------------------------

function encodeWav(
  channels: Float32Array[],
  sampleRate: number,
  numberOfChannels: number
): Blob {
  const length = channels[0].length;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize; // 44-byte WAV header

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleaved 16-bit PCM samples
  let pos = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const sample = channels[ch][i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(pos, int16, true);
      pos += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
