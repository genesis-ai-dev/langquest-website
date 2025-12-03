'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Spinner } from './spinner';
import { useAuth } from '@/components/auth-provider';
import { Badge } from './ui/badge';
import { OwnershipAlert } from '@/components/ownership-alert';
import { TagSelector } from '@/components/tag-selector';
import { X, Plus, Upload, Image as ImageIcon, CheckIcon } from 'lucide-react';
import { env } from '@/lib/env';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AudioButton } from './ui/audio-button';
import { checkProjectOwnership } from '@/lib/project-permissions';

const assetFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Asset name must be at least 2 characters.'
  }),
  content: z
    .array(
      z.object({
        text: z.string(),
        audio_id: z.string().optional()
      })
    )
    .optional()
    .default([]),
  tags: z.array(z.string()).optional(),
  quests: z.array(z.string()).optional()
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  initialData?: AssetFormValues & {
    id: string;
    images?: string[];
    tags?: { id: string }[];
  };
  onSuccess?: (data: { id: string }) => void;
  questId?: string; // Optional pre-selected quest ID
}

export function AssetForm({ initialData, onSuccess, questId }: AssetFormProps) {
  const { user, environment } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.tags
      ? Array.isArray(initialData.tags) &&
        typeof initialData.tags[0] === 'object'
        ? (initialData.tags as { id: string }[]).map((t) => t.id)
        : (initialData.tags as string[])
      : []
  );
  const [selectedQuests, setSelectedQuests] = useState<string[]>(
    questId ? [questId] : initialData?.quests || []
  );
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialData?.images || []
  );
  const [audioFiles, setAudioFiles] = useState<Record<number, File>>({});
  const [contents, setContents] = useState<
    { text: string; audio_id?: string }[]
  >(initialData?.content || [{ text: '', audio_id: undefined }]);

  // Set quest from prop if provided
  useEffect(() => {
    if (questId && !selectedQuests.includes(questId)) {
      setSelectedQuests((prev) => [...prev, questId]);
    }
  }, [questId, selectedQuests]);

  // Fetch quests for the multi-select - from projects where user is owner
  const { data: questsData = [], isLoading: questsLoading } = useQuery({
    queryKey: ['owned-quests', user?.id, environment],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await createBrowserClient(environment)
        .from('quest')
        .select(
          `
          id,
          name,
          project:project_id!inner(
            id,
            name,
            creator_id
          )
        `
        )
        .order('name');

      if (error) {
        console.error('Error fetching owned quests:', error);
        throw error;
      }

      return (data || []).filter(
        (quest) => quest.project && quest.project[0]?.creator_id === user.id
      );
    },
    enabled: !!user?.id
  });

  // Fetch source languoid from the quest's project
  const { data: questLanguoidData } = useQuery({
    queryKey: ['quest-languoid', questId, environment],
    queryFn: async () => {
      if (!questId) return null;

      // First get project_id from quest
      const { data: questData, error: questError } =
        await createBrowserClient(environment)
          .from('quest')
          .select('project_id')
          .eq('id', questId)
          .single();

      if (questError || !questData) return null;

      // Then get source languoid from project_language_link
      const { data: linkData, error: linkError } =
        await createBrowserClient(environment)
          .from('project_language_link')
          .select('languoid_id')
          .eq('project_id', questData.project_id)
          .eq('language_type', 'source')
          .single();

      if (linkError) return null;
      return { project_id: questData.project_id, languoid_id: linkData?.languoid_id };
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
    setContents((prev) => [...prev, { text: '', audio_id: undefined }]);
  };

  const removeContentItem = (index: number) => {
    setContents((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // If all content items are removed, we still want to allow form submission
      return updated;
    });
  };

  const updateContentItem = (index: number, text: string) => {
    setContents((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  async function onSubmit(values: AssetFormValues) {
    if (!user) {
      toast.error('You must be logged in to create assets');
      return;
    }

    // --- Ownership Validation ---
    if (selectedQuests.length === 0 && !initialData) {
      toast.error('A new asset must be associated with at least one quest.');
      return;
    }

    for (const questId of selectedQuests) {
      const { data: questData, error } = await createBrowserClient(environment)
        .from('quest')
        .select('project_id')
        .eq('id', questId)
        .single();

      if (error || !questData) {
        toast.error(
          'Could not verify project ownership for one of the quests.'
        );
        setIsSubmitting(false);
        return;
      }

      const isOwner = await checkProjectOwnership(
        questData.project_id,
        user.id,
        environment
      );

      if (!isOwner) {
        toast.error('You can only add assets to quests in projects you own.');
        setIsSubmitting(false);
        return;
      }
    }
    // --- End Validation ---

    setIsSubmitting(true);
    try {
      // Filter out empty content items
      const filteredContent = contents.filter(
        (item) => item.text.trim() !== ''
      );
      values.content = filteredContent.length > 0 ? filteredContent : [];

      // Check if we have at least an image or content
      if (
        images.length === 0 &&
        (!imageUrls || imageUrls.length === 0) &&
        filteredContent.length === 0
      ) {
        toast.error('Please add at least an image or content item');
        setIsSubmitting(false);
        return;
      }

      // Upload images if any
      const uploadedImagePaths: string[] = [];
      if (images.length > 0) {
        for (const image of images) {
          const fileName = `${Date.now()}-${image.name}`;
          // setUploadProgress((prev) => ({ ...prev, [fileName]: 0 }));

          // Simple upload without progress tracking
          const { data: uploadData, error: uploadError } =
            await createBrowserClient(environment)
              .storage.from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
              .upload(`images/${fileName}`, image);

          if (uploadError) throw uploadError;
          uploadedImagePaths.push(uploadData.path);

          // Update progress manually after upload completes
          // setUploadProgress((prev) => ({
          //   ...prev,
          //   [fileName]: 100
          // }));
        }
      }

      // Combine with existing image paths if updating
      const finalImagePaths =
        initialData && initialData.images
          ? [...initialData.images, ...uploadedImagePaths]
          : uploadedImagePaths;

      // Upload audio files if any
      const updatedContent = [...(values.content || [])];
      for (const [indexStr, file] of Object.entries(audioFiles)) {
        const index = parseInt(indexStr);
        const fileName = `${Date.now()}-${file.name}`;
        // setUploadProgress((prev) => ({ ...prev, [fileName]: 0 }));

        const { data: uploadData, error: uploadError } =
          await createBrowserClient(environment)
            .storage.from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
            .upload(`audio/${fileName}`, file);

        if (uploadError) throw uploadError;
        if (updatedContent[index]) {
          updatedContent[index].audio_id = uploadData.path;
        }

        // Update progress manually after upload completes
        // setUploadProgress((prev) => ({
        //   ...prev,
        //   [fileName]: 100
        // }));
      }

      let assetId: string;

      if (initialData?.id) {
        // Update existing asset
        const { data, error } = await createBrowserClient(environment)
          .from('asset')
          .update({
            name: values.name,
            images: finalImagePaths.length > 0 ? finalImagePaths : null
          })
          .eq('id', initialData.id)
          .select('id')
          .single();

        if (error) throw error;
        assetId = data.id;

        // Delete existing content
        await createBrowserClient(environment)
          .from('asset_content_link')
          .delete()
          .eq('asset_id', assetId);

        toast.success('Asset updated successfully');
      } else {
        // Create new asset (source_language_id is now optional/deprecated)
        try {
          // Get project_id from the first selected quest
          let projectId: string | null = null;
          if (selectedQuests.length > 0) {
            const { data: questData } = await createBrowserClient(environment)
              .from('quest')
              .select('project_id')
              .eq('id', selectedQuests[0])
              .single();
            projectId = questData?.project_id || null;
          }

          const { data, error } = await createBrowserClient(environment)
            .from('asset')
            .insert({
              name: values.name,
              images: finalImagePaths.length > 0 ? finalImagePaths : null,
              active: true,
              creator_id: user?.id,
              project_id: projectId
            })
            .select('id')
            .single();

          if (error) throw error;
          assetId = data.id;

          toast.success('Asset created successfully');
        } catch (insertError) {
          console.error('Error creating asset record:', insertError);
          toast.error('Failed to create core asset record.');
          setIsSubmitting(false);
          return;
        }
      }

      // Add content items with languoid_id from the project
      if (updatedContent.length > 0) {
        // Get languoid_id from the first selected quest's project
        let sourceLanguoidId: string | null = null;
        if (selectedQuests.length > 0) {
          const { data: questData } = await createBrowserClient(environment)
            .from('quest')
            .select('project_id')
            .eq('id', selectedQuests[0])
            .single();

          if (questData?.project_id) {
            const { data: linkData } = await createBrowserClient(environment)
              .from('project_language_link')
              .select('languoid_id')
              .eq('project_id', questData.project_id)
              .eq('language_type', 'source')
              .single();

            sourceLanguoidId = linkData?.languoid_id || null;
          }
        }

        const contentLinks = updatedContent.map((item) => ({
          asset_id: assetId,
          text: item.text,
          audio: item.audio_id ? [item.audio_id] : null, // audio is a jsonb array column
          id: crypto.randomUUID(),
          active: true,
          languoid_id: sourceLanguoidId
        }));

        const { error: contentError } = await createBrowserClient(environment)
          .from('asset_content_link')
          .insert(contentLinks);

        if (contentError) {
          console.error('Error linking asset content:', contentError);
          toast.error(`Failed to link asset content: ${contentError.message}`);
          // Decide if this is a hard stop or if partial success is okay
          // For now, let's assume it's not a hard stop but log it.
        }
      }

      // Handle tags - first remove existing tags
      if (initialData?.id) {
        const { error: deleteTagsError } = await createBrowserClient(
          environment
        )
          .from('asset_tag_link')
          .delete()
          .eq('asset_id', assetId);
        if (deleteTagsError) {
          console.error('Error deleting old asset tags:', deleteTagsError);
          toast.error(`Failed to clear old tags: ${deleteTagsError.message}`);
        }
      }

      // Add new tags
      if (selectedTags.length > 0) {
        const tagLinks = selectedTags.map((tagId) => ({
          asset_id: assetId,
          tag_id: tagId,
          active: true
        }));

        const { error: tagError } = await createBrowserClient(environment)
          .from('asset_tag_link')
          .insert(tagLinks);

        if (tagError) {
          console.error('Error linking asset tags:', tagError);
          toast.error(`Failed to link asset tags: ${tagError.message}`);
        }
      }

      // Handle quests - first remove existing quest links
      if (initialData?.id) {
        const { error: deleteQuestsError } = await createBrowserClient(
          environment
        )
          .from('quest_asset_link')
          .delete()
          .eq('asset_id', assetId);
        if (deleteQuestsError) {
          console.error(
            'Error deleting old asset-quest links:',
            deleteQuestsError
          );
          toast.error(
            `Failed to clear old quest links: ${deleteQuestsError.message}`
          );
        }
      }

      // Log selectedQuests state just before the linking logic for quests
      console.log(
        '[AssetForm - onSubmit] Just before quest linking. assetId:',
        assetId,
        'selectedQuests state:',
        selectedQuests
      );

      // Add new quest links
      if (selectedQuests.length > 0) {
        const questLinksPayload = selectedQuests.map((questId) => ({
          asset_id: assetId,
          quest_id: questId,
          active: true
        }));
        console.log(
          '[AssetForm - onSubmit] Constructed questLinksPayload:',
          JSON.parse(JSON.stringify(questLinksPayload))
        );

        const { data: insertedLinks, error: questError } =
          await createBrowserClient(environment)
            .from('quest_asset_link')
            .insert(questLinksPayload)
            .select(); // Ask Supabase to return the inserted rows

        if (questError) {
          console.error(
            '[AssetForm - onSubmit] Error linking asset to quests (Supabase error):',
            questError
          );
          toast.error(`Failed to link asset to quests: ${questError.message}`);
        } else if (
          !insertedLinks ||
          insertedLinks.length !== questLinksPayload.length
        ) {
          console.error(
            '[AssetForm - onSubmit] Failed to link asset to quests: Number of inserted links does not match expected.',
            {
              expectedCount: questLinksPayload.length,
              insertedCount: insertedLinks?.length || 0,
              insertedLinksData: JSON.parse(JSON.stringify(insertedLinks || []))
            }
          );
          toast.error(
            'Operation reported success, but failed to correctly link asset to all selected quests. Please check asset details.'
          );
        } else {
          console.log(
            '[AssetForm - onSubmit] Successfully linked asset to quests. Inserted links:',
            JSON.parse(JSON.stringify(insertedLinks))
          );
        }
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
        setContents([{ text: '', audio_id: undefined }]);
      }

      // Call onSuccess callback with the result
      if (onSuccess) {
        onSuccess({ id: assetId });
      }
    } catch (error: any) {
      console.error('Error saving asset:', error);
      // Check if the error is a Supabase Storage error object
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        'error' in error
      ) {
        // Typical Supabase storage error structure has error.message and error.error (like "InvalidRequest")
        toast.error(`Failed to save asset: ${error.message}`);
      } else if (error instanceof Error) {
        toast.error(`Failed to save asset: ${error.message}`);
      } else {
        toast.error('Failed to save asset due to an unknown error.');
      }
    } finally {
      setIsSubmitting(false);
      // setUploadProgress({});
    }
  }

  if (questsLoading && !questId) {
    return <Spinner />;
  }

  const allQuests =
    questId && questLanguoidData
      ? [
          {
            id: questId,
            name: 'Current Quest',
            project: [{ id: questLanguoidData.project_id }]
          }
        ]
      : questsData || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <OwnershipAlert
          user={user}
          contentType="asset"
          isEditing={!!initialData}
        />
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
                        : createBrowserClient(environment)
                            .storage.from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
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
                  accept="image/png, image/jpeg"
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
            {contents.map((item, index) => (
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
                              createBrowserClient(environment)
                                .storage.from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
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
                  <FormControl>
                    <div className="flex flex-col gap-2">
                      {/* Hidden input to store tags for form validation */}
                      <input
                        type="hidden"
                        {...form.register('tags')}
                        value={JSON.stringify(selectedTags)}
                      />

                      <TagSelector
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}
                        environment={environment}
                        label="Tags"
                        description="Add tags to categorize this asset."
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
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
                      {/* Hidden input to store quests for form validation */}
                      <input
                        type="hidden"
                        {...form.register('quests')}
                        value={JSON.stringify(selectedQuests)}
                      />
                      <div className="flex flex-wrap gap-1 p-1 border rounded-md min-h-[80px]">
                        {selectedQuests.length > 0 ? (
                          selectedQuests.map((selectedQuestId) => {
                            const quest = allQuests?.find(
                              (q) => q.id === selectedQuestId
                            );
                            return (
                              <Badge
                                key={selectedQuestId}
                                variant="secondary"
                                className="m-1"
                              >
                                {quest?.name}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 ml-2"
                                  onClick={() => {
                                    // Don't allow removing pre-selected quest
                                    if (questId !== selectedQuestId) {
                                      setSelectedQuests(
                                        selectedQuests.filter(
                                          (id) => id !== selectedQuestId
                                        )
                                      );
                                    }
                                  }}
                                  disabled={questId === selectedQuestId} // Disable if it's the pre-selected quest
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
                        <div className="border rounded-md p-4">
                          <div className="mb-4">
                            <label className="text-sm font-medium mb-2 block">
                              Available Quests
                            </label>
                            <div className="text-sm text-muted-foreground mb-2">
                              Click on quests to select/deselect them
                            </div>
                            {allQuests && allQuests.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {allQuests.map((quest) => {
                                  return (
                                    <Badge
                                      key={quest.id}
                                      variant={
                                        selectedQuests.includes(quest.id)
                                          ? 'default'
                                          : 'outline'
                                      }
                                      className={`cursor-pointer ${
                                        questId === quest.id ? 'opacity-70' : ''
                                      }`}
                                      onClick={() => {
                                        if (questId !== quest.id) {
                                          let newSelectedQuests;
                                          if (
                                            !selectedQuests.includes(quest.id)
                                          ) {
                                            newSelectedQuests = [
                                              ...selectedQuests,
                                              quest.id
                                            ];
                                          } else {
                                            newSelectedQuests =
                                              selectedQuests.filter(
                                                (id) => id !== quest.id
                                              );
                                          }
                                          setSelectedQuests(newSelectedQuests);
                                        }
                                      }}
                                    >
                                      {quest.name}
                                      {selectedQuests.includes(quest.id) && (
                                        <CheckIcon className="ml-1 h-3 w-3" />
                                      )}
                                    </Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                No quests available
                              </div>
                            )}
                          </div>
                        </div>
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

        <Button type="submit" disabled={isSubmitting || !user}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : !user ? (
            'Login Required'
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
