'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { uploadProcessSteps } from './steps';
import type {
  UploadProcessModalProps,
  UploadProjectSetup,
  UploadType,
  UploadValidationProgress,
  UploadValidationResult
} from './lib/types';
import { validateUploadPackage } from './lib/validation';

const uploadTypeLabels: Record<UploadType, string> = {
  project: 'Project',
  quest: 'Quest',
  asset: 'Asset'
};

function UploadProcessModal({
  open,
  onOpenChange,
  trigger,
  uploadType = 'project',
  projectId,
  questId,
  title,
  subtitle
}: UploadProcessModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [maxUnlockedStepIndex, setMaxUnlockedStepIndex] = React.useState(1);
  const [stepValidity, setStepValidity] = React.useState<
    Record<string, boolean>
  >({
    upload: false,
    validation: false,
    processing: false
  });
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [validationProgress, setValidationProgress] =
    React.useState<UploadValidationProgress>({
      isValidating: false,
      percent: 0,
      label: 'Waiting for upload.'
    });
  const [validationResult, setValidationResult] =
    React.useState<UploadValidationResult | null>(null);
  const [projectSetup, setProjectSetup] =
    React.useState<UploadProjectSetup | null>(null);
  const [generatedCsvContent, setGeneratedCsvContent] = React.useState('');

  const visibleSteps = React.useMemo(
    () =>
      uploadProcessSteps.filter(
        (step) => !step.uploadTypes || step.uploadTypes.includes(uploadType)
      ),
    [uploadType]
  );
  const currentStep = visibleSteps[currentStepIndex] ?? visibleSteps[0];
  const isCurrentStepValid = stepValidity[currentStep.value] ?? true;
  const uploadTypeLabel = uploadTypeLabels[uploadType];
  const modalTitle = title ?? `New ${uploadTypeLabel} Upload`;
  const modalSubtitle =
    subtitle ??
    `Follow each step to upload, validate, adjust, and process your ${uploadTypeLabel.toLowerCase()} files.`;

  React.useEffect(() => {
    setCurrentStepIndex((stepIndex) =>
      Math.min(stepIndex, Math.max(visibleSteps.length - 1, 0))
    );
    setMaxUnlockedStepIndex((stepIndex) =>
      Math.min(stepIndex, Math.max(visibleSteps.length - 1, 0))
    );
  }, [visibleSteps.length]);

  function handleStepChange(value: string) {
    const nextStepIndex = visibleSteps.findIndex(
      (step) => step.value === value
    );

    if (nextStepIndex === -1 || nextStepIndex > maxUnlockedStepIndex) {
      return;
    }

    setCurrentStepIndex(nextStepIndex);

    if (nextStepIndex < currentStepIndex) {
      setMaxUnlockedStepIndex(nextStepIndex);
    }
  }

  function handlePrevious() {
    setCurrentStepIndex((stepIndex) => {
      const previousStepIndex = Math.max(stepIndex - 1, 0);

      setMaxUnlockedStepIndex(previousStepIndex);

      return previousStepIndex;
    });
  }

  async function handleNext() {
    if (!isCurrentStepValid) {
      return;
    }

    if (currentStep.value === 'upload') {
      await handleUploadValidation();
      return;
    }

    setCurrentStepIndex((stepIndex) => {
      const nextStepIndex = Math.min(stepIndex + 1, visibleSteps.length - 1);

      setMaxUnlockedStepIndex((unlockedStepIndex) =>
        Math.max(unlockedStepIndex, nextStepIndex)
      );

      return nextStepIndex;
    });
  }

  async function handleUploadValidation() {
    if (!selectedFile) {
      handleStepValidityChange('upload', false);
      return;
    }

    const validationStepIndex = visibleSteps.findIndex(
      (step) => step.value === 'validation'
    );

    setCurrentStepIndex(validationStepIndex);
    setMaxUnlockedStepIndex(validationStepIndex);
    handleStepValidityChange('validation', false);
    setValidationResult(null);
    setValidationProgress({
      isValidating: true,
      percent: 0,
      label: 'Starting validation...'
    });

    try {
      const result = await validateUploadPackage(
        selectedFile,
        uploadType,
        (percent, label) => {
          setValidationProgress({
            isValidating: true,
            percent,
            label
          });
        }
      );

      setValidationResult(result);
      setProjectSetup(result.projectSetup ?? null);
      handleStepValidityChange('validation', result.isValid);
      setValidationProgress({
        isValidating: false,
        percent: 100,
        label: result.isValid
          ? 'Validation complete. No blocking errors found.'
          : 'Validation complete. Fix the errors before continuing.'
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unexpected error while validating the upload package.';

      setValidationResult({
        isValid: false,
        rowsCount: 0,
        referencedFilesCount: 0,
        assetsFilesCount: 0,
        issues: [
          {
            severity: 'error',
            code: 'validation_failed',
            message
          }
        ]
      });
      setProjectSetup(null);
      handleStepValidityChange('validation', false);
      setValidationProgress({
        isValidating: false,
        percent: 100,
        label: 'Validation failed.'
      });
    }
  }

  function handleSelectedFileChange(file: File | null) {
    setSelectedFile(file);
    setValidationResult(null);
    setProjectSetup(null);
    setGeneratedCsvContent('');
    setValidationProgress({
      isValidating: false,
      percent: 0,
      label: 'Waiting for validation.'
    });
    handleStepValidityChange('validation', false);
    handleStepValidityChange('processing', false);

    if (maxUnlockedStepIndex > 1) {
      setMaxUnlockedStepIndex(1);
    }
  }

  function handleStepValidityChange(stepValue: string, isValid: boolean) {
    setStepValidity((currentValidity) => {
      if (currentValidity[stepValue] === isValid) {
        return currentValidity;
      }

      return {
        ...currentValidity,
        [stepValue]: isValid
      };
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="grid h-[75vh] max-h-[75vh] w-[75vw]! max-w-[75vw]! grid-rows-[auto_1fr_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalSubtitle}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={currentStep.value}
          onValueChange={handleStepChange}
          className="min-h-0"
        >
          <TabsList className="h-auto w-full flex-wrap justify-start">
            {visibleSteps.map((step, stepIndex) => (
              <TabsTrigger
                key={step.value}
                value={step.value}
                disabled={stepIndex > maxUnlockedStepIndex}
              >
                {step.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleSteps.map((step) => {
            const StepComponent = step.Component;

            return (
              <TabsContent
                key={step.value}
                value={step.value}
                className="min-h-0 overflow-auto rounded-lg border bg-muted/20 p-6"
              >
                <StepComponent
                  uploadType={uploadType}
                  isActive={currentStep.value === step.value}
                  selectedFile={selectedFile}
                  projectId={projectId}
                  questId={questId}
                  onSelectedFileChange={handleSelectedFileChange}
                  validationProgress={validationProgress}
                  validationResult={validationResult}
                  projectSetup={projectSetup}
                  generatedCsvContent={generatedCsvContent}
                  onProjectSetupChange={setProjectSetup}
                  onGeneratedCsvContentChange={setGeneratedCsvContent}
                  onValidityChange={(isValid) =>
                    handleStepValidityChange(step.value, isValid)
                  }
                />
              </TabsContent>
            );
          })}
        </Tabs>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
          >
            Previous
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={
              currentStepIndex === visibleSteps.length - 1 ||
              !isCurrentStepValid ||
              validationProgress.isValidating
            }
          >
            Next
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { UploadProcessModal };
export type { UploadProcessModalProps, UploadType };
export default UploadProcessModal;
