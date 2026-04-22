'use client';

import { Suspense, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Lock,
  Settings2,
  Pencil,
  Copy,
  TreePine
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
import { useConfirm } from '@/components/ui/confirm';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  fetchBlueprintById,
  fetchProjectsForBlueprint,
  saveBlueprintMetadata
} from '@/lib/blueprint/rpc';
import type { DraftMode } from '@/lib/blueprint/types';
import { createDraftFromBlueprint } from '@/lib/blueprint/create-draft';
import { toast } from 'sonner';
import { BlueprintEditorTree } from '@/components/blueprint-editor-tree';
import { cn } from '@/lib/utils';

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

function EditorContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createBrowserClient();
  const dialogs = useConfirm();

  const {
    data: blueprint,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['blueprint', id],
    queryFn: () => fetchBlueprintById(supabase, id),
    enabled: !!id
  });

  const { data: linkedProjects } = useQuery({
    queryKey: ['blueprint-projects', id],
    queryFn: () => fetchProjectsForBlueprint(supabase, id),
    enabled: !!id && !!user
  });

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
  const isCreator = blueprint.creator_id === user?.id;
  const hasLinkedProjects =
    !isFrozen && linkedProjects && linkedProjects.length > 0;

  async function handleCreateDraft(mode: DraftMode) {
    if (!blueprint) return;
    try {
      const draftId = await createDraftFromBlueprint(
        blueprint,
        mode,
        dialogs,
        supabase
      );
      if (draftId) router.push(`/portal/templates/draft/${draftId}`);
    } catch {
      toast.error('Failed to create draft.');
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
              {blueprint.project_count}{' '}
              {blueprint.project_count === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
          >
            <TreePine className="mr-1 h-3 w-3" />
            Published
          </Badge>
          {isFrozen && (
            <Badge variant="outline">
              <Lock className="mr-1 h-3 w-3" />
              Frozen
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleCreateDraft('starting_point')}
          >
            <Copy className="mr-2 h-4 w-4" />
            Use as starting point
          </Button>
          {hasLinkedProjects && (
            <Button onClick={() => handleCreateDraft('update')}>
              <Pencil className="mr-2 h-4 w-4" />
              Update for my projects
            </Button>
          )}
          {isCreator && (
            <MetadataSheet
              blueprint={blueprint}
              supabase={supabase}
              onSave={() => refetch()}
            />
          )}
        </div>
      </div>

      {/* Frozen banner */}
      {isFrozen && (
        <div
          className={cn(
            'flex items-center justify-between rounded-lg border p-4',
            'border-amber-200 bg-amber-50',
            'dark:border-amber-800 dark:bg-amber-950/30'
          )}
        >
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              This blueprint is frozen for backward compatibility
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              It cannot be updated in place. Use &ldquo;Use as starting
              point&rdquo; to create a new draft from this blueprint.
            </p>
          </div>
        </div>
      )}

      {/* Tree viewer (read-only) */}
      <div className="min-w-0 rounded-lg border p-4">
        <BlueprintEditorTree
          root={blueprint.structure.root}
          canEdit={false}
          selectedNodeId={null}
          onNodeSelect={() => {}}
          onBatchActions={() => {}}
        />
      </div>
    </div>
  );
}

export default function BlueprintViewPage() {
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
