'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Spinner } from './spinner';

export type Language = {
  id: string;
  english_name: string;
  native_name: string;
  iso639_3: string;
};

interface LanguageComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  languages?: Language[];
  isLoading?: boolean;
  onCreateSuccess?: (newLanguage: Language) => void;
}

export function LanguageCombobox({
  value,
  onChange,
  placeholder = 'Select language...',
  disabled = false,
  languages = [],
  isLoading = false,
  onCreateSuccess
}: LanguageComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Filter languages based on input
  const filteredLanguages = languages.filter((language) =>
    language.english_name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Handle creating a new language
  const handleCreateLanguage = async () => {
    if (!inputValue.trim()) return;

    setIsCreating(true);
    try {
      // Generate a simple ISO code from the first 3 letters of the language name
      const iso639_3 = inputValue.trim().toLowerCase().slice(0, 3);

      // Insert the new language
      const { data, error } = await supabase
        .from('language')
        .insert({
          english_name: inputValue.trim(),
          native_name: inputValue.trim(),
          iso639_3
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Added language: ${data.english_name}`);
      onChange(data.id);
      setOpen(false);

      // Call the success callback if provided
      if (onCreateSuccess) {
        onCreateSuccess(data);
      }
    } catch (error) {
      console.error('Error creating language:', error);
      toast.error('Failed to create language');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            !value && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          {value
            ? languages.find((language) => language.id === value)
                ?.english_name || 'Unknown language'
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search language..."
            value={inputValue}
            onValueChange={setInputValue}
            className="h-9"
          />
          <CommandList>
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
              {filteredLanguages.map((language) => (
                <CommandItem
                  key={language.id}
                  value={language.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === language.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {language.english_name} ({language.iso639_3})
                </CommandItem>
              ))}
            </CommandGroup>

            {inputValue &&
              !filteredLanguages.some(
                (lang) =>
                  lang.english_name.toLowerCase() === inputValue.toLowerCase()
              ) && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleCreateLanguage}
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
                          Create "{inputValue}"
                        </>
                      )}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
