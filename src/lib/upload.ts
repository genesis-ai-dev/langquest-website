import JSZip from 'jszip';
import Papa from 'papaparse';
import { env } from './env';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  hasLanguageError?: boolean;
}

export interface LanguageValidationResult {
  hasErrors: boolean;
  errors: string[];
}

export const validateZipFiles = async (
  file: File,
  accessToken: string,
  environment: string
): Promise<ValidationResult> => {
  const errors: string[] = [];

  try {
    // Check file size (50MB = 50 * 1024 * 1024 bytes)
    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      errors.push(
        `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 50MB`
      );
      return { isValid: false, errors };
    }

    const zip = new JSZip();
    const zipContents = await zip.loadAsync(file);

    const csvFiles = Object.keys(zipContents.files).filter(
      (name) =>
        name.toLowerCase().endsWith('.csv') &&
        !name.includes('__MACOSX') &&
        !zipContents.files[name].dir
    );

    if (csvFiles.length === 0) {
      errors.push('No CSV file found in ZIP');
      return { isValid: false, errors };
    }

    if (csvFiles.length > 1) {
      errors.push(
        'Multiple CSV files found. Please include only one CSV file.'
      );
      return { isValid: false, errors };
    }

    const csvFile = zipContents.files[csvFiles[0]];
    const csvContent = await csvFile.async('text');

    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });

    if (parseResult.errors.length > 0) {
      errors.push(`Error parsing CSV: ${parseResult.errors[0].message}`);
      return { isValid: false, errors };
    }

    const csvData = parseResult.data as any[];

    const assetsFolders = Object.keys(zipContents.files).filter(
      (name) => name.startsWith('assets/') && zipContents.files[name].dir
    );

    if (assetsFolders.length === 0) {
      errors.push('"assets" folder not found in ZIP');
      return { isValid: false, errors };
    }

    const assetsFiles = Object.keys(zipContents.files).filter(
      (name) => name.startsWith('assets/') && !zipContents.files[name].dir
    );

    const assetsFilesBasenames = assetsFiles.map((fullPath) => {
      const parts = fullPath.split('/');
      return parts[parts.length - 1];
    });

    const languageValues = new Set<string>();
    let hasLanguageError = false;

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      if (row.source_images && typeof row.source_images === 'string') {
        const imageFiles = row.source_images
          .split(';')
          .map((f: string) => f.trim())
          .filter((f: string) => f);

        for (const imageFile of imageFiles) {
          const basename = imageFile.split('/').pop() || imageFile;
          if (!assetsFilesBasenames.includes(basename)) {
            errors.push(
              `Image file not found in assets folder: ${imageFile} (row ${i + 2})`
            );
          }
        }
      }

      if (row.source_audio && typeof row.source_audio === 'string') {
        const audioFiles = row.source_audio
          .split(';')
          .map((f: string) => f.trim())
          .filter((f: string) => f);

        for (const audioFile of audioFiles) {
          const basename = audioFile.split('/').pop() || audioFile;
          if (!assetsFilesBasenames.includes(basename)) {
            errors.push(
              `Audio file not found in assets folder: ${audioFile} (row ${i + 2})`
            );
          }
        }
      }

      if (row.target_language && typeof row.target_language === 'string') {
        const targetLang = row.target_language.trim();
        if (targetLang) {
          languageValues.add(targetLang);
        }
      }

      if (row.source_language && typeof row.source_language === 'string') {
        const sourceLang = row.source_language.trim();
        if (sourceLang) {
          languageValues.add(sourceLang);
        }
      }
    }

    if (accessToken && languageValues.size > 0) {
      const languageArray = Array.from(languageValues);
      const languageValidation = await validateLanguages(
        languageArray,
        accessToken,
        environment
      );

      if (languageValidation.hasErrors) {
        hasLanguageError = true;
        errors.push(...languageValidation.errors);
      }
    }

    return { isValid: errors.length === 0, errors, hasLanguageError };
  } catch (error: any) {
    errors.push(`Error processing ZIP: ${error.message}`);
    return { isValid: false, errors };
  }
};

export async function uploadZipDirect(
  file: File,
  accessToken: string,
  environment?: string
) {
  // 1. Create Signed URL
  const res = await fetch('/api/upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      filename: file.name,
      environment: environment || ''
    })
  });

  const { uploadUrl, path } = await res.json();

  // 2. Upload to Signed URL
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file
  });

  if (!uploadRes.ok) {
    throw new Error('Direct upload to bucket failed');
  }

  return path;
}

export async function deleteZipFile(
  uploadPath: string,
  accessToken: string,
  environment?: string
) {
  try {
    const response = await fetch('/api/delete-upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        uploadPath,
        environment: environment || 'production'
      })
    });

    if (!response.ok) {
      console.warn(`Failed to delete ZIP file: ${uploadPath}`);
    }
  } catch (error) {
    console.warn(`Error deleting ZIP file: ${uploadPath}`, error);
  }
}

export const validateLanguages = async (
  languageValues: string[],
  accessToken: string,
  environment?: string
): Promise<LanguageValidationResult> => {
  const errors: string[] = [];

  if (!languageValues || languageValues.length === 0) {
    return { hasErrors: false, errors: [] };
  }

  try {
    const response = await fetch('/api/languoid/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        languages: languageValues,
        environment: environment || env.NEXT_PUBLIC_ENVIRONMENT || 'production'
      })
    });

    if (!response.ok) {
      errors.push(`Failed to validate languages: ${response.statusText}`);
      return { hasErrors: true, errors };
    }

    const validationResult = await response.json();
    const invalidLanguages = validationResult.invalidLanguages || [];

    console.log('Invalid languages from validation:', invalidLanguages);

    for (const invalidLang of invalidLanguages) {
      console.log('Invalid language:', invalidLang);
      errors.push(
        `Language '${invalidLang.name}' not found in languoid table. \nSuggestions: ${invalidLang.suggestions.map((s: any) => s.name).join(', ')}.`
      );
    }

    return {
      hasErrors: errors.length > 0,
      errors
    };
  } catch (error: any) {
    errors.push(`Error validating languages: ${error.message}`);
    return { hasErrors: true, errors };
  }
};
