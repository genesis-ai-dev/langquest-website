'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  REVIEW_OVERALL_TARGET,
  reviewAudioProblem,
  reviewStatusLabel,
  reviewSubmissionProblems,
  type ReviewAudioRef,
  type ReviewStatus
} from '@/lib/review/submission';
import { cn } from '@/lib/utils';
import { PlaylistPlayer } from '@/components/review/playlist-player';
import { STATUS_CLASS_NAME } from '@/components/review/review-status';
import {
  requestReviewUploadUrls,
  runWithConcurrency,
  submitReview,
  uploadReviewAudio
} from './submit-review';

const UPLOAD_CONCURRENCY = 3;
const MAX_LISTED_ASSETS = 5;

export type SubmissionAsset = {
  assetId: string;
  name: string;
  badge: string | null;
  status: ReviewStatus;
  comment: string;
  audio: Blob | null;
};

export type ReviewSubmission = {
  reviewer: { name: string; email: string };
  overall: { status: ReviewStatus; comment: string; audio: Blob | null };
  assets: SubmissionAsset[];
};

type Phase = 'summary' | 'uploading' | 'saving' | 'error';

type UploadItem = {
  target: string;
  label: string;
  blob: Blob;
  loaded: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  audio: ReviewAudioRef | null;
  error: string | null;
};

function hasFeedback(asset: SubmissionAsset) {
  return (
    asset.status !== 'no_status' ||
    asset.comment.trim().length > 0 ||
    asset.audio !== null
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function buildUploads(submission: ReviewSubmission) {
  const uploads: Record<string, UploadItem> = {};
  const add = (target: string, label: string, blob: Blob | null) => {
    if (!blob) return;
    uploads[target] = {
      target,
      label,
      blob,
      loaded: 0,
      status: 'pending',
      audio: null,
      error: null
    };
  };

  add(REVIEW_OVERALL_TARGET, 'Overall feedback', submission.overall.audio);
  for (const asset of submission.assets) {
    if (hasFeedback(asset)) add(asset.assetId, asset.name, asset.audio);
  }
  return uploads;
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('shrink-0', STATUS_CLASS_NAME[status])}
    >
      {reviewStatusLabel(status)}
    </Badge>
  );
}

function BlobPlayer({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  if (!url) return null;
  return (
    <div className="flex items-center gap-2">
      <PlaylistPlayer paths={[url]} className="flex-1" />
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatBytes(blob.size)}
      </span>
    </div>
  );
}

function FeedbackSummary({
  comment,
  audio
}: {
  comment: string;
  audio: Blob | null;
}) {
  return (
    <div className="space-y-2">
      {comment.trim() ? (
        <p className="text-sm whitespace-pre-wrap wrap-break-word">
          {comment.trim()}
        </p>
      ) : null}
      {audio ? <BlobPlayer blob={audio} /> : null}
      {audio
        ? (() => {
            const problem = reviewAudioProblem(audio.type, audio.size);
            return problem ? (
              <p className="text-sm text-destructive">{problem}</p>
            ) : null;
          })()
        : null}
    </div>
  );
}

