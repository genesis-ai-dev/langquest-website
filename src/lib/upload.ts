import JSZip from 'jszip';
import Papa from 'papaparse';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateZipFiles = async (
  file: File
): Promise<ValidationResult> => {
  const errors: string[] = [];

  try {
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

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      // Verificar source_images
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
    }

    return { isValid: errors.length === 0, errors };
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
