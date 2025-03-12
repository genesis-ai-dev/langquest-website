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
import { X } from 'lucide-react';
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
  const [open, setOpen] = useState(false);

  // Fetch projects for the dropdown
  const { data: projects, isLoading: projectsLoading } = useQuery({
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
      return data;
    }
  });

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
      // Add selected tags to the values
      values.tags = selectedTags;

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
      if (values.tags && values.tags.length > 0) {
        const tagLinks = values.tags.map((tagId) => ({
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

        <FormField
          control={form.control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1 p-1 border rounded-md">
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
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
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
                                  setSelectedTags([...selectedTags, tag.id]);
                                } else {
                                  setSelectedTags(
                                    selectedTags.filter((id) => id !== tag.id)
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
                Add tags to categorize this quest.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
