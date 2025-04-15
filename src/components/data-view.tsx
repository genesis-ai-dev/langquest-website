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
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase/client';
import { camelToProperCase, cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import jsonata from 'jsonata';
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
import { useEffect, useState } from 'react';
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

const pathMap = {
  name: 'name',
  // Text: "translations.text",
  // Votes: "translations.votes.polarity",
  // Tags: "tags.name",
  tags: 'tags.tag.name',
  quests: 'quests.quest.name',
  projects: 'quests.quest.project.name',
  sourceLanguage: 'quests.quest.project.source_language.english_name',
  targetLanguage: 'quests.quest.project.target_language.english_name'
};

const parseAsSorting = createParser({
  parse(queryValue) {
    if (!queryValue) return [];
    try {
      return queryValue.split(',').map((part) => {
        const [path, direction] = part.split(':');
        return {
          path: path as keyof typeof pathMap,
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

export function DataView() {
  const [pageSize, setPageSize] = useQueryState(
    'size',
    parseAsInteger.withDefault(20)
  );
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(0));

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', page, pageSize],
    queryFn: async () => {
      const { data, error, count } = await supabase
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
        `,
          { count: 'exact' }
        )
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return {
        assets: data.map((asset) => ({
          ...asset,
          images: asset.images
            ? (JSON.parse(asset.images) as string[])
            : undefined
        })),
        count
      };
    }
  });

  const assets = data?.assets;
  const count = data?.count;

  const [filter, setFilter] = useState<
    { path: keyof typeof pathMap; value: string }[]
  >([]);
  const [sort, setSort] = useQueryState<
    { path: keyof typeof pathMap; sort: 'asc' | 'desc' }[]
  >('sort', parseAsSorting.withDefault([]));

  const [selectedFilter, setSelectedFilter] = useState<keyof typeof pathMap>();
  const [selectedSort, setSelectedSort] = useState<keyof typeof pathMap>();

  const [selectedFilterPathResults, setSelectedFilterPathResults] = useState<
    string[]
  >([]);
  const [selectedTagResults, setSelectedTagResults] = useState<string[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<typeof assets>();

  useEffect(() => {
    if (!selectedFilter || !assets) return;
    jsonata(pathMap[selectedFilter])
      .evaluate(assets)
      .then((result) => {
        const uniqueResult = Array.from(new Set(result));
        setSelectedFilterPathResults(uniqueResult as string[]);
      });
  }, [selectedFilter, assets]);

  const filterAndSortAssets = async (
    assetsToFilter: typeof assets,
    toFilter: typeof filter,
    toSort: typeof sort
  ) => {
    const copiedSort = [...toSort];
    const computedPath = `$[${toFilter.reduce((acc, { path, value }) => {
      return `${acc ? `${acc} and ` : ''}${
        path === 'tags'
          ? `"${value}" in ${pathMap[path]}`
          : `${pathMap[path]} = "${value}"`
      }`;
    }, '')}]${copiedSort
      .reverse()
      .map(
        ({ path, sort }) =>
          `${sort === 'asc' ? `^(${pathMap[path]})` : `^(>$.${pathMap[path]})`}`
      )
      .join('')}`;
    const result = (await jsonata(computedPath).evaluate(assetsToFilter)) as
      | ({
          sequence: number;
        } & typeof assetsToFilter)
      | undefined;
    if (result) delete (result as Partial<typeof result>).sequence;
    console.log(computedPath);
    return result;
  };

  const addFilter = (path: keyof typeof pathMap, value: string) => {
    const newFilter = [
      ...filter.filter((f) => f.path !== path),
      { path, value }
    ];
    setFilter(newFilter);
    filterAndSortAssets(assets, newFilter, sort).then(setFilteredAssets);
  };

  const removeFilter = (path: keyof typeof pathMap) => {
    const newFilter = filter.filter((f) => f.path !== path);
    setFilter(newFilter);
    if (!newFilter.length && !sort.length) setFilteredAssets(undefined);
    else filterAndSortAssets(assets, newFilter, sort).then(setFilteredAssets);
  };

  const addSort = (path: keyof typeof pathMap, direction: 'asc' | 'desc') => {
    const newSort = [
      ...sort.filter((s) => s.path !== path),
      { path, sort: direction }
    ];
    setSort(newSort);
    filterAndSortAssets(assets, filter, newSort).then(setFilteredAssets);
  };

  const removeSort = (path: keyof typeof pathMap) => {
    const newSort = sort.filter((s) => s.path !== path);
    setSort(newSort);
    if (!newSort.length && !filter.length) setFilteredAssets(undefined);
    else filterAndSortAssets(assets, filter, newSort).then(setFilteredAssets);
  };

  const toggleSortDirection = (path: keyof typeof pathMap) => {
    const newSort = sort.map((f) =>
      f.path === path
        ? ({ ...f, sort: f.sort === 'asc' ? 'desc' : 'asc' } as const)
        : f
    );
    console.log(newSort);
    setSort(newSort);
    filterAndSortAssets(assets, filter, newSort).then(setFilteredAssets);
  };

  if (isLoading)
    return (
      <div className="flex w-full h-full items-center justify-center">
        <Spinner />
      </div>
    );
  if (error) return <div>Error loading assets: {error.message}</div>;
  if (!assets) return <div>No assets found.</div>;

  return (
    <div className="whitespace-pre-wrap px-8 py-4 max-w-200 mx-auto flex flex-col scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4">
        <div className="flex gap-2 items-top flex-col">
          <div className="flex gap-2 items-center">
            <h1 className="font-semibold">Assets</h1>
            <div className="flex flex-1 justify-end gap-2">
              <Popover
                onOpenChange={(open) => {
                  if (!open) {
                    setSelectedFilter(undefined);
                    setSelectedFilterPathResults([]);
                    setSelectedTagResults([]);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      filter?.length > 0 &&
                        'dark:text-green-400 text-green-700 hover:text-green-700 hover:bg-green-500/20 transition-[background-color] duration-100'
                    )}
                  >
                    <FilterIcon className="size-4" />
                    <span className="hidden sm:block">
                      {filter.length > 0
                        ? `Filtered by ${filter.length} rule(s)`
                        : 'Filter'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="flex gap-2 flex-wrap w-72 justify-end"
                >
                  {!selectedFilter &&
                    Object.keys(pathMap)
                      .filter((key) => key !== 'name')
                      .sort()
                      .map((key) => (
                        <Button
                          variant="outline"
                          key={key}
                          onClick={() =>
                            setSelectedFilter(key as keyof typeof pathMap)
                          }
                        >
                          {camelToProperCase(key)}
                        </Button>
                      ))}
                  {selectedFilter &&
                    !selectedTagResults.length &&
                    Array.from(
                      new Set(
                        selectedFilterPathResults.map((value) =>
                          selectedFilter === 'tags'
                            ? value.split(':')[0]
                            : value
                        )
                      )
                    ).map((value, index) => (
                      <Button
                        variant="outline"
                        key={index}
                        onClick={() => {
                          if (selectedFilter === 'tags') {
                            setSelectedTagResults(
                              Array.from(
                                new Set(
                                  selectedFilterPathResults.filter((v) =>
                                    v.startsWith(value)
                                  )
                                )
                              )
                            );
                          } else addFilter(selectedFilter, value);
                        }}
                      >
                        {value}
                      </Button>
                    ))}
                  {selectedFilter &&
                    selectedTagResults.map((value, index) => (
                      <Button
                        variant="outline"
                        key={index}
                        onClick={() => addFilter(selectedFilter, value)}
                      >
                        {value.split(':')[1]}
                      </Button>
                    ))}
                </PopoverContent>
              </Popover>
              <Popover
                onOpenChange={(open) => {
                  if (!open) {
                    setSelectedSort(undefined);
                  }
                }}
              >
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
                        ? `Sorted by ${sort.length} rule(s)`
                        : 'Sort'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="flex gap-2 flex-wrap w-72 justify-end"
                >
                  {!selectedSort &&
                    Object.keys(pathMap)
                      .filter((key) => key !== 'tags')
                      .sort()
                      .reverse()
                      .map((key) => (
                        <Button
                          variant="outline"
                          key={key}
                          onClick={() =>
                            setSelectedSort(key as keyof typeof pathMap)
                          }
                        >
                          {camelToProperCase(key)}
                        </Button>
                      ))}
                  {selectedSort && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => addSort(selectedSort, 'asc')}
                      >
                        Ascending
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => addSort(selectedSort, 'desc')}
                      >
                        Descending
                      </Button>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {!!filter.length && (
              <div className="flex gap-4 flex-1 items-center">
                <FilterIcon className="size-4 text-muted-foreground flex-shrink-0" />
                <div className="overflow-x-auto flex gap-2 scrollbar-none">
                  {filter.map(({ path, value }) => (
                    <Badge
                      variant="outline"
                      key={`${path.toLowerCase()}-${value.toLowerCase()}`}
                      className="flex gap-2 items-center"
                    >
                      <span>
                        <span className="hidden sm:inline">
                          {camelToProperCase(path)}:{' '}
                        </span>
                        {value}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFilter(path)}
                        className="size-5 rounded-sm"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {!!sort.length && (
              <div className="flex gap-4 flex-1 items-center">
                <ListIcon className="size-4 text-muted-foreground flex-shrink-0" />
                <div className="overflow-x-auto flex gap-2 scrollbar-none">
                  {sort.map((s) => (
                    <Badge
                      variant="secondary"
                      key={`${s.path.toLowerCase()}-${s.sort.toLowerCase()}`}
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
        {(filteredAssets ?? assets)?.map((asset, index) => (
          <AccordionItem
            key={`${asset.id}-${index}`}
            value={asset.id}
            // className="hover:bg-secondary/30"
            className="first:border-t-0"
          >
            <AccordionTrigger>{asset.name}</AccordionTrigger>
            <AccordionContent>
              {/* <pre>{JSON.stringify(asset, undefined, 4)}</pre> */}
              <div className="flex flex-col gap-8 p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 justify-between">
                    <h2 className="text-3xl font-bold">{asset.name}</h2>
                  </div>
                  <div className="flex gap-2">
                    {asset.tags?.map((tag) => (
                      <Badge variant="outline" key={tag.tag.id}>
                        {tag.tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                {asset.images && asset.images.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold">
                      Images ({asset.images.length})
                    </h3>
                    <Carousel
                      opts={{
                        loop: true
                      }}
                    >
                      <CarouselContent>
                        {asset.images.map((image: string, index: number) => (
                          <CarouselItem key={index} className="basis-1/2">
                            <img
                              src={
                                supabase.storage
                                  .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                                  .getPublicUrl(image).data.publicUrl
                              }
                              alt={`Image ${index + 1}`}
                              className="w-full aspect-video object-cover rounded-lg"
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="absolute left-5" />
                      <CarouselNext className="absolute right-5" />
                    </Carousel>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold">
                    Quests ({asset.quests?.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {asset.quests?.map((quest) => (
                      <div
                        className={`flex flex-col gap-2 bg-secondary/30 p-4 rounded-md w-full ${
                          asset.quests?.length === 1 && 'col-span-2'
                        }`}
                        key={`${quest.quest.id}-${asset.id}`}
                      >
                        <div className="flex flex-col gap-6">
                          <div>
                            <span className="flex flex-1 text-lg font-semibold">
                              {quest.quest.name}
                            </span>
                            <span className="text-secondary-foreground">
                              {quest.quest.project.source_language.english_name}{' '}
                              →{' '}
                              {quest.quest.project.target_language.english_name}
                            </span>
                          </div>
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-2">
                                <span className="font-semibold w-20">
                                  Description
                                </span>{' '}
                                <span className="text-muted-foreground">
                                  {quest.quest.description}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-semibold w-20">
                                  Tags ({quest.quest.tags.length})
                                </span>
                                {quest.quest.tags.map((tag) => (
                                  <Badge variant="outline" key={tag.tag.id}>
                                    {tag.tag.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex gap-2">
                                <span className="font-semibold w-20">
                                  Project
                                </span>{' '}
                                <span className="text-muted-foreground">
                                  {quest.quest.project.name}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-semibold w-20">
                                  Description
                                </span>{' '}
                                <span className="text-muted-foreground">
                                  {quest.quest.project.description}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold">
                    Source Content ({asset.content?.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {asset.content?.map((content) => (
                      <div
                        className={`flex gap-2 bg-secondary/30 p-4 rounded-md w-full ${
                          asset.content?.length === 1 && 'col-span-2'
                        }`}
                        key={content.id}
                      >
                        <p className="flex flex-1">{content.text}</p>
                        {content.audio_id && (
                          <AudioButton
                            src={
                              supabase.storage
                                .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                                .getPublicUrl(content.audio_id).data.publicUrl
                            }
                            className="shrink-0"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {asset.translations?.length > 0 && (
                    <Accordion type="single" collapsible>
                      <AccordionItem
                        value={asset.id}
                        className="bg-secondary/30 border-none rounded-lg"
                      >
                        <AccordionTrigger>
                          <h3 className="text-md font-bold">
                            Translations ({asset.translations?.length})
                          </h3>
                        </AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-2 pb-4 px-4">
                          {asset.translations?.map((translation) => (
                            <div
                              key={translation.id}
                              className="flex justify-between w-full gap-2 px-2 items-center h-10 bg-secondary/50 rounded-md"
                            >
                              <span
                                className={cn(
                                  !translation.text &&
                                    'text-muted-foreground italic truncate'
                                )}
                              >
                                {!!translation.text
                                  ? translation.text
                                  : '[No text]'}{' '}
                              </span>
                              <div className="flex gap-4 items-center">
                                <span className="text-muted-foreground text-nowrap">
                                  {translation.target_language.english_name}
                                </span>
                                {translation.audio && (
                                  <AudioButton
                                    src={
                                      supabase.storage
                                        .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                                        .getPublicUrl(translation.audio).data
                                        .publicUrl
                                    }
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
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
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
          <SelectTrigger className="h-9 w-fit *:data-[slot=select-value]:gap-0">
            <SelectValue className="flex space-x-0">
              {pageSize} <span className="hidden sm:block">rows</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[20, 50, 100].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size} rows
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
