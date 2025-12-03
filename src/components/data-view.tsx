'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
// import {
//   Carousel,
//   CarouselContent,
//   CarouselItem,
//   CarouselNext,
//   CarouselPrevious
// } from '@/components/ui/carousel';
import { createBrowserClient } from '@/lib/supabase/client';
import { camelToProperCase, cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ArrowDownWideNarrowIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpWideNarrowIcon,
  FilterIcon,
  ListIcon,
  //  ThumbsDownIcon,
  //  ThumbsUpIcon,
  XIcon
} from 'lucide-react';
import { createParser, parseAsInteger, useQueryState } from 'nuqs';
import { Spinner } from './spinner';
// import { AudioButton } from './ui/audio-button';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { useAuth } from '@/components/auth-provider';
// import { getSupabaseCredentials } from '@/lib/supabase';
// import { env } from '@/lib/env';
import { AssetCard } from '@/components/asset-card';

export interface Root {
  assets: {
    id: string;
    name: string;
    project_id: string;
    project?: {
      id: string;
      name: string;
      description: string;
    };
    translations: {
      id: string;
      name: string;
      project_id: string;
      content: Content[];
    }[];
    content: Content[];
    tags: Tag[];
    quests: {
      quest?: {
        id: string;
        name: string;
        tags: Tag[];
        project: {
          id: string;
          name: string;
          description: string;
        };
        description: string;
      };
    }[];
    images?: string[];
  }[];
  count: number;
}

export interface Vote {
  id: string;
  polarity: string;
}


export interface Content {
  id: string;
  text: string;
  audio: string | [string] | null;
}

export interface Tag {
  tag: {
    id: string;
    key: string;
    value: string;
  };
}

// Language types removed - using languoid system now

interface FilterState {
  projects?: string[];
  quests?: string[];
  tags?: string[];
}

function parseImages(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const arr = (value as unknown[]).map((v) => String(v)).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Try JSON array first
    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed);
        return Array.isArray(arr) ? arr.map((v) => String(v)) : undefined;
      } catch {
        // fall through
      }
    }
    // Try Postgres array format: {a,b,c}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1);
      if (!inner) return undefined;
      const parts = inner
        .split(',')
        .map((p) => p.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
      return parts.length ? parts : undefined;
    }
    // Try comma-separated list or single string path
    if (trimmed.includes(',')) {
      const parts = trimmed
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      return parts.length ? parts : undefined;
    }
    return trimmed ? [trimmed] : undefined;
  }
  // Unknown format
  return undefined;
}

