'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardCheck, Mic, Square, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AssetSummary, QuestRecord } from '@/app/db/questExplorer';
import { extractAudioPaths } from '@/components/acl-reorder/audioUtils';
import {
  getTemplateStrategy,
  type DisplayNode
} from '@/components/QuestExplorer/template-strategies';
import {
  REVIEW_STATUS_OPTIONS,
  isReviewStatus,
  type ReviewStatus
} from '@/lib/review/submission';
import { PlaylistPlayer } from './playlist-player';
import { STATUS_CLASS_NAME, STATUS_ITEM_CLASS_NAME } from './review-status';
import {
  SubmitReviewDialog,
  type ReviewSubmission
} from './submit-review-dialog';

type ReviewContent = {
  text: string | null;
  audio: string[];
  order_index: number;
};

type ReviewAsset = {
  id: string;
  name: string | null;
  order_index: number;
  metadata: Record<string, unknown> | null;
  content: ReviewContent[];
};

export type ReviewPayload = {
  valid: true;
  quest: {
    id: string;
    name: string | null;
    description: string | null;
    metadata: Record<string, unknown> | null;
    template: string | null;
  };
  assets: ReviewAsset[];
};

type AssetField = {
  status: ReviewStatus;
  comment: string;
  hasRecording: boolean;
};

type ReviewDraft = {
  name: string;
  email: string;
  overallStatus: ReviewStatus;
  overallFeedback: string;
  hasOverallRecording: boolean;
  assets: Record<string, AssetField>;
};

const OVERALL_RECORDING_ID = '__overall__';

const DRAFT_PREFIX = 'lq-review-draft:';
const RECORDING_DB = 'lq-review';
const RECORDING_STORE = 'recordings';

function draftKey(reviewId: string) {
  return `${DRAFT_PREFIX}${reviewId}`;
}

function recordingKey(reviewId: string, assetId: string) {
  return `${reviewId}:${assetId}`;
}

function emptyAssetField(): AssetField {
  return { status: 'no_status', comment: '', hasRecording: false };
}

function readDraft(reviewId: string): ReviewDraft | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(draftKey(reviewId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.assets)) return null;

    const assets: Record<string, AssetField> = {};
    for (const [assetId, value] of Object.entries(parsed.assets)) {
      if (!isRecord(value)) continue;
      assets[assetId] = {
        status: isReviewStatus(value.status) ? value.status : 'no_status',
        comment: typeof value.comment === 'string' ? value.comment : '',
        hasRecording: value.hasRecording === true
      };
    }

    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      overallStatus: isReviewStatus(parsed.overallStatus)
        ? parsed.overallStatus
        : 'no_status',
      overallFeedback:
        typeof parsed.overallFeedback === 'string'
          ? parsed.overallFeedback
          : '',
      hasOverallRecording: parsed.hasOverallRecording === true,
      assets
    };
  } catch {
    return null;
  }
}

function writeDraft(reviewId: string, draft: ReviewDraft) {
  window.localStorage.setItem(draftKey(reviewId), JSON.stringify(draft));
}

async function clearDraft(reviewId: string, assetIds: string[]) {
  window.localStorage.removeItem(draftKey(reviewId));
  await Promise.all(
    [OVERALL_RECORDING_ID, ...assetIds].map((id) =>
      deleteRecording(reviewId, id)
    )
  );
}

function openRecordingDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(RECORDING_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(RECORDING_STORE)) {
        request.result.createObjectStore(RECORDING_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadRecording(reviewId: string, assetId: string) {
  const db = await openRecordingDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db
      .transaction(RECORDING_STORE, 'readonly')
      .objectStore(RECORDING_STORE)
      .get(recordingKey(reviewId, assetId));
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob ?? null;
}

async function saveRecording(reviewId: string, assetId: string, blob: Blob) {
  const db = await openRecordingDb();
  await new Promise<void>((resolve, reject) => {
    const request = db
      .transaction(RECORDING_STORE, 'readwrite')
      .objectStore(RECORDING_STORE)
      .put(blob, recordingKey(reviewId, assetId));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

async function deleteRecording(reviewId: string, assetId: string) {
  const db = await openRecordingDb();
  await new Promise<void>((resolve, reject) => {
    const request = db
      .transaction(RECORDING_STORE, 'readwrite')
      .objectStore(RECORDING_STORE)
      .delete(recordingKey(reviewId, assetId));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compareOrder(a: { order_index: number }, b: { order_index: number }) {
  return a.order_index - b.order_index;
}

export function parseReviewPayload(value: unknown): ReviewPayload | null {
  if (!isRecord(value) || value.valid !== true || !isRecord(value.quest)) {
    return null;
  }

  if (typeof value.quest.id !== 'string' || !Array.isArray(value.assets)) {
    return null;
  }

  const assets: ReviewAsset[] = [];

  for (const item of value.assets) {
    if (!isRecord(item) || typeof item.id !== 'string') continue;

    const content: ReviewContent[] = [];
    if (Array.isArray(item.content)) {
      for (const entry of item.content) {
        if (!isRecord(entry)) continue;
        content.push({
          text: typeof entry.text === 'string' ? entry.text : null,
          audio: extractAudioPaths(entry.audio),
          order_index:
            typeof entry.order_index === 'number' ? entry.order_index : 0
        });
      }
    }

    assets.push({
      id: item.id,
      name: typeof item.name === 'string' ? item.name : null,
      order_index: typeof item.order_index === 'number' ? item.order_index : 0,
      metadata: isRecord(item.metadata) ? item.metadata : null,
      content: content.sort(compareOrder)
    });
  }

  return {
    valid: true,
    quest: {
      id: value.quest.id,
      name: typeof value.quest.name === 'string' ? value.quest.name : null,
      description:
        typeof value.quest.description === 'string'
          ? value.quest.description
          : null,
      metadata: isRecord(value.quest.metadata) ? value.quest.metadata : null,
      template:
        typeof value.quest.template === 'string' ? value.quest.template : null
    },
    assets: assets.sort(compareOrder)
  };
}

function getVersionLabel(metadata: Record<string, unknown> | null) {
  if (!metadata || typeof metadata.versionLabel !== 'string') return null;
  const label = metadata.versionLabel.trim();
  return label || null;
}

function getAssetBadge(quest: ReviewPayload['quest'], asset: ReviewAsset) {
  if (!quest.template) return null;

  const strategy = getTemplateStrategy(quest.template);
  if (!strategy.behavior.showAssetLabel) return null;

  const questRecord: QuestRecord = {
    id: quest.id,
    name: quest.name ?? '',
    description: quest.description,
    metadata: quest.metadata,
    parent_id: null,
    created_at: '',
    creator_id: null,
    creator_username: null,
    children: []
  };
  const questNode: DisplayNode = {
    key: quest.id,
    title: quest.name ?? '',
    questId: quest.id,
    quest: questRecord,
    kind: 'quest'
  };
  const assetSummary: AssetSummary = {
    id: asset.id,
    name: asset.name,
    active: true,
    created_at: '',
    metadata: asset.metadata
  };
  const label = strategy.resolveAssetLabel(questNode, assetSummary).trim();

  if (!label || label.toLowerCase() === 'no labeled') return null;
  return label;
}

const CARD_PLAYER_WIDTH_CLASS = 'w-80 max-w-full';

function DeleteRecordingConfirmDialog({
  open,
  onOpenChange,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete recording</DialogTitle>
          <DialogDescription>
            Delete this recording? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackRecordingControls({
  reviewId,
  recordingId,
  onHasRecordingChange
}: {
  reviewId: string;
  recordingId: string;
  onHasRecordingChange: (hasRecording: boolean) => void;
}) {
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingUrlRef = useRef<string | null>(null);
  const onHasRecordingChangeRef = useRef(onHasRecordingChange);
  onHasRecordingChangeRef.current = onHasRecordingChange;

  const replaceRecordingUrl = (nextUrl: string | null) => {
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = nextUrl;
    setRecordingUrl(nextUrl);
  };

  useEffect(() => {
    let cancelled = false;
    setRecordError(null);

    void loadRecording(reviewId, recordingId)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          onHasRecordingChangeRef.current(false);
          return;
        }
        replaceRecordingUrl(URL.createObjectURL(blob));
        onHasRecordingChangeRef.current(true);
      })
      .catch(() => {
        if (!cancelled) setRecordError('Could not load the saved recording.');
      });

    return () => {
      cancelled = true;
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      replaceRecordingUrl(null);
    };
  }, [reviewId, recordingId]);

  const startRecording = async () => {
    setRecordError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined;
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        const blob = new Blob(chunks, {
          type: recorder.mimeType || 'audio/webm'
        });
        if (blob.size === 0) return;
        void saveRecording(reviewId, recordingId, blob)
          .then(() => {
            replaceRecordingUrl(URL.createObjectURL(blob));
            onHasRecordingChangeRef.current(true);
          })
          .catch(() => setRecordError('Could not save the recording.'));
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setRecordError('Microphone access was denied.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const performDeleteRecording = () => {
    void deleteRecording(reviewId, recordingId).catch(() => {
      setRecordError('Could not delete the recording.');
    });
    replaceRecordingUrl(null);
    onHasRecordingChangeRef.current(false);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isRecording ? (
            <Button type="button" variant="destructive" onClick={stopRecording}>
              <Square className="size-4" />
              Stop
            </Button>
          ) : recordingUrl ? (
            <PlaylistPlayer paths={[recordingUrl]} />
          ) : (
            <Button type="button" variant="outline" onClick={startRecording}>
              <Mic className="size-4" />
              Record
            </Button>
          )}
        </div>
        {recordingUrl && !isRecording ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setConfirmDeleteOpen(true)}
            aria-label="Delete recording"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
      {recordError ? (
        <p className="text-sm text-destructive">{recordError}</p>
      ) : null}
      <DeleteRecordingConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={performDeleteRecording}
      />
    </>
  );
}

function StatusSelect({
  value,
  onValueChange,
  name,
  label
}: {
  value: ReviewStatus;
  onValueChange: (value: ReviewStatus) => void;
  name: string;
  label: string;
}) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select
        value={value}
        onValueChange={(next) => {
          if (!isReviewStatus(next)) return;
          onValueChange(next);
        }}
      >
        <SelectTrigger
          type="button"
          className={`w-44 shrink-0 ${STATUS_CLASS_NAME[value]}`}
          aria-label={label}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REVIEW_STATUS_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={STATUS_ITEM_CLASS_NAME[option.value]}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

function assetAudioPaths(asset: ReviewAsset) {
  return asset.content.flatMap((entry) => entry.audio);
}

function assetHasContent(field: AssetField) {
  return field.comment.trim().length > 0 || field.hasRecording;
}

function AssetEditorDialog({
  reviewId,
  asset,
  badge,
  field,
  open,
  onOpenChange,
  onRemember,
  onCommit
}: {
  reviewId: string;
  asset: ReviewAsset;
  badge: string | null;
  field: AssetField;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemember: (assetId: string, patch: Partial<AssetField>) => void;
  onCommit: (assetId: string, next: AssetField) => void;
}) {
  const [status, setStatus] = useState<ReviewStatus>(field.status);
  const [comment, setComment] = useState(field.comment);
  const [hasRecording, setHasRecording] = useState(field.hasRecording);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const draftRef = useRef({
    status: field.status,
    comment: field.comment,
    hasRecording: field.hasRecording
  });
  const fieldRef = useRef(field);
  const onRememberRef = useRef(onRemember);
  const onCommitRef = useRef(onCommit);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingUrlRef = useRef<string | null>(null);
  const closingRef = useRef(false);

  fieldRef.current = field;
  onRememberRef.current = onRemember;
  onCommitRef.current = onCommit;
  draftRef.current = { status, comment, hasRecording };

  const remember = (patch: Partial<AssetField>) => {
    draftRef.current = { ...draftRef.current, ...patch };
    onRememberRef.current(asset.id, draftRef.current);
  };

  useEffect(() => {
    if (!open) return;

    const initial = fieldRef.current;
    setStatus(initial.status);
    setComment(initial.comment);
    setHasRecording(initial.hasRecording);
    draftRef.current = initial;
    setRecordError(null);
    closingRef.current = false;
    let cancelled = false;

    void loadRecording(reviewId, asset.id)
      .then((blob) => {
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        recordingUrlRef.current = url;
        setRecordingUrl(url);
        setHasRecording(true);
        draftRef.current = { ...draftRef.current, hasRecording: true };
        onRememberRef.current(asset.id, draftRef.current);
      })
      .catch(() => {
        if (!cancelled) setRecordError('Could not load the saved recording.');
      });

    return () => {
      cancelled = true;
      if (recordingUrlRef.current) {
        URL.revokeObjectURL(recordingUrlRef.current);
        recordingUrlRef.current = null;
      }
    };
  }, [open, asset.id, reviewId]);

  const replaceRecordingUrl = (nextUrl: string | null) => {
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = nextUrl;
    setRecordingUrl(nextUrl);
  };

  const startRecording = async () => {
    setRecordError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined;
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        const blob = new Blob(chunks, {
          type: recorder.mimeType || 'audio/webm'
        });
        if (blob.size === 0) {
          if (closingRef.current) {
            onCommitRef.current(asset.id, draftRef.current);
            onOpenChange(false);
          }
          return;
        }
        void saveRecording(reviewId, asset.id, blob)
          .then(() => {
            replaceRecordingUrl(URL.createObjectURL(blob));
            setHasRecording(true);
            draftRef.current = { ...draftRef.current, hasRecording: true };
            onRememberRef.current(asset.id, draftRef.current);
            if (closingRef.current) {
              onCommitRef.current(asset.id, draftRef.current);
              onOpenChange(false);
            }
          })
          .catch(() => {
            setRecordError('Could not save the recording.');
            if (closingRef.current) {
              onCommitRef.current(asset.id, draftRef.current);
              onOpenChange(false);
            }
          });
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setRecordError('Microphone access was denied.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const performDeleteRecording = () => {
    void deleteRecording(reviewId, asset.id).catch(() => {
      setRecordError('Could not delete the recording.');
    });
    replaceRecordingUrl(null);
    setHasRecording(false);
    remember({ hasRecording: false });
  };

  const close = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') {
      closingRef.current = true;
      if (typeof recorder.requestData === 'function') recorder.requestData();
      recorder.stop();
      recorderRef.current = null;
      return;
    }

    onRememberRef.current(asset.id, draftRef.current);
    onCommitRef.current(asset.id, draftRef.current);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8">
              {asset.name || 'Untitled asset'}
              {badge ? (
                <Badge variant="secondary" className="ml-2 align-middle">
                  {badge}
                </Badge>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-end">
            <StatusSelect
              name={`modal_asset_status_${asset.id}`}
              label={`Status for ${asset.name || 'asset'}`}
              value={status}
              onValueChange={(nextStatus) => {
                setStatus(nextStatus);
                remember({ status: nextStatus });
              }}
            />
          </div>

          <div className="space-y-3">
            {asset.content.map((entry, contentIndex) => (
              <div key={`${asset.id}-${contentIndex}`} className="space-y-3">
                {entry.text ? (
                  <p className="text-sm leading-6">{entry.text}</p>
                ) : null}
                <PlaylistPlayer paths={entry.audio} />
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Feedback</p>
            <Textarea
              name={`asset_comment_${asset.id}`}
              aria-label={`Feedback for ${asset.name || 'asset'}`}
              value={comment}
              onChange={(event) => {
                const value = event.target.value;
                setComment(value);
                remember({ comment: value });
              }}
              className="min-h-28"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {isRecording ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={stopRecording}
                  >
                    <Square className="size-4" />
                    Stop
                  </Button>
                ) : recordingUrl ? (
                  <PlaylistPlayer paths={[recordingUrl]} />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startRecording}
                  >
                    <Mic className="size-4" />
                    Record
                  </Button>
                )}
              </div>
              {recordingUrl && !isRecording ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setConfirmDeleteOpen(true)}
                  aria-label="Delete recording"
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
            {recordError ? (
              <p className="text-sm text-destructive">{recordError}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <DeleteRecordingConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={performDeleteRecording}
      />
    </>
  );
}

type ReviewerDraft = Pick<
  ReviewDraft,
  'name' | 'email' | 'overallStatus' | 'overallFeedback' | 'hasOverallRecording'
>;

function ReviewerFields({
  reviewId,
  onChange
}: {
  reviewId: string;
  onChange: (patch: Partial<ReviewerDraft>) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [overallStatus, setOverallStatus] = useState<ReviewStatus>('no_status');
  const [overallFeedback, setOverallFeedback] = useState('');

  useEffect(() => {
    const saved = readDraft(reviewId);
    if (!saved) return;
    setName(saved.name);
    setEmail(saved.email);
    setOverallStatus(saved.overallStatus);
    setOverallFeedback(saved.overallFeedback);
  }, [reviewId]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reviewer-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reviewer-name"
            name="name"
            aria-required
            autoComplete="name"
            value={name}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              onChange({ name: value });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reviewer-email">Email (optional)</Label>
          <Input
            id="reviewer-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              const value = event.target.value;
              setEmail(value);
              onChange({ email: value });
            }}
          />
        </div>
      </div>

      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Overall Feedback</h2>
          <StatusSelect
            name="overall_status"
            label="Overall status"
            value={overallStatus}
            onValueChange={(status) => {
              setOverallStatus(status);
              onChange({ overallStatus: status });
            }}
          />
        </div>
        <Textarea
          name="overall_feedback"
          aria-label="Overall feedback"
          value={overallFeedback}
          onChange={(event) => {
            const value = event.target.value;
            setOverallFeedback(value);
            onChange({ overallFeedback: value });
          }}
          className="min-h-28"
        />
        <FeedbackRecordingControls
          reviewId={reviewId}
          recordingId={OVERALL_RECORDING_ID}
          onHasRecordingChange={(hasOverallRecording) =>
            onChange({ hasOverallRecording })
          }
        />
      </section>
    </>
  );
}

async function buildSubmission(
  reviewId: string,
  review: ReviewPayload,
  draft: ReviewDraft
): Promise<ReviewSubmission> {
  const [overallAudio, ...assetAudio] = await Promise.all([
    loadRecording(reviewId, OVERALL_RECORDING_ID),
    ...review.assets.map((asset) => loadRecording(reviewId, asset.id))
  ]);

  return {
    reviewer: { name: draft.name, email: draft.email },
    overall: {
      status: draft.overallStatus,
      comment: draft.overallFeedback,
      audio: overallAudio
    },
    assets: review.assets.map((asset, index) => {
      const field = draft.assets[asset.id] ?? emptyAssetField();
      return {
        assetId: asset.id,
        name: asset.name || 'Untitled asset',
        badge: getAssetBadge(review.quest, asset),
        status: field.status,
        comment: field.comment,
        audio: assetAudio[index] ?? null
      };
    })
  };
}

export function ReviewForm({
  review,
  reviewId,
  token
}: {
  review: ReviewPayload;
  reviewId: string;
  token: string;
}) {
  const [assetFields, setAssetFields] = useState<Record<string, AssetField>>(
    () =>
      Object.fromEntries(
        review.assets.map((asset) => [asset.id, emptyAssetField()])
      )
  );
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const draftRef = useRef<ReviewDraft>({
    name: '',
    email: '',
    overallStatus: 'no_status',
    overallFeedback: '',
    hasOverallRecording: false,
    assets: {}
  });
  const saveTimerRef = useRef<number | null>(null);

  const versionLabel = getVersionLabel(review.quest.metadata);
  const subtitle = [review.quest.name, versionLabel]
    .filter(Boolean)
    .join(' · ');
  const editingAsset =
    review.assets.find((asset) => asset.id === editingAssetId) ?? null;
  const assetsRef = useRef(review.assets);
  assetsRef.current = review.assets;
  const hydratedRef = useRef(false);

  const scheduleSave = () => {
    if (!hydratedRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      writeDraft(reviewId, draftRef.current);
    }, 400);
  };

  const persistReviewer = useCallback(
    (patch: Partial<ReviewerDraft>) => {
      draftRef.current = { ...draftRef.current, ...patch };
      if (!hydratedRef.current) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        writeDraft(reviewId, draftRef.current);
      }, 400);
    },
    [reviewId]
  );

  const rememberAsset = (assetId: string, patch: Partial<AssetField>) => {
    const current = draftRef.current.assets[assetId] ?? emptyAssetField();
    draftRef.current = {
      ...draftRef.current,
      assets: {
        ...draftRef.current.assets,
        [assetId]: { ...current, ...patch }
      }
    };
    scheduleSave();
  };

  useEffect(() => {
    const saved = readDraft(reviewId);
    const assets = Object.fromEntries(
      assetsRef.current.map((asset) => {
        const stored = saved?.assets[asset.id];
        return [asset.id, stored ?? emptyAssetField()];
      })
    );
    const nextDraft: ReviewDraft = {
      name: saved?.name ?? '',
      email: saved?.email ?? '',
      overallStatus: saved?.overallStatus ?? 'no_status',
      overallFeedback: saved?.overallFeedback ?? '',
      hasOverallRecording: saved?.hasOverallRecording ?? false,
      assets
    };
    draftRef.current = {
      ...draftRef.current,
      ...nextDraft,
      name: draftRef.current.name || nextDraft.name,
      email: draftRef.current.email || nextDraft.email,
      overallFeedback:
        draftRef.current.overallFeedback || nextDraft.overallFeedback,
      overallStatus:
        draftRef.current.overallStatus === 'no_status'
          ? nextDraft.overallStatus
          : draftRef.current.overallStatus
    };
    setAssetFields(assets);
    hydratedRef.current = true;

    const flush = () => {
      if (!hydratedRef.current) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      writeDraft(reviewId, draftRef.current);
    };
    window.addEventListener('pagehide', flush);

    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
      hydratedRef.current = false;
    };
  }, [reviewId]);

  const updateAsset = (assetId: string, patch: Partial<AssetField>) => {
    setAssetFields((current) => ({
      ...current,
      [assetId]: {
        ...(current[assetId] ?? emptyAssetField()),
        ...patch
      }
    }));
    rememberAsset(assetId, patch);
  };

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submission, setSubmission] = useState<ReviewSubmission | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmission(null);
    setSubmitOpen(true);

    void buildSubmission(reviewId, review, draftRef.current)
      .then(setSubmission)
      .catch(() => {
        setSubmitOpen(false);
        setSubmitError('Could not load the saved recordings.');
      });
  };

  const handleSubmitted = () => {
    // Stop the draft autosave so unmounting/pagehide doesn't write it back.
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    hydratedRef.current = false;
    void clearDraft(
      reviewId,
      review.assets.map((asset) => asset.id)
    ).catch(() => undefined);
    setSubmitOpen(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-3 rounded-lg border p-8 text-center">
        <ClipboardCheck className="mx-auto size-10 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Review submitted</h1>
        <p className="text-muted-foreground">
          Thank you! Your feedback has been sent.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Review</h1>
          {subtitle ? <p className="text-lg">{subtitle}</p> : null}
          {review.quest.description ? (
            <p className="text-muted-foreground">{review.quest.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button type="submit">Submit</Button>
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
        </div>
      </div>

      <ReviewerFields reviewId={reviewId} onChange={persistReviewer} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Assets</h2>
        <div className="space-y-4">
          {review.assets.map((asset) => {
            const badge = getAssetBadge(review.quest, asset);
            const field = assetFields[asset.id] ?? emptyAssetField();
            const paths = assetAudioPaths(asset);

            return (
              <article
                key={asset.id}
                className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent/30"
                onClick={() => setEditingAssetId(asset.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate font-medium">
                      {asset.name || 'Untitled asset'}
                    </h3>
                    {badge ? (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <Badge variant="secondary">{badge}</Badge>
                      </>
                    ) : null}
                  </div>
                  <div
                    className="flex items-center gap-2"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    {paths.length > 0 ? (
                      <PlaylistPlayer
                        paths={paths}
                        className={CARD_PLAYER_WIDTH_CLASS}
                        isolateClick
                      />
                    ) : null}
                    <span
                      className="inline-flex size-5 shrink-0 items-center justify-center"
                      aria-hidden={!assetHasContent(field)}
                    >
                      {assetHasContent(field) ? (
                        <ClipboardCheck
                          className="size-5 text-primary"
                          aria-label="Feedback saved"
                        />
                      ) : null}
                    </span>
                    <StatusSelect
                      name={`asset_status_${asset.id}`}
                      label={`Status for ${asset.name || 'asset'}`}
                      value={field.status}
                      onValueChange={(status) =>
                        updateAsset(asset.id, { status })
                      }
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {editingAsset ? (
        <AssetEditorDialog
          reviewId={reviewId}
          asset={editingAsset}
          badge={getAssetBadge(review.quest, editingAsset)}
          field={assetFields[editingAsset.id] ?? emptyAssetField()}
          open={editingAssetId === editingAsset.id}
          onOpenChange={(open) => {
            if (!open) setEditingAssetId(null);
          }}
          onRemember={rememberAsset}
          onCommit={(assetId, next) => {
            setAssetFields((current) => ({
              ...current,
              [assetId]: next
            }));
            if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
            writeDraft(reviewId, draftRef.current);
          }}
        />
      ) : null}

      <SubmitReviewDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        reviewId={reviewId}
        token={token}
        submission={submission}
        onSubmitted={handleSubmitted}
      />
    </form>
  );
}
