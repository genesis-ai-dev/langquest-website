'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogContentWide,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TagSelector } from '@/components/tag-selector';
import { createBrowserClient } from '@/lib/supabase/client';
import { getSupabaseCredentials } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  MoreHorizontal,
  X,
  Tag
} from 'lucide-react';
import { env } from '@/lib/env';
import { useQuery } from '@tanstack/react-query';

const assetRowSchema = z
  .object({
    questId: z.string().min(1, 'Quest is required'),
    name: z.string().min(2, 'Asset name must be at least 2 characters'),
    images: z.array(z.string()).optional().default([]),
    content: z.string().optional().default(''),
    audioFile: z.any().optional(),
    tags: z.array(z.string()).optional().default([])
  })
  .refine(
    (data) => {
      if (data.audioFile && (!data.content || data.content.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Content is required when audio file is selected',
      path: ['content']
    }
  );

const bulkAssetFormSchema = z.object({
  assets: z.array(assetRowSchema).min(1, 'At least one asset is required')
});

// type AssetRow = z.infer<typeof assetRowSchema>;
type BulkAssetFormValues = z.infer<typeof bulkAssetFormSchema>;

interface BulkAssetModalProps {
  projectId: string;
  trigger: React.ReactNode;
  onAssetsCreated?: (assets: any[]) => void;
  defaultQuestId?: string; // Optional quest ID to pre-select
}

export function BulkAssetModal({
  projectId,
  trigger,
  onAssetsCreated,
  defaultQuestId
}: BulkAssetModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [currentAssetIndex, setCurrentAssetIndex] = useState<number | null>(
    null
  );
  const [globalTagModalOpen, setGlobalTagModalOpen] = useState(false);
  const [globalTags, setGlobalTags] = useState<string[]>([]);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [assetImages, setAssetImages] = useState<Record<string, File>>({});
  const [assetAudioFiles, setAssetAudioFiles] = useState<Record<number, File>>(
    {}
  );
  const { user } = useAuth();

  const supabase = createBrowserClient();
  const credentials = getSupabaseCredentials('production');

  // Clean up object URLs and local files when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up any object URLs to prevent memory leaks
      if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }

      // Clear local files when modal closes
      setAssetImages({});
      setAssetAudioFiles({});
      setPreviewImageUrl('');
    }
  }, [isOpen, previewImageUrl]);

  // Fetch quests for the project
  const { data: quests, isLoading: questsLoading } = useQuery({
    queryKey: ['project-quests', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quest')
        .select('id, name')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  // Fetch available tags
  const { data: availableTags } = useQuery({
    queryKey: ['available-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  const form = useForm<BulkAssetFormValues>({
    resolver: zodResolver(bulkAssetFormSchema),
    defaultValues: {
      assets: [
        {
          questId: defaultQuestId || '',
          name: '',
          images: [],
          content: '',
          tags: []
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'assets'
  });

  // Reset form with default quest when modal opens
  useEffect(() => {
    if (isOpen) {
      setGlobalTags([]); // Reset global tags
      form.reset({
        assets: [
          {
            questId: defaultQuestId || '',
            name: '',
            images: [],
            content: '',
            tags: []
          }
        ]
      });
    }
  }, [isOpen, defaultQuestId, form]);

  // Helper function to get tag name by ID
  const getTagName = (tagId: string) => {
    const tag = availableTags?.find((t) => t.id === tagId);
    return tag?.name || `Tag ${tagId.slice(0, 4)}...`;
  };

  // Add new asset row
  const addAssetRow = () => {
    append({
      questId: defaultQuestId || '',
      name: '',
      images: [],
      content: '',
      tags: [...globalTags] // Include global tags in new assets
    });
  };

  // Remove asset row
  const removeAssetRow = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Handle global tags update
  const handleGlobalTagsUpdate = (tags: string[]) => {
    const previousGlobalTags = globalTags;
    setGlobalTags(tags);

    // Find tags that were removed from global selection
    const removedTags = previousGlobalTags.filter((tag) => !tags.includes(tag));

    const currentAssets = form.getValues('assets');
    const updatedAssets = currentAssets.map((asset) => {
      let assetTags = [...asset.tags];

      // Remove tags that were removed from global selection
      removedTags.forEach((removedTag) => {
        assetTags = assetTags.filter((tag) => tag !== removedTag);
      });

      // Add new global tags
      tags.forEach((globalTag) => {
        if (!assetTags.includes(globalTag)) {
          assetTags.push(globalTag);
        }
      });

      return {
        ...asset,
        tags: assetTags
      };
    });

    form.setValue('assets', updatedAssets);
  };

  // Handle image upload
  const handleImageUpload = (index: number, files: FileList) => {
    const currentAssets = form.getValues('assets');
    const imageFileNames: string[] = [];

    // Store files locally and generate temporary file names
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

      // Store file in local state
      setAssetImages((prev) => ({
        ...prev,
        [`${index}-${fileName}`]: file
      }));

      imageFileNames.push(fileName);
    }

    // Update images array for specific asset
    const updatedAssets = [...currentAssets];
    updatedAssets[index] = {
      ...updatedAssets[index],
      images: [...(updatedAssets[index].images || []), ...imageFileNames]
    };

    form.setValue('assets', updatedAssets);
  };

  // Handle images removal
  const handleImagesRemove = (index: number) => {
    const currentAssets = form.getValues('assets');
    const currentImages = currentAssets[index]?.images || [];

    // Remove all image files from local state
    setAssetImages((prev) => {
      const updated = { ...prev };
      currentImages.forEach((imageId) => {
        delete updated[`${index}-${imageId}`];
      });
      return updated;
    });

    // Update form to remove all images
    const updatedAssets = [...currentAssets];
    updatedAssets[index] = {
      ...updatedAssets[index],
      images: []
    };

    form.setValue('assets', updatedAssets);
    toast.success('All images removed');
  };

  // Handle audio upload
  const handleAudioUpload = (index: number, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `audio-${Date.now()}-${Math.random()}.${fileExt}`;

    // Store file in local state
    setAssetAudioFiles((prev) => ({
      ...prev,
      [index]: file
    }));

    const currentAssets = form.getValues('assets');
    const updatedAssets = [...currentAssets];
    updatedAssets[index] = {
      ...updatedAssets[index],
      audioFile: fileName
    };

    form.setValue('assets', updatedAssets);
    toast.success('Audio file selected successfully');
  };

  // Handle audio removal
  const handleAudioRemove = (index: number) => {
    // Remove file from local state
    setAssetAudioFiles((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });

    // Update form
    const currentAssets = form.getValues('assets');
    const updatedAssets = [...currentAssets];
    updatedAssets[index] = {
      ...updatedAssets[index],
      audioFile: undefined
    };

    form.setValue('assets', updatedAssets);
    toast.success('Audio file removed');
  };

  // Handle tags update
  const handleTagsUpdate = (assetIndex: number, tags: string[]) => {
    const currentAssets = form.getValues('assets');
    const updatedAssets = [...currentAssets];
    updatedAssets[assetIndex] = {
      ...updatedAssets[assetIndex],
      tags
    };
    form.setValue('assets', updatedAssets);
  };

  // Submit form
  const onSubmit = async (data: BulkAssetFormValues) => {
    if (!user) {
      toast.error('You must be logged in to create assets');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdAssets = [];

      for (let i = 0; i < data.assets.length; i++) {
        const asset = data.assets[i];

        // First, upload all files to storage
        let uploadedImageIds: string[] = [];
        let uploadedAudioId: string | null = null;

        // Upload images
        if (asset.images && asset.images.length > 0) {
          for (const imageFileName of asset.images) {
            const imageFile = assetImages[`${i}-${imageFileName}`];
            if (imageFile) {
              try {
                const { error: uploadError } = await supabase.storage
                  .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                  .upload(imageFileName, imageFile);

                if (uploadError) throw uploadError;
                uploadedImageIds.push(imageFileName);
              } catch (error) {
                console.error('Error uploading image:', error);
                toast.error(`Failed to upload image: ${imageFileName}`);
                continue;
              }
            }
          }
        }

        // Upload audio
        if (asset.audioFile) {
          const audioFile = assetAudioFiles[i];
          if (audioFile) {
            try {
              const { error: uploadError } = await supabase.storage
                .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                .upload(asset.audioFile, audioFile);

              if (uploadError) throw uploadError;
              uploadedAudioId = asset.audioFile;
            } catch (error) {
              console.error('Error uploading audio:', error);
              toast.error(`Failed to upload audio for asset: ${asset.name}`);
            }
          }
        }

        // Get source language ID from the project
        const { data: projectData, error: projectError } = await supabase
          .from('project')
          .select('source_language_id')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;

        // Create asset
        const { data: assetData, error: assetError } = await supabase
          .from('asset')
          .insert({
            name: asset.name,
            images: uploadedImageIds.length > 0 ? uploadedImageIds : null,
            active: true,
            source_language_id: projectData.source_language_id
          })
          .select()
          .single();

        if (assetError) throw assetError;

        // Add content if provided
        if (asset.content) {
          const { error: contentError } = await supabase
            .from('asset_content_link')
            .insert({
              asset_id: assetData.id,
              text: asset.content,
              audio_id: uploadedAudioId,
              id: crypto.randomUUID(),
              active: true
            });

          if (contentError) throw contentError;
        }

        // Images are already handled in the asset creation (stored in the images column)

        // Add quest relationship
        if (asset.questId) {
          const { error: questError } = await supabase
            .from('quest_asset_link')
            .insert({
              quest_id: asset.questId,
              asset_id: assetData.id
            });

          if (questError) throw questError;
        }

        // Add tags
        if (asset.tags && asset.tags.length > 0) {
          const tagInserts = asset.tags.map((tagId) => ({
            asset_id: assetData.id,
            tag_id: tagId,
            active: true
          }));

          const { error: tagError } = await supabase
            .from('asset_tag_link')
            .insert(tagInserts);

          if (tagError) throw tagError;
        }

        createdAssets.push(assetData);
      }

      toast.success(`Successfully created ${createdAssets.length} assets`);

      if (onAssetsCreated) {
        onAssetsCreated(createdAssets);
      }

      // Reset form, clear local files, and close modal
      form.reset();
      setAssetImages({});
      setAssetAudioFiles({});
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating assets:', error);
      toast.error('Failed to create assets');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContentWide
        className="!w-[80vw] !max-w-[80vw] max-h-[90vh] overflow-auto"
        style={{
          width: '80vw !important',
          maxWidth: '80vw !important'
        }}
      >
        <DialogHeader>
          <DialogTitle>Add Multiple Assets</DialogTitle>
        </DialogHeader>

        <div className={'w-full'}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[18%]">Quest Name</TableHead>
                      <TableHead className="w-[20%]">Asset Name</TableHead>
                      <TableHead className="w-[12%]">Images</TableHead>
                      <TableHead className="w-[25%]">Content</TableHead>
                      <TableHead className="w-[8%]">Audio</TableHead>
                      <TableHead className="w-[14%]">
                        <div className="flex gap-2 items-center">
                          <span>Tags</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 ml-1 border"
                            onClick={() => setGlobalTagModalOpen(true)}
                            title="Apply tags to all assets"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead className="w-[3%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        {/* Quest Selection */}
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`assets.${index}.questId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select quest" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {quests?.map((quest) => (
                                      <SelectItem
                                        key={quest.id}
                                        value={quest.id}
                                      >
                                        {quest.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>

                        {/* Asset Name */}
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`assets.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Asset name"
                                    className="text-xs"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>

                        {/* Images */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 w-full">
                              <div className="flex-1 overflow-x-auto scrollbar-thin">
                                <div className="flex gap-1 min-w-max py-1">
                                  {form
                                    .watch(`assets.${index}.images`)
                                    ?.map((imageId, imgIndex) => (
                                      <Button
                                        key={imgIndex}
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="text-xs px-2 py-1 h-6 min-w-6 flex-shrink-0"
                                        onClick={() => {
                                          // Check if it's a local file first
                                          const localFile =
                                            assetImages[`${index}-${imageId}`];
                                          if (localFile) {
                                            const localUrl =
                                              URL.createObjectURL(localFile);
                                            setPreviewImageUrl(localUrl);
                                          } else {
                                            // Fallback to server URL for existing files
                                            const imageUrl = `${credentials.url.replace(/\/$/, '')}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_BUCKET}/${imageId}`;
                                            setPreviewImageUrl(imageUrl);
                                          }
                                          setImagePreviewOpen(true);
                                        }}
                                      >
                                        {imgIndex + 1}
                                      </Button>
                                    )) || []}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-shrink-0 h-6 w-6 p-0"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.multiple = true;
                                  input.accept = 'image/*';
                                  input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement)
                                      .files;
                                    if (files) handleImageUpload(index, files);
                                  };
                                  input.click();
                                }}
                              >
                                <Plus className="size-3" />
                              </Button>
                            </div>
                            {(form.watch(`assets.${index}.images`)?.length ||
                              0) > 0 && (
                              <div className="flex justify-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleImagesRemove(index)}
                                  className="h-5 w-5 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Remove all images"
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Content */}
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`assets.${index}.content`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Content text"
                                    className="min-h-[50px] max-h-[80px] resize-none text-xs"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>

                        {/* Audio */}
                        <TableCell>
                          {form.watch(`assets.${index}.audioFile`) &&
                          assetAudioFiles[index] ? (
                            <div className="flex flex-col items-center space-y-1">
                              <div
                                className="text-xs text-muted-foreground truncate cursor-pointer hover:text-foreground"
                                title={assetAudioFiles[index]?.name}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'audio/*';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement)
                                      .files?.[0];
                                    if (file) handleAudioUpload(index, file);
                                  };
                                  input.click();
                                }}
                              >
                                {assetAudioFiles[index]?.name?.length > 15
                                  ? `${assetAudioFiles[index]?.name?.slice(0, 12)}...`
                                  : assetAudioFiles[index]?.name}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAudioRemove(index)}
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <X className="size-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'audio/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement)
                                    .files?.[0];
                                  if (file) handleAudioUpload(index, file);
                                };
                                input.click();
                              }}
                            >
                              <Upload className="size-3" />
                              <span className="sr-only">Upload</span>
                            </Button>
                          )}
                        </TableCell>

                        {/* Tags */}
                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1">
                              {form
                                .watch(`assets.${index}.tags`)
                                ?.slice(0, 3)
                                .map((tagId, tagIndex) => (
                                  <Badge
                                    key={tagIndex}
                                    variant="secondary"
                                    className="text-xs max-w-20 truncate"
                                    title={getTagName(tagId)} // Tooltip with full name
                                  >
                                    {getTagName(tagId)}
                                  </Badge>
                                ))}
                              {(form.watch(`assets.${index}.tags`)?.length ||
                                0) > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  <MoreHorizontal className="size-3" />
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="p-0 w-6 h-6"
                              size="sm"
                              onClick={() => {
                                setCurrentAssetIndex(index);
                                setTagModalOpen(true);
                              }}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAssetRow(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={addAssetRow}>
                  <Plus className="size-4 mr-2" />
                  Add Asset
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save All Assets'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* Tag Selection Modal */}
        {tagModalOpen && currentAssetIndex !== null && (
          <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Select Tags</DialogTitle>
              </DialogHeader>
              <TagSelector
                selectedTags={
                  form.watch(`assets.${currentAssetIndex}.tags`) || []
                }
                onTagsChange={(tags) =>
                  handleTagsUpdate(currentAssetIndex, tags)
                }
                environment="production"
                allowTagCreation={true}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setTagModalOpen(false)}
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Global Tags Modal */}
        <Dialog open={globalTagModalOpen} onOpenChange={setGlobalTagModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Tags for All Assets</DialogTitle>
              <p className="text-sm text-muted-foreground">
                These tags will be applied to all existing assets and any new
                assets you add.
              </p>
            </DialogHeader>
            <TagSelector
              selectedTags={globalTags}
              onTagsChange={handleGlobalTagsUpdate}
              environment="development"
              allowTagCreation={true}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setGlobalTagModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setGlobalTagModalOpen(false)}>
                Apply to All
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Preview Modal */}
        <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
          <DialogContent className="max-w-4xl w-full p-0">
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
            <img
              src={previewImageUrl}
              alt="Asset Image Preview"
              className="w-full h-auto rounded-lg"
            />
          </DialogContent>
        </Dialog>
      </DialogContentWide>
    </Dialog>
  );
}

// Export default
export default BulkAssetModal;
