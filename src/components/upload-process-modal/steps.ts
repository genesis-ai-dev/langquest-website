import type { UploadProcessStepDefinition } from './lib/types';
import { ContentSetupStep } from './steps/content-setup-step';
import { DoneStep } from './steps/done-step';
import { InstructionsStep } from './steps/instructions-step';
import { ProcessingStep } from './steps/processing-step';
import { ProjectSetupStep } from './steps/project-setup-step';
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
    value: 'project-setup',
    label: 'Project Setup',
    Component: ProjectSetupStep,
    uploadTypes: ['project']
  },
  {
    value: 'content-setup',
    label: 'Content Setup',
    Component: ContentSetupStep
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
