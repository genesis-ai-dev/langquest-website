'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Copy,
  GitFork,
  History,
  Pencil,
  TreePine,
  Users
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/spinner';
import { cn } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  fetchTemplateLineage,
  fetchTemplateRevisions,
  type LineageNode,
  type RevisionEntry
} from '@/lib/template/rpc';
import { summarizeDiff, type TemplateDiff } from '@/lib/template/tree-diff';
import type { TemplateRow } from '@/lib/template/types';

interface TemplateProvenancePanelProps {
  template: TemplateRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartingPoint: (tpl: TemplateRow) => void;
  onUpdate: (tpl: TemplateRow) => void;
}

export function TemplateProvenancePanel({
  template,
  open,
  onOpenChange,
  onStartingPoint,
  onUpdate
}: TemplateProvenancePanelProps) {
  const supabase = createBrowserClient();
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const activeId = focusedNodeId ?? template?.id ?? null;

  const { data: lineage, isLoading: lineageLoading } = useQuery({
    queryKey: ['template-lineage', template?.id],
    queryFn: () => fetchTemplateLineage(supabase, template!.id),
    enabled: !!template
  });

  const { data: revisions, isLoading: revisionsLoading } = useQuery({
    queryKey: ['template-revisions', activeId],
    queryFn: () => fetchTemplateRevisions(supabase, activeId!),
    enabled: !!activeId
  });

  const tree = useMemo(() => {
    if (!lineage?.length) return null;
    return buildTree(lineage);
  }, [lineage]);

  const activeNode = lineage?.find((n) => n.id === activeId) ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GitFork className="h-4 w-4" />
            {template?.name ?? 'Template'}
          </SheetTitle>
          {template?.description && (
            <SheetDescription>{template.description}</SheetDescription>
          )}
        </SheetHeader>

        {template && (
          <div className="space-y-6 px-4 pb-6">
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStartingPoint(template)}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Use as starting point
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdate(template)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Update for my projects
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <TreePine className="h-3.5 w-3.5" />
                {template.project_count} projects
              </span>
              <span className="text-xs">
                Created {new Date(template.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Lineage Tree */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <GitFork className="h-3.5 w-3.5" />
                Fork lineage
              </h3>
              {lineageLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : tree ? (
                <div className="rounded-lg border p-3">
                  <LineageTree
                    node={tree}
                    activeId={activeId}
                    selectedId={template.id}
                    onSelect={setFocusedNodeId}
                    depth={0}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No fork history — this is the original template.
                </p>
              )}
            </div>

            {/* Focused node info */}
            {activeNode && activeNode.id !== template.id && (
              <div className="rounded-lg border border-dashed p-3 text-sm">
                <p className="font-medium">{activeNode.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeNode.project_count} projects &middot;{' '}
                  {new Date(activeNode.created_at).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Revision History */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <History className="h-3.5 w-3.5" />
                Revision history
                {activeNode && activeNode.id !== template.id && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({activeNode.name})
                  </span>
                )}
              </h3>
              {revisionsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : revisions && revisions.length > 0 ? (
                <div className="space-y-2">
                  {revisions.map((rev) => (
                    <RevisionCard key={rev.id} revision={rev} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No revisions recorded yet.
                </p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

interface TreeNode extends LineageNode {
  children: TreeNode[];
}

function buildTree(nodes: LineageNode[]): TreeNode | null {
  const map = new Map<string, TreeNode>();
  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }

  let root: TreeNode | null = null;
  for (const n of map.values()) {
    if (n.copied_from_template_id && map.has(n.copied_from_template_id)) {
      map.get(n.copied_from_template_id)!.children.push(n);
    } else {
      root = n;
    }
  }

  if (root) {
    sortChildren(root);
  }
  return root;
}

function sortChildren(node: TreeNode) {
  node.children.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  for (const child of node.children) {
    sortChildren(child);
  }
}

// ---------------------------------------------------------------------------
// Lineage tree renderer
// ---------------------------------------------------------------------------

function LineageTree({
  node,
  activeId,
  selectedId,
  onSelect,
  depth
}: {
  node: TreeNode;
  activeId: string | null;
  selectedId: string;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const isActive = node.id === activeId;
  const isSelected = node.id === selectedId;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-accent',
          isActive && 'bg-accent font-medium',
          isSelected && 'ring-1 ring-primary/40'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {depth > 0 && (
          <span className="text-muted-foreground/60">└</span>
        )}
        <span className="truncate">{node.name}</span>
        {node.project_count > 0 && (
          <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
            <Users className="mr-0.5 h-2.5 w-2.5" />
            {node.project_count}
          </Badge>
        )}
      </button>
      {node.children.map((child) => (
        <LineageTree
          key={child.id}
          node={child}
          activeId={activeId}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revision card
// ---------------------------------------------------------------------------

function RevisionCard({ revision }: { revision: RevisionEntry }) {
  const actions = revision.actions as TemplateDiff | Record<string, unknown> | null;
  const summary = actions ? formatRevisionSummary(actions) : null;

  return (
    <div className="rounded border px-3 py-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          {new Date(revision.saved_at).toLocaleString()}
        </span>
      </div>
      {summary && (
        <p className="mt-1 text-muted-foreground">{summary}</p>
      )}
    </div>
  );
}

function formatRevisionSummary(actions: TemplateDiff | Record<string, unknown>): string | null {
  // New format: full TemplateDiff with entries + summary
  if ('summary' in actions && 'entries' in actions) {
    return summarizeDiff(actions as TemplateDiff);
  }
  // Legacy format: flat counts
  const parts: string[] = [];
  if (typeof actions.added === 'number' && actions.added > 0) {
    parts.push(`${actions.added} added`);
  }
  if (typeof actions.removed === 'number' && actions.removed > 0) {
    parts.push(`${actions.removed} removed`);
  }
  if (typeof actions.renamed === 'number' && actions.renamed > 0) {
    parts.push(`${actions.renamed} renamed`);
  }
  if (typeof actions.moved === 'number' && actions.moved > 0) {
    parts.push(`${actions.moved} moved`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}
