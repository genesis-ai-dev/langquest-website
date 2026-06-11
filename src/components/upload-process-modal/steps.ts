import type { UploadProcessStepDefinition } from './types';
import { AdjustmentsStep } from './steps/adjustments-step';
import { DoneStep } from './steps/done-step';
import { InstructionsStep } from './steps/instructions-step';
import { ProcessingStep } from './steps/processing-step';
import { UploadStep } from './steps/upload-step';
import { ValidationStep } from './steps/validation-step';

const uploadProcessSteps: UploadProcessStepDefinition[] = [
  {
    value: 'instructions',
    label: 'Instructions',
    Component: InstructionsStep
  },
  {
    value: 'upload',
    label: 'Upload',
    Component: UploadStep
  },
  {
    value: 'validation',
    label: 'Validation',
    Component: ValidationStep
  },
  {
    value: 'adjustments',
    label: 'Adjustments',
    Component: AdjustmentsStep
  },
  {
    value: 'processing',
    label: 'Processing',
    Component: ProcessingStep
  },
  {
    value: 'done',
    label: 'Done',
    Component: DoneStep
  }
];

export { uploadProcessSteps };
