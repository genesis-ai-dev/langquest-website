'use client';

import { useState } from 'react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Spinner } from '@/components/spinner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { PlaylistPlayer } from '@/components/review/playlist-player';
import { STATUS_CLASS_NAME } from '@/components/review/review-status';
import { extractAudioPaths } from '@/components/acl-reorder/audioUtils';
import type {
  AssetSummary,
  QuestReview,
  QuestReviewAsset
} from '@/app/db/questExplorer';
import { useQuestReviews } from '@/app/db/useQuestExplorerQueries';
import { isReviewStatus, reviewStatusLabel } from '@/lib/review/submission';
import { cn } from '@/lib/utils';
import { AssetLabelBadge } from './asset-label-badge';
import type { DisplayNode } from './template-strategies';

interface QuestReviewsButtonProps {
  questId: string;
  questName: string;
  versionLabel: string | null;
  assets: AssetSummary[];
  quest: DisplayNode | null;
  showAssetLabel?: boolean;
  resolveAssetLabel?: (
    quest: DisplayNode | null,
    asset: AssetSummary
  ) => string;
}

function reviewerInitials(name: string | null) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const initials =
    words.length === 1
      ? words[0].slice(0, 2)
      : `${words[0][0]}${words[words.length - 1][0]}`;
  return initials.toUpperCase();
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter((part) => part && part.trim()).join(' · ');
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return null;
  const status = isReviewStatus(result) ? result : null;

  return (
    <Badge
      variant="outline"
      className={cn('shrink-0', status ? STATUS_CLASS_NAME[status] : '')}
    >
      {status ? reviewStatusLabel(status) : result}
    </Badge>
  );
}

function ReviewSummary({
  review,
  questName,
  versionLabel,
  titleAs: Title = 'p'
}: {
  review: QuestReview;
  questName: string;
  versionLabel: string | null;
  titleAs?: 'p' | typeof DialogTitle;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="text-sm font-semibold">
          {reviewerInitials(review.reviewer_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-0.5 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <Title className="truncate text-sm font-semibold">
            {joinParts([questName, versionLabel])}
          </Title>
          <ResultBadge result={review.quest_result} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {joinParts([
            review.reviewer_name ?? 'Unknown reviewer',
            formatReviewDate(review.reviewed_at)
          ])}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {joinParts([review.review_label, review.origin])}
        </p>
      </div>
    </div>
  );
}

function FeedbackBlock({
  comment,
  audio
}: {
  comment: string | null;
  audio: string[];
}) {
  if (!comment && audio.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No feedback</p>;
  }

  return (
    <div className="space-y-2">
      {comment ? (
        <p className="text-sm whitespace-pre-wrap break-words">{comment}</p>
      ) : null}
      {audio.length > 0 ? <PlaylistPlayer paths={audio} /> : null}
    </div>
  );
}

function ReviewAssetRow({
  asset,
  feedback,
  label
}: {
  asset: AssetSummary;
  feedback: QuestReviewAsset | undefined;
  label: string;
}) {
  const assetAudio = (asset.content ?? []).flatMap((entry) =>
    extractAudioPaths(entry.audio)
  );

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">
            {asset.name || 'Untitled asset'}
          </p>
          {label ? <AssetLabelBadge text={label} className="py-0" /> : null}
        </div>
        <ResultBadge result={feedback?.asset_result ?? null} />
      </div>
      {assetAudio.length > 0 ? <PlaylistPlayer paths={assetAudio} /> : null}
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Feedback
        </p>
        <FeedbackBlock
          comment={feedback?.comment ?? null}
          audio={feedback?.audio ?? []}
        />
      </div>
    </div>
  );
}

export function QuestReviewsButton({
  questId,
  questName,
  versionLabel,
  assets,
  quest,
  showAssetLabel = false,
  resolveAssetLabel
}: QuestReviewsButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const {
    data: reviews = [],
    isLoading,
    error
  } = useQuestReviews(questId, open);

  const selectedReview =
    reviews.find((review) => review.id === selectedReviewId) ?? null;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSelectedReviewId(null);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        title="Reviews"
        aria-label="Reviews"
        onClick={() => setOpen(true)}
      >
        <ClipboardList className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-4 sm:max-w-2xl">
          {selectedReview ? (
            <>
              <DialogHeader className="space-y-3 pr-8">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 w-fit"
                  onClick={() => setSelectedReviewId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Reviews
                </Button>
                <ReviewSummary
                  review={selectedReview}
                  questName={questName}
                  versionLabel={versionLabel}
                  titleAs={DialogTitle}
                />
                <DialogDescription className="sr-only">
                  Review details
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                <section className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Overall Feedback</h3>
                    <ResultBadge result={selectedReview.quest_result} />
                  </div>
                  <FeedbackBlock
                    comment={selectedReview.conclusion}
                    audio={selectedReview.audio}
                  />
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Assets</h3>
                  {assets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This quest has no assets.
                    </p>
                  ) : (
                    assets.map((asset) => (
                      <ReviewAssetRow
                        key={asset.id}
                        asset={asset}
                        feedback={selectedReview.assets.find(
                          (item) => item.asset_id === asset.id
                        )}
                        label={
                          showAssetLabel
                            ? (resolveAssetLabel?.(quest, asset) ?? '')
                            : ''
                        }
                      />
                    ))
                  )}
                </section>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Reviews</DialogTitle>
                <DialogDescription>
                  {joinParts([questName, versionLabel])}
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Spinner className="h-5 w-5 text-primary" />
                  </div>
                ) : error ? (
                  <p className="py-6 text-center text-sm text-destructive">
                    {error instanceof Error
                      ? error.message
                      : 'Could not load the reviews.'}
                  </p>
                ) : reviews.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No reviews submitted for this quest yet.
                  </p>
                ) : (
                  reviews.map((review) => (
                    <button
                      key={review.id}
                      type="button"
                      className="w-full rounded-lg border p-3 transition-colors hover:bg-accent/30"
                      onClick={() => setSelectedReviewId(review.id)}
                    >
                      <ReviewSummary
                        review={review}
                        questName={questName}
                        versionLabel={versionLabel}
                      />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
