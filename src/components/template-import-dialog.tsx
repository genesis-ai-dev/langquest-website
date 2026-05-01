'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, TreePine } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/spinner';
import { createBrowserClient } from '@/lib/supabase/client';
import { fetchTemplates } from '@/lib/template/rpc';
import type { TemplateRow } from '@/lib/template/types';
import type { TemplateNode } from '@/lib/template/types';
import {
  getImportableSections,
  extractNodesFromTemplate
} from '@/lib/template/composition';

interface TemplateImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (nodes: TemplateNode[]) => void;
  excludeTemplateId?: string | null;
}

export function TemplateImportDialog({
  open,
  onOpenChange,
  onImport,
  excludeTemplateId
}: TemplateImportDialogProps) {
  const supabase = createBrowserClient();
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRow | null>(
    null
  );
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(
    new Set()
  );

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates-for-import'],
    queryFn: () => fetchTemplates(supabase, { shared: true }),
    enabled: open
  });

  const filtered = templates?.filter(
    (t) =>
      t.id !== excludeTemplateId &&
      (!search || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  const sections = selectedTemplate
    ? getImportableSections(selectedTemplate.structure)
    : [];

  const toggleNode = useCallback((nodeId: string) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  function handleImport() {
    if (!selectedTemplate || selectedNodeIds.size === 0) return;
    const nodes = extractNodesFromTemplate(
      selectedTemplate.structure,
      [...selectedNodeIds]
    );
    onImport(nodes);
    handleClose();
  }

  function handleClose() {
    setSearch('');
    setSelectedTemplate(null);
    setSelectedNodeIds(new Set());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Import from template
          </DialogTitle>
          <DialogDescription>
            {selectedTemplate
              ? `Select sections to import from "${selectedTemplate.name}". Imported items get fresh IDs — no shared identity with the source.`
              : 'Choose a template to import sections from.'}
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {isLoading && (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              )}
              {filtered?.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => setSelectedTemplate(t)}
                >
                  <TreePine className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.name}</p>
                    {t.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              {!isLoading && filtered?.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No templates found.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTemplate(null);
                setSelectedNodeIds(new Set());
              }}
            >
              &larr; Back to template list
            </Button>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {sections.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  This template has no importable sections.
                </p>
              ) : (
                sections.map((section) => (
                  <label
                    key={section.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedNodeIds.has(section.id)}
                      onCheckedChange={() => toggleNode(section.id)}
                    />
                    <span className="text-sm">{section.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({section.childCount} items)
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {selectedTemplate && (
            <Button
              onClick={handleImport}
              disabled={selectedNodeIds.size === 0}
            >
              Import {selectedNodeIds.size} section
              {selectedNodeIds.size !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
