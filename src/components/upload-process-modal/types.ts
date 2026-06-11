import type { ComponentType, ReactNode } from 'react';

type UploadType = 'project' | 'quest' | 'asset';

type UploadValidationIssueSeverity = 'error' | 'warning';

type UploadValidationIssue = {
  severity: UploadValidationIssueSeverity;
  code: string;
  message: string;
  row?: number;
  field?: string;
  fileName?: string;
};

type UploadValidationProgress = {
  isValidating: boolean;
  percent: number;
  label: string;
};

type UploadValidationResult = {
  isValid: boolean;
  csvFileName?: string;
  rowsCount: number;
  referencedFilesCount: number;
  assetsFilesCount: number;
  issues: UploadValidationIssue[];
};

type UploadProcessStepProps = {
  uploadType: UploadType;
  selectedFile?: File | null;
  onSelectedFileChange?: (file: File | null) => void;
  validationProgress?: UploadValidationProgress;
  validationResult?: UploadValidationResult | null;
  onValidityChange?: (isValid: boolean) => void;
};

type UploadProcessStepDefinition = {
  value:
    | 'instructions'
    | 'upload'
    | 'validation'
    | 'adjustments'
    | 'processing'
    | 'done';
  label: string;
  Component: ComponentType<UploadProcessStepProps>;
};

type UploadProcessModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  uploadType?: UploadType;
  title?: string;
  subtitle?: string;
};

export type {
  UploadProcessModalProps,
  UploadProcessStepDefinition,
  UploadProcessStepProps,
  UploadValidationIssue,
  UploadValidationProgress,
  UploadValidationResult,
  UploadType
};
