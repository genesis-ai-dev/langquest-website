'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Lock,
  Pencil,
  Settings2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/spinner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/auth-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  acquireBlueprintLock,
  fetchBlueprintById,
  forkBlueprint,
  heartbeatBlueprintLock,
  publishBlueprint,
  releaseBlueprintLock,
  saveBlueprintMetadata
} from '@/lib/blueprint/rpc';
import {
  applyAction,
  findNodeById,
  generateNodeId,
  type BlueprintAction
} from '@/lib/blueprint/actions';
import { deleteDraft, loadDraft, saveDraft } from '@/lib/blueprint/draft-store';
import type { BlueprintStructure } from '@/lib/blueprint/types';
import { toast } from 'sonner';
import { BlueprintEditorTree } from '@/components/blueprint-editor-tree';
import { BlueprintNodePanel } from '@/components/blueprint-node-panel';

function EditorContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();

  const [structure, setStructure] = useState<BlueprintStructure | null>(null);
  const [actions, setActions] = useState<BlueprintAction[]>([]);
  const [actionIndex, setActionIndex] = useState(-1);
  const [baseVersion, setBaseVersion] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: blueprint, isLoading } = useQuery({
    queryKey: ['blueprint', id],
    queryFn: () => fetchBlueprintById(supabase, id),
    enabled: !!id
  });

  // Load draft or use server structure
  useEffect(() => {
    if (!blueprint) return;

    (async () => {
      const draft = await loadDraft(blueprint.id);
      if (draft && draft.baseVersion === blueprint.structure_version) {
        setStructure(draft.structure);
        setActions(draft.actionLog);
        setActionIndex(draft.actionIndex);
        toast.info('Restored draft from browser');
      } else {
        setStructure(blueprint.structure);
      }
      setBaseVersion(blueprint.structure_version);
    })();
  }, [blueprint]);

  // Heartbeat
  useEffect(() => {
    if (!isLocked || !id) return;
    heartbeatRef.current = setInterval(async () => {
      try {
        await heartbeatBlueprintLock(supabase, id);
      } catch {
        toast.error('Failed to heartbeat lock');
      }
    }, 60_000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isLocked, id, supabase]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (isLocked && id) {
        releaseBlueprintLock(supabase, id).catch(() => {});
      }
    };
  }, [isLocked, id, supabase]);

  // Auto-save draft
  useEffect(() => {
    if (!structure || !id) return;
    const timer = setTimeout(() => {
      saveDraft({
        blueprintId: id,
        baseVersion,
        structure,
        actionLog: actions,
        actionIndex,
        savedAt: Date.now()
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [structure, actions, actionIndex, id, baseVersion]);

  const dispatchAction = useCallback(
    (action: BlueprintAction) => {
      if (!structure) return;
      const newStructure = applyAction(structure, action);
      setStructure(newStructure);
      const newActions = [...actions.slice(0, actionIndex + 1), action];
      setActions(newActions);
      setActionIndex(newActions.length - 1);
    },
    [structure, actions, actionIndex]
  );

  const dispatchBatchActions = useCallback(
    (batch: BlueprintAction[]) => {
      if (!structure || batch.length === 0) return;
      const stamped =
        batch.length > 1
          ? (() => {
              const gid = generateNodeId();
              return batch.map((a) => ({ ...a, groupId: gid }));
            })()
          : batch;
      const newStructure = stamped.reduce(
        (s, a) => applyAction(s, a),
        structure
      );
      setStructure(newStructure);
      const newActions = [...actions.slice(0, actionIndex + 1), ...stamped];
      setActions(newActions);
      setActionIndex(newActions.length - 1);
    },
    [structure, actions, actionIndex]
  );

  const undo = useCallback(() => {
    if (actionIndex < 0 || !blueprint) return;
    const gid = actions[actionIndex].groupId;
    let target = actionIndex;
    if (gid) {
      while (target > 0 && actions[target - 1].groupId === gid) {
        target--;
      }
    }
    const prevActions = actions.slice(0, target);
    let rebuilt = blueprint.structure;
    for (const a of prevActions) {
      rebuilt = applyAction(rebuilt, a);
    }
    setStructure(rebuilt);
    setActionIndex(target - 1);
  }, [actionIndex, actions, blueprint]);

  const redo = useCallback(() => {
    if (actionIndex >= actions.length - 1 || !structure) return;
    const gid = actions[actionIndex + 1].groupId;
    let target = actionIndex + 1;
    if (gid) {
      while (
        target < actions.length - 1 &&
        actions[target + 1].groupId === gid
      ) {
        target++;
      }
    }
    let newStructure = structure;
    for (let i = actionIndex + 1; i <= target; i++) {
      newStructure = applyAction(newStructure, actions[i]);
    }
    setStructure(newStructure);
    setActionIndex(target);
  }, [actionIndex, actions, structure]);

  async function handleLock() {
    if (!id) return;
    const result = await acquireBlueprintLock(supabase, id);
    if (result.ok) {
      setIsLocked(true);
      toast.success('Blueprint locked for editing');
    } else {
      toast.error(result.reason);
    }
  }

  async function handleUnlock() {
    if (!id) return;
    await releaseBlueprintLock(supabase, id);
    setIsLocked(false);
    toast.info('Lock released');
  }

  async function handlePublish() {
    if (!id || !structure) return;
    const result = await publishBlueprint(
      supabase,
      id,
      baseVersion,
      structure,
      []
    );
    if (result.ok) {
      setBaseVersion(result.new_version);
      setActions([]);
      setActionIndex(-1);
      await deleteDraft(id);
      queryClient.invalidateQueries({ queryKey: ['blueprint', id] });
      toast.success(
        result.forked
          ? `Published as fork (v${result.new_version})`
          : `Published v${result.new_version}`
      );
    } else {
      toast.error(result.reason);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Blueprint not found.
      </div>
    );
  }

  const isFrozen = blueprint.locked_for_backward_compat;
  const canEdit = isLocked && !isFrozen;
  const hasChanges = actionIndex >= 0;
  const selectedNode =
    selectedNodeId && structure
      ? findNodeById(structure.root, selectedNodeId)
      : null;

  async function handleFork() {
    if (!id) return;
    try {
      const result = await forkBlueprint(supabase, id);
      if (result.ok) {
        toast.success('Blueprint forked — redirecting to editable copy');
        router.push(`/portal/templates/${result.blueprint_id}`);
      } else {
        toast.error(result.reason);
      }
    } catch {
      toast.error('Failed to fork blueprint');
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/portal/templates')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{blueprint.name}</h1>
            <p className="text-sm text-muted-foreground">
              v{baseVersion} &middot; {blueprint.project_count} projects
            </p>
          </div>
          {isFrozen && (
            <Badge variant="outline">
              <Lock className="mr-1 h-3 w-3" />
              Legacy
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={actionIndex < 0}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={actionIndex >= actions.length - 1}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          {!isLocked && !isFrozen && (
            <Button onClick={handleLock}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {isLocked && (
            <>
              <Button variant="ghost" size="sm" onClick={handleUnlock}>
                <X className="mr-1 h-3.5 w-3.5" />
                Stop editing
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!hasChanges}
              >
                <Save className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </>
          )}
          <MetadataSheet
            blueprint={blueprint}
            supabase={supabase}
            onSave={() =>
              queryClient.invalidateQueries({ queryKey: ['blueprint', id] })
            }
          />
        </div>
      </div>

      {/* Frozen blueprint notice */}
      {isFrozen && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              This blueprint is linked to legacy projects
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              It cannot be edited directly. Fork it to create an editable copy
              that you can assign to projects.
            </p>
          </div>
          <Button variant="outline" onClick={handleFork}>
            Fork this blueprint
          </Button>
        </div>
      )}

      {/* Tree Editor + Property Panel */}
      {structure && (
        <div className="flex gap-4">
          <div className="min-w-0 flex-1 rounded-lg border p-4">
            <BlueprintEditorTree
              root={structure.root}
              canEdit={canEdit}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onBatchActions={dispatchBatchActions}
            />
          </div>
          {selectedNode && (
            <div className="w-80 shrink-0 rounded-lg border">
              <BlueprintNodePanel
                key={selectedNode.id}
                node={selectedNode}
                canEdit={canEdit}
                onBatchActions={dispatchBatchActions}
                onClose={() => setSelectedNodeId(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetadataSheet({
  blueprint,
  supabase,
  onSave
}: {
  blueprint: { id: string; name: string; icon: string | null; shared: boolean };
  supabase: ReturnType<typeof createBrowserClient>;
  onSave: () => void;
}) {
  const [name, setName] = useState(blueprint.name);
  const [icon, setIcon] = useState(blueprint.icon ?? '');
  const [shared, setShared] = useState(blueprint.shared);
  const [saving, setSaving] = useState(false);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Blueprint Settings</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Icon (lucide name)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={shared} onCheckedChange={setShared} />
            <Label>Shared publicly</Label>
          </div>
          <Button
            className="w-full"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await saveBlueprintMetadata(supabase, blueprint.id, {
                  name,
                  icon: icon || undefined,
                  shared
                });
                onSave();
                toast.success('Settings saved');
              } catch {
                toast.error('Failed to save settings');
              } finally {
                setSaving(false);
              }
            }}
          >
            Save Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function BlueprintEditorPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        }
      >
        <EditorContent />
      </Suspense>
    </div>
  );
}
