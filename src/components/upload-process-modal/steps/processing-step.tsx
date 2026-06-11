import type { UploadProcessStepProps } from '../types';
import { StepLayout } from './step-layout';

function ProcessingStep({ uploadType }: UploadProcessStepProps) {
  return (
    <StepLayout
      title="Processing"
      description={`The ${uploadType} upload will be processed and saved into the system.`}
    />
  );
}

export { ProcessingStep };
