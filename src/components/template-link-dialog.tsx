'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Search, TreePine, AlertTriangle } from 'lucide-react';
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
  fetchTemplates,
  linkTemplateToProject
} from '@/lib/template/rpc';
import type { TemplateRow } from '@/lib/template/types';
import { toast } from 'sonner';

interface TemplateLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentTemplateId?: string | null;
  onLinked: () => void;
}

export function TemplateLinkDialog({
  open,
  onOpenChange,
  projectId,
  currentTemplateId,
  onLinked
}: TemplateLinkDialogProps) {
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates-shared'],
    queryFn: () => fetchTemplates(supabase, { shared: true }),
    enabled: open
  });

  const filtered = useMemo(() => {
    if (!templates) return [];
    let list = templates.filter((t) => t.id !== currentTemplateId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, currentTemplateId, search]);

  const handleLink = useCallback(async () => {
    if (!selectedId) return;
    setLinking(true);
    setError(null);
    try {
      const result = await linkTemplateToProject(supabase, projectId, selectedId);
      if (!result.ok) {
        setError((result as any).reason ?? 'Failed to link template');
        return;
      }
      toast.success('Template linked to project');
      queryClient.invalidateQueries({ queryKey: ['project-template'] });
      onLinked();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message ?? 'Unexpected error');
    } finally {
      setLinking(false);
    }
  }, [selectedId, supabase, projectId, queryClient, onLinked, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {currentTemplateId ? 'Change template' : 'Link a template'}
          </DialogTitle>
          <DialogDescription>
            {currentTemplateId
              ? 'Replace the current template with a different one. Only shared templates are shown.'
              : 'Choose a shared template to apply to this project.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : filtered.length === 0 && !search.trim() ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No shared templates available.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedId(tpl.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md border transition-colors',
                    selectedId === tpl.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TreePine className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{tpl.name}</span>
                    </div>
                    {tpl.project_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {tpl.project_count} project{tpl.project_count !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6 line-clamp-2">
                      {tpl.description}
                    </p>
                  )}
                </button>
              ))}
              {filtered.length === 0 && search.trim() && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No templates match your search.
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
            onClick={handleLink}
            disabled={!selectedId || linking}
          >
            {linking ? <Spinner className="h-4 w-4 mr-2" /> : null}
            {currentTemplateId ? 'Change template' : 'Link template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
