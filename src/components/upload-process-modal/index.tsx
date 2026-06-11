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
  UploadType,
  UploadValidationProgress,
  UploadValidationResult
} from './types';
import { validateUploadPackage } from './validation';

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
  title,
  subtitle
}: UploadProcessModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [maxUnlockedStepIndex, setMaxUnlockedStepIndex] = React.useState(1);
  const [stepValidity, setStepValidity] = React.useState<
    Record<string, boolean>
  >({
    upload: false,
    validation: false
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

  const currentStep = uploadProcessSteps[currentStepIndex];
  const isCurrentStepValid = stepValidity[currentStep.value] ?? true;
  const uploadTypeLabel = uploadTypeLabels[uploadType];
  const modalTitle = title ?? `New ${uploadTypeLabel} Upload`;
  const modalSubtitle =
    subtitle ??
    `Follow each step to upload, validate, adjust, and process your ${uploadTypeLabel.toLowerCase()} files.`;

  function handleStepChange(value: string) {
    const nextStepIndex = uploadProcessSteps.findIndex(
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
      const nextStepIndex = Math.min(
        stepIndex + 1,
        uploadProcessSteps.length - 1
      );

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

    const validationStepIndex = uploadProcessSteps.findIndex(
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
    setValidationProgress({
      isValidating: false,
      percent: 0,
      label: 'Waiting for validation.'
    });
    handleStepValidityChange('validation', false);

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
            {uploadProcessSteps.map((step, stepIndex) => (
              <TabsTrigger
                key={step.value}
                value={step.value}
                disabled={stepIndex > maxUnlockedStepIndex}
              >
                {step.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {uploadProcessSteps.map((step) => {
            const StepComponent = step.Component;

            return (
              <TabsContent
                key={step.value}
                value={step.value}
                className="min-h-0 overflow-auto rounded-lg border bg-muted/20 p-6"
              >
                <StepComponent
                  uploadType={uploadType}
                  selectedFile={selectedFile}
                  onSelectedFileChange={handleSelectedFileChange}
                  validationProgress={validationProgress}
                  validationResult={validationResult}
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
              currentStepIndex === uploadProcessSteps.length - 1 ||
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
