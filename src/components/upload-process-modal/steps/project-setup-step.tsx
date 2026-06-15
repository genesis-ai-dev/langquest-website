import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import { LanguoidComboboxUpload } from '@/components/languoid-combobox-upload';
import { Spinner } from '@/components/spinner';
import { fetchFiaLanguoids } from '@/app/db/languoid';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { projectTemplates } from '@/templates';

import type { UploadProjectSetup } from '../lib/types';
import type { UploadProcessStepProps } from '../lib/types';

const emptyProjectSetup: UploadProjectSetup = {
  projectName: '',
  description: '',
  template: 'unstructured',
  fiaContentLanguage: '',
  targetLanguage: ''
};

function ProjectSetupStep({
  projectSetup,
  onProjectSetupChange,
  onValidityChange
}: UploadProcessStepProps) {
  const setup = projectSetup ?? emptyProjectSetup;
  const isFiaTemplate = setup.template === 'fia';
  const supabase = React.useMemo(() => createBrowserClient(), []);

  const { data: fiaLanguoids = [], isLoading: isLoadingFiaLanguoids } =
    useQuery({
      queryKey: ['upload-process-fia-languoids'],
      queryFn: () => fetchFiaLanguoids(supabase),
      enabled: isFiaTemplate
    });

  React.useEffect(() => {
    onValidityChange?.(isProjectSetupValid(setup));
  }, [onValidityChange, setup]);

  React.useEffect(() => {
    if (!setup.targetLanguage || isLikelyId(setup.targetLanguage)) {
      return;
    }

    let isCancelled = false;

    resolveLanguoidIdByName(setup.targetLanguage).then((languoidId) => {
      if (!isCancelled && languoidId) {
        updateProjectSetup({ targetLanguage: languoidId });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [setup.targetLanguage]);

  React.useEffect(() => {
    if (
      !isFiaTemplate ||
      !setup.fiaContentLanguage ||
      isLikelyId(setup.fiaContentLanguage) ||
      fiaLanguoids.length === 0
    ) {
      return;
    }

    const matchedLanguage = fiaLanguoids.find(
      (languoid) =>
        languoid.name?.toLowerCase() === setup.fiaContentLanguage.toLowerCase()
    );

    if (matchedLanguage) {
      updateProjectSetup({ fiaContentLanguage: matchedLanguage.id });
    }
  }, [fiaLanguoids, isFiaTemplate, setup.fiaContentLanguage]);

  function updateProjectSetup(changes: Partial<UploadProjectSetup>) {
    const nextSetup = {
      ...setup,
      ...changes
    };

    onProjectSetupChange?.(nextSetup);
    onValidityChange?.(isProjectSetupValid(nextSetup));
  }

  async function resolveLanguoidIdByName(languageName: string) {
    const { data, error } = await supabase.rpc('search_languoids', {
      search_query: languageName.trim().toLowerCase(),
      result_limit: 10,
      ui_ready_only: false
    });

    if (error || !Array.isArray(data)) {
      return null;
    }

    const exactMatch = data.find(
      (languoid) =>
        typeof languoid?.name === 'string' &&
        languoid.name.toLowerCase() === languageName.trim().toLowerCase()
    );

    return typeof exactMatch?.id === 'string' ? exactMatch.id : null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <h3 className="text-xl font-semibold">Project Setup</h3>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Review the project fields read from the CSV before creating the
          project. You can edit these values before continuing.
        </p>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden gap-0">
        <CardHeader className="shrink-0 pb-3">
          {/* <CardTitle className="text-base">Project Details</CardTitle> */}
          {/* <CardDescription>
            These values will be used when creating the project.
          </CardDescription> */}
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto pt-0">
          <div className="mx-auto grid max-w-3xl gap-5">
            <div className="grid gap-2">
              <Label htmlFor="upload-project-name">Project Name</Label>
              <Input
                id="upload-project-name"
                value={setup.projectName}
                onChange={(event) =>
                  updateProjectSetup({ projectName: event.target.value })
                }
                placeholder="Enter project name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="upload-project-description">Description</Label>
              <Textarea
                id="upload-project-description"
                value={setup.description}
                onChange={(event) =>
                  updateProjectSetup({ description: event.target.value })
                }
                placeholder="Enter project description"
                className="min-h-24"
              />
            </div>

            <div className="grid gap-2">
              <Label>Template</Label>
              <Select
                value={setup.template || 'unstructured'}
                onValueChange={(template) =>
                  updateProjectSetup({
                    template,
                    fiaContentLanguage:
                      template === 'fia' ? setup.fiaContentLanguage : ''
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {projectTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFiaTemplate ? (
              <div className="grid gap-2">
                <Label>FIA Content Language</Label>
                <Select
                  value={setup.fiaContentLanguage}
                  onValueChange={(fiaContentLanguage) =>
                    updateProjectSetup({ fiaContentLanguage })
                  }
                  disabled={isLoadingFiaLanguoids}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select FIA content language" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingFiaLanguoids ? (
                      <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                        <Spinner className="mr-2 h-4 w-4" />
                        Loading languages...
                      </div>
                    ) : fiaLanguoids.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        No FIA languages available
                      </div>
                    ) : (
                      fiaLanguoids.map((languoid) => (
                        <SelectItem key={languoid.id} value={languoid.id}>
                          {languoid.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>Target Language</Label>
              <LanguoidComboboxUpload
                value={setup.targetLanguage}
                onChange={(targetLanguage) =>
                  updateProjectSetup({ targetLanguage })
                }
                placeholder="Select target language"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function isLikelyId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isProjectSetupValid(projectSetup: UploadProjectSetup) {
  return Boolean(
    projectSetup.projectName.trim() &&
      projectSetup.template.trim() &&
      isLikelyId(projectSetup.targetLanguage) &&
      (projectSetup.template !== 'fia' ||
        isLikelyId(projectSetup.fiaContentLanguage))
  );
}

export { ProjectSetupStep };
