'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  ArrowLeftRight,
  Circle,
  ChevronRight,
  FileAudio,
  Folder,
  Layers,
  Plus,
  X
} from 'lucide-react';
import type { BlueprintNode } from '@/lib/blueprint/types';
import {
  collectNonDeletedDescendantNodeIds,
  createRemoveNodeAction,
  createUpdatePropsAction,
  type BlueprintAction
} from '@/lib/blueprint/actions';
import { useConfirm } from '@/components/ui/confirm';
import { cn } from '@/lib/utils';

const NODE_TYPE_PRESETS = [
  'root',
  'book',
  'chapter',
  'verse',
  'section',
  'passage',
  'story',
  'unit',
  'lesson',
  'category'
] as const;

const CUSTOM_NODE_TYPES_STORAGE_KEY = 'blueprint-editor-custom-node-types';

function loadCustomNodeTypes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_NODE_TYPES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is string => typeof x === 'string' && x.trim().length > 0
    );
  } catch {
    return [];
  }
}

function saveCustomNodeTypes(types: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    CUSTOM_NODE_TYPES_STORAGE_KEY,
    JSON.stringify(types)
  );
}

/** Normalize stored linkable_type for UI (handles null / odd JSON). */
function effectiveLinkableType(
  node: BlueprintNode
): 'quest' | 'asset' | 'both' | undefined {
  const t = node.linkable_type;
  if (t === 'quest' || t === 'asset' || t === 'both') return t;
  return undefined;
}

interface BlueprintNodePanelProps {
  node: BlueprintNode;
  canEdit: boolean;
  onBatchActions: (actions: BlueprintAction[]) => void;
  onClose: () => void;
}

