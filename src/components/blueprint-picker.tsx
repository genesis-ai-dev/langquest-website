'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import { fetchBlueprints } from '@/lib/blueprint/rpc';
import type { TemplateBlueprintRow } from '@/lib/blueprint/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Book, ScrollText, Folder, Search, Users, Lock } from 'lucide-react';

interface BlueprintPickerProps {
  value: string | null;
  onChange: (blueprintId: string | null, blueprint: TemplateBlueprintRow | null) => void;
}

const ICON_MAP: Record<string, typeof Book> = {
  book: Book,
  'scroll-text': ScrollText,
  folder: Folder
};

export function BlueprintPicker({ value, onChange }: BlueprintPickerProps) {
  const { supabase } = useAuth();
  const [search, setSearch] = useState('');

  const { data: blueprints, isLoading } = useQuery({
    queryKey: ['blueprints-shared'],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      return fetchBlueprints(supabase, { shared: true });
    }
  });

  const filtered = (blueprints ?? []).filter((bp) =>
    bp.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No templates found
          </p>
        )}
        {filtered.map((bp) => {
          const Icon = ICON_MAP[bp.icon ?? ''] ?? Folder;
          const isSelected = value === bp.id;

          return (
            <button
              key={bp.id}
              type="button"
              onClick={() => onChange(isSelected ? null : bp.id, isSelected ? null : bp)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                isSelected
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{bp.name}</span>
                  {bp.locked_for_backward_compat && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {bp.project_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {bp.project_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
