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
import { createBrowserClient } from '@/lib/supabase/client';
import {
  fetchTemplateById,
  fetchProjectsForTemplate,
  saveTemplateMetadata
} from '@/lib/template/rpc';
import type { PublishIntent } from '@/lib/template/types';
import { createDraftFromTemplate } from '@/lib/template/create-draft';
import { toast } from 'sonner';
import { TemplateEditorTree } from '@/components/template-editor-tree';
import { cn } from '@/lib/utils';

function MetadataSheet({
  template,
  supabase,
  onSave
}: {
  template: { id: string; name: string; icon: string | null; shared: boolean };
  supabase: ReturnType<typeof createBrowserClient>;
  onSave: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [icon, setIcon] = useState(template.icon ?? '');
  const [shared, setShared] = useState(template.shared);
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
          <SheetTitle>Template Settings</SheetTitle>
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
                await saveTemplateMetadata(supabase, template.id, {
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

  const {
    data: tpl,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['template', id],
    queryFn: () => fetchTemplateById(supabase, id),
    enabled: !!id
  });

  const { data: linkedProjects } = useQuery({
    queryKey: ['template-projects', id],
    queryFn: () => fetchProjectsForTemplate(supabase, id),
    enabled: !!id && !!user
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!tpl) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Template not found.
      </div>
    );
  }

  const isCreator = tpl.creator_id === user?.id;
  const unfrozenLinks = linkedProjects?.filter((p) => !p.frozen) ?? [];
  const hasLinkedProjects = unfrozenLinks.length > 0;
  const allLinksFrozen =
    linkedProjects && linkedProjects.length > 0 && unfrozenLinks.length === 0;

  async function handleCreateDraft(intent: PublishIntent) {
    if (!tpl) return;
    const draftId = await createDraftFromTemplate(tpl, intent);
    router.push(`/portal/templates/draft/${draftId}`);
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
            <h1 className="text-xl font-bold">{tpl.name}</h1>
            <p className="text-sm text-muted-foreground">
              {tpl.project_count}{' '}
              {tpl.project_count === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
          >
            <TreePine className="mr-1 h-3 w-3" />
            Published
          </Badge>
          {allLinksFrozen && (
            <Badge variant="outline">
              <Lock className="mr-1 h-3 w-3" />
              All projects frozen
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
              template={tpl}
              supabase={supabase}
              onSave={() => refetch()}
            />
          )}
        </div>
      </div>

      {/* Frozen links banner */}
      {allLinksFrozen && (
        <div
          className={cn(
            'flex items-center justify-between rounded-lg border p-4',
            'border-amber-200 bg-amber-50',
            'dark:border-amber-800 dark:bg-amber-950/30'
          )}
        >
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              All linked projects are frozen
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Projects using this template cannot be re-pointed to a new version.
              You can still use this as a starting point for new work.
            </p>
          </div>
        </div>
      )}

      {/* Tree viewer (read-only) */}
      <div className="min-w-0 rounded-lg border p-4">
        <TemplateEditorTree
          root={tpl.structure.root}
          canEdit={false}
          selectedNodeId={null}
          onNodeSelect={() => {}}
          onBatchActions={() => {}}
        />
      </div>
    </div>
  );
}

export default function TemplateViewPage() {
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
