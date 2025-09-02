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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { createBrowserClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Spinner } from './spinner';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { X, CheckIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { checkProjectOwnership } from '@/lib/project-permissions';
import { OwnershipAlert } from '@/components/ownership-alert';
// import { cn } from '@/lib/utils';

const questFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Quest name must be at least 2 characters.'
  }),
  description: z.string().optional(),
  project_id: z.string({
    required_error: 'Please select a project.'
  }),
  tags: z.array(z.string()).optional()
});

type QuestFormValues = z.infer<typeof questFormSchema>;

interface QuestFormProps {
  initialData?: QuestFormValues & { id: string };
  onSuccess?: (data: { id: string }) => void;
  projectId?: string; // Optional pre-selected project ID
}

export function QuestForm({
  initialData,
  onSuccess,
  projectId
}: QuestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.tags || []
  );
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const { user, environment } = useAuth();

  // Fetch projects for the dropdown - only projects where user is creator/owner
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['owned-projects', user?.id, environment],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get projects where user is the creator
      const { data, error } = await createBrowserClient(environment)
        .from('project')
        .select(
          `
          id, 
          name, 
          creator_id,
          source_language:source_language_id(english_name), 
          target_language:target_language_id(english_name)
        `
        )
        .order('name');

      if (error) throw error;

      return (data || []).filter((p) => p.creator_id === user.id);
    },
    enabled: !!user?.id
  });

  // Fetch tags for the multi-select
  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['tags', environment],
    queryFn: async () => {
      const { data, error } = await createBrowserClient(environment)
        .from('tag')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Set up form with default values
  const form = useForm<QuestFormValues>({
    resolver: zodResolver(questFormSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      project_id: projectId || '',
      tags: []
    }
  });

  // Filter tags based on search query
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  // Determine which tags to show (filtered and then sliced if not expanded)
  const tagsToShow = isTagsExpanded ? filteredTags : filteredTags.slice(0, 3);

  async function onSubmit(values: QuestFormValues) {
    if (!user) {
      toast.error('You must be logged in to create quests');
      return;
    }

    // Server-side check to ensure user is still an owner.
    const isOwner = await checkProjectOwnership(
      values.project_id,
      user.id,
      environment
    );
    if (!isOwner) {
      toast.error('You must be an owner of the project to create quests.');
      return;
    }

    setIsSubmitting(true);
    try {
      // We're now handling tags directly with selectedTags state
      // No need to add them to values here

      let questId: string;

      if (initialData?.id) {
        // Update existing quest
        const { data, error } = await createBrowserClient(environment)
          .from('quest')
          .update({
            name: values.name,
            description: values.description,
            project_id: values.project_id
          })
          .eq('id', initialData.id)
          .select('id')
          .single();

        if (error) throw error;
        questId = data.id;
        toast.success('Quest updated successfully');
      } else {
        // Create new quest
        const { data, error } = await createBrowserClient(environment)
          .from('quest')
          .insert({
            name: values.name,
            description: values.description,
            project_id: values.project_id
          })
          .select('id')
          .single();

        if (error) throw error;
        questId = data.id;
        toast.success('Quest created successfully');
      }

      // Handle tags - first remove existing tags
      if (initialData?.id) {
        await createBrowserClient(environment)
          .from('quest_tag_link')
          .delete()
          .eq('quest_id', questId);
      }

      // Add new tags
      if (selectedTags.length > 0) {
        const tagLinks = selectedTags.map((tagId) => ({
          quest_id: questId,
          tag_id: tagId
        }));

        const { error: tagError } = await createBrowserClient(environment)
          .from('quest_tag_link')
          .insert(tagLinks);

        if (tagError) throw tagError;
      }

      // Reset form if not editing
      if (!initialData) {
        form.reset({
          name: '',
          description: '',
          project_id: values.project_id,
          tags: []
        });
        setSelectedTags([]);
      }

      // Call onSuccess callback with the result
      if (onSuccess) {
        onSuccess({ id: questId });
      }
    } catch (error: any) {
      console.error('Error saving quest:', error);
      const errorMessage = error?.message || 'An unknown error occurred';
      toast.error(`Failed to save quest: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (projectsLoading || tagsLoading) {
    return <Spinner />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <OwnershipAlert
          user={user}
          contentType="quest"
          isEditing={!!initialData}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quest Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter quest name" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for this translation quest.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter quest description"
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Describe what this quest involves and its goals.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="project_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!!projectId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} (
                      {(project.source_language as any)?.english_name} →{' '}
                      {(project.target_language as any)?.english_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The project this quest belongs to.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Use a hidden input for tags to avoid Controller issues */}
        <input
          type="hidden"
          {...form.register('tags')}
          value={JSON.stringify(selectedTags)}
        />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tags
            </label>
            {filteredTags.length > 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                className="h-auto p-1"
              >
                {isTagsExpanded ? (
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
            <div className="flex flex-wrap gap-1 p-3 border rounded-md min-h-[60px] bg-muted/20">
              {selectedTags.length > 0 ? (
                selectedTags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  return (
                    <Badge key={tagId} variant="secondary" className="m-1">
                      {tag?.name}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-2 hover:bg-destructive/20"
                        onClick={() => {
                          const newSelectedTags = selectedTags.filter(
                            (id) => id !== tagId
                          );
                          setSelectedTags(newSelectedTags);
                          form.setValue('tags', newSelectedTags);
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

            {/* Available tags */}
            {!tagsLoading ? (
              <div className="border rounded-md p-4">
                <div className="mb-3">
                  <label className="text-sm font-medium mb-2 block">
                    Available Tags
                  </label>
                  <div className="text-sm text-muted-foreground mb-3">
                    Click on tags to select/deselect them
                  </div>

                  {/* Search input */}
                  {tags.length > 5 && (
                    <div className="mb-3">
                      <Input
                        type="text"
                        placeholder="Search tags..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  {tagsToShow.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tagsToShow.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={
                            selectedTags.includes(tag.id)
                              ? 'default'
                              : 'outline'
                          }
                          className="cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => {
                            let newSelectedTags;
                            if (!selectedTags.includes(tag.id)) {
                              newSelectedTags = [...selectedTags, tag.id];
                            } else {
                              newSelectedTags = selectedTags.filter(
                                (id) => id !== tag.id
                              );
                            }
                            setSelectedTags(newSelectedTags);
                            form.setValue('tags', newSelectedTags);
                          }}
                        >
                          {tag.name}
                          {selectedTags.includes(tag.id) && (
                            <CheckIcon className="ml-1 h-3 w-3" />
                          )}
                        </Badge>
                      ))}
                      {!isTagsExpanded && filteredTags.length > 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsTagsExpanded(true)}
                          className="h-6 px-2 text-xs"
                        >
                          +{filteredTags.length - 3} more
                        </Button>
                      )}
                    </div>
                  ) : tagSearchQuery ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No tags found matching &quot;{tagSearchQuery}&quot;
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No tags available
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center p-4 border rounded-md">
                <Spinner className="h-6 w-6" />
                <span className="ml-2">Loading tags...</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Add tags to categorize this quest.
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting || !user}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : !user ? (
            'Login Required'
          ) : initialData ? (
            'Update Quest'
          ) : (
            'Create Quest'
          )}
        </Button>
      </form>
    </Form>
  );
}
