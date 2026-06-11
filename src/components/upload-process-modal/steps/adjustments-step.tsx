import type { UploadProcessStepProps } from '../types';
import { StepLayout } from './step-layout';

function AdjustmentsStep({ uploadType }: UploadProcessStepProps) {
  return (
    <StepLayout
      title="Adjustments"
      description={`Resolve ${uploadType} validation issues before continuing the upload process.`}
    />
  );
}

export { AdjustmentsStep };
