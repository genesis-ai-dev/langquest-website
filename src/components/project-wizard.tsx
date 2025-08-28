'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
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
import { Spinner } from '@/components/spinner';
import { toast } from 'sonner';
import {
  InfoIcon,
  ArrowRight,
  ArrowLeft,
  Copy,
  Plus,
  Upload,
  X
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { LanguageCombobox, Language } from './language-combobox';
import { useAuth } from '@/components/auth-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { createProjectOwnership } from '@/lib/project-permissions';

// Step 1: Choose project creation method
const projectMethodSchema = z.object({
  method: z.enum(['new', 'clone']),
  template_id: z.string().optional()
});

// Step 2: Project details
const projectDetailsSchema = z.object({
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

// Step 3: Confirmation
const projectConfirmSchema = z.object({
  confirmed: z.boolean().default(true)
});

// Combined schema for all steps (used only for typing)
// const projectWizardSchema = z.object({
//   step1: projectMethodSchema,
//   step2: projectDetailsSchema,
//   step3: projectConfirmSchema
// });

type ProjectWizardValues = {
  step1?: z.infer<typeof projectMethodSchema>;
  step2?: z.infer<typeof projectDetailsSchema>;
  step3?: z.infer<typeof projectConfirmSchema>;
};

interface ProjectWizardProps {
  onSuccess?: (data: { id: string }) => void;
  onCancel?: () => void;
  projectToClone?: string; // ID of project to clone
}

export function ProjectWizard({
  onSuccess,
  onCancel,
  projectToClone
}: ProjectWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { user, environment } = useAuth();
  const [cloneJob, setCloneJob] = useState<{
    id?: string;
    status?: string;
    stage?: string;
    dstProjectId?: string;
  } | null>(null);
  const [wizardData, setWizardData] = useState<Partial<ProjectWizardValues>>({
    step1: {
      method: projectToClone ? 'clone' : 'new',
      template_id: projectToClone || undefined
    },
    step2: {
      name: '',
      description: '',
      source_language_id: 'eng',
      target_language_id: 'eng',
      color: '#3b82f6'
    },
    step3: { confirmed: true }
  });

  // Step 1 form
  const step1Form = useForm<z.infer<typeof projectMethodSchema>>({
    resolver: zodResolver(projectMethodSchema),
    defaultValues: wizardData.step1 || {
      method: projectToClone ? 'clone' : 'new',
      template_id: projectToClone || undefined
    }
  });

  // Step 2 form
  const step2Form = useForm<z.infer<typeof projectDetailsSchema>>({
    resolver: zodResolver(projectDetailsSchema),
    defaultValues: {
      name: '',
      description: '',
      source_language_id: 'eng',
      target_language_id: 'eng',
      color: '#3b82f6'
    }
  });

  // Fetch existing projects for cloning
  const { data: existingProjects } = useQuery({
    queryKey: ['projects', environment],
    queryFn: async () => {
      const supabase = createBrowserClient(environment);
      const { data, error } = await supabase
        .from('project')
        .select(
          `
        id,
        name,
        description,
        source_language_id,
        target_language_id,
        source_language:source_language_id(id, english_name),
        target_language:target_language_id(english_name),
        quests:quest!project_id(count)
      `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: step === 1
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

  // Simplified cloning logic - combine all the related effects
  useEffect(() => {
    // Only run this effect when we're on step 1 or 2, not after
    if (step > 2) return;

    if (!projectToClone || !existingProjects) return;

    const projectData = existingProjects.find((p) => p.id === projectToClone);
    if (!projectData) return;

    const cloneData = {
      name: '',
      description: projectData.description,
      source_language_id: projectData.source_language_id,
      target_language_id: ''
    };

    // Update everything at once
    setProjectName(cloneData.name);
    setWizardData((prev) => ({
      ...prev,
      step1: { method: 'clone', template_id: projectToClone },
      step2: cloneData
    }));
    step2Form.reset(cloneData);

    // Auto-advance to step 2
    if (step === 1) setStep(2);
  }, [projectToClone, existingProjects, step, step2Form]);

  // Simplified step 2 sync
  useEffect(() => {
    if (step === 2 && wizardData.step2 && !step2Form.getValues('name')) {
      step2Form.reset(wizardData.step2);
      if (wizardData.step2.name) setProjectName(wizardData.step2.name);
    }
  }, [step, wizardData.step2, step2Form]);

  // Sync the project name with the form
  useEffect(() => {
    if (projectName) {
      step2Form.setValue('name', projectName);

      // Also update the wizard data
      setWizardData((prev) => {
        // Make sure we have all required properties
        const currentStep2 = prev.step2 || {
          name: '',
          source_language_id: 'eng',
          target_language_id: 'eng',
          description: ''
        };

        return {
          ...prev,
          step2: {
            ...currentStep2,
            name: projectName
          }
        };
      });
    }
  }, [projectName, step2Form]);

  // Watch for changes in the form and update wizardData
  useEffect(() => {
    const subscription = step2Form.watch((value) => {
      if (step === 2 && Object.keys(value).length > 0) {
        // Only update if we have actual values and we're on step 2
        setWizardData((prev) => {
          const prevStep2 = prev.step2 || {
            name: '',
            description: undefined,
            source_language_id: 'eng',
            target_language_id: 'eng'
          };

          // Construct the potential new step2 data from current form values
          const newStep2Data: z.infer<typeof projectDetailsSchema> = {
            name: value.name || prevStep2.name,
            description: value.description,
            source_language_id:
              value.source_language_id || prevStep2.source_language_id,
            target_language_id:
              value.target_language_id !== undefined
                ? value.target_language_id
                : prevStep2.target_language_id
          };

          // Compare new data with previous step2 data
          if (
            prevStep2.name === newStep2Data.name &&
            prevStep2.description === newStep2Data.description &&
            prevStep2.source_language_id === newStep2Data.source_language_id &&
            prevStep2.target_language_id === newStep2Data.target_language_id
          ) {
            return prev; // No actual change in values, return the existing state object to prevent loop
          }

          // If there are changes, update wizardData.step2
          return {
            ...prev,
            step2: newStep2Data
          };
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [step, step2Form]); // Dependencies: step and step2Form (which is stable)

  // Reset form once when entering step 2 (avoid resetting on each wizardData change)
  useEffect(() => {
    if (step === 2 && wizardData.step2) {
      const currentName = step2Form.getValues('name');
      const isFirstTimeInStep2 = currentName === '';

      if (isFirstTimeInStep2) {
        step2Form.reset(wizardData.step2);
      }
    }
  }, [step, step2Form]);

  // Step 3 form
  const step3Form = useForm<z.infer<typeof projectConfirmSchema>>({
    resolver: zodResolver(projectConfirmSchema),
    defaultValues: wizardData.step3 || {
      confirmed: true
    }
  });

  // Handle step 1 submission
  const onStep1Submit = async (values: z.infer<typeof projectMethodSchema>) => {
    setWizardData((prev) => ({ ...prev, step1: values }));
    setStep(2);
  };

  // Handle step 2 submission
  const onStep2Submit = async (
    values: z.infer<typeof projectDetailsSchema>
  ) => {
    const formValues = {
      ...values,
      name: projectName || values.name
    };

    setWizardData((prev) => ({
      ...prev,
      step2: formValues
    }));

    setStep(3);
  };

  // Handle step 3 submission (final submission)
  const onStep3Submit = async (
    values: z.infer<typeof projectConfirmSchema>
  ) => {
    // Prevent re-entrancy / double submits
    if (isSubmitting) return;
    if (
      wizardData.step1?.method === 'clone' &&
      cloneJob?.id &&
      cloneJob.status !== 'failed' &&
      cloneJob.status !== 'done'
    ) {
      // A clone is already in progress for this dialog
      return;
    }
    if (!user) {
      toast.error('You must be logged in to create projects');
      return;
    }

    setWizardData((prev) => ({ ...prev, step3: values }));
    setIsSubmitting(true);

    try {
      const isCloning =
        wizardData.step1?.method === 'clone' && wizardData.step1?.template_id;

      if (isCloning) {
        // Validate required fields for clone path
        const rootProjectId = wizardData.step1?.template_id as string;
        const newName = (projectName || wizardData.step2?.name || '').trim();
        const targetLang = (wizardData.step2?.target_language_id || '').trim();

        if (!newName) {
          toast.error('Please enter a name for the cloned project');
          return;
        }
        if (!targetLang) {
          toast.error('Please select a target language');
          return;
        }

        const supabase = createBrowserClient(environment);

        // Resolve profile.id for creator_id (not auth uid)
        let profileId: string | undefined;
        try {
          const { data: profByAuth } = await supabase
            .from('profile')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();
          if (profByAuth?.id) {
            profileId = profByAuth.id;
          } else {
            // Fallback if schema uses id = auth uid
            const { data: profById } = await supabase
              .from('profile')
              .select('id')
              .eq('id', user.id)
              .single();
            profileId = profById?.id;
          }
        } catch {
          profileId = undefined;
        }

        if (!profileId) {
          toast.error('Could not resolve your profile');
          return;
        }

        // Start clone job via RPC
        const { data: jobIdData, error: startErr } = await supabase.rpc(
          'start_clone',
          {
            p_root_project_id: rootProjectId,
            p_new_project_name: newName,
            p_target_language_id: targetLang,
            p_creator_id: profileId,
            p_batch_size: 25
          }
        );
        if (startErr) throw startErr;
        const jobId = jobIdData as string;

        toast.success('Clone started');
        setCloneJob({ id: jobId, status: 'queued', stage: 'seed_project' });

        // Persist minimal job tracking so dashboard can gray out destination once visible
        try {
          const storageKey = `cloneJobs:${environment}:${user.id}`;
          const existingRaw = localStorage.getItem(storageKey);
          const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
          const entry = { jobId, name: newName };
          localStorage.setItem(
            storageKey,
            JSON.stringify([entry, ...existing])
          );
        } catch {}

        // Poll job status
        let attempts = 0;
        let dstProjectId: string | undefined;
        while (attempts < 120) {
          const { data, error } = await supabase.rpc('get_clone_status', {
            p_job_id: jobId
          });
          if (error) throw error;

          const row = Array.isArray(data) ? (data as any[])[0] : (data as any);
          const status = row?.status as string | undefined;
          const progress = row?.progress as any;
          if (progress && typeof progress === 'object') {
            dstProjectId = progress.dst_project_id || dstProjectId;
          }

          setCloneJob({
            id: jobId,
            status,
            stage: progress?.stage,
            dstProjectId
          });

          // Keep local to dialog; dashboard effect will poll get_clone_status by jobId

          if (status === 'done') {
            toast.success('Project cloned successfully');
            if (onSuccess) onSuccess({ id: dstProjectId || '' });
            return;
          }
          if (status === 'failed') {
            toast.error('Project clone failed');
            return;
          }

          // wait 2s between polls
          await new Promise((r) => setTimeout(r, 2000));
          attempts += 1;
        }

        toast.error(
          'Clone timed out. It may still complete in the background.'
        );
        return;
      }

      // Non-clone path: create a fresh project directly
      const projectData = {
        name: projectName || wizardData.step2?.name || '',
        description: wizardData.step2?.description || '',
        source_language_id: wizardData.step2?.source_language_id || '',
        target_language_id: wizardData.step2?.target_language_id || ''
      };

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
        toast.error('Project created but ownership setup failed');
        return;
      }

      toast.success('Project created successfully');
      if (onSuccess) onSuccess(data);
    } catch {
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle going back to previous step
  const handleBack = () => {
    if (step > 1) {
      // If going back from step 3 to step 2, preserve the current form values
      if (step === 3) {
        // Don't reset the form, let the current values persist
        // This ensures user edits are not lost when navigating back
      }
      setStep(step - 1);
    }
  };

  // Handle cancellation
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Get source language name
  const getLanguageName = (id: string) => {
    const language = languages?.find((lang) => lang.id === id);
    return language ? language.english_name : id;
  };

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
      step2Form.setValue('image', file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    step2Form.setValue('image', undefined);

    // Reset file input
    const fileInput = document.getElementById(
      'wizard-image-upload'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Render step 1: Choose project creation method
  const renderStep1 = () => {
    return (
      <Form {...step1Form}>
        <form
          onSubmit={step1Form.handleSubmit(onStep1Submit)}
          className="space-y-6"
        >
          <FormField
            control={step1Form.control}
            name="method"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Project Creation Method</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new" />
                      <Label htmlFor="new" className="flex items-center">
                        <Plus className="mr-2 h-4 w-4" />
                        Create a new project from scratch
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="clone" id="clone" />
                      <Label htmlFor="clone" className="flex items-center">
                        <Copy className="mr-2 h-4 w-4" />
                        Clone an existing project
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {step1Form.watch('method') === 'clone' && (
            <FormField
              control={step1Form.control}
              name="template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Project to Clone</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project to clone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {existingProjects?.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          No projects available to clone
                        </div>
                      ) : (
                        existingProjects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} (
                            {project.source_language[0]?.english_name} →{' '}
                            {project.target_language[0]?.english_name})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a project to clone. You&apos;ll need to specify a new
                    target language in the next step.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  // Render step 2: Project details
  const renderStep2 = () => {
    return (
      <Form {...step2Form}>
        <form
          onSubmit={step2Form.handleSubmit(onStep2Submit)}
          className="space-y-6"
        >
          <FormField
            control={step2Form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter project name"
                    value={projectName}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setProjectName(newValue);
                      // Also update the form value
                      field.onChange(newValue);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>
                  A descriptive name for your translation project.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={step2Form.control}
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
              control={step2Form.control}
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
                      disabled={wizardData.step1?.method === 'clone'}
                    />
                  </FormControl>
                  <FormDescription>
                    {wizardData.step1?.method === 'clone'
                      ? "Locked to the source project's source language."
                      : 'The original language of the content.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={step2Form.control}
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
                    The language you&apos;re translating into. This is required
                    even when cloning a template.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={step2Form.control}
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
                      id="wizard-color-picker"
                    />
                    <label
                      htmlFor="wizard-color-picker"
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
            control={step2Form.control}
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
                        id="wizard-image-upload"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="wizard-image-upload"
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

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  // Render step 3: Confirmation
  const renderStep3 = () => {
    const projectDetails = wizardData.step2;
    const isCloning = wizardData.step1?.method === 'clone';
    const sourceProjectId = wizardData.step1?.template_id;
    const sourceProject = existingProjects?.find(
      (p) => p.id === sourceProjectId
    );

    return (
      <Form {...step3Form}>
        <form
          onSubmit={step3Form.handleSubmit(onStep3Submit)}
          className="space-y-6"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Project Summary</h3>

            <div className="rounded-md border p-4 space-y-3">
              <div>
                <span className="font-medium">Creation Method:</span>{' '}
                {isCloning ? 'Cloning from project' : 'New project'}
              </div>

              {isCloning && sourceProject && (
                <div>
                  <span className="font-medium">Source Project:</span>{' '}
                  {sourceProject.name}
                </div>
              )}

              <div>
                <span className="font-medium">Name:</span>{' '}
                {projectName || projectDetails?.name}
              </div>

              {projectDetails?.description && (
                <div>
                  <span className="font-medium">Description:</span>{' '}
                  {projectDetails.description}
                </div>
              )}

              <div>
                <span className="font-medium">Source Language:</span>{' '}
                {getLanguageName(projectDetails?.source_language_id || '')}
              </div>

              <div>
                <span className="font-medium">Target Language:</span>{' '}
                {getLanguageName(projectDetails?.target_language_id || '')}
              </div>

              {projectDetails?.color && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Color:</span>
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: projectDetails.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {projectDetails.color}
                  </span>
                </div>
              )}

              {imagePreview && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Image:</span>
                  <img
                    src={imagePreview}
                    alt="Selected project image"
                    className="w-8 h-8 rounded object-cover border border-border"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedImage?.name}
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Please review the project details above. Click &quot;Create
              Project&quot; to proceed or go back to make changes.
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting || !user}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : !user ? (
                'Login Required'
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  // Render the current step
  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <div
            className={`rounded-full w-8 h-8 flex items-center justify-center ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            1
          </div>
          <div className="h-1 w-8 bg-muted">
            <div className={`h-full ${step > 1 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <div
            className={`rounded-full w-8 h-8 flex items-center justify-center ${step === 2 ? 'bg-primary text-primary-foreground' : step > 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            2
          </div>
          <div className="h-1 w-8 bg-muted">
            <div className={`h-full ${step > 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <div
            className={`rounded-full w-8 h-8 flex items-center justify-center ${step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            3
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Step {step} of 3</div>
      </div>

      {user && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Project Creation</AlertTitle>
          <AlertDescription>
            Creating project as:{' '}
            <span className="font-medium">{user.email}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Login warning */}
      {!user && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to create projects
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Choose Project Creation Method'}
            {step === 2 && 'Project Details'}
            {step === 3 && 'Confirm Project Creation'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Select how you want to create your new project'}
            {step === 2 && 'Enter the details for your new project'}
            {step === 3 && 'Review and confirm your project details'}
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[60vh] overflow-y-auto">
          {renderCurrentStep()}
          {step === 3 && cloneJob && (
            <div className="mt-4 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Clone status</div>
                  <div className="text-muted-foreground">
                    {cloneJob.status || 'queued'}
                    {cloneJob.stage ? ` • ${cloneJob.stage}` : ''}
                  </div>
                </div>
                {cloneJob.dstProjectId && (
                  <div className="text-muted-foreground">
                    New project id:{' '}
                    <span className="font-mono">{cloneJob.dstProjectId}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
