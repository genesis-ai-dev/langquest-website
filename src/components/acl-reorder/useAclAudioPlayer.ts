'use client';

import { useCallback, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { env } from '@/lib/env';
import { SupabaseEnvironment } from '@/lib/supabase';
import { extractAudioPaths } from './audioUtils';

export type AclWithAudio = {
  id: string;
  asset_id: string;
  order_index: number | null;
  audio: unknown; // jsonb — could be string[], string, or null at runtime
  text?: string | null;
  created_at?: string | null;
};

function getFirstAudioPath(acl: AclWithAudio): string | null {
  const paths = extractAudioPaths(acl.audio);
  return paths[0] ?? null;
}

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

export function useAclAudioPlayer(environment: SupabaseEnvironment) {
  const [playingAclId, setPlayingAclId] = useState<string | null>(null);
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<AclWithAudio[]>([]);
  const queueIdxRef = useRef(0);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAclId(null);
    setPlayingAssetId(null);
    queueRef.current = [];
    queueIdxRef.current = 0;
  }, []);

  const playSingle = useCallback(
    async (acl: AclWithAudio) => {
      stop();
      const path = getFirstAudioPath(acl);
      if (!path) return;

      const url = resolveAudioUrl(path, environment);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        setPlayingAclId(null);
        audioRef.current = null;
      });

      setPlayingAclId(acl.id);
      await audio.play();
    },
    [environment, stop]
  );

  const playAll = useCallback(
    async (acls: AclWithAudio[]) => {
      stop();
      const withAudio = acls.filter((a) => getFirstAudioPath(a));
      if (withAudio.length === 0) return;

      queueRef.current = withAudio;
      queueIdxRef.current = 0;
      setPlayingAssetId(withAudio[0]?.asset_id ?? null);

      const playNext = () => {
        if (queueIdxRef.current >= queueRef.current.length) {
          setPlayingAclId(null);
          setPlayingAssetId(null);
          queueRef.current = [];
          return;
        }
        const acl = queueRef.current[queueIdxRef.current];
        const path = getFirstAudioPath(acl);
        if (!path) {
          queueIdxRef.current++;
          playNext();
          return;
        }

        setPlayingAclId(acl.id);
        const url = resolveAudioUrl(path, environment);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.addEventListener('ended', () => {
          queueIdxRef.current++;
          playNext();
        });
        audio.play();
      };

      playNext();
    },
    [environment, stop]
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingAclId(null);
    setPlayingAssetId(null);
  }, []);

  return {
    playSingle,
    playAll,
    pause,
    stop,
    playingAclId,
    playingAssetId
  };
}
