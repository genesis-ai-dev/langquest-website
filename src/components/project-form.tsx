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
import { createBrowserClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Spinner } from './spinner';
import { toast } from 'sonner';
import { InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { LanguageCombobox, Language } from './language-combobox';
import { useAuth } from '@/components/auth-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const projectFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Project name must be at least 2 characters.'
  }),
  description: z.string().optional(),
  source_language_id: z.string().min(1, {
    message: 'Source language is required.'
  }),
  target_language_id: z.string().min(1, {
    message: 'Target language is required.'
  })
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  initialData?: ProjectFormValues & { id: string };
  onSuccess?: (data: { id: string }) => void;
}

export function ProjectForm({ initialData, onSuccess }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, environment } = useAuth();

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

  // Fetch languages for dropdowns
  const { data: languages, isLoading: languagesLoading } = useQuery({
    queryKey: ['languages', environment],
    queryFn: async () => {
      const { data, error } = await createBrowserClient(environment)
        .from('language')
        .select('id, english_name, native_name, iso639_3')
        .order('english_name');

      if (error) throw error;
      return data;
    }
  });

  // Handle language creation success
  const handleLanguageCreated = () => {
    // Refetch languages to update the list
    // This is optional since we're already updating the UI optimistically
  };

  async function onSubmit(values: ProjectFormValues) {
    // Check if user is authenticated
    if (!user) {
      toast.error('You must be logged in to create projects');
      return;
    }

    setIsSubmitting(true);
    try {
      const projectData = {
        name: values.name,
        description: values.description || null,
        source_language_id: values.source_language_id,
        target_language_id: values.target_language_id
      };

      if (initialData?.id) {
        // Update existing project
        const { data, error } = await createBrowserClient(environment)
          .from('project')
          .update(projectData)
          .eq('id', initialData.id)
          .select('id')
          .single();

        if (error) throw error;
        toast.success('Project updated successfully');

        // Call onSuccess callback with the result
        if (onSuccess && data) {
          onSuccess(data);
        }
      } else {
        // Create new project
        const { data, error } = await createBrowserClient(environment)
          .from('project')
          .insert(projectData)
          .select('id')
          .single();

        if (error) throw error;
        toast.success('Project created successfully');

        // Call onSuccess callback with the result
        if (onSuccess && data) {
          onSuccess(data);
        }
      }

      // Reset form if not editing
      if (!initialData) {
        form.reset({
          name: '',
          description: '',
          source_language_id: '',
          target_language_id: ''
        });
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {user && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Project {initialData ? 'Edit' : 'Creation'}</AlertTitle>
            <AlertDescription>
              {initialData ? 'Editing' : 'Creating'} project as:{' '}
              <span className="font-medium">{user.email}</span>
            </AlertDescription>
          </Alert>
        )}

        {!user && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              You must be logged in to {initialData ? 'edit' : 'create'}{' '}
              projects
            </AlertDescription>
          </Alert>
        )}

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
                Provide details about the project&apos;s purpose and goals.
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
                <FormLabel className="flex items-center gap-2">
                  Source Language
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          The original language of the content.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <LanguageCombobox
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select source language"
                    languages={(languages as Language[]) || []}
                    isLoading={languagesLoading}
                    onCreateSuccess={handleLanguageCreated}
                  />
                </FormControl>
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
                <FormLabel className="flex items-center gap-2">
                  Target Language
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          The language you&apos;re translating into.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <LanguageCombobox
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select target language"
                    languages={(languages as Language[]) || []}
                    isLoading={languagesLoading}
                    onCreateSuccess={handleLanguageCreated}
                  />
                </FormControl>
                <FormDescription>
                  The language you&apos;re translating into.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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
            'Update Project'
          ) : (
            'Create Project'
          )}
        </Button>
      </form>
    </Form>
  );
}
