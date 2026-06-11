import type { UploadType, UploadValidationIssue } from './types';

type CsvRow = Record<string, string>;

type UploadTemplate = {
  headers: string[];
  sampleRows: string[];
  requiredFields: string[];
  filename: string;
};

const uploadTemplates: Record<UploadType, UploadTemplate> = {
  project: {
    headers: [
      'project_name',
      'project_description',
      'project_template',
      'target_language',
      'parent_quest_name',
      'quest_name',
      'quest_description',
      'quest_tags',
      'asset_name',
      'asset_tags',
      'asset_label',
      'source_language',
      'source_images',
      'source_content',
      'source_audio'
    ],
    sampleRows: [
      'My Project,Description of my project,bible,English,,Genesis,First quest description',
      'My Project,Description of my project,bible,English,Genesis,Genesis 1,First sub-quest description,category:1;difficulty:2,Asset A1,content:1;theme:5,1-3,English,image1.jpg;image2.png,This is the main content for asset A1,audio1.mp3;audio2.wav',
      'My Project,Description of my project,bible,English,Genesis,Genesis 1,First sub-quest description,category:1;difficulty:2,Asset A2,content:2;theme:7,4,English,image3.jpg,This is the main content for asset A2,audio3.mp3',
      'My Project,Description of my project,bible,English,Genesis,Genesis 2,Second sub-quest description,category:1;difficulty:4,Asset B1,content:3;theme:9,,English,,This is the main content for asset B1,audio4.wav;audio5.mp3'
    ],
    requiredFields: ['project_name', 'target_language', 'quest_name'],
    filename: 'project-upload-template.csv'
  },
  quest: {
    headers: [
      'parent_quest_name',
      'quest_name',
      'quest_description',
      'quest_tags',
      'asset_name',
      'asset_tags',
      'asset_label',
      'source_language',
      'source_images',
      'source_content',
      'source_audio'
    ],
    sampleRows: [
      ',Genesis,First quest description',
      'Genesis,Genesis 1,First sub-quest description,category:1;difficulty:2,Asset A1,content:1;theme:5,1-3,English,image1.jpg;image2.png,This is the main content for asset A1,audio1.mp3;audio2.wav',
      'Genesis,Genesis 1,First sub-quest description,category:1;difficulty:2,Asset A2,content:2;theme:7,4,English,image3.jpg,This is the main content for asset A2,audio3.mp3',
      'Genesis,Genesis 2,Second sub-quest description,category:1;difficulty:4,Asset B1,content:3;theme:9,,English,,This is the main content for asset B1,audio4.wav;audio5.mp3'    ],
    requiredFields: ['quest_name'],
    filename: 'quest-upload-template.csv'
  },
  asset: {
    headers: [
      'asset_name',
      'asset_tags',
      'asset_label',
      'source_language',
      'source_images',
      'source_content',
      'source_audio'
    ],
    sampleRows: [
      'Asset A1,content:1;theme:5,1-3,English,image1.jpg;image2.png,This is the main content for asset A1,audio1.mp3;audio2.wav',
      'Asset A2,content:2;theme:7,4,English,image3.jpg,This is the main content for asset A2,audio3.mp3',
      'Asset B1,content:3;theme:9,,English,,This is the main content for asset B1,audio4.wav;audio5.mp3'
    ],
    requiredFields: ['asset_name'],
    filename: 'asset-upload-template.csv'
  }
};

function getUploadTemplate(uploadType: UploadType) {
  return uploadTemplates[uploadType];
}

function createTemplateCsvContent(uploadType: UploadType) {
  const template = getUploadTemplate(uploadType);

  return [template.headers.join(','), ...template.sampleRows].join('\n');
}

function downloadUploadTemplate(uploadType: UploadType) {
  const template = getUploadTemplate(uploadType);
  const blob = new Blob([createTemplateCsvContent(uploadType)], {
    type: 'text/csv'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = template.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function validateTemplateHeaders(
  headers: string[],
  uploadType: UploadType,
  issues: UploadValidationIssue[]
) {
  const expectedHeaders = getUploadTemplate(uploadType).headers;
  const missingHeaders = expectedHeaders.filter(
    (header) => !headers.includes(header)
  );
  const extraHeaders = headers.filter(
    (header) => !expectedHeaders.includes(header)
  );

  if (missingHeaders.length > 0) {
    issues.push({
      severity: 'error',
      code: 'missing_headers',
      message: `Missing required columns: ${missingHeaders.join(', ')}.`
    });
  }

  if (extraHeaders.length > 0) {
    issues.push({
      severity: 'error',
      code: 'unexpected_headers',
      message: `Unexpected columns for ${uploadType} upload: ${extraHeaders.join(', ')}.`
    });
  }

  if (
    headers.length === expectedHeaders.length &&
    headers.some((header, index) => header !== expectedHeaders[index])
  ) {
    issues.push({
      severity: 'error',
      code: 'invalid_header_order',
      message: `CSV columns must match the ${uploadType} template order.`
    });
  }
}

function validateTemplateRequiredFields(
  rows: CsvRow[],
  uploadType: UploadType,
  issues: UploadValidationIssue[]
) {
  const requiredFields = getUploadTemplate(uploadType).requiredFields;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    requiredFields.forEach((field) => {
      if (!row[field]) {
        issues.push({
          severity: 'error',
          code: 'missing_required_field',
          message: `Missing required field '${field}'.`,
          row: rowNumber,
          field
        });
      }
    });
  });
}

export {
  createTemplateCsvContent,
  downloadUploadTemplate,
  getUploadTemplate,
  uploadTemplates,
  validateTemplateHeaders,
  validateTemplateRequiredFields
};
export type { CsvRow, UploadTemplate };
