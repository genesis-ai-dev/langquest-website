'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AclRow } from './AclRow';
import type { AclWithAudio } from './useAclAudioPlayer';

export type AssetWithAcls = {
  id: string;
  name: string | null;
  order_index: number;
  acls: AclWithAudio[];
};

interface AssetAclListProps {
  asset: AssetWithAcls;
  playingAclId: string | null;
  movingAclId: string | null;
  onPlaySingle: (acl: AclWithAudio) => void;
  onPlayAll: (acls: AclWithAudio[]) => void;
  onMoveUp: (acl: AclWithAudio) => void;
  onMoveDown: (acl: AclWithAudio) => void;
}

export function AssetAclList({
  asset,
  playingAclId,
  movingAclId,
  onPlaySingle,
  onPlayAll,
  onMoveUp,
  onMoveDown
}: AssetAclListProps) {
  const sortedAcls = [...asset.acls].sort((a, b) => {
    if (a.order_index !== b.order_index) return a.order_index - b.order_index;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  const hasAnyAudio = sortedAcls.some(
    (a) => a.audio && Array.isArray(a.audio) && a.audio.some((p) => typeof p === 'string' && p.trim())
  );

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {asset.name || `Asset ${asset.id.slice(0, 8)}`}
        </h3>
        {hasAnyAudio && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPlayAll(sortedAcls)}
            className="gap-1"
          >
            <Play className="size-4" />
            Play all
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedAcls.map((acl, idx) => (
            <motion.div
              key={acl.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AclRow
                acl={acl}
                index={idx}
                total={sortedAcls.length}
                isPlaying={playingAclId === acl.id}
                onPlay={() => onPlaySingle(acl)}
                onMoveUp={() => onMoveUp(acl)}
                onMoveDown={() => onMoveDown(acl)}
                isMoving={movingAclId === acl.id}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
