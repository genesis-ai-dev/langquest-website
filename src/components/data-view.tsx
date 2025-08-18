'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
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
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon
} from 'lucide-react';
import { createParser, parseAsInteger, useQueryState } from 'nuqs';
import { Spinner } from './spinner';
import { AudioButton } from './ui/audio-button';
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
import { getSupabaseCredentials } from '@/lib/supabase';
import { env } from '@/lib/env';

export interface Root {
  assets: {
    id: string;
    name: string;
    translations: {
      id: string;
      text: string;
      audio: string;
      votes: Vote[];
      target_language: TargetLanguage;
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
          source_language: SourceLanguage;
          target_language: TargetLanguage;
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

export interface TargetLanguage {
  id: string;
  english_name: string;
}

export interface Content {
  id: string;
  text: string;
  audio_id: string;
}

export interface Tag {
  tag: {
    id: string;
    name: string;
  };
}

export interface SourceLanguage {
  id: string;
  english_name: string;
}

export interface TargetLanguage {
  id: string;
  english_name: string;
}

interface FilterState {
  projects?: string[];
  quests?: string[];
  tags?: string[];
  sourceLanguage?: string;
  targetLanguage?: string;
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
  const credentials = getSupabaseCredentials(environment);

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

        // Step 1: Get filtered asset IDs using simpler queries
        let assetIds: string[] = [];

        if (questId) {
          // Filter by specific quest
          const { data: questAssets } = await supabase
            .from('quest_asset_link')
            .select('asset_id')
            .eq('quest_id', questId);
          assetIds = questAssets?.map((qa) => qa.asset_id) || [];
        } else if (projectId) {
          // Filter by specific project
          const { data: projectQuests } = await supabase
            .from('quest')
            .select('id')
            .eq('project_id', projectId);

          if (projectQuests?.length) {
            const questIds = projectQuests.map((q) => q.id);
            const { data: questAssets } = await supabase
              .from('quest_asset_link')
              .select('asset_id')
              .in('quest_id', questIds);
            assetIds = questAssets?.map((qa) => qa.asset_id) || [];
          }
        } else {
          // Apply project filter if any
          let filteredAssetIds: string[] = [];

          if (filters.projects?.length) {
            const { data: projectQuests } = await supabase
              .from('quest')
              .select('id')
              .in('project_id', filters.projects);

            if (projectQuests?.length) {
              const questIds = projectQuests.map((q) => q.id);
              const { data: questAssets } = await supabase
                .from('quest_asset_link')
                .select('asset_id')
                .in('quest_id', questIds);
              filteredAssetIds = questAssets?.map((qa) => qa.asset_id) || [];
            }
          }

          // Apply quest filter
          if (filters.quests?.length) {
            const { data: questAssets } = await supabase
              .from('quest_asset_link')
              .select('asset_id')
              .in('quest_id', filters.quests);
            const questFilteredIds =
              questAssets?.map((qa) => qa.asset_id) || [];

            if (filteredAssetIds.length > 0) {
              // Intersect with existing filters
              filteredAssetIds = filteredAssetIds.filter((id) =>
                questFilteredIds.includes(id)
              );
            } else {
              filteredAssetIds = questFilteredIds;
            }
          }

          // Apply tag filter
          if (filters.tags?.length) {
            const { data: tagAssets } = await supabase
              .from('asset_tag_link')
              .select('asset_id, tag!inner(name)')
              .in('tag.name', filters.tags);
            const tagFilteredIds = tagAssets?.map((ta) => ta.asset_id) || [];

            if (filteredAssetIds.length > 0) {
              // Intersect with existing filters
              filteredAssetIds = filteredAssetIds.filter((id) =>
                tagFilteredIds.includes(id)
              );
            } else {
              filteredAssetIds = tagFilteredIds;
            }
          }

          // Apply language filters
          if (filters.sourceLanguage || filters.targetLanguage) {
            let languageQuery = supabase
              .from('quest')
              .select(
                'id, project!inner(source_language!inner(english_name), target_language!inner(english_name))'
              );

            if (filters.sourceLanguage) {
              languageQuery = languageQuery.eq(
                'project.source_language.english_name',
                filters.sourceLanguage
              );
            }

            if (filters.targetLanguage) {
              languageQuery = languageQuery.eq(
                'project.target_language.english_name',
                filters.targetLanguage
              );
            }

            const { data: languageQuests } = await languageQuery;

            if (languageQuests?.length) {
              const questIds = languageQuests.map((q) => q.id);
              const { data: questAssets } = await supabase
                .from('quest_asset_link')
                .select('asset_id')
                .in('quest_id', questIds);
              const languageFilteredIds =
                questAssets?.map((qa) => qa.asset_id) || [];

              if (filteredAssetIds.length > 0) {
                // Intersect with existing filters
                filteredAssetIds = filteredAssetIds.filter((id) =>
                  languageFilteredIds.includes(id)
                );
              } else {
                filteredAssetIds = languageFilteredIds;
              }
            } else {
              // No quests match language criteria, return empty
              return { assets: [], count: 0 } as Root;
            }
          }

          // If no filters applied, get all assets
          if (
            filteredAssetIds.length === 0 &&
            Object.keys(filters).length === 0
          ) {
            const { data: allAssets } = await supabase
              .from('asset')
              .select('id');
            assetIds = allAssets?.map((a) => a.id) || [];
          } else {
            assetIds = filteredAssetIds;
          }
        }

        // Step 2: Get paginated asset data for the filtered IDs
        if (assetIds.length === 0) {
          return { assets: [], count: 0 } as Root;
        }

        const totalCount = assetIds.length;
        const paginatedIds = assetIds.slice(
          page * pageSize,
          (page + 1) * pageSize
        );

        if (paginatedIds.length === 0) {
          return { assets: [], count: totalCount } as Root;
        }

        let query = supabase
          .from('asset')
          .select(
            `
            id, 
            name, 
            images,
            translations:translation(id, text, audio, target_language:target_language_id(id, english_name), votes:vote(id, polarity)),
            content:asset_content_link(id, audio_id, text),
            tags:asset_tag_link(tag(id, name)),
            quests:quest_asset_link(quest(id, name, description, 
              project(id, name, description, source_language:language!source_language_id(id, english_name), target_language:language!target_language_id(id, english_name)),
              tags:quest_tag_link(tag(id, name))
            ))
          `
          )
          .in('id', paginatedIds);

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

        const { data: assets, error } = await query;

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
          count: totalCount
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

      const [projectsRes, questsRes, tagsRes, languagesRes] = await Promise.all(
        [
          supabase.from('project').select('id, name').order('name'),
          supabase
            .from('quest')
            .select('id, name, project:project_id(name)')
            .order('name'),
          supabase.from('tag').select('id, name').order('name'),
          supabase
            .from('language')
            .select('id, english_name')
            .order('english_name')
        ]
      );

      return {
        projects: projectsRes.data || [],
        quests: questsRes.data || [],
        tags: tagsRes.data || [],
        languages: languagesRes.data || []
      };
    }
  });

