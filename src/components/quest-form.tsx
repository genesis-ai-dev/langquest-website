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
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Spinner } from './spinner';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { X, CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Fetch projects for the dropdown
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project')
        .select(
          `
          id, 
          name, 
          source_language:language!source_language_id(english_name), 
          target_language:language!target_language_id(english_name)
        `
        )
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch tags for the multi-select
  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
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

  async function onSubmit(values: QuestFormValues) {
    setIsSubmitting(true);
    try {
      // We're now handling tags directly with selectedTags state
      // No need to add them to values here

      let questId: string;

      if (initialData?.id) {
        // Update existing quest
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        await supabase.from('quest_tag_link').delete().eq('quest_id', questId);
      }

      // Add new tags
      if (selectedTags.length > 0) {
        const tagLinks = selectedTags.map((tagId) => ({
          quest_id: questId,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
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
    } catch (error) {
      console.error('Error saving quest:', error);
      toast.error('Failed to save quest');
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
                      {project.name} ({project.source_language.english_name} →{' '}
                      {project.target_language.english_name})
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
          <div className="flex justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tags
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1 p-1 border rounded-md min-h-[60px]">
              {selectedTags.length > 0 ? (
                selectedTags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  return (
                    <Badge key={tagId} variant="secondary" className="m-1">
                      {tag?.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-2"
                        onClick={() => {
                          const newSelectedTags = selectedTags.filter(
                            (id) => id !== tagId
                          );
                          setSelectedTags(newSelectedTags);
                          // Update form value
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

            {/* Only render the Popover when tags are available or loading is complete */}
            {!tagsLoading ? (
              <div className="border rounded-md p-4">
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">
                    Available Tags
                  </label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Click on tags to select/deselect them
                  </div>
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={
                            selectedTags.includes(tag.id)
                              ? 'default'
                              : 'outline'
                          }
                          className="cursor-pointer"
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
                            // Update form value
                            form.setValue('tags', newSelectedTags);
                          }}
                        >
                          {tag.name}
                          {selectedTags.includes(tag.id) && (
                            <CheckIcon className="ml-1 h-3 w-3" />
                          )}
                        </Badge>
                      ))}
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

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
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
