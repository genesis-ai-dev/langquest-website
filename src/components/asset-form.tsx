'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Spinner } from './spinner';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { X, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem
} from './ui/command';
import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';
import { env } from '@/lib/env';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AudioButton } from './ui/audio-button';

const assetFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Asset name must be at least 2 characters.'
  }),
  content: z
    .array(
      z.object({
        text: z.string().min(1, { message: 'Content text is required' }),
        audio_id: z.string().optional()
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  quests: z.array(z.string()).optional()
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  initialData?: AssetFormValues & { id: string; images?: string[] };
  onSuccess?: (data: { id: string }) => void;
  questId?: string; // Optional pre-selected quest ID
}

export function AssetForm({ initialData, onSuccess, questId }: AssetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.tags || []
  );
  const [selectedQuests, setSelectedQuests] = useState<string[]>(
    questId ? [questId] : initialData?.quests || []
  );
  const [tagsOpen, setTagsOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialData?.images || []
  );
  const [audioFiles, setAudioFiles] = useState<Record<number, File>>({});
  const [contentItems, setContentItems] = useState<
    { text: string; audio_id?: string }[]
  >(initialData?.content || [{ text: '', audio_id: undefined }]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  // Fetch tags for the multi-select
  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Fetch quests for the multi-select
  const { data: quests, isLoading: questsLoading } = useQuery({
    queryKey: ['quests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quest')
        .select(
          `
          id, 
          name, 
          project:project_id(
            id, 
            name, 
            source_language:language!source_language_id(english_name), 
            target_language:language!target_language_id(english_name)
          )
        `
        )
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !questId // Only fetch if questId is not provided
  });

  // Fetch specific quest if questId is provided
  const { data: specificQuest } = useQuery({
    queryKey: ['quest', questId],
    queryFn: async () => {
      if (!questId) return null;

      const { data, error } = await supabase
        .from('quest')
        .select(
          `
          id, 
          name, 
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

  // Set up form with default values
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: initialData || {
      name: '',
      content: [{ text: '', audio_id: undefined }],
      tags: [],
      quests: questId ? [questId] : []
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      setImages((prev) => [...prev, ...newImages]);

      // Create preview URLs
      const newImageUrls = newImages.map((file) => URL.createObjectURL(file));
      setImageUrls((prev) => [...prev, ...newImageUrls]);
    }
  };

  const handleAudioChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAudioFiles((prev) => ({ ...prev, [index]: file }));
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addContentItem = () => {
    setContentItems((prev) => [...prev, { text: '', audio_id: undefined }]);
  };

  const removeContentItem = (index: number) => {
    setContentItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateContentItem = (index: number, text: string) => {
    setContentItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  async function onSubmit(values: AssetFormValues) {
    setIsSubmitting(true);
    try {
      // Add selected tags and quests to the values
      values.tags = selectedTags;
      values.quests = selectedQuests;
      values.content = contentItems.filter((item) => item.text.trim() !== '');

      // Upload images if any
      const uploadedImagePaths: string[] = [];
      if (images.length > 0) {
        for (const image of images) {
          const fileName = `${Date.now()}-${image.name}`;
          setUploadProgress((prev) => ({ ...prev, [fileName]: 0 }));

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
              .upload(`images/${fileName}`, image, {
                onUploadProgress: (progress) => {
                  const percent = Math.round(
                    (progress.loaded / progress.total) * 100
                  );
                  setUploadProgress((prev) => ({
                    ...prev,
                    [fileName]: percent
                  }));
                }
              });

          if (uploadError) throw uploadError;
          uploadedImagePaths.push(uploadData.path);
        }
      }

      // Combine with existing image paths if updating
      const finalImagePaths = initialData?.images
        ? [...initialData.images, ...uploadedImagePaths]
        : uploadedImagePaths;

      // Upload audio files if any
      const updatedContent = [...values.content!];
      for (const [indexStr, file] of Object.entries(audioFiles)) {
        const index = parseInt(indexStr);
        const fileName = `${Date.now()}-${file.name}`;
        setUploadProgress((prev) => ({ ...prev, [fileName]: 0 }));

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
          .upload(`audio/${fileName}`, file, {
            onUploadProgress: (progress) => {
              const percent = Math.round(
                (progress.loaded / progress.total) * 100
              );
              setUploadProgress((prev) => ({ ...prev, [fileName]: percent }));
            }
          });

        if (uploadError) throw uploadError;
        if (updatedContent[index]) {
          updatedContent[index].audio_id = uploadData.path;
        }
      }

      let assetId: string;

      if (initialData?.id) {
        // Update existing asset
        const { data, error } = await supabase
          .from('asset')
          .update({
            name: values.name,
            images:
              finalImagePaths.length > 0
                ? JSON.stringify(finalImagePaths)
                : null
          })
          .eq('id', initialData.id)
          .select('id')
          .single();

        if (error) throw error;
        assetId = data.id;

        // Delete existing content
        await supabase
          .from('asset_content_link')
          .delete()
          .eq('asset_id', assetId);

        toast.success('Asset updated successfully');
      } else {
        // Create new asset
        const { data, error } = await supabase
          .from('asset')
          .insert({
            name: values.name,
            images:
              finalImagePaths.length > 0
                ? JSON.stringify(finalImagePaths)
                : null
          })
          .select('id')
          .single();

        if (error) throw error;
        assetId = data.id;

        toast.success('Asset created successfully');
      }

      // Add content items
      if (updatedContent.length > 0) {
        const contentLinks = updatedContent.map((item) => ({
          asset_id: assetId,
          text: item.text,
          audio_id: item.audio_id
        }));

        const { error: contentError } = await supabase
          .from('asset_content_link')
          .insert(contentLinks);

        if (contentError) throw contentError;
      }

      // Handle tags - first remove existing tags
      if (initialData?.id) {
        await supabase.from('asset_tag_link').delete().eq('asset_id', assetId);
      }

      // Add new tags
      if (values.tags && values.tags.length > 0) {
        const tagLinks = values.tags.map((tagId) => ({
          asset_id: assetId,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('asset_tag_link')
          .insert(tagLinks);

        if (tagError) throw tagError;
      }

      // Handle quests - first remove existing quest links
      if (initialData?.id) {
        await supabase
          .from('quest_asset_link')
          .delete()
          .eq('asset_id', assetId);
      }

      // Add new quest links
      if (values.quests && values.quests.length > 0) {
        const questLinks = values.quests.map((questId) => ({
          asset_id: assetId,
          quest_id: questId
        }));

        const { error: questError } = await supabase
          .from('quest_asset_link')
          .insert(questLinks);

        if (questError) throw questError;
      }

      // Reset form if not editing
      if (!initialData) {
        form.reset({
          name: '',
          content: [{ text: '', audio_id: undefined }],
          tags: [],
          quests: questId ? [questId] : []
        });
        setSelectedTags([]);
        setSelectedQuests(questId ? [questId] : []);
        setImages([]);
        setImageUrls([]);
        setAudioFiles({});
        setContentItems([{ text: '', audio_id: undefined }]);
      }

      // Call onSuccess callback with the result
      if (onSuccess) {
        onSuccess({ id: assetId });
      }
    } catch (error) {
      console.error('Error saving asset:', error);
      toast.error('Failed to save asset');
    } finally {
      setIsSubmitting(false);
      setUploadProgress({});
    }
  }

  if (tagsLoading || (questsLoading && !questId)) {
    return <Spinner />;
  }

  const allQuests = questId && specificQuest ? [specificQuest] : quests || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter asset name" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for this translation asset.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div>
            <FormLabel>Images</FormLabel>
            <div className="mt-2 flex flex-wrap gap-4">
              {imageUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative w-24 h-24 rounded-md overflow-hidden border"
                >
                  <img
                    src={
                      url.startsWith('blob:')
                        ? url
                        : supabase.storage
                            .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                            .getPublicUrl(url).data.publicUrl
                    }
                    alt={`Asset image ${index}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <label className="flex items-center justify-center w-24 h-24 border border-dashed rounded-md cursor-pointer hover:bg-accent">
                <div className="flex flex-col items-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">
                    Add Image
                  </span>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  multiple
                />
              </label>
            </div>
            <FormDescription className="mt-2">
              Upload images related to this asset.
            </FormDescription>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Content</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addContentItem}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Content
            </Button>
          </div>

          <div className="space-y-4">
            {contentItems.map((item, index) => (
              <div key={index} className="p-4 border rounded-md relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => removeContentItem(index)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="space-y-4">
                  <div>
                    <FormLabel className="text-sm">Text</FormLabel>
                    <Textarea
                      value={item.text}
                      onChange={(e) => updateContentItem(index, e.target.value)}
                      placeholder="Enter content text"
                      className="mt-1 min-h-[100px]"
                    />
                  </div>

                  <div>
                    <FormLabel className="text-sm">Audio</FormLabel>
                    <div className="flex items-center gap-2 mt-1">
                      {item.audio_id && !audioFiles[index] ? (
                        <div className="flex items-center gap-2">
                          <AudioButton
                            src={
                              supabase.storage
                                .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                                .getPublicUrl(item.audio_id).data.publicUrl
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            Current audio file
                          </span>
                        </div>
                      ) : audioFiles[index] ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {audioFiles[index].name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setAudioFiles((prev) => {
                                const updated = { ...prev };
                                delete updated[index];
                                return updated;
                              });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Upload Audio</span>
                          <Input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => handleAudioChange(index, e)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <FormDescription>
            Add text content and optional audio recordings.
          </FormDescription>
        </div>

        <Tabs defaultValue="tags" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="quests">Quests</TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1 p-1 border rounded-md min-h-[80px]">
                        {selectedTags.length > 0 ? (
                          selectedTags.map((tagId) => {
                            const tag = tags?.find((t) => t.id === tagId);
                            return (
                              <Badge
                                key={tagId}
                                variant="secondary"
                                className="m-1"
                              >
                                {tag?.name}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 ml-2"
                                  onClick={() => {
                                    setSelectedTags(
                                      selectedTags.filter((id) => id !== tagId)
                                    );
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            );
                          })
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">
                            No tags selected
                          </div>
                        )}
                      </div>
                      <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={tagsOpen}
                            className="justify-between"
                          >
                            Select tags
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search tags..." />
                            <CommandEmpty>No tag found.</CommandEmpty>
                            <CommandGroup>
                              {tags?.map((tag) => (
                                <CommandItem
                                  key={tag.id}
                                  value={tag.name}
                                  onSelect={() => {
                                    if (!selectedTags.includes(tag.id)) {
                                      setSelectedTags([
                                        ...selectedTags,
                                        tag.id
                                      ]);
                                    } else {
                                      setSelectedTags(
                                        selectedTags.filter(
                                          (id) => id !== tag.id
                                        )
                                      );
                                    }
                                  }}
                                >
                                  <CheckIcon
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedTags.includes(tag.id)
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  {tag.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Add tags to categorize this asset.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="quests" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="quests"
              render={() => (
                <FormItem>
                  <FormLabel>Quests</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1 p-1 border rounded-md min-h-[80px]">
                        {selectedQuests.length > 0 ? (
                          selectedQuests.map((questId) => {
                            const quest = allQuests?.find(
                              (q) => q.id === questId
                            );
                            return (
                              <Badge
                                key={questId}
                                variant="secondary"
                                className="m-1"
                              >
                                {quest?.name}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 ml-2"
                                  onClick={() => {
                                    if (questId !== questId) {
                                      // Don't allow removing pre-selected quest
                                      setSelectedQuests(
                                        selectedQuests.filter(
                                          (id) => id !== questId
                                        )
                                      );
                                    }
                                  }}
                                  disabled={questId === questId} // Disable if it's the pre-selected quest
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            );
                          })
                        ) : (
                          <div className="text-sm text-muted-foreground p-2">
                            No quests selected
                          </div>
                        )}
                      </div>
                      {!questId && ( // Only show quest selector if not pre-selected
                        <Popover open={questsOpen} onOpenChange={setQuestsOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={questsOpen}
                              className="justify-between"
                            >
                              Select quests
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search quests..." />
                              <CommandEmpty>No quest found.</CommandEmpty>
                              <CommandGroup>
                                {allQuests?.map((quest) => (
                                  <CommandItem
                                    key={quest.id}
                                    value={quest.name}
                                    onSelect={() => {
                                      if (!selectedQuests.includes(quest.id)) {
                                        setSelectedQuests([
                                          ...selectedQuests,
                                          quest.id
                                        ]);
                                      } else {
                                        setSelectedQuests(
                                          selectedQuests.filter(
                                            (id) => id !== quest.id
                                          )
                                        );
                                      }
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        selectedQuests.includes(quest.id)
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    {quest.name} (
                                    {quest.project.source_language.english_name}{' '}
                                    →{' '}
                                    {quest.project.target_language.english_name}
                                    )
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>Link this asset to quests.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : initialData ? (
            'Update Asset'
          ) : (
            'Create Asset'
          )}
        </Button>
      </form>
    </Form>
  );
}