export function BlueprintNodePanel({
  node,
  canEdit,
  onBatchActions,
  onClose
}: BlueprintNodePanelProps) {
  const dialogs = useConfirm();
  const [customNodeTypes, setCustomNodeTypes] = useState<string[]>([]);

  useEffect(() => {
    setCustomNodeTypes(loadCustomNodeTypes());
  }, []);

  const allNodeTypes = useMemo(() => {
    const merged = new Set<string>([...NODE_TYPE_PRESETS, ...customNodeTypes]);
    if (node.node_type) merged.add(node.node_type);
    return Array.from(merged).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
  }, [customNodeTypes, node.node_type]);

  const structureKindValue = node.node_type?.trim()
    ? node.node_type.trim()
    : '__none__';

  const update = useCallback(
    (props: Partial<BlueprintNode>) => {
      onBatchActions([createUpdatePropsAction(node.id, props)]);
    },
    [node.id, onBatchActions]
  );

  const descendantIds = useMemo(
    () => collectNonDeletedDescendantNodeIds(node),
    [node]
  );

  const applyContentTypeChange = useCallback(
    async (next: 'quest' | 'asset') => {
      const current = effectiveLinkableType(node);
      if (current === next) return;

      const propsForQuest = {
        linkable_type: 'quest' as const,
        allows_spanning: undefined
      };
      const propsForAsset = {
        linkable_type: 'asset' as const,
        is_download_unit: undefined,
        is_version_anchor: undefined
      };

      // Sections (quest) can keep nested rows — never strip the subtree when
      // switching *to* sections.
      if (next === 'quest') {
        onBatchActions([createUpdatePropsAction(node.id, propsForQuest)]);
        return;
      }

      // Recordings (asset) are single-row leaves in this editor: nested rows
      // cannot stay. Soft-delete descendants, then set type (only when needed).
      if (descendantIds.length > 0) {
        const n = descendantIds.length;
        const ok = await dialogs.confirm({
          title: 'Switch to Recordings?',
          description: `Recordings are single rows — they can’t keep nested items. This row has ${n} nested item${n === 1 ? '' : 's'} that will be dropped from the tree. They’re soft-deleted so existing links stay valid. Use Undo if you change your mind.`,
          confirmLabel: 'Switch to Recordings',
          variant: 'destructive'
        });
        if (!ok) return;

        const removals = descendantIds.map((id) => createRemoveNodeAction(id));
        onBatchActions([
          ...removals,
          createUpdatePropsAction(node.id, propsForAsset)
        ]);
        return;
      }

      onBatchActions([createUpdatePropsAction(node.id, propsForAsset)]);
    },
    [node, descendantIds, onBatchActions, dialogs]
  );

  const setSections = useCallback(() => {
    applyContentTypeChange('quest');
  }, [applyContentTypeChange]);

  const setRecordings = useCallback(() => {
    applyContentTypeChange('asset');
  }, [applyContentTypeChange]);

  const addCustomNodeType = useCallback(async () => {
    const trimmed = await dialogs.prompt({
      title: 'Add custom node type',
      description: 'Enter a name for this kind (for example "episode" or "lesson part").',
      placeholder: 'Type name',
      confirmLabel: 'Add'
    });
    if (!trimmed) return;
    setCustomNodeTypes((prev) => {
      const next = Array.from(new Set([...prev, trimmed]));
      saveCustomNodeTypes(next);
      return next;
    });
    onBatchActions([createUpdatePropsAction(node.id, { node_type: trimmed })]);
  }, [node.id, onBatchActions, dialogs]);

  const primaryListLabel = node.short_label?.trim() || node.name;
  const hasChildren =
    (node.children?.filter((c) => !c.deleted).length ?? 0) > 0;

  const link = effectiveLinkableType(node);
  const legacyBoth = link === 'both';
  const isSections = link === 'quest';
  const isRecordings = link === 'asset';
  const contentUnset = !isSections && !isRecordings;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{node.name}</h3>
          <p className="text-xs text-muted-foreground">
            Click another row in the tree to edit it
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-5 p-4">
        <Field
          label="Display name"
          hint="The full name people see in lists and headers."
        >
          <Input
            value={node.name}
            disabled={!canEdit}
            onChange={(e) => update({ name: e.target.value })}
          />
        </Field>

        <Field
          label="Short label"
          hint="Optional shorter text for tight spaces in the app."
        >
          <Input
            value={node.short_label ?? ''}
            placeholder="e.g. Gen, 1, 1:1"
            disabled={!canEdit}
            onChange={(e) =>
              update({ short_label: e.target.value.trim() || undefined })
            }
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-2 cursor-default rounded-md border bg-muted/30 p-2">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Preview in app
                </p>
                <div className="flex flex-row items-center justify-between rounded-lg bg-background px-3 py-2.5 shadow-sm">
                  <div className="flex flex-1 flex-row items-center gap-2.5">
                    <Circle className="h-2 w-2 shrink-0 fill-primary text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">
                        {primaryListLabel}
                      </p>
                      {node.node_type ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {node.node_type}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {hasChildren ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : null}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="left">
              <p>
                This is how the title line appears in the mobile app navigation
                list (main line uses your short label, or the display name if you
                leave short label blank).
              </p>
            </TooltipContent>
          </Tooltip>
        </Field>

        <Field
          label="Label pattern (advanced)"
          hint="Optional pattern with placeholders like {book} — only used when the app supplies extra values."
        >
          <Input
            value={node.label_template ?? ''}
            placeholder="Usually leave blank"
            disabled={!canEdit}
            onChange={(e) =>
              update({ label_template: e.target.value || undefined })
            }
          />
        </Field>

        <Field
          label="Structure kind"
          hint="What you call this level of the outline (optional). Use + to add your own kinds for this browser only."
        >
          <div className="flex gap-2">
            <Select
              key={`${node.id}-kind-${structureKindValue}`}
              value={structureKindValue}
              disabled={!canEdit}
              onValueChange={(v) =>
                update({ node_type: v === '__none__' ? undefined : v })
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose a kind…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {allNodeTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={!canEdit}
              title="Add a new kind for this browser"
              onClick={addCustomNodeType}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Field>

        <div className="space-y-2">
          <Label className="text-xs">Content type</Label>
          <p className="text-[11px] leading-tight text-muted-foreground">
            What kind of content lives at this level? Pick one — sections and
            recordings are not mixed on the same row.
          </p>
          {legacyBoth ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              This node used an older &quot;both&quot; setting. Choose Sections or
              Recordings below.
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={!canEdit}
              onClick={setSections}
              aria-pressed={isSections}
              className={cn(
                'flex flex-col gap-1 rounded-lg border-2 p-3 text-left transition-colors',
                isSections
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-muted bg-background hover:bg-muted/40',
                !canEdit && 'cursor-not-allowed opacity-60'
              )}
            >
              <div className="flex items-center gap-2">
                <Folder
                  className={cn(
                    'h-4 w-4',
                    isSections ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="text-sm font-medium">Sections</span>
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Groups or units of work — like books, chapters, or stories. People
                open a section to work inside it.
              </p>
            </button>
            <button
              type="button"
              disabled={!canEdit}
              onClick={setRecordings}
              aria-pressed={isRecordings}
              className={cn(
                'flex flex-col gap-1 rounded-lg border-2 p-3 text-left transition-colors',
                isRecordings
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-muted bg-background hover:bg-muted/40',
                !canEdit && 'cursor-not-allowed opacity-60'
              )}
            >
              <div className="flex items-center gap-2">
                <FileAudio
                  className={cn(
                    'h-4 w-4',
                    isRecordings ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="text-sm font-medium">Recordings</span>
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Individual clips or takes — like verses or lines. People record
                here.
              </p>
            </button>
          </div>
          {contentUnset && !legacyBoth ? (
            <p className="text-[11px] text-muted-foreground">
              Choose Sections or Recordings to unlock more options.
            </p>
          ) : null}
        </div>

        {isSections ? (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Section options
            </p>
            <ToggleRow
              icon={<Layers className="h-4 w-4" aria-hidden />}
              label="Allow versions"
              hint="More than one contribution can exist for the same spot (different versions of the work)."
              checked={!!node.is_version_anchor}
              disabled={!canEdit}
              onChange={(v) => update({ is_version_anchor: v || undefined })}
            />
          </div>
        ) : null}

        {isRecordings ? (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Recording options
            </p>
            <ToggleRow
              icon={<ArrowLeftRight className="h-4 w-4" aria-hidden />}
              label="Allow range recordings"
              hint="One recording can cover several items in a row (for example verses 1 through 3)."
              checked={!!node.allows_spanning}
              disabled={!canEdit}
              onChange={(v) => update({ allows_spanning: v || undefined })}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && (
        <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  disabled,
  onChange
}: {
  icon?: ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="mt-0.5 shrink-0"
      />
      {icon ? (
        <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      ) : null}
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
