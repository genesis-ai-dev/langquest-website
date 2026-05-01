'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Save,
  Undo2,
  Redo2,
  Trash2,
  Settings2,
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
  fetchTemplateById,
  checkTemplateCompatibility
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
import type { TemplateStructure, TemplateNode, PublishIntent } from '@/lib/template/types';
import {
  hasHiddenNodes,
  countHiddenNodes,
  stripHiddenNodes
} from '@/lib/template/hidden-nodes';
import { computeTreeDiff, collectNodeIds } from '@/lib/template/tree-diff';
import { toast } from 'sonner';
import { TemplateEditorTree } from '@/components/template-editor-tree';
import { TemplateNodePanel } from '@/components/template-node-panel';
import { TemplateImportDialog } from '@/components/template-import-dialog';

type LinkedProject = {
  linkId: string;
  projectId: string;
  projectName: string;
  frozen: boolean;
};

// ---------------------------------------------------------------------------
// Metadata sheet
// ---------------------------------------------------------------------------

function DraftMetadataSheet({
  metadata,
  onUpdate
}: {
  metadata: { name: string; description: string | null; icon: string | null; shared: boolean };
  onUpdate: (m: { name: string; description: string | null; icon: string | null; shared: boolean }) => void;
}) {
  const [name, setName] = useState(metadata.name);
  const [description, setDescription] = useState(metadata.description ?? '');
  const [icon, setIcon] = useState(metadata.icon ?? '');
  const [shared, setShared] = useState(metadata.shared);

  useEffect(() => {
    setName(metadata.name);
    setDescription(metadata.description ?? '');
    setIcon(metadata.icon ?? '');
    setShared(metadata.shared);
  }, [metadata.name, metadata.description, metadata.icon, metadata.shared]);

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
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template"
            />
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
                description: description.trim() || null,
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

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

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
  const [metadata, setMetadata] = useState({
    name: '',
    description: '' as string | null,
    icon: null as string | null,
    shared: false
  });

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [sourceTemplateName, setSourceTemplateName] = useState<string | null>(null);

  // Publish dialog state — all project logic lives here, not in the editor
  const [publishTarget, setPublishTarget] = useState<
    'starting_point' | 'update' | 'both'
  >('starting_point');
  const [linkedProjects, setLinkedProjects] = useState<LinkedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);

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
        setMetadata(loaded.metadata);

        if (loaded.actionLog.length > 0 && loaded.actionIndex >= 0) {
          const replayed = loaded.actionLog
            .slice(0, loaded.actionIndex + 1)
            .reduce(
              (s, a) => applyAction(s, a),
              loaded.structure
            );
          setStructure(replayed);
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

  // Auto-save draft (debounced 1s)
  useEffect(() => {
    if (!draftId || !structure || !draft) return;

    const timer = setTimeout(() => {
      saveDraft({
        draftId,
        sourceTemplateId: draft.sourceTemplateId,
        publishIntent: draft.publishIntent,
        structure: initialStructure!,
        actionLog: actions,
        actionIndex,
        metadata,
        savedAt: Date.now()
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    structure,
    actions,
    actionIndex,
    metadata,
    draftId,
    draft,
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

  const handleImportNodes = useCallback(
    (nodes: TemplateNode[]) => {
      if (!structure || nodes.length === 0) return;
      const batch: TemplateAction[] = nodes.map((node, i) => ({
        type: 'add_node' as const,
        payload: {
          parentId: structure.root.id,
          node,
          insertIndex: (structure.root.children?.length ?? 0) + i
        },
        timestamp: Date.now()
      }));
      dispatchBatchActions(batch);
      toast.success(`Imported ${nodes.length} section${nodes.length > 1 ? 's' : ''}`);
    },
    [structure, dispatchBatchActions]
  );

  // Open publish dialog — fetch linked projects at this point
  const openPublishDialog = useCallback(async () => {
    if (!draft) return;

    // Set default from publishIntent
    setPublishTarget(draft.publishIntent);
    setSelectedLinkIds([]);

    if (draft.sourceTemplateId) {
      setLoadingProjects(true);
      try {
        const projects = await fetchProjectsForTemplate(
          supabase,
          draft.sourceTemplateId
        );
        setLinkedProjects(projects);
        // Pre-select non-frozen links
        setSelectedLinkIds(
          projects.filter((p) => !p.frozen).map((p) => p.linkId)
        );
      } catch {
        toast.error('Failed to load linked projects');
        setLinkedProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    } else {
      setLinkedProjects([]);
    }

    setPublishDialogOpen(true);
  }, [draft, supabase]);

  async function handlePublish() {
    if (!structure || !draft || !initialStructure) return;

    if (!metadata.name.trim()) {
      toast.error('A template name is required before publishing. Set it in Draft Settings.');
      return;
    }

    setPublishing(true);
    try {
      const nonFrozenLinkIds = selectedLinkIds;
      const wantsUpdate =
        publishTarget === 'update' || publishTarget === 'both';
      const wantsClean =
        publishTarget === 'starting_point' || publishTarget === 'both';

      // Compatibility check when updating existing projects
      if (wantsUpdate && draft.sourceTemplateId && nonFrozenLinkIds.length > 0) {
        const nodeIds = [...collectNodeIds(structure.root)];
        const compat = await checkTemplateCompatibility(
          supabase,
          draft.sourceTemplateId,
          nonFrozenLinkIds,
          nodeIds
        );
        if (!compat.compatible) {
          toast.error(
            `Cannot update: ${compat.missing_node_ids.length} node(s) referenced by existing contributions would be orphaned. Restore them and try again.`
          );
          setPublishing(false);
          return;
        }
      }

      const diff = computeTreeDiff(initialStructure, structure);

      if (publishTarget === 'both' && draft.sourceTemplateId) {
        // Fork 1: with tombstones, re-pointing existing projects
        const updateResult = await publishTemplate(supabase, {
          sourceTemplateId: draft.sourceTemplateId,
          structure,
          name: metadata.name,
          description: metadata.description,
          icon: metadata.icon ?? undefined,
          shared: metadata.shared,
          targetLinkIds: nonFrozenLinkIds,
          actions: diff
        });

        if (!updateResult.ok) {
          toast.error(updateResult.reason);
          setPublishing(false);
          return;
        }

        // Fork 2: clean, for general availability
        const cleanStructure: TemplateStructure = {
          ...structure,
          root: stripHiddenNodes(structure.root)
        };
        const cleanDiff = computeTreeDiff(initialStructure, cleanStructure);

        const cleanResult = await publishTemplate(supabase, {
          sourceTemplateId: draft.sourceTemplateId,
          structure: cleanStructure,
          name: metadata.name,
          description: metadata.description,
          icon: metadata.icon ?? undefined,
          shared: metadata.shared,
          actions: cleanDiff
        });

        if (cleanResult.ok) {
          await deleteDraft(draftId);
          toast.success('Published both versions successfully');
          router.push(`/portal/templates/${updateResult.template_id}`);
        } else {
          toast.error(`Update published, but clean version failed: ${cleanResult.reason}`);
        }
      } else if (wantsUpdate && draft.sourceTemplateId) {
        const result = await publishTemplate(supabase, {
          sourceTemplateId: draft.sourceTemplateId,
          structure,
          name: metadata.name,
          description: metadata.description,
          icon: metadata.icon ?? undefined,
          shared: metadata.shared,
          targetLinkIds: nonFrozenLinkIds,
          actions: diff
        });

        if (result.ok) {
          await deleteDraft(draftId);
          toast.success('Published successfully');
          router.push(`/portal/templates/${result.template_id}`);
        } else {
          toast.error(result.reason);
        }
      } else {
        // Starting point — publish clean
        const finalStructure = hasHiddenNodes(structure.root)
          ? { ...structure, root: stripHiddenNodes(structure.root) }
          : structure;
        const finalDiff = hasHiddenNodes(structure.root)
          ? computeTreeDiff(initialStructure, finalStructure)
          : diff;

        const result = await publishTemplate(supabase, {
          sourceTemplateId: draft.sourceTemplateId,
          structure: finalStructure,
          name: metadata.name,
          description: metadata.description,
          icon: metadata.icon ?? undefined,
          shared: metadata.shared,
          actions: finalDiff
        });

        if (result.ok) {
          await deleteDraft(draftId);
          toast.success('Published successfully');
          router.push(`/portal/templates/${result.template_id}`);
        } else {
          toast.error(result.reason);
        }
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
      setSelectedLinkIds((prev) =>
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

  const hiddenCount = structure ? countHiddenNodes(structure.root) : 0;
  const hasSource = !!draft.sourceTemplateId;

  const affectedProjectCount =
    linkedProjects.filter((p) => selectedLinkIds.includes(p.linkId)).length;

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
              {hasSource
                ? `Based on: ${sourceTemplateName ?? 'Loading...'}`
                : 'New template'}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
          >
            Draft
          </Badge>
          {hiddenCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {hiddenCount} deleted item{hiddenCount !== 1 ? 's' : ''}
            </span>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setImportDialogOpen(true)}
            title="Import sections from another template"
          >
            <Download className="h-4 w-4" />
          </Button>
          <DraftMetadataSheet metadata={metadata} onUpdate={setMetadata} />
          <Button onClick={() => void openPublishDialog()}>
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

      {/* Tree Editor + Property Panel */}
      {structure && (
        <div className="flex gap-4">
          <div className="min-w-0 flex-1 rounded-lg border p-4">
            <TemplateEditorTree
              root={structure.root}
              canEdit
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

      {/* Publish dialog — all project/target logic lives here */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish template</DialogTitle>
            <DialogDescription>
              Choose how to publish your changes.
            </DialogDescription>
          </DialogHeader>

          {/* Publish target selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Publish target</p>
            <div className="space-y-1.5">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="publishTarget"
                  value="starting_point"
                  checked={publishTarget === 'starting_point'}
                  onChange={() => setPublishTarget('starting_point')}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">Make available for new projects</p>
                  <p className="text-xs text-muted-foreground">
                    {hiddenCount > 0
                      ? `Deleted items (${hiddenCount}) will be stripped from the published version`
                      : 'A clean template ready for anyone to use'}
                  </p>
                </div>
              </label>
              {hasSource && (
                <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="publishTarget"
                    value="update"
                    checked={publishTarget === 'update'}
                    onChange={() => setPublishTarget('update')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Update existing projects</p>
                    <p className="text-xs text-muted-foreground">
                      {hiddenCount > 0
                        ? `Deleted items preserved as hidden for data integrity`
                        : 'Re-point selected project links to this version'}
                    </p>
                  </div>
                </label>
              )}
              {hasSource && hiddenCount > 0 && (
                <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="publishTarget"
                    value="both"
                    checked={publishTarget === 'both'}
                    onChange={() => setPublishTarget('both')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Both</p>
                    <p className="text-xs text-muted-foreground">
                      Update existing projects and publish a clean version for general use
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Project selection (only when updating) */}
          {(publishTarget === 'update' || publishTarget === 'both') &&
            hasSource && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Projects to update</p>
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
                  <div className="max-h-40 space-y-1.5 overflow-y-auto">
                    {linkedProjects.map((project) => (
                      <label
                        key={project.linkId}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={selectedLinkIds.includes(project.linkId)}
                          onCheckedChange={() => toggleProjectLink(project.linkId)}
                          disabled={project.frozen}
                        />
                        <span className="text-sm">
                          {project.projectName}
                          {project.frozen && (
                            <span className="ml-1 text-xs text-muted-foreground">(frozen)</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* Summary */}
          {publishTarget !== 'starting_point' && affectedProjectCount > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950/30">
              <p className="text-blue-800 dark:text-blue-200">
                {affectedProjectCount} project{affectedProjectCount !== 1 ? 's' : ''} will be updated.
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
              disabled={publishing}
            >
              {publishing ? 'Publishing...' : 'Publish'}
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

      {/* Import dialog */}
      <TemplateImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportNodes}
        excludeTemplateId={draft.sourceTemplateId}
      />
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
