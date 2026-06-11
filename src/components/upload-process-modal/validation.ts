import JSZip from 'jszip';
import Papa from 'papaparse';

import type {
  UploadType,
  UploadValidationIssue,
  UploadValidationResult
} from './types';
import type { CsvRow } from './template';
import {
  validateTemplateHeaders,
  validateTemplateRequiredFields
} from './template';

type ValidationProgressHandler = (percent: number, label: string) => void;

const mediaColumns = ['source_images', 'source_audio'] as const;

async function validateUploadPackage(
  file: File,
  uploadType: UploadType,
  onProgress: ValidationProgressHandler = () => undefined
): Promise<UploadValidationResult> {
  const issues: UploadValidationIssue[] = [];

  onProgress(5, 'Reading ZIP file...');
  const zip = await JSZip.loadAsync(file);

  onProgress(20, 'Looking for CSV file...');
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const csvEntries = entries.filter((entry) =>
    normalizePath(entry.name).toLowerCase().endsWith('.csv')
  );

  if (csvEntries.length === 0) {
    issues.push({
      severity: 'error',
      code: 'missing_csv',
      message: 'No CSV file was found inside the ZIP package.'
    });
  }

  if (csvEntries.length > 1) {
    issues.push({
      severity: 'error',
      code: 'multiple_csv_files',
      message: 'Only one CSV file is allowed inside the ZIP package.',
      fileName: csvEntries.map((entry) => entry.name).join(', ')
    });
  }

  const csvEntry = csvEntries[0];

  if (csvEntry && normalizePath(csvEntry.name).includes('/')) {
    issues.push({
      severity: 'error',
      code: 'csv_not_in_root',
      message: 'The CSV file must be placed in the root directory of the ZIP.',
      fileName: csvEntry.name
    });
  }

  if (!csvEntry) {
    return createValidationResult({
      issues,
      rowsCount: 0,
      referencedFilesCount: 0,
      assetsFilesCount: getAssetsFiles(entries).size
    });
  }

  onProgress(35, 'Parsing CSV file...');
  const csvContent = await csvEntry.async('string');
  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim()
  });

  parseResult.errors.forEach((error) => {
    issues.push({
      severity: 'error',
      code: 'csv_parse_error',
      message: error.message,
      row: typeof error.row === 'number' ? error.row + 2 : undefined
    });
  });

  const rows = parseResult.data;
  const headers = parseResult.meta.fields ?? [];

  onProgress(50, 'Validating CSV structure...');
  validateTemplateHeaders(headers, uploadType, issues);
  validateRows(rows, uploadType, issues);

  onProgress(70, 'Checking referenced media files...');
  const assetsFiles = getAssetsFiles(entries);
  const referencedFiles = getReferencedMediaFiles(rows, issues);
  validateReferencedFilesExist(referencedFiles, assetsFiles, issues);

  onProgress(90, 'Checking unused files...');
  validateUnusedAssets(referencedFiles, assetsFiles, issues);

  onProgress(100, 'Validation complete.');

  return createValidationResult({
    csvFileName: csvEntry.name,
    issues,
    rowsCount: rows.length,
    referencedFilesCount: referencedFiles.size,
    assetsFilesCount: assetsFiles.size
  });
}

function validateRows(
  rows: CsvRow[],
  uploadType: UploadType,
  issues: UploadValidationIssue[]
) {
  if (rows.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty_csv',
      message: 'The CSV file is empty.'
    });
    return;
  }

  const projectNames = new Set<string>();

  validateTemplateRequiredFields(rows, uploadType, issues);

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (uploadType === 'project' && row.project_name) {
      projectNames.add(row.project_name);
    }

    validateAssetPayload(row, uploadType, rowNumber, issues);
  });

  if (uploadType === 'project' && projectNames.size > 1) {
    issues.push({
      severity: 'error',
      code: 'multiple_projects',
      message: `Project upload can mention only one project. Found: ${Array.from(
        projectNames
      ).join(', ')}.`
    });
  }
}

