"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import jsonata from "jsonata";
import {
  ArrowDownWideNarrowIcon,
  ArrowUpWideNarrowIcon,
  FilterIcon,
  ListIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon
} from "lucide-react";
import { createParser, parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { Spinner } from "./spinner";
import { AudioButton } from "./ui/audio-button";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";

const pathMap = {
  Name: "name",
  // Text: "translations.text",
  // Votes: "translations.votes.polarity",
  // Tags: "tags.name",
  Tags: "tags.tag.name",
  Quests: "quests.quest.name",
  Project: "quests.quest.project.name",
  "Source Language": "quests.quest.project.source_language.english_name",
  "Target Language": "quests.quest.project.target_language.english_name"
};

const parseAsSorting = createParser({
  parse(queryValue) {
    if (!queryValue) return [];
    try {
      return queryValue.split(",").map((part) => {
        const [path, direction] = part.split(":");
        return {
          path: path as keyof typeof pathMap,
          sort: direction as "asc" | "desc"
        };
      });
    } catch (error) {
      return [];
    }
  },
  serialize(value) {
    if (!value?.length) return "";
    return value
      .map((sort) => `${sort.path.toLowerCase()}:${sort.sort}`)
      .join(",");
  },
  eq(a, b) {
    return a.length === b.length;
  }
});

export function DataView() {
  const [pageSize, setPageSize] = useQueryState(
    "size",
    parseAsInteger.withDefault(50)
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(0));

  const {
    data: assets,
    isLoading,
    error
  } = useQuery({
    queryKey: ["assets", page, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset")
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
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return data.map((asset) => ({
        ...asset,
        images: asset.images
          ? (JSON.parse(asset.images) as string[])
          : undefined
      }));
    }
  });

  const [filter, setFilter] = useState<
    { path: keyof typeof pathMap; value: string }[]
  >([]);
  const [sort, setSort] = useQueryState<
    { path: keyof typeof pathMap; sort: "asc" | "desc" }[]
  >("sort", parseAsSorting.withDefault([]));

  const [selectedFilter, setSelectedFilter] = useState<keyof typeof pathMap>();

  const [selectedFilterPathResults, setSelectedFilterPathResults] = useState<
    string[]
  >([]);
  const [selectedTagResults, setSelectedTagResults] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedFilter) return;
    jsonata(pathMap[selectedFilter])
      .evaluate(assets)
      .then((result) => {
        const uniqueResult = Array.from(new Set(result));
        setSelectedFilterPathResults(uniqueResult as string[]);
      });
  }, [selectedFilter, assets]);

  const filterAssets = async () => {
    if (!assets) return [];
    if (!filter.length && !sort.length) return assets;
    const computedPath = `$[${filter.reduce((acc, { path, value }) => {
      return `${acc ? `${acc} and ` : ""}${
        path === "Tags"
          ? `"${value}" in ${pathMap[path]}`
          : `${pathMap[path]} = "${value}"`
      }`;
    }, "")}]${sort
      .map(
        ({ path, sort }) =>
          `${sort === "asc" ? `^(${pathMap[path]})` : `^(>$.${pathMap[path]})`}`
      )
      .join("")}`;
    console.log(computedPath);
    const result = (await jsonata(computedPath).evaluate(assets)) as
      | ({
          sequence: number;
        } & typeof assets)
      | undefined;
    if (result) delete (result as Partial<typeof result>).sequence;
    console.log(result);
    return result;
  };

  const [filteredAssets, setFilteredAssets] = useState<typeof assets>([]);

  useEffect(() => {
    filterAssets().then((result) => {
      setFilteredAssets(typeof result === "object" ? result : []);
    });
  }, [filter, sort, assets]);

  /*
    {
    "id": "17f6f122-e655-48fe-b02f-f09723a17d59",
    "name": "Lucas 1:2 (Zapoteco)",
    "images": null,
    "translations": [
        {
            "id": "38003a13-ec16-99cf-1973-c6bf864f63a8",
            "text": "Randall's translation",
            "audio": null,
            "votes": []
        },
        {
            "id": "d1ffcd12-9925-1f1b-98e4-8f0adb664bc3",
            "text": "Caleb's translation",
            "audio": null,
            "votes": []
        },
        {
            "id": "dcfeb818-0dd8-5648-c60d-936401a04113",
            "text": "Milhouse's translation",
            "audio": null,
            "votes": [
                {
                    "id": "102a2706-b365-1070-8abc-49a5eaef2dc4",
                    "polarity": "up"
                },
                {
                    "id": "f4e12b53-c293-7a4b-cae9-ffd469c1230f",
                    "polarity": "down"
                }
            ]
        },
        {
            "id": "40d0e9ea-5a54-9788-ac2d-4ec2591fb25c",
            "text": "Test audio recording - two parts with pause between",
            "audio": "d7659e4c-b00e-4ebc-870d-1ffcd10ac041",
            "votes": []
        },
        {
            "id": "da0085b7-55f1-b0e1-3107-784086e49fd3",
            "text": "Keean",
            "audio": "d1cac465-4884-4cfc-9381-e5b171875a8e",
            "votes": []
        },
        {
            "id": "3061b4b0-cc57-1592-bbc5-6e7eadfa8e76",
            "text": "Pause test",
            "audio": "6f1dcec7-50a5-40dc-aad6-8a291b3a6b86",
            "votes": [
                {
                    "id": "ef2cb471-3763-4da6-a1b7-bf7aa7ab82fc",
                    "polarity": "up"
                },
                {
                    "id": "2f359fb4-2a9d-b450-7993-4b0e46949343",
                    "polarity": "down"
                },
                {
                    "id": "e21209a8-e126-f157-f6dd-a9e350a55da9",
                    "polarity": "up"
                }
            ]
        },
        {
            "id": "d0700730-bc1d-d6f9-6520-514982f81fb5",
            "text": "RLS test",
            "audio": "05ca2661-fa46-4203-b096-e7bdf77e07e6",
            "votes": []
        },
        {
            "id": "32385bec-9f14-4241-9229-4ce4420b020c",
            "text": "No audio test with RLS active",
            "audio": null,
            "votes": []
        },
        {
            "id": "3552fdfd-bd79-1295-ee07-386e4a961734",
            "text": "",
            "audio": "f4c304a6-e0c1-4c91-bbd6-073c2d6c7ec7",
            "votes": []
        },
        {
            "id": "edf5d415-b64a-16dd-d32d-96686202a2da",
            "text": "",
            "audio": "432012bd-87f4-43db-be4e-8a7512b800a4",
            "votes": []
        }
    ],
    "asset_content_link": [
        {
            "id": "d81273c4-35d6-422b-93bb-df3e2439270e",
            "text": "Tal como nos lo transmitieron por aquellos que lo vieron desde el principio y fueron predicadores de la palabra, (BES)",
            "audio_id": "ec4737e7-b417-4205-8b9d-ada2622dcb56_LUK_1_2_BES"
        }
    ],
    "asset_tag_link": [
        {
            "tag": {
                "id": "683e00e2-7136-4431-9e55-021234b8b6e9",
                "name": "Libro:Lucas"
            }
        },
        {
            "tag": {
                "id": "85e2355b-7d57-47b5-bdfb-8fe46e8b1f41",
                "name": "Capítulo:1"
            }
        },
        {
            "tag": {
                "id": "62397bd8-d56e-4c29-8388-2d399f7cd000",
                "name": "Versículo:2"
            }
        }
    ],
    "quest_asset_link": [
        {
            "quest": {
                "id": "97d398d9-4737-44f1-a9da-fe3f988e193a",
                "name": "Lucas 1:1-5 (Zapoteco)",
                "quest_tag_link": [
                    {
                        "tag": {
                            "id": "683e00e2-7136-4431-9e55-021234b8b6e9",
                            "name": "Libro:Lucas"
                        }
                    },
                    {
                        "tag": {
                            "id": "85e2355b-7d57-47b5-bdfb-8fe46e8b1f41",
                            "name": "Capítulo:1"
                        }
                    }
                ]
            }
        }
    ]
}
  */

  const [popoverOpen, setPopoverOpen] = useState(false);

  if (isLoading)
    return (
      <div className="flex w-full h-full items-center justify-center">
        <Spinner />
      </div>
    );
  if (error) return <div>Error loading assets: {error.message}</div>;
  if (!assets) return <div>No assets found.</div>;

  return (
    <div className="whitespace-pre-wrap px-8 py-4 max-w-200 mx-auto flex flex-col">
      {(!!filter.length || !!sort.length) && (
        <h1 className="font-semibold">Assets</h1>
      )}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-4">
        <div className="flex gap-8 items-top justify-between">
          {!filter.length && !sort.length && (
            <h1 className="font-semibold">Assets</h1>
          )}
          {!!(filter.length || sort.length) && (
            <div className="flex gap-2 flex-wrap justify-start">
              {filter.map(({ path, value }) => (
                <Badge
                  variant="outline"
                  key={`${path.toLowerCase()}-${value.toLowerCase()}`}
                  className="flex gap-2 items-center"
                >
                  <span>
                    <span className="hidden sm:inline">{path}: </span>
                    {value}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setFilter(filter.filter((f) => f.path !== path))
                    }
                    className="size-5 rounded-sm"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </Badge>
              ))}
              {sort.map((s) => (
                <Badge
                  variant="secondary"
                  key={`${s.path.toLowerCase()}-${s.sort.toLowerCase()}`}
                  className="flex gap-2 items-center"
                >
                  {s.path}:{" "}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setSort(
                        sort.map((f) =>
                          f.path === s.path
                            ? { ...f, sort: f.sort === "asc" ? "desc" : "asc" }
                            : f
                        )
                      )
                    }
                    className="size-5 rounded-sm"
                  >
                    {s.sort === "asc" ? (
                      <ArrowDownWideNarrowIcon className="size-4" />
                    ) : (
                      <ArrowUpWideNarrowIcon className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setSort(sort.filter((f) => f.path !== s.path))
                    }
                    className="size-5 rounded-sm"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2 flex-1 justify-end">
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-fit *:data-[slot=select-value]:gap-0">
                <SelectValue className="flex space-x-0">
                  {pageSize} <span className="hidden sm:block">rows</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[50, 100, 200].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover
              open={popoverOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedFilter(undefined);
                  setSelectedFilterPathResults([]);
                  setSelectedTagResults([]);
                }
                setPopoverOpen(open);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    filter?.length > 0 &&
                      "dark:text-green-400 text-green-700 hover:text-green-700 hover:bg-green-500/20 transition-[background-color] duration-100"
                  )}
                >
                  <FilterIcon className="size-4" />
                  <span className="hidden sm:block">
                    {filter.length > 0
                      ? `Filtered by ${filter.length} rule(s)`
                      : "Filter"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="flex gap-2 flex-wrap w-85 justify-end"
              >
                {!selectedFilter &&
                  Object.keys(pathMap)
                    .sort()
                    .reverse()
                    .map((key) => (
                      <Button
                        variant="outline"
                        key={key}
                        onClick={() =>
                          setSelectedFilter(key as keyof typeof pathMap)
                        }
                      >
                        {key}
                      </Button>
                    ))}
                {selectedFilter &&
                  !selectedTagResults.length &&
                  Array.from(
                    new Set(
                      selectedFilterPathResults.map(
                        (value) => value.split(":")[0]
                      )
                    )
                  ).map((value, index) => (
                    <Button
                      variant="outline"
                      key={index}
                      onClick={() => {
                        if (selectedFilter === "Tags") {
                          setSelectedTagResults(
                            Array.from(
                              new Set(
                                selectedFilterPathResults.filter((v) =>
                                  v.startsWith(value)
                                )
                              )
                            )
                          );
                        } else {
                          setFilter([
                            ...filter.filter((f) => f.path !== selectedFilter),
                            { path: selectedFilter, value }
                          ]);
                          setSelectedFilter(undefined);
                          setSelectedFilterPathResults([]);
                        }
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
                      onClick={() => {
                        setFilter([...filter, { path: selectedFilter, value }]);
                      }}
                    >
                      {value.split(":")[1]}
                    </Button>
                  ))}
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    sort?.length > 0 &&
                      "dark:text-green-400 text-green-700 hover:text-green-700 hover:bg-green-500/20 transition-[background-color] duration-100"
                  )}
                >
                  <ListIcon className="size-4" />
                  <span className="hidden sm:block">
                    {sort.length > 0
                      ? `Sorted by ${sort.length} rule(s)`
                      : "Sort"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="flex gap-2 flex-wrap w-85 justify-end"
              >
                {!selectedFilter &&
                  Object.keys(pathMap)
                    .filter((key) => key !== "Tags")
                    .sort()
                    .reverse()
                    .map((key) => (
                      <Button
                        variant="outline"
                        key={key}
                        onClick={() =>
                          setSort([
                            ...sort.filter((s) => s.path !== key),
                            { path: key as keyof typeof pathMap, sort: "asc" }
                          ])
                        }
                      >
                        {key}
                      </Button>
                    ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      <Accordion type="single" collapsible>
        {filteredAssets?.map((asset, index) => (
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
                          asset.quests?.length === 1 && "col-span-2"
                        }`}
                        key={`${quest.quest.id}-${asset.id}`}
                      >
                        <div className="flex flex-col gap-6">
                          <div>
                            <span className="flex flex-1 text-lg font-semibold">
                              {quest.quest.name}
                            </span>
                            <span className="text-secondary-foreground">
                              {quest.quest.project.source_language.english_name}{" "}
                              →{" "}
                              {quest.quest.project.target_language.english_name}
                            </span>
                          </div>
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-2">
                                <span className="font-semibold w-20">
                                  Description
                                </span>{" "}
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

                            <div>
                              <div className="flex gap-2">
                                <span className="font-semibold w-20">
                                  Project
                                </span>{" "}
                                <span className="text-muted-foreground">
                                  {quest.quest.project.name}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-semibold w-20">
                                  Description
                                </span>{" "}
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
                          asset.content?.length === 1 && "col-span-2"
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
                    <h3 className="text-md font-bold">
                      Translations ({asset.translations?.length})
                    </h3>
                  )}
                  <div className="flex flex-col gap-2">
                    {asset.translations?.map((translation) => (
                      <div
                        key={translation.id}
                        className="flex justify-between w-full gap-2 px-2 items-center h-10 bg-secondary/30 rounded-md"
                      >
                        <span
                          className={cn(
                            !translation.text &&
                              "text-muted-foreground italic truncate"
                          )}
                        >
                          {!!translation.text
                            ? translation.text
                            : "[No text]"}{" "}
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
                                  (vote) => vote.polarity === "up"
                                ).length
                              }
                            </div>
                            <div className="flex gap-1 items-center tabular-nums">
                              <ThumbsDownIcon className="size-4" />
                              {
                                translation.votes.filter(
                                  (vote) => vote.polarity === "down"
                                ).length
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
