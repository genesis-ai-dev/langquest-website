import type { UploadProcessStepProps } from '../types';
import { StepLayout } from './step-layout';

function DoneStep({ uploadType }: UploadProcessStepProps) {
  return (
    <StepLayout
      title="Done"
      description={`The ${uploadType} upload process is complete.`}
    />
  );
}

export { DoneStep };