function validateAssetPayload(
  row: CsvRow,
  uploadType: UploadType,
  rowNumber: number,
  issues: UploadValidationIssue[]
) {
  const hasAssetName = Boolean(row.asset_name);
  const hasAnyAssetPayload = Boolean(
    row.source_images || row.source_content || row.source_audio
  );

  if ((uploadType === 'project' || uploadType === 'quest') && !hasAssetName) {
    return;
  }

  if (!hasAnyAssetPayload) {
    issues.push({
      severity: 'error',
      code: 'missing_asset_payload',
      message:
        'Asset row must include at least one of source_images, source_content, or source_audio.',
      row: rowNumber
    });
  }

}

function getReferencedMediaFiles(
  rows: CsvRow[],
  issues: UploadValidationIssue[]
) {
  const referencedFiles = new Map<string, { row: number; field: string }>();

  rows.forEach((row, index) => {
    mediaColumns.forEach((column) => {
      splitFileList(row[column]).forEach((fileName) => {
        const normalizedFileName = normalizeFileName(fileName);

        if (!normalizedFileName) {
          return;
        }

        if (referencedFiles.has(normalizedFileName)) {
          return;
        }

        referencedFiles.set(normalizedFileName, {
          row: index + 2,
          field: column
        });
      });
    });
  });

  rows.forEach((row, index) => {
    mediaColumns.forEach((column) => {
      splitFileList(row[column]).forEach((fileName) => {
        if (!normalizeFileName(fileName)) {
          issues.push({
            severity: 'error',
            code: 'empty_file_reference',
            message: `Empty file reference found in ${column}.`,
            row: index + 2,
            field: column
          });
        }
      });
    });
  });

  return referencedFiles;
}

function validateReferencedFilesExist(
  referencedFiles: Map<string, { row: number; field: string }>,
  assetsFiles: Map<string, string>,
  issues: UploadValidationIssue[]
) {
  referencedFiles.forEach((reference, fileName) => {
    if (!assetsFiles.has(fileName)) {
      issues.push({
        severity: 'error',
        code: 'missing_asset_file',
        message: `File '${fileName}' is referenced in the CSV but was not found in the ZIP assets folder.`,
        row: reference.row,
        field: reference.field,
        fileName
      });
    }
  });
}

function validateUnusedAssets(
  referencedFiles: Map<string, { row: number; field: string }>,
  assetsFiles: Map<string, string>,
  issues: UploadValidationIssue[]
) {
  assetsFiles.forEach((entryPath, fileName) => {
    if (!referencedFiles.has(fileName)) {
      issues.push({
        severity: 'warning',
        code: 'unused_asset_file',
        message: `File '${fileName}' exists in the assets folder but is not mentioned in the CSV.`,
        fileName: entryPath
      });
    }
  });
}

function getAssetsFiles(entries: JSZip.JSZipObject[]) {
  const assetsFiles = new Map<string, string>();

  entries.forEach((entry) => {
    const normalizedPath = normalizePath(entry.name);

    if (!normalizedPath.startsWith('assets/')) {
      return;
    }

    const fileName = normalizeFileName(normalizedPath);

    if (fileName) {
      assetsFiles.set(fileName, entry.name);
    }
  });

  return assetsFiles;
}

function splitFileList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value.split(';').map((fileName) => fileName.trim());
}

function normalizePath(path: string) {
  return path.replaceAll('\\', '/').replace(/^\/+/, '');
}

function normalizeFileName(path: string) {
  return normalizePath(path).split('/').pop()?.trim() ?? '';
}

function createValidationResult({
  csvFileName,
  issues,
  rowsCount,
  referencedFilesCount,
  assetsFilesCount
}: {
  csvFileName?: string;
  issues: UploadValidationIssue[];
  rowsCount: number;
  referencedFilesCount: number;
  assetsFilesCount: number;
}): UploadValidationResult {
  return {
    isValid: !issues.some((issue) => issue.severity === 'error'),
    csvFileName,
    rowsCount,
    referencedFilesCount,
    assetsFilesCount,
    issues
  };
}

export { validateUploadPackage };
