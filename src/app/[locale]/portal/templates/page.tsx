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
import { fetchTemplates } from '@/lib/template/rpc';
import type { TemplateRow } from '@/lib/template/types';
import {
  listDrafts,
  deleteDraft,
  type TemplateDraft
} from '@/lib/template/draft-store';
import {
  createBlankDraft,
  createDraftFromTemplate
} from '@/lib/template/create-draft';
import { PortalHeader } from '@/components/portal-header';
import { toast } from 'sonner';

function countNodes(
  node: TemplateRow['structure']['root'] | undefined
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
  draft: TemplateDraft;
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
// Published template card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onStartingPoint,
  onUpdate
}: {
  template: TemplateRow;
  onStartingPoint: () => void;
  onUpdate: () => void;
}) {
  const nodeCount = countNodes(template.structure?.root);

  return (
    <Card className="transition-colors hover:bg-accent/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <div className="flex gap-1">
            {template.locked_for_backward_compat && (
              <Badge variant="outline" className="text-xs">
                <Lock className="mr-1 h-3 w-3" />
                Frozen
              </Badge>
            )}
            {template.shared && (
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
          <span>{template.project_count} projects</span>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={onStartingPoint}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Use as starting point
          </Button>
          {!template.locked_for_backward_compat && (
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
  const [drafts, setDrafts] = useState<TemplateDraft[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', user?.id],
    queryFn: () => fetchTemplates(supabase),
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

  const templateNameById = new Map(
    templates?.map((bp) => [bp.id, bp.name]) ?? []
  );

  const filtered = templates?.filter(
    (bp) =>
      !search ||
      bp.name.toLowerCase().includes(search.toLowerCase()) ||
      bp.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const myTemplates = filtered?.filter((bp) => bp.creator_id === user.id);
  const sharedTemplates = filtered?.filter(
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

  async function handleStartingPoint(bp: TemplateRow) {
    const draftId = await createDraftFromTemplate(
      bp,
      'starting_point',
      dialogs,
      supabase
    );
    if (draftId) router.push(`/portal/templates/draft/${draftId}`);
  }

  async function handleUpdate(bp: TemplateRow) {
    try {
      const draftId = await createDraftFromTemplate(
        bp,
        'update',
        dialogs,
        supabase
      );
      if (draftId) router.push(`/portal/templates/draft/${draftId}`);
    } catch {
      toast.error('Failed to fetch projects for this template.');
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
        <h1 className="text-2xl font-bold">Templates</h1>
        <Button onClick={() => void handleNewFromScratch()}>
          <Plus className="mr-2 h-4 w-4" />
          New from scratch
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
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
                  draft.sourceTemplateId
                    ? (templateNameById.get(draft.sourceTemplateId) ?? null)
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

      {myTemplates && myTemplates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">My Templates</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myTemplates.map((bp) => (
              <TemplateCard
                key={bp.id}
                template={bp}
                onStartingPoint={() => void handleStartingPoint(bp)}
                onUpdate={() => void handleUpdate(bp)}
              />
            ))}
          </div>
        </div>
      )}

      {sharedTemplates && sharedTemplates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Shared Templates</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedTemplates.map((bp) => (
              <TemplateCard
                key={bp.id}
                template={bp}
                onStartingPoint={() => void handleStartingPoint(bp)}
                onUpdate={() => void handleUpdate(bp)}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !filtered?.length && !filteredDrafts.length && (
        <div className="py-12 text-center text-muted-foreground">
          No templates found. Create one to get started.
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
