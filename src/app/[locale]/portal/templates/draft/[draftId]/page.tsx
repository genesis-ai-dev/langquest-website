'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Trash2,
  Settings2,
  ArrowRightLeft,
  AlertTriangle
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAuth } from '@/components/auth-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  publishTemplate,
  fetchProjectsForTemplate,
  fetchTemplateById
} from '@/lib/template/rpc';
import {
  applyAction,
  findNodeById,
  generateNodeId,
  type TemplateAction
} from '@/lib/template/actions';
import {
  loadDraft,
  saveDraft,
  deleteDraft,
  type TemplateDraft
} from '@/lib/template/draft-store';
import type { TemplateStructure, DraftMode } from '@/lib/template/types';
import {
  hasHiddenNodes,
  countHiddenNodes,
  stripHiddenNodes
} from '@/lib/template/hidden-nodes';
import { toast } from 'sonner';
import { TemplateEditorTree } from '@/components/template-editor-tree';
import { TemplateNodePanel } from '@/components/template-node-panel';

type LinkedProject = {
  linkId: string;
  projectId: string;
  projectName: string;
};

function DraftMetadataSheet({
  metadata,
  onUpdate
}: {
  metadata: { name: string; icon: string | null; shared: boolean };
  onUpdate: (m: { name: string; icon: string | null; shared: boolean }) => void;
}) {
  const [name, setName] = useState(metadata.name);
  const [icon, setIcon] = useState(metadata.icon ?? '');
  const [shared, setShared] = useState(metadata.shared);

  useEffect(() => {
    setName(metadata.name);
    setIcon(metadata.icon ?? '');
    setShared(metadata.shared);
  }, [metadata.name, metadata.icon, metadata.shared]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Draft Settings</SheetTitle>
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
            onClick={() => {
              onUpdate({
                name: name.trim() || metadata.name,
                icon: icon.trim() || null,
                shared
              });
              toast.success('Draft settings updated');
            }}
          >
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DraftEditorContent() {
  const { draftId } = useParams<{ draftId: string }>();
  useAuth();
  const router = useRouter();
  const supabase = createBrowserClient();

  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [structure, setStructure] = useState<TemplateStructure | null>(null);
  const [initialStructure, setInitialStructure] =
    useState<TemplateStructure | null>(null);
  const [actions, setActions] = useState<TemplateAction[]>([]);
  const [actionIndex, setActionIndex] = useState(-1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mode, setMode] = useState<DraftMode>('starting_point');
  const [targetLinkIds, setTargetLinkIds] = useState<string[]>([]);
  const [metadata, setMetadata] = useState({
    name: '',
    icon: null as string | null,
    shared: false
  });
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [switchModeDialogOpen, setSwitchModeDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [sourceTemplateName, setSourceTemplateName] = useState<string | null>(
    null
  );
  const [linkedProjects, setLinkedProjects] = useState<LinkedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // Load draft from IndexedDB
  useEffect(() => {
    if (!draftId) return;

    (async () => {
      try {
        const loaded = await loadDraft(draftId);
        if (!loaded) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setDraft(loaded);
        setStructure(loaded.structure);
        setInitialStructure(loaded.structure);
        setActions(loaded.actionLog);
        setActionIndex(loaded.actionIndex);
        setMode(loaded.mode);
        setTargetLinkIds(loaded.targetLinkIds);
        setMetadata(loaded.metadata);

        // Rebuild current structure from initial + replayed actions
        if (loaded.actionLog.length > 0 && loaded.actionIndex >= 0) {
          const replayed = loaded.actionLog
            .slice(0, loaded.actionIndex + 1)
            .reduce(
              (s, a) => applyAction(s, a),
              loaded.structure
            );
          setStructure(replayed);
          // initialStructure stays as the base before any actions
          setInitialStructure(loaded.structure);
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [draftId]);

  // Fetch source template name
  useEffect(() => {
    if (!draft?.sourceTemplateId) return;

    (async () => {
      try {
        const bp = await fetchTemplateById(supabase, draft.sourceTemplateId!);
        if (bp) setSourceTemplateName(bp.name);
      } catch {
        // Non-critical
      }
    })();
  }, [draft?.sourceTemplateId, supabase]);

  // Fetch linked projects for update mode
  useEffect(() => {
    if (mode !== 'update' || !draft?.sourceTemplateId) return;

    setLoadingProjects(true);
    (async () => {
      try {
        const projects = await fetchProjectsForTemplate(
          supabase,
          draft.sourceTemplateId!
        );
        setLinkedProjects(projects);
      } catch {
        toast.error('Failed to load linked projects');
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, [mode, draft?.sourceTemplateId, supabase]);

  // Auto-save draft (debounced 1s)
  useEffect(() => {
    if (!draftId || !structure || !draft) return;

    const timer = setTimeout(() => {
      saveDraft({
        draftId,
        sourceTemplateId: draft.sourceTemplateId,
        mode,
        structure: initialStructure!,
        actionLog: actions,
        actionIndex,
        metadata,
        targetLinkIds,
        savedAt: Date.now()
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    structure,
    actions,
    actionIndex,
    metadata,
    targetLinkIds,
    draftId,
    draft,
    mode,
    initialStructure
  ]);

  const dispatchBatchActions = useCallback(
    (batch: TemplateAction[]) => {
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
    if (actionIndex < 0 || !initialStructure) return;
    const gid = actions[actionIndex].groupId;
    let target = actionIndex;
    if (gid) {
      while (target > 0 && actions[target - 1].groupId === gid) {
        target--;
      }
    }
    const prevActions = actions.slice(0, target);
    let rebuilt = initialStructure;
    for (const a of prevActions) {
      rebuilt = applyAction(rebuilt, a);
    }
    setStructure(rebuilt);
    setActionIndex(target - 1);
  }, [actionIndex, actions, initialStructure]);

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

  const handleSwitchToStartingPoint = useCallback(() => {
    if (!structure) return;
    const stripped = stripHiddenNodes(structure.root);
    const newStructure: TemplateStructure = {
      ...structure,
      root: stripped
    };
    setStructure(newStructure);
    setInitialStructure(newStructure);
    setActions([]);
    setActionIndex(-1);
    setMode('starting_point');
    setTargetLinkIds([]);
    setSwitchModeDialogOpen(false);
    toast.success('Switched to starting-point mode');
  }, [structure]);

  async function handlePublish() {
    if (!structure || !draft) return;

    if (mode === 'starting_point' && hasHiddenNodes(structure.root)) {
      toast.error(
        'Cannot publish: structure contains hidden nodes in starting-point mode. This is a bug — please report it.'
      );
      return;
    }

    setPublishing(true);
    try {
      const result = await publishTemplate(supabase, {
        sourceTemplateId: draft.sourceTemplateId,
        structure,
        name: metadata.name,
        icon: metadata.icon ?? undefined,
        shared: metadata.shared,
        targetLinkIds: mode === 'update' ? targetLinkIds : undefined,
        actions: actions.slice(0, actionIndex + 1)
      });

      if (result.ok) {
        await deleteDraft(draftId);
        toast.success('Published successfully');
        router.push(`/portal/templates/${result.template_id}`);
      } else {
        toast.error(result.reason);
      }
    } catch (err) {
      console.error('Publish failed:', err);
      toast.error('Failed to publish');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscard() {
    try {
      await deleteDraft(draftId);
      toast.info('Draft discarded');
      router.push('/portal/templates');
    } catch {
      toast.error('Failed to discard draft');
    }
  }

  const toggleProjectLink = useCallback(
    (linkId: string) => {
      setTargetLinkIds((prev) =>
        prev.includes(linkId)
          ? prev.filter((id) => id !== linkId)
          : [...prev, linkId]
      );
    },
    []
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (notFound || !draft) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          Draft not found. It may have been published or discarded.
        </p>
        <Button
          variant="link"
          className="mt-4"
          onClick={() => router.push('/portal/templates')}
        >
          Back to templates
        </Button>
      </div>
    );
  }

  const selectedNode =
    selectedNodeId && structure
      ? findNodeById(structure.root, selectedNodeId)
      : null;

  const modeLabel =
    mode === 'starting_point' ? 'starting point' : 'updating projects';

  const affectedProjectCount =
    mode === 'update'
      ? linkedProjects.filter((p) => targetLinkIds.includes(p.linkId)).length
      : 0;

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
            <h1 className="text-xl font-bold">{metadata.name}</h1>
            <p className="text-sm text-muted-foreground">
              {draft.sourceTemplateId
                ? `Based on: ${sourceTemplateName ?? 'Loading...'}`
                : 'New template'}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
          >
            Draft — {modeLabel}
          </Badge>
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
          <DraftMetadataSheet metadata={metadata} onUpdate={setMetadata} />
          <Button onClick={() => setPublishDialogOpen(true)}>
            <Save className="mr-2 h-4 w-4" />
            Publish
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDiscardDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mode switch banner (update mode only) */}
      {mode === 'update' && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Update mode
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Hidden nodes will be preserved. Publishing will update selected
              linked projects.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSwitchModeDialogOpen(true)}
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Switch to starting-point mode
          </Button>
        </div>
      )}

      {/* Project link panel (update mode only) */}
      {mode === 'update' && draft.sourceTemplateId && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">
            Projects to update on publish
          </h3>
          {loadingProjects ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Loading linked projects...
            </div>
          ) : linkedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects are linked to this template.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedProjects.map((project) => (
                <label
                  key={project.linkId}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={targetLinkIds.includes(project.linkId)}
                    onCheckedChange={() => toggleProjectLink(project.linkId)}
                  />
                  <span className="text-sm">{project.projectName}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tree Editor + Property Panel */}
      {structure && (
        <div className="flex gap-4">
          <div className="min-w-0 flex-1 rounded-lg border p-4">
            <TemplateEditorTree
              root={structure.root}
              canEdit
              mode={mode}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onBatchActions={dispatchBatchActions}
            />
          </div>
          {selectedNode && (
            <div className="w-80 shrink-0 rounded-lg border">
              <TemplateNodePanel
                key={selectedNode.id}
                node={selectedNode}
                canEdit
                onBatchActions={dispatchBatchActions}
                onClose={() => setSelectedNodeId(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Publish dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish template</DialogTitle>
            <DialogDescription>
              {mode === 'starting_point'
                ? 'This will create a new published template available for use in projects.'
                : `This will create a new version and update ${affectedProjectCount} project${affectedProjectCount === 1 ? '' : 's'}.`}
            </DialogDescription>
          </DialogHeader>
          {mode === 'update' && affectedProjectCount > 0 && (
            <div className="space-y-1 text-sm">
              <p className="font-medium">Affected projects:</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {linkedProjects
                  .filter((p) => targetLinkIds.includes(p.linkId))
                  .map((p) => (
                    <li key={p.linkId}>{p.projectName}</li>
                  ))}
              </ul>
            </div>
          )}
          {mode === 'starting_point' &&
            structure &&
            hasHiddenNodes(structure.root) && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  This structure contains {countHiddenNodes(structure.root)}{' '}
                  hidden node(s). Starting-point templates cannot have hidden
                  nodes. This is likely a bug.
                </p>
              </div>
            )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={
                publishing ||
                (mode === 'starting_point' &&
                  !!structure &&
                  hasHiddenNodes(structure.root))
              }
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Switch mode dialog */}
      <Dialog
        open={switchModeDialogOpen}
        onOpenChange={setSwitchModeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to starting-point mode?</DialogTitle>
            <DialogDescription>
              Switching to starting-point mode will permanently remove all hidden
              nodes and disconnect this draft from your projects. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {structure && hasHiddenNodes(structure.root) && (
            <p className="text-sm text-muted-foreground">
              {countHiddenNodes(structure.root)} hidden node(s) will be removed.
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSwitchModeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSwitchToStartingPoint}>
              Switch mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard draft?</DialogTitle>
            <DialogDescription>
              This will permanently delete this draft. Any unsaved changes will
              be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDiscardDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DraftEditorPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        }
      >
        <DraftEditorContent />
      </Suspense>
    </div>
  );
}
