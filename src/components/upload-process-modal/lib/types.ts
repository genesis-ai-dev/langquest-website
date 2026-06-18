import type { ComponentType, ReactNode } from 'react';

import type { CsvDataBuildResult } from './csv-data-build';
import type { UploadProcessResponse } from './upload-processing';

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

type UploadProjectSetup = {
  projectName: string;
  description: string;
  template: string;
  fiaContentLanguage: string;
  targetLanguage: string;
  targetLanguageName?: string;
};

type UploadValidationResult = {
  isValid: boolean;
  csvFileName?: string;
  rowsCount: number;
  referencedFilesCount: number;
  assetsFilesCount: number;
  csvData?: CsvDataBuildResult;
  projectSetup?: UploadProjectSetup;
  issues: UploadValidationIssue[];
};

type UploadProcessStepProps = {
  uploadType: UploadType;
  isActive?: boolean;
  selectedFile?: File | null;
  projectId?: string;
  questId?: string;
  projectTemplate?: string;
  projectFiaContentLanguage?: string | null;
  onSelectedFileChange?: (file: File | null) => void;
  validationProgress?: UploadValidationProgress;
  validationResult?: UploadValidationResult | null;
  projectSetup?: UploadProjectSetup | null;
  generatedCsvContent?: string;
  processingResult?: UploadProcessResponse | null;
  onProjectSetupChange?: (projectSetup: UploadProjectSetup) => void;
  onGeneratedCsvContentChange?: (csvContent: string) => void;
  onProcessingResultChange?: (result: UploadProcessResponse | null) => void;
  onValidityChange?: (isValid: boolean) => void;
};

type UploadProcessStepDefinition = {
  value:
    | 'instructions'
    | 'upload'
    | 'validation'
    | 'project-setup'
    | 'content-setup'
    | 'processing'
    | 'done';
  label: string;
  Component: ComponentType<UploadProcessStepProps>;
  uploadTypes?: UploadType[];
};

type UploadProcessModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: ReactNode;
  uploadType?: UploadType;
  projectId?: string;
  questId?: string;
  projectTemplate?: string;
  projectFiaContentLanguage?: string | null;
  title?: string;
  subtitle?: string;
};

export type {
  UploadProcessModalProps,
  UploadProcessStepDefinition,
  UploadProcessStepProps,
  UploadProjectSetup,
  UploadValidationIssue,
  UploadValidationProgress,
  UploadValidationResult,
  UploadType
};
