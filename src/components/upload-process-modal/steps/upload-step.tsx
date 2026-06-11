import * as React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, FileArchive, Upload } from 'lucide-react';

import type { UploadProcessStepProps } from '../types';

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

function getFileSizeInMb(file: File) {
  return (file.size / 1024 / 1024).toFixed(2);
}

function validateZipFile(file: File | null) {
  if (!file) {
    return 'Please select a ZIP file.';
  }

  if (!file.name.toLowerCase().endsWith('.zip')) {
    return 'Only ZIP files are allowed.';
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return 'The ZIP file size must not exceed 50 MB.';
  }

  return null;
}

function UploadStep({
  uploadType,
  selectedFile,
  onSelectedFileChange,
  onValidityChange
}: UploadProcessStepProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isUploaded, setIsUploaded] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const onValidityChangeRef = React.useRef(onValidityChange);

  React.useEffect(() => {
    onValidityChangeRef.current = onValidityChange;
  }, [onValidityChange]);

  React.useEffect(() => {
    onValidityChangeRef.current?.(false);
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    const validationError = validateZipFile(selectedFile);

    onSelectedFileChange?.(selectedFile);
    setError(validationError);
    setIsUploaded(false);
    onValidityChange?.(false);
  }

  function handleUpload() {
    const validationError = validateZipFile(selectedFile ?? null);

    setError(validationError);

    if (validationError) {
      setIsUploaded(false);
      onValidityChange?.(false);
      return;
    }

    setIsUploaded(true);
    onValidityChange?.(true);
  }

  function handleReset() {
    onSelectedFileChange?.(null);
    setError(null);
    setIsUploaded(false);
    onValidityChange?.(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <h3 className="text-xl font-semibold">Upload ZIP file</h3>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Select the ZIP file containing the CSV and media files for this{' '}
          {uploadType} upload. The file must be a ZIP and cannot exceed 50 MB.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Select ZIP File
            </CardTitle>
            <CardDescription>
              Choose the package that will be validated before continuing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <FileArchive className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedFile.name}</span>
                <span className="shrink-0">
                  ({getFileSizeInMb(selectedFile)} MB)
                </span>
              </div>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Invalid file</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {isUploaded ? (
              <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>File ready</AlertTitle>
                <AlertDescription>
                  The selected ZIP passed the initial checks. You can continue
                  to the next step.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={!selectedFile && !error && !isUploaded}
              >
                Reset
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile}
              >
                <Upload className="h-4 w-4" />
                Upload ZIP File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { UploadStep };
