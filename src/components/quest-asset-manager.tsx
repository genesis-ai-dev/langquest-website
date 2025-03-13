'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';
import { toast } from 'sonner';
import { Search, Plus, Check, X } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface QuestAssetManagerProps {
  questId: string;
  onSuccess?: () => void;
}

export function QuestAssetManager({
  questId,
  onSuccess
}: QuestAssetManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
            source_language:language!source_language_id(english_name),
            target_language:language!target_language_id(english_name)
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
    refetch: refetchLinkedAssets
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
            source_language:language!source_language_id(english_name),
            content:asset_content_link(id, text)
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
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['asset-search', searchTerm, questId],
    queryFn: async () => {
      let query = supabase.from('asset').select(`
          id,
          name,
          images,
          source_language:language!source_language_id(english_name),
          content:asset_content_link(id, text),
          tags:asset_tag_link(
            tag:tag_id(id, name)
          )
        `);

      // Add search filter if search term is provided
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return data;
    },
    enabled: isDialogOpen // Only fetch when dialog is open
  });

  // Initialize selected assets with already linked assets
  useEffect(() => {
    if (linkedAssets) {
      setSelectedAssets(linkedAssets.map((link) => link.asset_id));
    }
  }, [linkedAssets]);

  // Handle asset selection
  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  // Handle saving asset links
  const saveAssetLinks = async () => {
    setIsSubmitting(true);
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
      setIsDialogOpen(false);
      refetchLinkedAssets();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating assets:', error);
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
  const isAssetLinked = (assetId: string) => {
    return selectedAssets.includes(assetId);
  };

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
            {quest.project.source_language.english_name} →{' '}
            {quest.project.target_language.english_name}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Manage Assets
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add Assets to Quest</DialogTitle>
              <DialogDescription>
                Search and select assets to add to this quest.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center space-x-2 my-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            <ScrollArea className="h-[400px] rounded-md border">
              {searchLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : searchResults?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No assets found. Try a different search term.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Preview</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults?.map((asset) => (
                      <TableRow
                        key={asset.id}
                        className={isAssetLinked(asset.id) ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isAssetLinked(asset.id)}
                            onCheckedChange={() =>
                              toggleAssetSelection(asset.id)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {asset.name}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {getAssetPreview(asset)}
                        </TableCell>
                        <TableCell>
                          {asset.source_language.english_name}
                        </TableCell>
                        <TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>

            <DialogFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedAssets.length} assets selected
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          ) : linkedAssets?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No assets added to this quest yet. Click "Manage Assets" to add
              some.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {linkedAssets?.map((link) => (
                <Card key={link.asset_id} className="overflow-hidden">
                  {link.asset.images && (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={JSON.parse(link.asset.images)[0] || ''}
                        alt={link.asset.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/600x400?text=No+Image';
                        }}
                      />
                    </div>
                  )}
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">{link.asset.name}</CardTitle>
                    <CardDescription>
                      {link.asset.source_language.english_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {getAssetPreview(link.asset)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
