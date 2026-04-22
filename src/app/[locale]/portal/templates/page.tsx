'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Copy,
  Globe,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  TreePine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';
import { useAuth } from '@/components/auth-provider';
import { useConfirm } from '@/components/ui/confirm';
import { createBrowserClient } from '@/lib/supabase/client';
import { fetchBlueprints } from '@/lib/blueprint/rpc';
import type { TemplateBlueprintRow } from '@/lib/blueprint/types';
import {
  listDrafts,
  deleteDraft,
  type BlueprintDraft
} from '@/lib/blueprint/draft-store';
import {
  createBlankDraft,
  createDraftFromBlueprint
} from '@/lib/blueprint/create-draft';
import { PortalHeader } from '@/components/portal-header';
import { toast } from 'sonner';

function countNodes(
  node: TemplateBlueprintRow['structure']['root'] | undefined
): number {
  if (!node) return 0;
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      if (!child.deleted) count += countNodes(child);
    }
  }
  return count;
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Draft card
// ---------------------------------------------------------------------------

function DraftCard({
  draft,
  sourceName,
  onResume,
  onDelete
}: {
  draft: BlueprintDraft;
  sourceName: string | null;
  onResume: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onResume}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{draft.metadata.name}</CardTitle>
          <Badge
            variant={draft.mode === 'update' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {draft.mode === 'update' ? 'updating' : 'starting point'}
          </Badge>
        </div>
        {sourceName && (
          <CardDescription className="text-xs">
            From: {sourceName}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Edited {formatRelativeTime(draft.savedAt)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Discard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Published blueprint card
// ---------------------------------------------------------------------------

function BlueprintCard({
  blueprint,
  onStartingPoint,
  onUpdate
}: {
  blueprint: TemplateBlueprintRow;
  onStartingPoint: () => void;
  onUpdate: () => void;
}) {
  const nodeCount = countNodes(blueprint.structure?.root);

  return (
    <Card className="transition-colors hover:bg-accent/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{blueprint.name}</CardTitle>
          <div className="flex gap-1">
            {blueprint.locked_for_backward_compat && (
              <Badge variant="outline" className="text-xs">
                <Lock className="mr-1 h-3 w-3" />
                Frozen
              </Badge>
            )}
            {blueprint.shared && (
              <Badge variant="secondary" className="text-xs">
                <Globe className="mr-1 h-3 w-3" />
                Shared
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <TreePine className="h-3.5 w-3.5" />
            {nodeCount} nodes
          </span>
          <span>{blueprint.project_count} projects</span>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={onStartingPoint}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Use as starting point
          </Button>
          {!blueprint.locked_for_backward_compat && (
            <Button size="sm" variant="outline" onClick={onUpdate}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Update for my projects
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function TemplatesContent() {
  const { user, signOut, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createBrowserClient();
  const dialogs = useConfirm();
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<BlueprintDraft[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);

  const { data: blueprints, isLoading } = useQuery({
    queryKey: ['blueprints', user?.id],
    queryFn: () => fetchBlueprints(supabase),
    enabled: !!user
  });

  useEffect(() => {
    listDrafts().then((d) => {
      setDrafts(d.sort((a, b) => b.savedAt - a.savedAt));
      setDraftsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectTo=/portal/templates');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return null;
  }

  const blueprintNameById = new Map(
    blueprints?.map((bp) => [bp.id, bp.name]) ?? []
  );

  const filtered = blueprints?.filter(
    (bp) =>
      !search ||
      bp.name.toLowerCase().includes(search.toLowerCase()) ||
      bp.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const myBlueprints = filtered?.filter((bp) => bp.creator_id === user.id);
  const sharedBlueprints = filtered?.filter(
    (bp) => bp.shared && bp.creator_id !== user.id
  );

  const filteredDrafts = drafts.filter(
    (d) =>
      !search || d.metadata.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleNewFromScratch() {
    const draftId = await createBlankDraft();
    router.push(`/portal/templates/draft/${draftId}`);
  }

  async function handleStartingPoint(bp: TemplateBlueprintRow) {
    const draftId = await createDraftFromBlueprint(
      bp,
      'starting_point',
      dialogs,
      supabase
    );
    if (draftId) router.push(`/portal/templates/draft/${draftId}`);
  }

  async function handleUpdate(bp: TemplateBlueprintRow) {
    try {
      const draftId = await createDraftFromBlueprint(
        bp,
        'update',
        dialogs,
        supabase
      );
      if (draftId) router.push(`/portal/templates/draft/${draftId}`);
    } catch {
      toast.error('Failed to fetch projects for this blueprint.');
    }
  }

  async function handleDeleteDraft(draftId: string) {
    await deleteDraft(draftId);
    setDrafts((prev) => prev.filter((d) => d.draftId !== draftId));
    toast.success('Draft discarded.');
  }

  return (
    <div className="space-y-6">
      <PortalHeader user={user} onSignOut={() => void signOut()} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Template Blueprints</h1>
        <Button onClick={() => void handleNewFromScratch()}>
          <Plus className="mr-2 h-4 w-4" />
          New from scratch
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search blueprints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {draftsLoaded && filteredDrafts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Drafts</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDrafts.map((draft) => (
              <DraftCard
                key={draft.draftId}
                draft={draft}
                sourceName={
                  draft.sourceBlueprintId
                    ? (blueprintNameById.get(draft.sourceBlueprintId) ?? null)
                    : null
                }
                onResume={() =>
                  router.push(`/portal/templates/draft/${draft.draftId}`)
                }
                onDelete={() => void handleDeleteDraft(draft.draftId)}
              />
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {myBlueprints && myBlueprints.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My Blueprints</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myBlueprints.map((bp) => (
              <BlueprintCard
                key={bp.id}
                blueprint={bp}
                onStartingPoint={() => void handleStartingPoint(bp)}
                onUpdate={() => void handleUpdate(bp)}
              />
            ))}
          </div>
        </div>
      )}

      {sharedBlueprints && sharedBlueprints.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Shared Blueprints</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedBlueprints.map((bp) => (
              <BlueprintCard
                key={bp.id}
                blueprint={bp}
                onStartingPoint={() => void handleStartingPoint(bp)}
                onUpdate={() => void handleUpdate(bp)}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !filtered?.length && !filteredDrafts.length && (
        <div className="py-12 text-center text-muted-foreground">
          No blueprints found. Create one to get started.
        </div>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        }
      >
        <TemplatesContent />
      </Suspense>
    </div>
  );
}
