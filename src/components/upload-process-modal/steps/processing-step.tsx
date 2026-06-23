import * as React from 'react';
import {
  CircleCheck,
  CircleX,
  Download,
  FileText,
  Loader2,
  UploadCloud
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { createBrowserClient } from '@/lib/supabase/client';

import {
  startUploadProcess,
  uploadZipFileWithProgress
} from '../lib/upload-processing';
import type { UploadProcessStepProps } from '../lib/types';

type ProcessingStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error';

type ProcessingState = {
  status: ProcessingStatus;
  percent: number;
  label: string;
  error?: string;
};

function normalizeQuestMetadata(
  metadata: unknown
): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }

  if (typeof metadata === 'string') {
    try {
      const parsedMetadata = JSON.parse(metadata);
      return normalizeQuestMetadata(parsedMetadata);
    } catch {
      return null;
    }
  }

  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  return null;
}

function ProcessingStep({
  uploadType,
  isActive,
  selectedFile,
  generatedCsvContent,
  projectId,
  questId,
  selectedQuest,
  projectSetup,
  onProcessingResultChange,
  onValidityChange
}: UploadProcessStepProps) {
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const selectedQuestMetadata = React.useMemo(
    () => normalizeQuestMetadata(selectedQuest?.metadata),
    [selectedQuest?.metadata]
  );
  const [retryCount, setRetryCount] = React.useState(0);
  const [processingState, setProcessingState] = React.useState<ProcessingState>(
    {
      status: 'idle',
      percent: 0,
      label: 'Waiting to start processing.'
    }
  );
  const activeProcessKeyRef = React.useRef('');
  const completedProcessKeyRef = React.useRef('');
  const onValidityChangeRef = React.useRef(onValidityChange);
  const processKey = React.useMemo(
    () =>
      [
        uploadType,
        selectedFile?.name ?? '',
        selectedFile?.size ?? 0,
        generatedCsvContent?.length ?? 0,
        projectId ?? '',
        questId ?? '',
        selectedQuestMetadata ? JSON.stringify(selectedQuestMetadata) : '',
        projectSetup?.fiaContentLanguage ?? '',
        retryCount
      ].join(':'),
    [
      generatedCsvContent?.length,
      projectId,
      projectSetup?.fiaContentLanguage,
      questId,
      retryCount,
      selectedFile?.name,
      selectedFile?.size,
      selectedQuestMetadata,
      uploadType
    ]
  );

  React.useEffect(() => {
    onValidityChangeRef.current = onValidityChange;
  }, [onValidityChange]);

  React.useEffect(() => {
    if (!isActive) {
      return;
    }

    if (!selectedFile) {
      onValidityChangeRef.current?.(false);
      setProcessingState({
        status: 'error',
        percent: 0,
        label: 'No ZIP file selected.',
        error: 'Select a ZIP file before processing the upload.'
      });
      return;
    }

    if (!generatedCsvContent) {
      onValidityChangeRef.current?.(false);
      setProcessingState({
        status: 'error',
        percent: 0,
        label: 'Generated CSV is missing.',
        error: 'Complete the content setup before processing the upload.'
      });
      return;
    }

    if (
      activeProcessKeyRef.current === processKey ||
      completedProcessKeyRef.current === processKey
    ) {
      return;
    }

    let isCancelled = false;
    let processingInterval: ReturnType<typeof setInterval> | undefined;
    const fileToProcess = selectedFile;
    const csvToProcess = generatedCsvContent;

    activeProcessKeyRef.current = processKey;
    onProcessingResultChange?.(null);
    onValidityChangeRef.current?.(false);

    async function runProcess() {
      try {
        setProcessingState({
          status: 'uploading',
          percent: 0,
          label: 'Preparing ZIP upload...'
        });

        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('Authentication required. Please log in again.');
        }

        const uploadPath = await uploadZipFileWithProgress({
          file: fileToProcess,
          accessToken: session.access_token,
          uploadType,
          onStatus: (label) => {
            if (isCancelled) return;

            setProcessingState((currentState) => ({
              status: 'uploading',
              percent: currentState.percent,
              label
            }));
          },
          onProgress: (uploadPercent) => {
            if (isCancelled) return;

            setProcessingState({
              status: 'uploading',
              percent: Math.min(90, Math.round(uploadPercent * 0.9)),
              label: `Uploading ZIP file... ${uploadPercent}%`
            });
          }
        });

        if (isCancelled) return;

        setProcessingState({
          status: 'processing',
          percent: 90,
          label: 'Processing uploaded file...'
        });

        processingInterval = setInterval(() => {
          setProcessingState((currentState) => {
            if (currentState.status !== 'processing') {
              return currentState;
            }

            return {
              ...currentState,
              percent: Math.min(99, currentState.percent + 1)
            };
          });
        }, 1500);

        const result = await startUploadProcess({
          accessToken: session.access_token,
          uploadType,
          uploadPath,
          csvContent: csvToProcess,
          projectId,
          questId,
          questMetadata:
            uploadType === 'asset' ? selectedQuestMetadata : undefined,
          fiaContentLanguoidId:
            uploadType === 'project' && projectSetup?.template === 'fia'
              ? projectSetup.fiaContentLanguage
              : undefined
        });

        if (isCancelled) return;

        setProcessingState({
          status: 'success',
          percent: 100,
          label:
            result.message ??
            `Upload process request received (${result.rowsCount ?? 0} rows).`
        });
        completedProcessKeyRef.current = processKey;
        onProcessingResultChange?.(result);
        onValidityChangeRef.current?.(true);
      } catch (error) {
        if (isCancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : 'Unexpected error while processing the upload.';

        setProcessingState({
          status: 'error',
          percent: 0,
          label: 'Upload processing failed.',
          error: message
        });
        onValidityChangeRef.current?.(false);
      } finally {
        if (activeProcessKeyRef.current === processKey) {
          activeProcessKeyRef.current = '';
        }

        if (processingInterval) {
          clearInterval(processingInterval);
        }
      }
    }

    const startTimer = setTimeout(() => {
      runProcess();
    }, 0);

    return () => {
      isCancelled = true;
      if (startTimer) {
        clearTimeout(startTimer);
      }

      if (activeProcessKeyRef.current === processKey) {
        activeProcessKeyRef.current = '';
      }

      if (processingInterval) {
        clearInterval(processingInterval);
      }
    };
  }, [
    generatedCsvContent,
    isActive,
    onProcessingResultChange,
    processKey,
    projectId,
    projectSetup?.fiaContentLanguage,
    projectSetup?.template,
    questId,
    selectedFile,
    selectedQuestMetadata,
    supabase,
    uploadType
  ]);

  function handleDownloadCsv() {
    if (!generatedCsvContent) {
      return;
    }

    const blob = new Blob([generatedCsvContent], {
      type: 'text/csv;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${uploadType}-processed-upload.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleRetry() {
    activeProcessKeyRef.current = '';
    completedProcessKeyRef.current = '';
    setRetryCount((currentRetryCount) => currentRetryCount + 1);
  }

  const isRunning =
    processingState.status === 'uploading' ||
    processingState.status === 'processing';

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <h3 className="text-xl font-semibold">Processing</h3>
        <p className="text-sm text-muted-foreground">
          The {uploadType} upload will be processed and saved into the system.
        </p>
      </div>

      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : processingState.status === 'success' ? (
              <CircleCheck className="h-4 w-4 text-green-600" />
            ) : processingState.status === 'error' ? (
              <CircleX className="h-4 w-4 text-destructive" />
            ) : (
              <UploadCloud className="h-4 w-4 text-muted-foreground" />
            )}
            {processingState.label}
          </span>
          <span className="text-muted-foreground">
            {processingState.percent}%
          </span>
        </div>
        <Progress value={processingState.percent} />
      </div>

      {processingState.status === 'error' ? (
        <Alert variant="destructive">
          <CircleX className="h-4 w-4" />
          <AlertTitle>Processing failed</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{processingState.error}</span>
            <Button type="button" variant="secondary" onClick={handleRetry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-4">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Generated CSV backup
          </CardTitle>
          <CardDescription>
            Download the CSV generated from the final content setup. Keep this
            file as a backup or future reference for the corrections applied
            before processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadCsv}
            disabled={!generatedCsvContent}
          >
            <Download className="h-4 w-4" />
            Download generated CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export { ProcessingStep };
