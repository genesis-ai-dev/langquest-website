'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/spinner';
import { toast } from 'sonner';
import { InfoIcon, ArrowRight, ArrowLeft, Copy, Plus } from 'lucide-react';
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
  CardFooter,
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
  })
});

// Step 3: Confirmation
const projectConfirmSchema = z.object({
  confirmed: z.boolean().default(true)
});

// Combined schema for all steps
const projectWizardSchema = z.object({
  step1: projectMethodSchema,
  step2: projectDetailsSchema,
  step3: projectConfirmSchema
});

type ProjectWizardValues = z.infer<typeof projectWizardSchema>;

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
  const queryClient = useQueryClient();
  const [wizardData, setWizardData] = useState<Partial<ProjectWizardValues>>({
    step1: {
      method: projectToClone ? 'clone' : 'new',
      template_id: projectToClone || undefined
    },
    step2: {
      name: '',
      description: '',
      source_language_id: 'eng',
      target_language_id: 'eng'
    },
    step3: { confirmed: true }
  });

  // Fetch all projects for cloning (not just templates)
  const { data: existingProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['existing-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project')
        .select(
          `
          id, 
          name, 
          description,
          source_language_id,
          source_language:language!source_language_id(english_name), 
          target_language:language!target_language_id(english_name)
        `
        )
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Fetch languages for dropdowns
  const { data: languages, isLoading: languagesLoading } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language')
        .select('id, english_name, native_name, iso639_3')
        .order('english_name');

      if (error) throw error;
      return data;
    }
  });

  // Initialize project name from wizardData when component loads
  useEffect(() => {
    if (wizardData.step2?.name && !projectName) {
      setProjectName(wizardData.step2.name);
    }
  }, [wizardData.step2?.name, projectName]);

  // Step 1 form
  const step1Form = useForm<z.infer<typeof projectMethodSchema>>({
    resolver: zodResolver(projectMethodSchema),
    defaultValues: {
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
      target_language_id: 'eng'
    }
  });

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
        // 'value' is the current state of the form from the watch callback
        if (value.name) {
          // Only update if name exists (to avoid empty updates)
          setWizardData((prev) => {
            const prevStep2 = prev.step2 || {
              name: '',
              description: undefined, // explicit undefined for clarity if not present
              source_language_id: 'eng',
              target_language_id: 'eng'
            };

            // Construct the potential new step2 data from current form values
            // Ensure it strictly matches the type z.infer<typeof projectDetailsSchema>
            const newStep2Data: z.infer<typeof projectDetailsSchema> = {
              name: value.name!, // Assert non-null as it's checked by the if (value.name) guard
              description: value.description, // This is string | undefined, matching the schema
              source_language_id:
                value.source_language_id || prevStep2.source_language_id,
              target_language_id:
                value.target_language_id || prevStep2.target_language_id
            };

            // Compare new data with previous step2 data
            if (
              prevStep2.name === newStep2Data.name &&
              prevStep2.description === newStep2Data.description &&
              prevStep2.source_language_id ===
                newStep2Data.source_language_id &&
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
      }
    });

    return () => subscription.unsubscribe();
  }, [step, step2Form]); // Dependencies: step and step2Form (which is stable)

  // Reset form when step changes to 2
  useEffect(() => {
    if (step === 2 && wizardData.step2) {
      // Only reset the form with wizardData if it's the first time we're entering step 2
      // and there's no user input yet
      const currentName = step2Form.getValues('name');
      const isFirstTimeInStep2 = currentName === '';

      if (isFirstTimeInStep2) {
        step2Form.reset(wizardData.step2);
      }
    }
  }, [step, wizardData.step2, step2Form]);

  // Step 3 form
  const step3Form = useForm<z.infer<typeof projectConfirmSchema>>({
    resolver: zodResolver(projectConfirmSchema),
    defaultValues: wizardData.step3 || {
      confirmed: true
    }
  });

  // If projectToClone is provided, pre-fill the form when projects are loaded
  useEffect(() => {
    console.log(
      '[ProjectWizard - Clone Effect Triggered] projectToClone:',
      projectToClone,
      'existingProjects loaded:',
      !!existingProjects,
      'current step:',
      step
    );

    if (projectToClone && existingProjects) {
      const projectData = existingProjects.find((p) => p.id === projectToClone);
      if (projectData) {
        console.log(
          '[ProjectWizard - Clone] Found projectData to clone:',
          JSON.parse(JSON.stringify(projectData))
        );

        // Update step1Form values if this is the initial setup for cloning
        if (
          step1Form.getValues('method') !== 'clone' ||
          step1Form.getValues('template_id') !== projectToClone
        ) {
          step1Form.setValue('method', 'clone');
          step1Form.setValue('template_id', projectToClone);
        }

        const initialName = `Clone of ${projectData.name}`;
        const initialDescription = projectData.description;
        const initialSourceLanguage = projectData.source_language_id;

        console.log(
          '[ProjectWizard - Clone] Generated initialName:',
          initialName
        );
        console.log(
          '[ProjectWizard - Clone] Generated initialDescription:',
          initialDescription
        );
        console.log(
          '[ProjectWizard - Clone] Generated initialSourceLanguage:',
          initialSourceLanguage
        );

        // Set the local projectName state, which controls the input field
        setProjectName(initialName);

        // Prepare values for step2Form and wizardData.step2
        const step2Values = {
          name: initialName,
          description: initialDescription,
          source_language_id: initialSourceLanguage,
          target_language_id: '' // User must specify target language
        };

        // Update wizardData first, as other effects might depend on it
        setWizardData((prev) => ({
          ...prev,
          step1: {
            // ensure step1 is also aligned
            method: 'clone',
            template_id: projectToClone
          },
          step2: { ...(prev.step2 || {}), ...step2Values }
        }));

        // Reset step2Form with the new values
        // This should happen after wizardData is updated if other effects watch wizardData.step2 to reset the form
        step2Form.reset(step2Values);
        console.log(
          '[ProjectWizard - Clone] step2Form reset with:',
          JSON.parse(JSON.stringify(step2Values))
        );

        // If projectToClone is provided and we are in step 1, automatically move to step 2
        if (step === 1) {
          console.log(
            '[ProjectWizard - Clone] Advancing from step 1 to step 2 due to cloning.'
          );
          setStep(2);
        }
      } else {
        console.log(
          '[ProjectWizard - Clone] projectToClone ID provided (' +
            projectToClone +
            '), but projectData NOT found in existingProjects.'
        );
      }
    } else {
      console.log(
        '[ProjectWizard - Clone] useEffect for cloning condition not met (inside). projectToClone:',
        projectToClone,
        'existingProjects loaded:',
        !!existingProjects
      );
    }
    // Main dependencies are projectToClone and existingProjects. Others are for specific conditional logic inside.
  }, [
    projectToClone,
    existingProjects,
    step,
    step1Form,
    step2Form,
    setProjectName,
    setWizardData,
    setStep
  ]);

  // Sync step2Form with wizardData.step2 when step changes to 2 or wizardData.step2 changes
  // This helps ensure that if wizardData.step2 was populated by the cloning effect,
  // the form reflects it when navigating to or re-entering step 2.
  useEffect(() => {
    if (step === 2 && wizardData.step2) {
      console.log(
        '[ProjectWizard - Step 2 Sync Effect] Resetting step2Form with wizardData.step2:',
        JSON.parse(JSON.stringify(wizardData.step2))
      );
      step2Form.reset(wizardData.step2);
      if (wizardData.step2.name) {
        setProjectName(wizardData.step2.name); // Sync local projectName if it exists in wizardData
      }
    }
  }, [step, wizardData.step2]); // step2Form is not in deps to prevent potential loops if reset triggers watch that updates wizardData

  // Initialize project name from wizardData when component loads (if not already set by cloning)
  useEffect(() => {
    if (wizardData.step2?.name && !projectName && step === 2) {
      console.log(
        '[ProjectWizard - Initial projectName Sync] Setting projectName from wizardData.step2.name:',
        wizardData.step2.name
      );
      setProjectName(wizardData.step2.name);
    }
    // Only run when wizardData.step2.name changes and projectName is not already set, specifically for step 2.
  }, [wizardData.step2?.name, step]); // Removed projectName from deps to avoid re-running if projectName is set by this effect itself or by cloning effect.

  // Handle step 1 submission
  const onStep1Submit = async (values: z.infer<typeof projectMethodSchema>) => {
    setWizardData((prev) => ({ ...prev, step1: values }));
    setStep(2);
  };

  // Handle step 2 submission
  const onStep2Submit = async (
    values: z.infer<typeof projectDetailsSchema>
  ) => {
    // Use our local state for the project name
    const formValues = {
      ...values,
      name: projectName || values.name // Prefer our local state, fall back to form value
    };

    // Log the values to verify they're being captured correctly
    console.log('Step 2 form values on submit:', formValues);

    // Update the wizard data with the current form values
    setWizardData((prev) => ({
      ...prev,
      step2: formValues
    }));

    // Move to the next step
    setStep(3);
  };

  // Handle step 3 submission (final submission)
  const onStep3Submit = async (
    values: z.infer<typeof projectConfirmSchema>
  ) => {
    setWizardData((prev) => ({ ...prev, step3: values }));

    // Final submission
    setIsSubmitting(true);
    try {
      // Get the latest values from wizardData and our local state
      const projectData = {
        name: projectName || wizardData.step2?.name || '',
        description: wizardData.step2?.description || '',
        source_language_id: wizardData.step2?.source_language_id || '',
        target_language_id: wizardData.step2?.target_language_id || ''
      };

      console.log('Final project data being submitted:', projectData);

      // Create new project
      const { data, error } = await supabase
        .from('project')
        .insert(projectData)
        .select('id')
        .single();

      if (error) throw error;

      // If cloning a template, also clone quests and assets
      if (
        wizardData.step1?.method === 'clone' &&
        wizardData.step1?.template_id
      ) {
        // Clone quests from template
        const { data: templateQuests, error: questsError } = await supabase
          .from('quest')
          .select('*')
          .eq('project_id', wizardData.step1.template_id);

        if (questsError) throw questsError;

        // For each quest in the template, create a new quest in the new project
        for (const quest of templateQuests || []) {
          const newQuest = {
            name: quest.name,
            description: quest.description,
            project_id: data.id,
            active: quest.active
          };

          const { data: newQuestData, error: newQuestError } = await supabase
            .from('quest')
            .insert(newQuest)
            .select('id')
            .single();

          if (newQuestError) throw newQuestError;

          // Clone asset links for this quest
          const { data: assetLinks, error: assetLinksError } = await supabase
            .from('quest_asset_link')
            .select('asset_id')
            .eq('quest_id', quest.id);

          if (assetLinksError) throw assetLinksError;

          // Create new asset links for the new quest
          for (const link of assetLinks || []) {
            const newLink = {
              quest_id: newQuestData.id,
              asset_id: link.asset_id,
              active: true
            };

            const { error: newLinkError } = await supabase
              .from('quest_asset_link')
              .insert(newLink);

            if (newLinkError) throw newLinkError;
          }
        }
      }

      toast.success('Project created successfully');

      // Call onSuccess callback with the result
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Error creating project:', error);
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
  const handleLanguageCreated = (newLanguage: Language) => {
    // Refetch languages to update the list
    queryClient.invalidateQueries({ queryKey: ['languages'] });
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
                      {projectsLoading ? (
                        <div className="flex justify-center p-2">
                          <Spinner className="h-4 w-4" />
                        </div>
                      ) : existingProjects?.length === 0 ? (
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
                    Choose a project to clone. You'll need to specify a new
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
                    {(function () {
                      console.log(
                        '[ProjectWizard - renderStep2] Source LanguageCombobox value:',
                        field.value
                      );
                      console.log(
                        '[ProjectWizard - renderStep2] Source LanguageCombobox wizardData.step2.source_language_id:',
                        wizardData.step2?.source_language_id
                      );
                      return (
                        <LanguageCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select source language"
                          languages={(languages as Language[]) || []}
                          isLoading={languagesLoading}
                          onCreateSuccess={handleLanguageCreated}
                        />
                      );
                    })()}
                  </FormControl>
                  <FormDescription>
                    {wizardData.step1?.method === 'clone'
                      ? "Defaults to the cloned project's source language, but can be changed."
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
                            The language you're translating into.
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
                    The language you're translating into. This is required even
                    when cloning a template.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
            </div>

            <p className="text-sm text-muted-foreground">
              Please review the project details above. Click "Create Project" to
              proceed or go back to make changes.
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
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
        <CardContent>{renderCurrentStep()}</CardContent>
      </Card>
    </div>
  );
}
