'use client';

import { motion } from 'framer-motion';
import { Play, Pause, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AclWithAudio } from './useAclAudioPlayer';

interface AclRowProps {
  acl: AclWithAudio;
  index: number;
  total: number;
  isPlaying: boolean;
  onPlay: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isMoving?: boolean;
}

export function AclRow({
  acl,
  index,
  total,
  isPlaying,
  onPlay,
  onMoveUp,
  onMoveDown,
  isMoving = false
}: AclRowProps) {
  const hasAudio =
    acl.audio &&
    Array.isArray(acl.audio) &&
    acl.audio.some((p) => typeof p === 'string' && p.trim());
  const textPreview = acl.text
    ? acl.text.length > 60
      ? `${acl.text.slice(0, 60)}…`
      : acl.text
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 1 }}
      animate={{ opacity: isMoving ? 0.7 : 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center gap-2 py-3 px-3 sm:py-2 rounded-md border bg-background',
        'hover:bg-muted/50 transition-colors'
      )}
    >
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {hasAudio ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-10 sm:size-8 min-w-10 min-h-10 sm:min-w-8 sm:min-h-8"
            onClick={onPlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>
        ) : (
          <div className="size-10 sm:size-8 w-10 h-10 sm:w-8 sm:h-8" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-10 sm:size-7 min-w-10 min-h-10 sm:min-w-7 sm:min-h-7"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Move up"
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 sm:size-7 min-w-10 min-h-10 sm:min-w-7 sm:min-h-7"
          onClick={onMoveDown}
          disabled={index >= total - 1}
          aria-label="Move down"
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm text-muted-foreground">
          #{index + 1} · order_index: {acl.order_index ?? 0}
        </span>
        {textPreview && (
          <p className="text-sm truncate mt-0.5" title={acl.text ?? undefined}>
            {textPreview}
          </p>
        )}
      </div>
    </motion.div>
  );
}
