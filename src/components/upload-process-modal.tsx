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

const uploadProcessSteps = [
  {
    value: 'instructions',
    label: 'Instructions',
    content:
      'Review the upload requirements before starting the import process.'
  },
  {
    value: 'upload',
    label: 'Upload',
    content: 'Select the files that will be processed by the upload flow.'
  },
  {
    value: 'validation',
    label: 'Validation',
    content: 'Uploaded data will be checked for structure and required fields.'
  },
  {
    value: 'adjustments',
    label: 'Adjustments',
    content: 'Resolve validation issues before continuing the upload process.'
  },
  {
    value: 'processing',
    label: 'Processing',
    content: 'The upload will be processed and saved into the system.'
  },
  {
    value: 'done',
    label: 'Done',
    content: 'The upload process is complete.'
  }
] as const;

type UploadProcessStep = (typeof uploadProcessSteps)[number];

type UploadProcessModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: string;
  subtitle?: string;
};

function UploadProcessModal({
  open,
  onOpenChange,
  trigger,
  title = 'New upload system',
  subtitle = 'Follow each step to upload, validate, adjust, and process your files.'
}: UploadProcessModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [maxVisibleStepIndex, setMaxVisibleStepIndex] = React.useState(1);

  const currentStep = uploadProcessSteps[currentStepIndex];
  const visibleSteps = uploadProcessSteps.slice(0, maxVisibleStepIndex + 1);

  function handleStepChange(value: string) {
    const nextStepIndex = uploadProcessSteps.findIndex(
      (step) => step.value === value
    );

    if (nextStepIndex === -1 || nextStepIndex > maxVisibleStepIndex) {
      return;
    }

    setCurrentStepIndex(nextStepIndex);
  }

  function handlePrevious() {
    setCurrentStepIndex((stepIndex) => Math.max(stepIndex - 1, 0));
  }

  function handleNext() {
    setCurrentStepIndex((stepIndex) => {
      const nextStepIndex = Math.min(
        stepIndex + 1,
        uploadProcessSteps.length - 1
      );

      setMaxVisibleStepIndex((visibleStepIndex) =>
        Math.max(visibleStepIndex, nextStepIndex)
      );

      return nextStepIndex;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <Tabs value={currentStep.value} onValueChange={handleStepChange}>
          <TabsList className="h-auto w-full flex-wrap justify-start">
            {visibleSteps.map((step) => (
              <TabsTrigger key={step.value} value={step.value}>
                {step.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {uploadProcessSteps.map((step: UploadProcessStep) => (
            <TabsContent
              key={step.value}
              value={step.value}
              className="min-h-48 rounded-lg border bg-muted/20 p-6"
            >
              <h3 className="text-base font-semibold">{step.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {step.content}
              </p>
            </TabsContent>
          ))}
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
            disabled={currentStepIndex === uploadProcessSteps.length - 1}
          >
            Next
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { UploadProcessModal };
export default UploadProcessModal;
