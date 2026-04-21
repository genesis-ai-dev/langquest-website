'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  PlusCircle,
  Copy,
  Lock,
  Globe,
  TreePine,
  Search
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
import { createBrowserClient } from '@/lib/supabase/client';
import { fetchBlueprints, forkBlueprint } from '@/lib/blueprint/rpc';
import type { TemplateBlueprintRow } from '@/lib/blueprint/types';
import { PortalHeader } from '@/components/portal-header';

function TemplatesContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const supabase = createBrowserClient();
  const [search, setSearch] = useState('');

  const { data: blueprints, isLoading } = useQuery({
    queryKey: ['blueprints', user?.id],
    queryFn: () => fetchBlueprints(supabase),
    enabled: !!user
  });

  if (!user) {
    router.push('/login?redirectTo=/portal/templates');
    return null;
  }

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

  async function handleFork(bp: TemplateBlueprintRow) {
    const result = await forkBlueprint(supabase, bp.id);
    if (result.ok) {
      router.push(`/portal/templates/${result.blueprint_id}`);
    }
  }

  return (
    <div className="space-y-6">
      <PortalHeader user={user} onSignOut={() => void signOut()} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Template Blueprints</h1>
        <Button onClick={() => router.push('/portal/templates/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Blueprint
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
                onClick={() => router.push(`/portal/templates/${bp.id}`)}
                onFork={() => handleFork(bp)}
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
                onClick={() => router.push(`/portal/templates/${bp.id}`)}
                onFork={() => handleFork(bp)}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !filtered?.length && (
        <div className="py-12 text-center text-muted-foreground">
          No blueprints found. Create one to get started.
        </div>
      )}
    </div>
  );
}

function BlueprintCard({
  blueprint,
  onClick,
  onFork
}: {
  blueprint: TemplateBlueprintRow;
  onClick: () => void;
  onFork: () => void;
}) {
  const nodeCount = countNodes(blueprint.structure?.root);

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
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
        <CardDescription>
          {blueprint.slug && (
            <span className="font-mono text-xs">{blueprint.slug}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <TreePine className="h-3.5 w-3.5" />
            {nodeCount} nodes
          </span>
          <span>v{blueprint.structure_version}</span>
          <span>{blueprint.project_count} projects</span>
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onFork();
            }}
          >
            <Copy className="mr-1 h-3 w-3" />
            Fork
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function countNodes(node: TemplateBlueprintRow['structure']['root'] | undefined): number {
  if (!node) return 0;
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      if (!child.deleted) count += countNodes(child);
    }
  }
  return count;
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
