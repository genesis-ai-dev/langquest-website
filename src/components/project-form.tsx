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
import { InfoIcon, Upload, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { LanguageCombobox, Language } from './language-combobox';
import { useAuth } from '@/components/auth-provider';
import { OwnershipAlert } from '@/components/ownership-alert';
import { createProjectOwnership } from '@/lib/project-permissions';

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
  }),
  color: z.string().optional(),
  image: z.any().optional()
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  initialData?: ProjectFormValues & { id: string };
  onSuccess?: (data: { id: string }) => void;
}

export function ProjectForm({ initialData, onSuccess }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { user, environment } = useAuth();

  // Set up form with default values
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      source_language_id: '',
      target_language_id: '',
      color: '#3b82f6'
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be smaller than 5MB');
        return;
      }

      setSelectedImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Update form value
      form.setValue('image', file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    form.setValue('image', undefined);

    // Reset file input
    const fileInput = document.getElementById(
      'image-upload'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
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
        target_language_id: values.target_language_id,
        color: values.color,
        image: values.image,
        creator_id: user.id // Set creator_id to auth user ID (profile.id = auth.users.id)
      };

      if (initialData?.id) {
        // Update existing project (exclude creator_id from updates)
        const { ...updateData } = projectData;
        const { data, error } = await createBrowserClient(environment)
          .from('project')
          .update(updateData)
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

        try {
          await createProjectOwnership(data.id, user.id, environment);
        } catch (ownershipError) {
          console.error('Error creating project ownership:', ownershipError);
          // Non-fatal: creator_id still grants ownership
        }
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
          target_language_id: '',
          color: '#3b82f6'
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
    <div className="max-h-[60vh] overflow-y-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <OwnershipAlert
            user={user}
            contentType="project"
            isEditing={!!initialData}
          />

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

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-border shadow-sm"
                      style={{ backgroundColor: field.value || '#3b82f6' }}
                    />
                    <input
                      type="color"
                      {...field}
                      value={field.value || '#3b82f6'}
                      className="sr-only"
                      id="color-picker"
                    />
                    <label
                      htmlFor="color-picker"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                    >
                      Choose Color
                    </label>
                  </div>
                </FormControl>
                <FormDescription>
                  Choose a theme color for your project.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="image"
            render={() => (
              <FormItem>
                <FormLabel>Project Image</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Project Image Preview"
                          className="h-20 w-20 rounded-lg object-cover border-2 border-border"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 h-6 w-6 flex items-center justify-center hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-border rounded-lg bg-muted/20">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        id="image-upload"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="image-upload"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {selectedImage ? 'Change Image' : 'Upload Image'}
                      </label>
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  Upload a square icon image for your project (JPG, PNG, max
                  5MB).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
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
              'Update Project'
            ) : (
              'Create Project'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
