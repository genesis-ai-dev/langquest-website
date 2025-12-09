'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn, debounce } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from './spinner';

import { LanguoidModal } from '@/components/languoid-modal';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { SupabaseEnvironment } from '@/lib/supabase';
import { env } from '@/lib/env';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import type { LanguoidSearchResult } from '../../database.types';

export type Languoid = {
  id: string;
  name: string | null;
  level: string | null;
  ui_ready: boolean | null;
  iso_code?: string | null;
  matched_alias_name?: string | null;
  matched_alias_type?: string | null;
};

interface NewLanguoid {
  iso639_3: string;
  name: string;
}

interface LanguoidComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onCreateSuccess?: (newLanguoid: Languoid) => void;
  onLanguoidSelect?: (languoid: Languoid | null) => void;
}

export function LanguoidCombobox({
  value,
  onChange,
  placeholder = 'Select language...',
  disabled = false,
  onCreateSuccess,
  onLanguoidSelect
}: LanguoidComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedLanguoid, setNewlyCreatedLanguoid] =
    useState<Languoid | null>(null);
  const [isLanguoidModalOpen, setIsLanguoidModalOpen] = useState(false);

  // Get environment from auth context or URL parameters
  const { environment: authEnvironment } = useAuth();
  const searchParams = useSearchParams();
  const environment =
    authEnvironment ||
    (searchParams.get('env') as SupabaseEnvironment) ||
    env.NEXT_PUBLIC_ENVIRONMENT ||
    'production';

  // Query client for invalidating queries
  const queryClient = useQueryClient();

  const debouncedSearch = useMemo(
    () => debounce((value: string) => setInputValue(value), 100),
    []
  );

  // Search languoids using RPC function
  const { data: languoids = [], isLoading } = useQuery({
    queryKey: ['languoids-search', environment, inputValue],
    queryFn: async () => {
      const supabase = createBrowserClient(environment);

      // If search query is less than 2 chars, get some default languoids
      if (!inputValue || inputValue.length < 2) {
        const { data, error } = await supabase
          .from('languoid')
          .select('id, name, level, ui_ready')
          .eq('active', true)
          .eq('level', 'language')
          .order('name')
          .limit(50);

        if (error) throw error;
        return (data || []).map((l) => ({
          ...l,
          iso_code: null as string | null
        })) as Languoid[];
      }

      // Use the search_languoids RPC function
      const { data, error } = await supabase.rpc('search_languoids', {
        search_query: inputValue.trim().toLowerCase(),
        result_limit: 50,
        ui_ready_only: false
      });

      if (error) throw error;
      return (data || []).map((result: LanguoidSearchResult) => ({
        id: result.id,
        name: result.name,
        level: result.level,
        ui_ready: result.ui_ready,
        iso_code: result.iso_code,
        matched_alias_name: result.matched_alias_name,
        matched_alias_type: result.matched_alias_type
      })) as Languoid[];
    },
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Handle creating a new languoid
  const handleCreateLanguoid = async (languoid: NewLanguoid) => {
    if (!languoid.name.trim()) return;

    setIsCreating(true);
    try {
      // Get authentication token from Supabase client
      const supabase = createBrowserClient(environment);
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in.');
      }

      // Use the API endpoint to create languoid
      const response = await fetch('/api/languoid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          environment: environment,
          name: languoid.name.trim(),
          iso639_3: languoid.iso639_3.trim().toLowerCase()
        })
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Failed to create languoid');
      }

      const data = (await response.json()) as Languoid;

      // Store the newly created languoid
      setNewlyCreatedLanguoid(data);

      // Invalidate languoid queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['languoids-search', environment]
      });

      toast.success(`Added language: ${data.name}`);
      onChange(data.id);
      if (onLanguoidSelect) {
        onLanguoidSelect(data);
      }
      setOpen(false);

      // Call the success callback if provided
      if (onCreateSuccess) {
        onCreateSuccess(data);
      }
    } catch (error) {
      console.error('Error creating languoid:', error);
      toast.error('Failed to create language');
    } finally {
      setIsCreating(false);
    }
  };

  // Find the selected languoid, including the newly created one if applicable
  const selectedLanguoid =
    languoids.find((languoid) => languoid.id === value) ||
    (newlyCreatedLanguoid && newlyCreatedLanguoid.id === value
      ? newlyCreatedLanguoid
      : null);

  const handleNewLanguoidSelected = (languoid: NewLanguoid) => {
    handleCreateLanguoid(languoid)
      .then(() => {
        setIsLanguoidModalOpen(false);
      })
      .catch(() => {
        console.error('Failed to create languoid');
      });
  };

  // Format display name - show alias if matched, with languoid name and ISO code in brackets
  const formatLanguoidName = (languoid: Languoid) => {
    const hasMatchedAlias =
      languoid.matched_alias_name &&
      languoid.matched_alias_name.toLowerCase() !==
        languoid.name?.toLowerCase();

    if (hasMatchedAlias) {
      // Show: "Matched Alias (Languoid Name [iso_code])"
      const nameWithIso = languoid.iso_code
        ? `${languoid.name} [${languoid.iso_code}]`
        : languoid.name;
      return `${languoid.matched_alias_name} (${nameWithIso})`;
    }

    // No alias match or alias is the same as the name
    if (languoid.iso_code) {
      return `${languoid.name} [${languoid.iso_code}]`;
    }
    return languoid.name || 'Unknown';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between overflow-hidden flex bg-primary-foreground',
            !value && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <div className="overflow-hidden text-ellipsis max-w-40">
            {selectedLanguoid ? selectedLanguoid.name : placeholder}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search language..."
            value={inputValue}
            onValueChange={(value) => debouncedSearch(value)}
            className="h-9"
          />
          <CommandList className="max-h-[200px] overflow-y-auto overscroll-contain">
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner className="h-4 w-4 mr-2" />
                  Loading languages...
                </div>
              ) : (
                <div className="py-6 text-center text-sm">
                  No language found.
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {languoids.map((languoid) => (
                <CommandItem
                  key={languoid.id}
                  value={languoid.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    if (onLanguoidSelect) {
                      onLanguoidSelect(languoid);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === languoid.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {formatLanguoidName(languoid)}
                </CommandItem>
              ))}
            </CommandGroup>

            {inputValue &&
              !languoids.some(
                (lang) => lang.name?.toLowerCase() === inputValue.toLowerCase()
              ) && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => setIsLanguoidModalOpen(true)}
                      disabled={isCreating}
                      className="text-primary"
                    >
                      {isCreating ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create &quot;{inputValue}&quot;
                        </>
                      )}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
      <LanguoidModal
        isOpen={isLanguoidModalOpen}
        onClose={() => setIsLanguoidModalOpen(false)}
        initialName={inputValue}
        onLanguoidSelect={handleNewLanguoidSelected}
      />
    </Popover>
  );
}
