'use client';

import { useEffect, useRef, useState } from 'react';
// import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { SupabaseEnvironment } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';
import { X, CheckIcon, ChevronDown, ChevronUp, Tag } from 'lucide-react';
// import { fi, is, se, ta } from 'date-fns/locale';
// import { set } from 'date-fns';
import {
  Pagination,
  PaginationContent,
  // PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';

interface Tag {
  id: string;
  key: string;
  value: string;
}

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  environment: SupabaseEnvironment;
  label?: string;
  description?: string;
  placeholder?: string;
  maxVisibleTags?: number;
  maxVisibleTagsExtended?: number;
  showSearch?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
  allowTagCreation?: boolean;
}

export function TagSelector({
  selectedTags,
  onTagsChange,
  environment,
  label = 'Tags',
  description = 'Add tags to categorize this item.',
  placeholder = 'Search tags...',
  maxVisibleTags = 3,
  maxVisibleTagsExtended = 50,
  showSearch = true,
  disabled = false,
  variant = 'default',
  className = '',
  allowTagCreation = true
}: TagSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const cachedTags = useRef<Map<string, Tag[]>>(new Map());
  const showingSelectedTags = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (selectedTags.length === 0) return;
    async function fetchRecoveredTags() {
      const { data, error } = await createBrowserClient(environment)
        .from('tag')
        .select('*')
        .in('id', selectedTags)
        .order('key')
        .order('value');
      if (error) throw error;

      data?.forEach((tag) => {
        showingSelectedTags.current.set(tag.id, `${tag.key}:${tag.value}`);
      });
    }

    fetchRecoveredTags();
  }, []);

  useEffect(() => {
    setIsTagsLoading(true);

    async function fetchTags() {
      if (cachedTags.current.has(searchQuery)) {
        const data = cachedTags.current.get(searchQuery);
        setFilteredTags(data || []);
        setTotalPages(
          Math.ceil(data ? data.length / maxVisibleTagsExtended : 0)
        );
      } else {
        const { data, error } = await createBrowserClient(environment)
          .from('tag')
          .select('*')
          .or(`key.ilike.${searchQuery}%,value.ilike.${searchQuery}%`)
          .order('key')
          .order('value');
        if (error) throw error;
        cachedTags.current.set(searchQuery, data || []);
        setFilteredTags(data || []);
        setTotalPages(Math.ceil(data.length / maxVisibleTagsExtended));
      }
      setCurrentPage(1);
    }

    fetchTags().finally(() => setIsTagsLoading(false));
  }, [searchQuery]);

  const tagsToShow = isExpanded
    ? filteredTags.slice(
        (currentPage - 1) * maxVisibleTagsExtended,
        currentPage * maxVisibleTagsExtended
      )
    : filteredTags.slice(0, maxVisibleTags);

  const handleTagToggle = (tagId: string, tagName: string) => {
    if (disabled) return;

    let newSelectedTags;
    if (!selectedTags.includes(tagId)) {
      newSelectedTags = [...selectedTags, tagId];
    } else {
      newSelectedTags = selectedTags.filter((id) => id !== tagId);
    }
    showingSelectedTags.current.set(tagId, tagName);
    onTagsChange(newSelectedTags);
  };

  const handleTagRemove = (tagId: string) => {
    if (disabled) return;

    const newSelectedTags = selectedTags.filter((id) => id !== tagId);
    onTagsChange(newSelectedTags);
  };

  async function createNewTag(tagName: string) {
    if (!allowTagCreation) return;
    if (tagName.trim() === '') return;

    // Parse key:value format
    const parts = tagName.split(':');
    const key = parts[0]?.trim() || tagName.trim();
    const value = parts[1]?.trim() || '';
    const displayName = `${key}:${value}`;

    if (
      filteredTags.find(
        (t) => `${t.key}:${t.value}`.toLowerCase() === displayName.toLowerCase()
      )
    )
      return;
    /* Verify if a tag with same key:value exists */
    const { data: existingTags, error: existingTagsError } =
      await createBrowserClient(environment)
        .from('tag')
        .select('*')
        .eq('key', key)
        .eq('value', value);
    if (existingTagsError) throw existingTagsError;
    if (existingTags && existingTags.length > 0) {
      return;
    }

    const { data, error } = await createBrowserClient(environment)
      .from('tag')
      .insert({ key, value })
      .select()
      .single();

    if (error) throw error;
    showingSelectedTags.current.set(data.id, `${data.key}:${data.value}`);
    onTagsChange([...selectedTags, data.id]);
    setSearchQuery('');
  }

  if (variant === 'compact') {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}

        <div className="flex flex-wrap gap-2">
          {/* {tags.map((tag) => ( */}
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant={
                showingSelectedTags.current.has(tag) ? 'default' : 'outline'
              }
              className={`cursor-pointer hover:scale-105 transition-transform ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() =>
                handleTagToggle(tag, showingSelectedTags.current.get(tag) || '')
              }
            >
              {showingSelectedTags.current.get(tag)}
              {selectedTags.includes(tag) && (
                <CheckIcon className="ml-1 h-3 w-3" />
              )}
            </Badge>
          ))}
        </div>

        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }
  function createNewTagButton() {
    if (
      allowTagCreation &&
      searchQuery.trim() !== '' &&
      !isTagsLoading &&
      filteredTags.find(
        (t) => `${t.key}:${t.value}`.toLowerCase() === searchQuery.toLowerCase()
      ) == null
    ) {
      return (
        <Badge
          key={`createNewTag`}
          variant={'outline'}
          className={`cursor-pointer border-gray-400 border-dotted hover:scale-105 transition-transform ${
            disabled ? 'cursor-not-allowed' : ''
          }`}
          onClick={() => createNewTag(searchQuery)}
        >
          + create: &quot;{searchQuery}&quot;
        </Badge>
      );
    } else {
      return null;
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
        {filteredTags.length > maxVisibleTags && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-1"
            disabled={disabled}
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp className="ml-1 h-3 w-3" />
              </>
            ) : (
              <>
                Show All ({filteredTags.length}){' '}
                <ChevronDown className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* Selected tags display */}
        <div
          className={`flex flex-wrap gap-1 p-3 border rounded-md min-h-[60px] bg-muted/20 ${
            disabled ? 'opacity-50' : ''
          }`}
        >
          {selectedTags.length > 0 ? (
            selectedTags.map((tagId) => {
              const tag = showingSelectedTags.current.get(tagId);
              return (
                <Badge key={tagId} variant="secondary" className="m-0.5">
                  {tag}
                  <button
                    type="button"
                    // variant="ghost"
                    // size="sm"
                    className="h-auto p-0 ml-1 hover:bg-destructive/20 rounded"
                    onClick={() => handleTagRemove(tagId)}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground p-2">
              No tags selected
            </div>
          )}
        </div>

        {/* Available tags */}
        <div
          className={`border rounded-md p-4 ${disabled ? 'opacity-50' : ''}`}
        >
          <div className="mb-3">
            <label className="text-sm font-medium mb-2 block">
              Available Tags
            </label>
            <div className="text-sm text-muted-foreground mb-3">
              Click on tags to select/deselect them
            </div>

            {/* Search input */}
            {showSearch && (
              // tags.length > 5 && (
              <div className="mb-3 flex">
                <Input
                  type="text"
                  placeholder={placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-sm"
                  disabled={disabled}
                />
              </div>
            )}

            {isTagsLoading ? (
              <div className="flex justify-center p-4 border rounded-md">
                <Spinner className="h-6 w-6" />
                <span className="ml-2">Loading tags...</span>
              </div>
            ) : tagsToShow.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {createNewTagButton()}
                {tagsToShow.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={
                      selectedTags.includes(tag.id) ? 'default' : 'outline'
                    }
                    className={`cursor-pointer hover:scale-105 transition-transform ${
                      disabled ? 'cursor-not-allowed' : ''
                    }`}
                    onClick={() =>
                      handleTagToggle(tag.id, `${tag.key}:${tag.value}`)
                    }
                  >
                    {tag.key}:{tag.value}
                    {selectedTags.includes(tag.id) && (
                      <CheckIcon className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
                {!isExpanded && filteredTags.length > maxVisibleTags && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExpanded(true)}
                    className="h-6 px-2 text-xs"
                    disabled={disabled}
                  >
                    +{filteredTags.length - maxVisibleTags} more
                  </Button>
                )}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col text-center text-sm text-muted-foreground">
                {createNewTagButton()}
                No tags found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="flex flex-col text-center text-sm text-muted-foreground">
                {createNewTagButton()}
                No tags available
              </div>
            )}
          </div>
          {isExpanded && filteredTags.length > maxVisibleTagsExtended && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      currentPage > 1 && setCurrentPage(currentPage - 1)
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink>
                    {currentPage} / {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      currentPage < totalPages &&
                      setCurrentPage(currentPage + 1)
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function useTagSelector(
  environment: SupabaseEnvironment,
  initialTags: string[] = []
) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);

  console.log('Selected tags in hook:', initialTags);

  const TagSelectorComponent = (props: Partial<TagSelectorProps>) => (
    <TagSelector
      selectedTags={selectedTags}
      onTagsChange={setSelectedTags}
      environment={environment}
      {...props}
    />
  );

  return {
    selectedTags,
    setSelectedTags,
    TagSelector: TagSelectorComponent
  };
}

export default TagSelector;