const parseAsFilters = createParser({
  parse(queryValue) {
    if (!queryValue) return {};
    try {
      return JSON.parse(queryValue);
    } catch {
      return {};
    }
  },
  serialize(value) {
    if (!value || Object.keys(value).length === 0) return '';
    return JSON.stringify(value);
  },
  eq(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
});

const parseAsSorting = createParser({
  parse(queryValue) {
    if (!queryValue) return [];
    try {
      return queryValue.split(',').map((part) => {
        const [path, direction] = part.split(':');
        return {
          path: path as string,
          sort: direction as 'asc' | 'desc'
        };
      });
    } catch {
      return [];
    }
  },
  serialize(value) {
    if (!value?.length) return '';
    return value
      .map((sort) => `${sort.path.toLowerCase()}:${sort.sort}`)
      .join(',');
  },
  eq(a, b) {
    return a.length === b.length;
  }
});

interface DataViewProps {
  projectId?: string; // Optional prop to filter by specific project
  questId?: string; // Optional prop to filter by specific quest
  showProjectFilter?: boolean; // Whether to show project filter options
}

export function DataView({
  projectId,
  questId,
  showProjectFilter = true
}: DataViewProps = {}) {
  const t = useTranslations('data_view');
  const [pageSize, setPageSize] = useQueryState(
    'size',
    parseAsInteger.withDefault(20)
  );
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(0));
  const [filters, setFilters] = useQueryState<FilterState>(
    'filters',
    parseAsFilters.withDefault({})
  );
  const [sort, setSort] = useQueryState<
    { path: string; sort: 'asc' | 'desc' }[]
  >('sort', parseAsSorting.withDefault([]));

  const { environment } = useAuth();
  // const credentials = getSupabaseCredentials(environment);

  const { data, isLoading, error } = useQuery<Root>({
    queryKey: [
      'assets',
      page,
      pageSize,
      filters,
      sort,
      projectId,
      questId,
      environment
    ],
    queryFn: async () => {
      try {
        const supabase = createBrowserClient(environment);

        // Build the main query with filters
        let query = supabase.from('asset').select(
          `
            id, 
            name, 
            images,
            project_id,
            project:project_id(id, name, description),
            translations:asset!source_asset_id(id, name, project_id, 
              content:asset_content_link(id, text, audio)
            ),
            content:asset_content_link(id, audio, text),
            tags:asset_tag_link(tag(id, key, value)),
            quests:quest_asset_link(quest(id, name, description, 
              project(id, name, description),
              tags:quest_tag_link(tag(id, key, value))
            ))
          `,
          { count: 'exact' }
        );

        // Apply filters directly to the main query
        if (projectId) {
          query = query.eq('project_id', projectId);
        } else if (filters.projects?.length) {
          query = query.in('project_id', filters.projects);
        }

        // Filter by quest (still need quest_asset_link for this)
        if (questId) {
          const { data: questAssets } = await supabase
            .from('quest_asset_link')
            .select('asset_id')
            .eq('quest_id', questId);
          const assetIds = questAssets?.map((qa) => qa.asset_id) || [];
          if (assetIds.length === 0) {
            return { assets: [], count: 0 } as Root;
          }
          query = query.in('id', assetIds);
        } else if (filters.quests?.length) {
          const { data: questAssets } = await supabase
            .from('quest_asset_link')
            .select('asset_id')
            .in('quest_id', filters.quests);
          const assetIds = questAssets?.map((qa) => qa.asset_id) || [];
          if (assetIds.length === 0) {
            return { assets: [], count: 0 } as Root;
          }
          query = query.in('id', assetIds);
        }

        // Filter by tags (still need asset_tag_link for this)
        if (filters.tags?.length) {
          const { data: tagAssets } = await supabase
            .from('asset_tag_link')
            .select('asset_id, tag!inner(key, value)')
            .in('tag.key', filters.tags);
          const assetIds = tagAssets?.map((ta) => ta.asset_id) || [];
          if (assetIds.length === 0) {
            return { assets: [], count: 0 } as Root;
          }
          query = query.in('id', assetIds);
        }

        // Apply sorting
        if (sort.length > 0) {
          sort.forEach((sortItem) => {
            const ascending = sortItem.sort === 'asc';
            switch (sortItem.path) {
              case 'name':
                query = query.order('name', { ascending });
                break;
              default:
                query = query.order('name', { ascending });
                break;
            }
          });
        } else {
          query = query.order('name');
        }

        // Apply pagination
        query = query.range(page * pageSize, (page + 1) * pageSize - 1);

        const { data: assets, error, count } = await query;

        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }

        console.log(
          'Filter query successful, returned:',
          assets?.length,
          'assets'
        );

        return {
          assets:
            assets?.map((asset) => ({
              ...asset,
              images: parseImages(asset.images)
            })) || [],
          count: count || 0
        } as unknown as Root;
      } catch (error) {
        console.error('Query execution error:', error);
        throw error;
      }
    }
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options', environment],
    queryFn: async () => {
      const supabase = createBrowserClient(environment);

      const [projectsRes, questsRes, tagsRes] = await Promise.all([
        supabase.from('project').select('id, name').order('name'),
        supabase
          .from('quest')
          .select('id, name, project:project_id(name)')
          .order('name'),
        supabase.from('tag').select('id, key, value').order('key')
      ]);

      return {
        projects: projectsRes.data || [],
        quests: questsRes.data || [],
        tags: tagsRes.data || []
      };
    }
  });

  const assets = data?.assets;
  const count = data?.count;

  const addFilter = (filterType: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: [...(prev[filterType] || []), value]
    }));
    setPage(0); // Reset to first page when filtering
  };

  const removeFilter = (filterType: keyof FilterState, value?: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value && newFilters[filterType]) {
        newFilters[filterType] = newFilters[filterType]!.filter(
          (v) => v !== value
        );
        if (newFilters[filterType]!.length === 0) {
          delete newFilters[filterType];
        }
      }
      return newFilters;
    });
  };

  const addSort = (path: string, direction: 'asc' | 'desc') => {
    setSort((prev) => [
      ...prev.filter((s) => s.path !== path),
      { path, sort: direction }
    ]);
  };

  const removeSort = (path: string) => {
    setSort((prev) => prev.filter((s) => s.path !== path));
  };

  const toggleSortDirection = (path: string) => {
    setSort((prev) =>
      prev.map((s) =>
        s.path === path ? { ...s, sort: s.sort === 'asc' ? 'desc' : 'asc' } : s
      )
    );
  };

  if (isLoading)
    return (
      <div className="flex w-screen h-screen items-center justify-center">
        <Spinner />
      </div>
    );

  if (error) return <div>{t('errorLoading', { error: error.message })}</div>;

  if (!assets) return <div>{t('noAssets')}</div>;

  return (
    <div className="whitespace-pre-wrap px-8 py-4 max-w-200 mx-auto flex flex-col scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4">
        <div className="flex gap-2 items-top flex-col">
          <div className="flex gap-2 items-center">
            <h1 className="font-semibold">Assets</h1>
            <div className="flex flex-1 justify-end gap-2">
              {/* Hide filters when viewing a specific quest - context is already filtered enough */}
              {!questId && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          Object.keys(filters).length > 0 &&
                            'dark:text-green-400 text-green-700 hover:text-green-700 hover:bg-green-500/20 transition-[background-color] duration-100'
                        )}
                      >
                        <FilterIcon className="size-4" />
                        <span className="hidden sm:block">
                          {Object.keys(filters).length > 0
                            ? t('filteredBy', {
                                count: Object.keys(filters).length
                              })
                            : t('filter')}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-80 max-h-96 overflow-y-auto"
                    >
                      <div className="space-y-4">
                        {showProjectFilter && (
                          <div>
                            <h4 className="font-medium mb-2">Projects</h4>
                            <div className="flex flex-wrap gap-1">
                              {filterOptions?.projects
                                .filter((project) => project && project.name)
                                .map((project) => (
                                  <Button
                                    key={project.id}
                                    variant={
                                      filters.projects?.includes(project.id)
                                        ? 'default'
                                        : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => {
                                      if (
                                        filters.projects?.includes(project.id)
                                      ) {
                                        removeFilter('projects', project.id);
                                      } else {
                                        addFilter('projects', project.id);
                                      }
                                    }}
                                  >
                                    {project.name}
                                  </Button>
                                ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-1">
                            {filterOptions?.tags
                              .filter((tag) => tag && tag.key)
                              .slice(0, 10)
                              .map((tag) => (
                                <Button
                                  key={tag.id}
                                  variant={
                                    filters.tags?.includes(tag.key)
                                      ? 'default'
                                      : 'outline'
                                  }
                                  size="sm"
                                  onClick={() => {
                                    if (filters.tags?.includes(tag.key)) {
                                      removeFilter('tags', tag.key);
                                    } else {
                                      addFilter('tags', tag.key);
                                    }
                                  }}
                                >
                                  {tag.key}: {tag.value}
                                </Button>
                              ))}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          sort?.length > 0 &&
                            'dark:text-green-400 text-green-700 hover:text-green-700 hover:bg-green-500/20 transition-[background-color] duration-100'
                        )}
                      >
                        <ListIcon className="size-4" />
                        <span className="hidden sm:block">
                          {sort.length > 0
                            ? t('sortedBy', { count: sort.length })
                            : t('sort')}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72">
                      <div className="space-y-2">
                        {['name', 'projects', 'quests'].map((key) => (
                          <div key={key} className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addSort(key, 'asc')}
                            >
                              {camelToProperCase(key)} ↑
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addSort(key, 'desc')}
                            >
                              {camelToProperCase(key)} ↓
                            </Button>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          <div className="flex flex-col gap-2">
            {!questId && Object.keys(filters).length > 0 && (
              <div className="flex gap-4 flex-1 items-center">
                <FilterIcon className="size-4 text-muted-foreground flex-shrink-0" />
                <div className="overflow-x-auto flex gap-2 scrollbar-none">
                  {Object.entries(filters).map(([filterType, values]) => {
                    if (typeof values === 'string') {
                      return (
                        <Badge
                          key={filterType}
                          variant="outline"
                          className="flex gap-2 items-center"
                        >
                          <span>
                            {camelToProperCase(filterType)}: {values}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeFilter(filterType as keyof FilterState)
                            }
                            className="size-5 rounded-sm"
                          >
                            <XIcon className="size-4" />
                          </Button>
                        </Badge>
                      );
                    }
                    return values.map((value: string) => {
                      let displayValue = value;
                      if (
                        filterType === 'projects' &&
                        filterOptions?.projects
                      ) {
                        const project = filterOptions.projects.find(
                          (p) => p?.id === value
                        );
                        displayValue = project?.name || value;
                      }

                      return (
                        <Badge
                          key={`${filterType}-${value}`}
                          variant="outline"
                          className="flex gap-2 items-center"
                        >
                          <span>
                            {camelToProperCase(filterType)}: {displayValue}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeFilter(
                                filterType as keyof FilterState,
                                value
                              )
                            }
                            className="size-5 rounded-sm"
                          >
                            <XIcon className="size-4" />
                          </Button>
                        </Badge>
                      );
                    });
                  })}
                </div>
              </div>
            )}

            {sort.length > 0 && (
              <div className="flex gap-4 flex-1 items-center">
                <ListIcon className="size-4 text-muted-foreground flex-shrink-0" />
                <div className="overflow-x-auto flex gap-2 scrollbar-none">
                  {sort.map((s) => (
                    <Badge
                      variant="secondary"
                      key={`${s.path}-${s.sort}`}
                      className="flex gap-1 items-center"
                    >
                      {camelToProperCase(s.path)}{' '}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSortDirection(s.path)}
                        className="size-5 rounded-sm outline-1"
                      >
                        {s.sort === 'desc' ? (
                          <ArrowDownWideNarrowIcon className="size-4" />
                        ) : (
                          <ArrowUpWideNarrowIcon className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSort(s.path)}
                        className="size-5 rounded-sm"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible>
        {assets?.map((asset, index) => (
          <AccordionItem
            key={`${asset.id}-${index}`}
            value={asset.id}
            className="first:border-t-0"
          >
            <AccordionTrigger>{asset.name}</AccordionTrigger>
            <AccordionContent>
              <AssetCard asset={asset} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex justify-end p-4 gap-2">
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => setPageSize(Number(value))}
        >
          <SelectTrigger className="h-9 w-fit *:data-[slot=select-value]:gap-2 gap-1">
            <SelectValue className="flex space-x-0">
              {t('rowsDisplay', { count: pageSize })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[20, 50, 100].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {t('rowsDisplay', { count: size })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={!((count ?? 0) > (page + 1) * pageSize)}
          onClick={() => setPage(page + 1)}
        >
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
