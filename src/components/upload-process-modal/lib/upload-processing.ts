import type { UploadType } from './types';

type UploadProgressHandler = (percent: number) => void;
type UploadStatusHandler = (label: string) => void;

type PrepareUploadFileResponse = {
  uploadUrl: string;
  path: string;
  expiresIn: number;
};

type UploadProcessResponse = {
  success: boolean;
  message?: string;
  uploadPath?: string;
  rowsCount?: number;
  stats?: {
    projects?: { read: number; created: number };
    quests?: { read: number; created: number };
    assets?: { read: number; created: number };
    errors?: Array<{ row: number; message: string }>;
    warnings?: Array<{ row: number; message: string }>;
  };
};

type StartUploadProcessParams = {
  accessToken: string;
  uploadType: UploadType;
  uploadPath: string;
  csvContent: string;
  projectId?: string;
  questId?: string;
  fiaContentLanguoidId?: string;
  questMetadata?: Record<string, unknown> | null;
};

async function uploadZipFileWithProgress({
  file,
  accessToken,
  uploadType,
  onProgress,
  onStatus
}: {
  file: File;
  accessToken: string;
  uploadType: UploadType;
  onProgress?: UploadProgressHandler;
  onStatus?: UploadStatusHandler;
}) {
  onStatus?.('Preparing ZIP upload...');
  const preparedUpload = await prepareUploadFile({
    file,
    accessToken,
    uploadType
  });

  onStatus?.('Starting ZIP upload...');
  onProgress?.(1);
  await uploadFileToSignedUrl({
    file,
    uploadUrl: preparedUpload.uploadUrl,
    onProgress,
    onStatus
  });

  return preparedUpload.path;
}

async function startUploadProcess({
  accessToken,
  uploadType,
  uploadPath,
  csvContent,
  projectId,
  questId,
  fiaContentLanguoidId,
  questMetadata
}: StartUploadProcessParams): Promise<UploadProcessResponse> {
  const response = await fetch('/api/uploadprocess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      uploadType,
      uploadPath,
      csvContent,
      projectId,
      questId,
      fiaContentLanguoidId,
      questMetadata
    })
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to process uploaded file');
  }

  const uploadProcessResult = result as UploadProcessResponse;

  if (!uploadProcessResult.success) {
    const firstError = uploadProcessResult.stats?.errors?.[0];
    throw new Error(
      firstError
        ? `Row ${firstError.row}: ${firstError.message}`
        : uploadProcessResult.message || 'Upload processing failed'
    );
  }

  return uploadProcessResult;
}

async function prepareUploadFile({
  file,
  accessToken,
  uploadType
}: {
  file: File;
  accessToken: string;
  uploadType: UploadType;
}) {
  const response = await fetch('/api/uploadfile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size,
      uploadType
    })
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || 'Failed to prepare upload');
  }

  return result as PrepareUploadFileResponse;
}

function uploadFileToSignedUrl({
  file,
  uploadUrl,
  onProgress,
  onStatus
}: {
  file: File;
  uploadUrl: string;
  onProgress?: UploadProgressHandler;
  onStatus?: UploadStatusHandler;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl);
    xhr.timeout = 5 * 60 * 1000;
    xhr.setRequestHeader('Content-Type', file.type || 'application/zip');
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onloadstart = () => {
      onStatus?.('Uploading ZIP file...');
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new Error('Direct upload to storage failed'));
    };
    xhr.onerror = () => reject(new Error('Direct upload to storage failed'));
    xhr.onabort = () => reject(new Error('Direct upload was cancelled'));
    xhr.ontimeout = () => reject(new Error('Direct upload timed out'));
    xhr.send(file);
  });
}

export { startUploadProcess, uploadZipFileWithProgress };
export type { UploadProcessResponse };
