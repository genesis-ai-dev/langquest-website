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
import { useAuth } from '@/components/auth-provider';
import { checkProjectOwnership } from '@/lib/project-permissions';
import { OwnershipAlert } from '@/components/ownership-alert';
import { TagSelector } from '@/components/tag-selector';
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

  if (projectsLoading) {
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

        <TagSelector
          selectedTags={selectedTags}
          onTagsChange={(tags) => {
            setSelectedTags(tags);
            form.setValue('tags', tags);
          }}
          environment={environment}
          label="Tags"
          description="Add tags to categorize this quest."
          disabled={isSubmitting || !user}
        />

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
