'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GitFork, Search, TreePine, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  fetchTemplateLineage,
  adoptTemplateFork,
  type LineageNode
} from '@/lib/template/rpc';
import { toast } from 'sonner';

interface TemplateAdoptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTemplateId: string;
  linkId: string;
  onAdopted: () => void;
}

export function TemplateAdoptDialog({
  open,
  onOpenChange,
  currentTemplateId,
  linkId,
  onAdopted
}: TemplateAdoptDialogProps) {
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adopting, setAdopting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: lineage, isLoading } = useQuery({
    queryKey: ['template-lineage', currentTemplateId],
    queryFn: () => fetchTemplateLineage(supabase, currentTemplateId),
    enabled: open && !!currentTemplateId
  });

  const forks = useMemo(() => {
    if (!lineage) return [];
    return lineage.filter((n) => n.id !== currentTemplateId);
  }, [lineage, currentTemplateId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return forks;
    const q = search.toLowerCase();
    return forks.filter((f) => f.name.toLowerCase().includes(q));
  }, [forks, search]);

  const handleAdopt = useCallback(async () => {
    if (!selectedId) return;
    setAdopting(true);
    setError(null);
    try {
      const result = await adoptTemplateFork(supabase, linkId, selectedId);
      if (!result.ok) {
        setError((result as any).reason ?? 'Failed to adopt fork');
        return;
      }
      toast.success('Template updated to the selected fork');
      queryClient.invalidateQueries({ queryKey: ['project-template'] });
      onAdopted();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message ?? 'Unexpected error');
    } finally {
      setAdopting(false);
    }
  }, [selectedId, supabase, linkId, queryClient, onAdopted, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitFork className="h-5 w-5" />
            Adopt a template fork
          </DialogTitle>
          <DialogDescription>
            Browse other versions of your current template and switch to one.
            Only compatible forks (those containing all your existing contribution
            nodes) can be adopted.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : forks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No other forks found for this template lineage.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search forks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.map((fork) => (
                <button
                  key={fork.id}
                  onClick={() => setSelectedId(fork.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md border transition-colors',
                    selectedId === fork.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TreePine className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{fork.name}</span>
                    </div>
                    {fork.project_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {fork.project_count} project{fork.project_count !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Created {new Date(fork.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No forks match your search.
                </p>
              )}
            </div>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdopt}
            disabled={!selectedId || adopting}
          >
            {adopting ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Adopt this fork
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
