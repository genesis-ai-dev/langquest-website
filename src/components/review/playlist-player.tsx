'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

function resolveAudioUrl(path: string) {
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const bucket = env.NEXT_PUBLIC_SUPABASE_BUCKET || 'local';
  const { data } = createBrowserClient()
    .storage.from(bucket)
    .getPublicUrl(path);
  return data.publicUrl;
}

let activeAudioStop: (() => void) | null = null;

export function PlaylistPlayer({
  paths,
  compact = false,
  className,
  isolateClick = false
}: {
  paths: string[];
  compact?: boolean;
  className?: string;
  isolateClick?: boolean;
}) {
  const urls = paths.map(resolveAudioUrl);
  const urlsKey = urls.join('\n');
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlsRef = useRef(urls);
  const stopRef = useRef<() => void>(() => undefined);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  urlsRef.current = urls;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || urlsRef.current.length === 0) return;

    const stop = () => {
      audio.pause();
    };
    stopRef.current = stop;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const updateProgress = () => {
      if (!audio.duration) return;
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const handleEnded = () => {
      const queue = urlsRef.current;
      const next = indexRef.current + 1;
      if (next < queue.length) {
        indexRef.current = next;
        setIndex(next);
        audio.src = queue[next];
        void audio.play();
        return;
      }
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      if (activeAudioStop === stop) activeAudioStop = null;
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [urlsKey]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (activeAudioStop && activeAudioStop !== stopRef.current) {
      activeAudioStop();
    }
    activeAudioStop = stopRef.current;

    const finished = audio.ended && indexRef.current >= urls.length - 1;
    if (finished || !audio.getAttribute('src')) {
      indexRef.current = 0;
      setIndex(0);
      audio.src = urls[0];
    }

    void audio.play();
  };

  const seek = (event: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    audio.currentTime =
      ((event.clientX - rect.left) / rect.width) * audio.duration;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (urls.length === 0) return null;

  const playerButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={togglePlay}
      className="size-8 rounded-full p-0"
      aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
    >
      {isPlaying ? (
        <PauseIcon className="size-4" />
      ) : (
        <PlayIcon className="size-4" />
      )}
    </Button>
  );

  const clickIsolationProps = isolateClick
    ? {
        onClick: (event: MouseEvent<HTMLDivElement>) => event.stopPropagation(),
        onPointerDown: (event: MouseEvent<HTMLDivElement>) =>
          event.stopPropagation()
      }
    : {};

  if (compact) {
    return (
      <div className={cn('inline-flex', className)} {...clickIsolationProps}>
        <audio ref={audioRef} preload="metadata" />
        {playerButton}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg bg-muted/30 p-3',
        className
      )}
      {...clickIsolationProps}
    >
      <audio ref={audioRef} preload="metadata" />
      {playerButton}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div
          className="h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-muted"
          onClick={seek}
        >
          <div
            className="h-full bg-primary transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {urls.length > 1 ? `${index + 1}/${urls.length} · ` : ''}
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