function SummaryView({ submission }: { submission: ReviewSubmission }) {
  const { reviewer, overall, assets } = submission;
  const counts = {
    approved: assets.filter((asset) => asset.status === 'approved').length,
    suggested: assets.filter((asset) => asset.status === 'suggested_changes')
      .length,
    noStatus: assets.filter((asset) => asset.status === 'no_status').length,
    comments: assets.filter((asset) => asset.comment.trim()).length,
    recordings: assets.filter((asset) => asset.audio).length
  };
  const overallEmpty = !overall.comment.trim() && !overall.audio;

  return (
    <div className="space-y-5">
      <section className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Name: </span>
          {reviewer.name.trim() || (
            <span className="text-muted-foreground italic">Not provided</span>
          )}
        </p>
        <p>
          <span className="text-muted-foreground">Email: </span>
          {reviewer.email.trim() || (
            <span className="text-muted-foreground italic">Not provided</span>
          )}
        </p>
      </section>

      <section className="space-y-2 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Overall Feedback</h3>
          <StatusBadge status={overall.status} />
        </div>
        {overallEmpty ? (
          <p className="text-sm text-muted-foreground italic">
            No comment or recording
          </p>
        ) : (
          <FeedbackSummary comment={overall.comment} audio={overall.audio} />
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="font-medium">Assets ({assets.length})</h3>
          <p className="text-sm text-muted-foreground">
            {counts.approved} approved · {counts.suggested} suggested changes ·{' '}
            {counts.noStatus} no status
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {counts.comments} with comments · {counts.recordings} with recordings
        </p>
      </section>
    </div>
  );
}

function StepLabel({
  label,
  state
}: {
  label: string;
  state: 'pending' | 'active' | 'done' | 'error';
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {state === 'done' ? (
        <CheckCircle2 className="size-4 text-green-600" />
      ) : state === 'active' ? (
        <Loader2 className="size-4 animate-spin" />
      ) : state === 'error' ? (
        <XCircle className="size-4 text-destructive" />
      ) : (
        <span className="inline-block size-4 rounded-full border" />
      )}
      <span className={state === 'pending' ? 'text-muted-foreground' : ''}>
        {label}
      </span>
    </li>
  );
}

export function SubmitReviewDialog({
  open,
  onOpenChange,
  reviewId,
  token,
  submission,
  onSubmitted
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  token: string;
  submission: ReviewSubmission | null;
  onSubmitted: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('summary');
  const [error, setError] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<'upload' | 'save' | null>(null);
  const [uploads, setUploads] = useState<Record<string, UploadItem>>({});
  const uploadsRef = useRef<Record<string, UploadItem>>({});

  const busy = phase === 'uploading' || phase === 'saving';

  useEffect(() => {
    const next = submission ? buildUploads(submission) : {};
    uploadsRef.current = next;
    setUploads(next);
    setPhase('summary');
    setError(null);
    setFailedStep(null);
  }, [submission]);

  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  const patchUpload = (target: string, patch: Partial<UploadItem>) => {
    const current = uploadsRef.current[target];
    if (!current) return;
    uploadsRef.current = {
      ...uploadsRef.current,
      [target]: { ...current, ...patch }
    };
    setUploads(uploadsRef.current);
  };

  const run = async () => {
    if (!submission) return;
    setError(null);
    setFailedStep(null);

    const pending = Object.values(uploadsRef.current).filter(
      (item) => item.status !== 'done'
    );

    if (pending.length > 0) {
      setPhase('uploading');
      try {
        // Fresh URLs (and paths) on every attempt; a failed earlier attempt
        // may leave an orphaned file behind.
        const { uploads: urls } = await requestReviewUploadUrls(
          reviewId,
          token,
          pending.map((item) => ({ target: item.target, blob: item.blob }))
        );

        await runWithConcurrency(urls, UPLOAD_CONCURRENCY, async (upload) => {
          const item = uploadsRef.current[upload.target];
          if (!item) return;
          patchUpload(upload.target, {
            status: 'uploading',
            loaded: 0,
            error: null
          });
          try {
            await uploadReviewAudio(upload.upload_url, item.blob, (loaded) =>
              patchUpload(upload.target, { loaded })
            );
            patchUpload(upload.target, {
              status: 'done',
              audio: { path: upload.path }
            });
          } catch (err) {
            patchUpload(upload.target, {
              status: 'error',
              loaded: 0,
              error: err instanceof Error ? err.message : 'Upload failed'
            });
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setFailedStep('upload');
        setPhase('error');
        return;
      }

      if (
        Object.values(uploadsRef.current).some((item) => item.status !== 'done')
      ) {
        setError('Some recordings could not be uploaded.');
        setFailedStep('upload');
        setPhase('error');
        return;
      }
    }

    setPhase('saving');
    const audioFor = (target: string) =>
      uploadsRef.current[target]?.audio ?? null;

    try {
      await submitReview({
        review_id: reviewId,
        token,
        reviewer: submission.reviewer,
        overall: {
          status: submission.overall.status,
          comment: submission.overall.comment,
          audio: audioFor(REVIEW_OVERALL_TARGET)
        },
        assets: submission.assets.filter(hasFeedback).map((asset) => ({
          asset_id: asset.assetId,
          status: asset.status,
          comment: asset.comment,
          audio: audioFor(asset.assetId)
        }))
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save the review'
      );
      setFailedStep('save');
      setPhase('error');
      return;
    }

    onSubmitted();
  };

  const items = Object.values(uploads);
  const totalBytes = items.reduce((sum, item) => sum + item.blob.size, 0);
  const loadedBytes = items.reduce(
    (sum, item) =>
      sum + (item.status === 'done' ? item.blob.size : item.loaded),
    0
  );
  const failedUploads = items.filter((item) => item.status === 'error');
  const blockers = submission
    ? [
        ...reviewSubmissionProblems({
          reviewerName: submission.reviewer.name,
          overallStatus: submission.overall.status,
          overallComment: submission.overall.comment,
          hasOverallAudio: submission.overall.audio !== null
        }),
        ...items.flatMap((item) => {
          const problem = reviewAudioProblem(item.blob.type, item.blob.size);
          return problem ? [`${item.label}: ${problem}`] : [];
        })
      ]
    : [];

  const warnings: string[] = [];
  if (submission) {
    if (!submission.reviewer.email.trim()) warnings.push('Email is empty.');
    const { overall } = submission;
    if (
      overall.status === 'no_status' &&
      !overall.comment.trim() &&
      !overall.audio &&
      !submission.assets.some(hasFeedback)
    ) {
      warnings.push('No feedback has been added yet.');
    }

    const unexplained = submission.assets.filter(
      (asset) =>
        asset.status === 'suggested_changes' &&
        !asset.comment.trim() &&
        !asset.audio
    );
    if (unexplained.length > 0) {
      const names = unexplained
        .slice(0, MAX_LISTED_ASSETS)
        .map((asset) =>
          asset.badge ? `${asset.name} (${asset.badge})` : asset.name
        );
      const more = unexplained.length - names.length;
      warnings.push(
        `${unexplained.length} asset${unexplained.length === 1 ? ' has' : 's have'} "Suggested Changes" without a comment or recording: ${names.join(', ')}${more > 0 ? ` and ${more} more` : ''}.`
      );
    }
  }

  const uploadStep =
    phase === 'uploading'
      ? 'active'
      : failedStep === 'upload'
        ? 'error'
        : phase === 'saving' || failedStep === 'save'
          ? 'done'
          : 'pending';
  const saveStep =
    phase === 'saving' ? 'active' : failedStep === 'save' ? 'error' : 'pending';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {phase === 'summary' ? 'Review submission' : 'Submitting review'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'summary'
              ? 'Check what will be sent before confirming.'
              : 'Keep this page open until the submission finishes.'}
          </DialogDescription>
        </DialogHeader>

        {!submission ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Preparing summary...
          </div>
        ) : phase === 'summary' ? (
          <>
            <SummaryView submission={submission} />
            {items.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {items.length} recording{items.length === 1 ? '' : 's'} ·{' '}
                {formatBytes(totalBytes)} to upload
              </p>
            ) : null}
            {warnings.length > 0 ? (
              <div className="space-y-1 rounded-lg border border-yellow-500/50 bg-yellow-400/10 p-3 text-sm">
                {warnings.map((warning) => (
                  <p key={warning} className="flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-yellow-600" />
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
            {blockers.length > 0 ? (
              <div className="space-y-1 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">Fix before submitting:</p>
                <ul className="list-disc pl-5">
                  {blockers.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-5">
            <ol className="space-y-2">
              {items.length > 0 ? (
                <StepLabel
                  label={`Uploading recordings (${items.filter((item) => item.status === 'done').length}/${items.length})`}
                  state={uploadStep}
                />
              ) : null}
              <StepLabel label="Saving review" state={saveStep} />
            </ol>

            {items.length > 0 ? (
              <div className="space-y-1">
                <Progress
                  value={totalBytes ? (loadedBytes / totalBytes) * 100 : 0}
                />
                <p className="text-right text-xs text-muted-foreground tabular-nums">
                  {formatBytes(loadedBytes)} / {formatBytes(totalBytes)}
                </p>
                {failedUploads.length > 0 ? (
                  <p className="text-xs text-destructive">
                    Failed: {failedUploads.map((item) => item.label).join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {phase === 'summary' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={!submission || blockers.length > 0}
                onClick={() => void run()}
              >
                Confirm submission
              </Button>
            </>
          ) : phase === 'error' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button type="button" onClick={() => void run()}>
                Try again
              </Button>
            </>
          ) : (
            <Button type="button" disabled>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
