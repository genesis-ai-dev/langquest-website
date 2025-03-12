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

const projectFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Project name must be at least 2 characters.'
  }),
  description: z.string().optional(),
  source_language_id: z.string({
    required_error: 'Please select a source language.'
  }),
  target_language_id: z.string({
    required_error: 'Please select a target language.'
  })
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  initialData?: ProjectFormValues & { id: string };
  onSuccess?: (data: { id: string }) => void;
}

export function ProjectForm({ initialData, onSuccess }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch languages for the dropdown
  const { data: languages, isLoading: languagesLoading } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language')
        .select('id, english_name')
        .order('english_name');

      if (error) throw error;
      return data;
    }
  });

  // Set up form with default values
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      source_language_id: '',
      target_language_id: ''
    }
  });

  async function onSubmit(values: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      let result;

      if (initialData?.id) {
        // Update existing project
        const { data, error } = await supabase
          .from('project')
          .update(values)
          .eq('id', initialData.id)
          .select('id')
          .single();

        if (error) throw error;
        result = data;
        toast.success('Project updated successfully');
      } else {
        // Create new project
        const { data, error } = await supabase
          .from('project')
          .insert(values)
          .select('id')
          .single();

        if (error) throw error;
        result = data;
        toast.success('Project created successfully');
      }

      // Reset form if not editing
      if (!initialData) {
        form.reset({
          name: '',
          description: '',
          source_language_id: values.source_language_id,
          target_language_id: values.target_language_id
        });
      }

      // Call onSuccess callback with the result
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (languagesLoading) {
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
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter project name" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for your translation project.
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
                  placeholder="Enter project description"
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Provide details about the project's purpose and goals.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="source_language_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source Language</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {languages?.map((language) => (
                      <SelectItem key={language.id} value={language.id}>
                        {language.english_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The original language of the content.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_language_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Language</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {languages?.map((language) => (
                      <SelectItem key={language.id} value={language.id}>
                        {language.english_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The language you're translating into.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : initialData ? (
            'Update Project'
          ) : (
            'Create Project'
          )}
        </Button>
      </form>
    </Form>
  );
}
