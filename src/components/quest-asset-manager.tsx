'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';
import { toast } from 'sonner';
import { Search, Plus, X, Filter, ListFilter, FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useMediaQuery } from '@/hooks/use-media-query';
import { env } from '@/lib/env';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';

interface QuestAssetManagerProps {
  questId: string;
  onSuccess?: () => void;
  onAddNewAsset: () => void;
}

export function QuestAssetManager({
  questId,
  onSuccess,
  onAddNewAsset
}: QuestAssetManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState<string | null>(null);

  // Check if the device is mobile
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Fetch quest details
  const { data: quest, isLoading: questLoading } = useQuery({
    queryKey: ['quest-details', questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quest')
        .select(
          `
          id, 
          name, 
          description,
          project:project_id(
            id,
            name,
            source_language:source_language_id(english_name),
            target_language:target_language_id(english_name)
          )
        `
        )
        .eq('id', questId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!questId
  });

  // Fetch assets already linked to this quest
  const {
    data: linkedAssets,
    isLoading: linkedAssetsLoading,
    refetch: refetchLinkedAssets,
    error: linkedAssetsError
  } = useQuery({
    queryKey: ['quest-assets', questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quest_asset_link')
        .select(
          `
          asset_id,
          asset:asset_id(
            id,
            name,
            images,
            source_language:source_language_id(english_name),
            content:asset_content_link(id, text),
            tags:asset_tag_link(
              tag:tag_id(id, name)
            )
          )
        `
        )
        .eq('quest_id', questId);

      if (error) throw error;
      return data;
    },
    enabled: !!questId
  });

  // Fetch all assets for search
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError
  } = useQuery({
    queryKey: ['asset-search', searchTerm, questId, activeTab],
    queryFn: async () => {
      let query = supabase.from('asset').select(`
          id,
          name,
          images,
          source_language:source_language_id(english_name),
          content:asset_content_link(id, text),
          tags:asset_tag_link(
            tag:tag_id(id, name)
          )
        `);

      // Add search filter if search term is provided
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      // Filter by tab if not "all"
      if (activeTab === 'images') {
        query = query.not('images', 'is', null);
      } else if (activeTab === 'text') {
        query = query.not('content', 'is', null);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return data;
    },
    enabled: isSheetOpen // Only fetch when sheet is open
  });

  // Initialize selected assets with already linked assets
  useEffect(() => {
    if (linkedAssets) {
      setSelectedAssets(linkedAssets.map((link) => link.asset_id));
    }
  }, [linkedAssets]);

  // Handle errors
  useEffect(() => {
    if (linkedAssetsError) {
      setError('Failed to load linked assets');
      toast.error('Failed to load linked assets');
    } else if (searchError) {
      setError('Failed to search assets');
      toast.error('Failed to search assets');
    } else {
      setError(null);
    }
  }, [linkedAssetsError, searchError]);

  // Handle asset selection
  const toggleAssetSelection = useCallback((assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  }, []);

  // Handle saving asset links
  const saveAssetLinks = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Get current linked assets
      const currentLinkedAssetIds =
        linkedAssets?.map((link) => link.asset_id) || [];

      // Assets to add (in selected but not in current)
      const assetsToAdd = selectedAssets.filter(
        (id) => !currentLinkedAssetIds.includes(id)
      );

      // Assets to remove (in current but not in selected)
      const assetsToRemove = currentLinkedAssetIds.filter(
        (id) => !selectedAssets.includes(id)
      );

      // Add new links
      if (assetsToAdd.length > 0) {
        const newLinks = assetsToAdd.map((assetId) => ({
          quest_id: questId,
          asset_id: assetId,
          active: true
        }));

        const { error: addError } = await supabase
          .from('quest_asset_link')
          .insert(newLinks);

        if (addError) throw addError;
      }

      // Remove old links
      if (assetsToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('quest_asset_link')
          .delete()
          .eq('quest_id', questId)
          .in('asset_id', assetsToRemove);

        if (removeError) throw removeError;
      }

      toast.success('Assets updated successfully');
      setIsSheetOpen(false);
      refetchLinkedAssets();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating assets:', error);
      setError('Failed to update assets');
      toast.error('Failed to update assets');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get asset preview text (first 50 characters of first content item)
  const getAssetPreview = (asset: any) => {
    if (!asset.content || asset.content.length === 0) return 'No content';
    return (
      asset.content[0]?.text?.substring(0, 50) +
        (asset.content[0]?.text?.length > 50 ? '...' : '') || 'No text'
    );
  };

  // Check if an asset is already linked to this quest
  const isAssetLinked = useCallback(
    (assetId: string) => {
      return selectedAssets.includes(assetId);
    },
    [selectedAssets]
  );

  // Reset search and filters when sheet opens/closes
  const handleOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSearchTerm('');
      setActiveTab('all');
    }
  };

  // Render asset table
  const renderAssetTable = () => (
    <div className="flex flex-col gap-4 h-full">
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search assets by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchTerm('');
            setActiveTab('all');
          }}
          disabled={!searchTerm && activeTab === 'all'}
        >
          <Filter className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="flex-1 w-full overflow-hidden">
        <ScrollArea className="h-full rounded-md border">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] sticky left-0 bg-background z-10">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead className="w-[300px] sticky left-[40px] bg-background z-10">
                  Name
                </TableHead>
                <TableHead className="w-[250px]">Preview</TableHead>
                <TableHead className="w-[150px]">Language</TableHead>
                <TableHead className="w-[300px]">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="text-center py-4 text-destructive">
                      {error}.{' '}
                      <Button
                        variant="link"
                        onClick={() => refetchLinkedAssets()}
                      >
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : searchResults?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="text-center py-4 text-muted-foreground">
                      No assets found. Try a different search term.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                searchResults?.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className={isAssetLinked(asset.id) ? 'bg-muted/50' : ''}
                    onClick={() => toggleAssetSelection(asset.id)}
                  >
                    <TableCell className="py-2 sticky left-0 bg-inherit z-10">
                      <Checkbox
                        checked={isAssetLinked(asset.id)}
                        onCheckedChange={() => toggleAssetSelection(asset.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium py-2 group cursor-pointer sticky left-[40px] bg-inherit z-10">
                      <div className="truncate group-hover:whitespace-normal">
                        {asset.name}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 group cursor-pointer">
                      <div className="truncate group-hover:whitespace-normal">
                        {getAssetPreview(asset)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 group cursor-pointer">
                      <div className="truncate group-hover:whitespace-normal">
                        {(asset as any).source_language?.english_name}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {asset.tags && asset.tags.length > 0 ? (
                          asset.tags.map((tagLink: any) => (
                            <Badge key={tagLink.tag.id} variant="outline">
                              {tagLink.tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No tags
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );

  // Render sheet footer
  const renderFooter = () => (
    <div className="flex items-center justify-between w-full">
      <div className="text-sm text-muted-foreground">
        {selectedAssets.length} assets selected
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" onClick={() => handleOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={saveAssetLinks} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );

  if (questLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (!quest) {
    return <div>Quest not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{quest.name}</h2>
          <p className="text-sm text-muted-foreground">
            {(quest.project as any)?.source_language?.english_name} →{' '}
            {(quest.project as any)?.target_language?.english_name}
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={onAddNewAsset}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Asset
          </Button>
          <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
              <Button>
                <ListFilter className="mr-2 h-4 w-4" />
                Manage Linked Assets
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isMobile ? 'bottom' : 'right'}
              className={`p-6 flex flex-col overflow-hidden ${
                isMobile
                  ? 'h-[95vh] sm:h-[90vh]'
                  : 'w-[95vw] max-w-[1200px] !right-0 !left-auto'
              }`}
              style={
                !isMobile ? { width: '95vw', maxWidth: '1200px' } : undefined
              }
            >
              <SheetHeader className="mb-4">
                <SheetTitle>Add Assets to Quest</SheetTitle>
                <SheetDescription>
                  Search and select assets to add to this quest.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-hidden">{renderAssetTable()}</div>

              <SheetFooter className="mt-6 pt-2 border-t">
                {renderFooter()}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assets in this Quest</CardTitle>
          <CardDescription>
            Manage the assets included in this quest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkedAssetsLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-destructive">
              {error}.{' '}
              <Button variant="link" onClick={() => refetchLinkedAssets()}>
                Try again
              </Button>
            </div>
          ) : linkedAssets?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No assets added to this quest yet. Click &quot;Manage Assets&quot;
              to add some.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {linkedAssets?.map((link) => (
                <Card
                  key={link.asset_id}
                  className="overflow-hidden h-full flex flex-col group hover:shadow-md transition-shadow"
                >
                  {(link.asset as any).images ? (
                    (() => {
                      try {
                        const imagePaths = JSON.parse(
                          (link.asset as any).images
                        );
                        if (imagePaths && imagePaths.length > 0) {
                          // If only one image, show it directly
                          if (imagePaths.length === 1) {
                            return (
                              <div className="aspect-video w-full overflow-hidden bg-muted">
                                <img
                                  src={
                                    supabase.storage
                                      .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                                      .getPublicUrl(imagePaths[0]).data
                                      .publicUrl
                                  }
                                  alt={(link.asset as any).name}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://placehold.co/600x400?text=No+Image';
                                  }}
                                />
                              </div>
                            );
                          }

                          // If multiple images, show carousel
                          return (
                            <div className="aspect-video w-full overflow-hidden bg-muted relative">
                              <Carousel
                                opts={{ loop: true }}
                                className="h-full"
                              >
                                <CarouselContent className="h-full">
                                  {imagePaths.map(
                                    (imagePath: string, index: number) => (
                                      <CarouselItem
                                        key={index}
                                        className="h-full"
                                      >
                                        <img
                                          src={
                                            supabase.storage
                                              .from(
                                                env.NEXT_PUBLIC_SUPABASE_BUCKET
                                              )
                                              .getPublicUrl(imagePath).data
                                              .publicUrl
                                          }
                                          alt={`${(link.asset as any).name} - Image ${index + 1}`}
                                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                              'https://placehold.co/600x400?text=No+Image';
                                          }}
                                        />
                                      </CarouselItem>
                                    )
                                  )}
                                </CarouselContent>
                                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6" />
                                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6" />
                              </Carousel>
                              {/* Image counter badge */}
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                {imagePaths.length} images
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="aspect-video w-full flex items-center justify-center bg-muted/50">
                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        );
                      } catch (error) {
                        console.error('Error parsing image paths:', error);
                        return (
                          <div className="aspect-video w-full flex items-center justify-center bg-muted/50">
                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        );
                      }
                    })()
                  ) : (
                    <div className="aspect-video w-full flex items-center justify-center bg-muted/50">
                      <FileText className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg line-clamp-1">
                      {(link.asset as any).name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Badge variant="outline" className="font-normal">
                        {(link.asset as any).source_language?.english_name}
                      </Badge>
                      {(link.asset as any).content &&
                        (link.asset as any).content.length > 0 && (
                          <Badge variant="secondary" className="font-normal">
                            <FileText className="h-3 w-3 mr-1" /> Text
                          </Badge>
                        )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {getAssetPreview(link.asset as any)}
                    </p>
                  </CardContent>
                  {(link.asset as any).tags &&
                    (link.asset as any).tags.length > 0 && (
                      <CardFooter className="p-4 pt-0">
                        <div className="flex flex-wrap gap-1">
                          {(link.asset as any).tags
                            .slice(0, 3)
                            .map((tagLink: any) => (
                              <Badge
                                key={tagLink.tag.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {tagLink.tag.name}
                              </Badge>
                            ))}
                          {(link.asset as any).tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(link.asset as any).tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </CardFooter>
                    )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