  const assets = data?.assets;
  const count = data?.count;

  const addFilter = (filterType: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]:
        filterType === 'sourceLanguage' || filterType === 'targetLanguage'
          ? value
          : [...(prev[filterType] || []), value]
    }));
    setPage(0); // Reset to first page when filtering
  };

  const removeFilter = (filterType: keyof FilterState, value?: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (filterType === 'sourceLanguage' || filterType === 'targetLanguage') {
        delete newFilters[filterType];
      } else if (value && newFilters[filterType]) {
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
                              .filter((tag) => tag && tag.name)
                              .slice(0, 10)
                              .map((tag) => (
                                <Button
                                  key={tag.id}
                                  variant={
                                    filters.tags?.includes(tag.name)
                                      ? 'default'
                                      : 'outline'
                                  }
                                  size="sm"
                                  onClick={() => {
                                    if (filters.tags?.includes(tag.name)) {
                                      removeFilter('tags', tag.name);
                                    } else {
                                      addFilter('tags', tag.name);
                                    }
                                  }}
                                >
                                  {tag.name}
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
              <div className="flex flex-col gap-8 p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 justify-between">
                    <h2 className="text-3xl font-bold">{asset.name}</h2>
                  </div>
                  <div className="flex gap-2">
                    {asset.tags?.map((tag) => (
                      <Badge
                        variant="outline"
                        key={
                          typeof tag.tag === 'string' ? tag.tag : tag.tag?.id
                        }
                      >
                        {typeof tag.tag === 'string'
                          ? tag.tag
                          : tag.tag?.name || 'Unknown Tag'}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Display images if available */}
                {asset.images && asset.images.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">
                      {t('images', { count: asset.images.length })}
                    </h3>
                    <Carousel className="w-full max-w-md">
                      <CarouselContent>
                        {asset.images.map((image, index) => (
                          <CarouselItem key={index}>
                            <img
                              src={image}
                              alt={`${asset.name} - Image ${index + 1}`}
                              className="w-full h-auto rounded-lg"
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  </div>
                )}

                {/* Display quests */}
                {asset.quests && asset.quests.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">
                      {t('quests', { count: asset.quests.length })}
                    </h3>
                    {asset.quests.map((questLink, index) =>
                      questLink.quest ? (
                        <div key={index} className="border p-4 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">
                                {questLink.quest.name || 'Unnamed Quest'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {questLink.quest.description}
                              </p>
                              <div className="mt-2">
                                <Badge variant="secondary">
                                  {t('project')}:{' '}
                                  {questLink.quest.project?.name ||
                                    'Unknown Project'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {questLink.quest.tags &&
                            questLink.quest.tags.length > 0 && (
                              <div className="mt-2 flex gap-1">
                                {questLink.quest.tags.map((tag, tagIndex) => (
                                  <Badge variant="outline" key={tagIndex}>
                                    {tag.tag?.name || 'Unknown Tag'}
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {/* Display source content */}
                {asset.content && asset.content.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">
                      {t('sourceContent', { count: asset.content.length })}
                    </h3>
                    <Accordion type="single" collapsible>
                      {asset.content.map((content, index) => (
                        <AccordionItem key={index} value={content.id}>
                          <AccordionTrigger>
                            {content.text || t('noText')}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-col gap-2">
                              <p>{content.text}</p>
                              {content.audio_id && (
                                <AudioButton
                                  src={`${credentials.url.replace(/\/$/, '')}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_BUCKET}/${content.audio_id}`}
                                  className="h-8 w-8"
                                />
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                {/* Display translations */}
                {asset.translations && asset.translations.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">
                      {t('translations', { count: asset.translations.length })}
                    </h3>
                    <Accordion type="single" collapsible>
                      {asset.translations.map((translation, index) => (
                        <AccordionItem key={index} value={translation.id}>
                          <AccordionTrigger>
                            <div className="flex justify-between items-center w-full mr-4">
                              <span>
                                {translation.text || t('noText')} (
                                {translation.target_language.english_name})
                              </span>
                              <div className="flex gap-4 items-center">
                                <div className="flex gap-1 items-center tabular-nums">
                                  <ThumbsUpIcon className="size-4" />
                                  {
                                    translation.votes.filter(
                                      (vote) => vote.polarity === 'up'
                                    ).length
                                  }
                                </div>
                                <div className="flex gap-1 items-center tabular-nums">
                                  <ThumbsDownIcon className="size-4" />
                                  {
                                    translation.votes.filter(
                                      (vote) => vote.polarity === 'down'
                                    ).length
                                  }
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-col gap-2">
                              <p>{translation.text}</p>
                              <div className="flex gap-2 items-center">
                                {translation.audio && (
                                  <AudioButton
                                    src={translation.audio}
                                    className="h-8 w-8"
                                  />
                                )}
                                <div className="flex gap-4 items-center">
                                  <div className="flex gap-1 items-center tabular-nums">
                                    <ThumbsUpIcon className="size-4" />
                                    {
                                      translation.votes.filter(
                                        (vote) => vote.polarity === 'up'
                                      ).length
                                    }
                                  </div>
                                  <div className="flex gap-1 items-center tabular-nums">
                                    <ThumbsDownIcon className="size-4" />
                                    {
                                      translation.votes.filter(
                                        (vote) => vote.polarity === 'down'
                                      ).length
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </div>
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
