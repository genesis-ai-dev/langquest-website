import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../database.types';
import { getSupabaseCredentials, SupabaseEnvironment } from '@/lib/supabase';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { env } from '@/lib/env';
// import { th } from 'date-fns/locale';
// import { metadata } from '@/app/[locale]/layout';

interface ProjectRow {
  project_name: string;
  project_description?: string;
  target_language: string;
  parent_quest_name?: string;
  quest_name: string;
  quest_description?: string;
  quest_tags?: string;
  asset_name: string;
  asset_tags?: string;
  source_images?: string;
  source_content?: string;
  source_audio?: string;
  translation_text?: string;
  translation_audio?: string;
  votes_up?: string;
  votes_down?: string;
  // Backward compatibility fields
  asset_content?: string;
  asset_image_files?: string;
  asset_audio_files?: string;
}

interface QuestRow {
  asset_name: string;
  asset_tags?: string;
  source_images?: string;
  source_content?: string;
  source_audio?: string;
  translation_text?: string;
  translation_audio?: string;
  votes_up?: string;
  votes_down?: string;
  // Backward compatibility fields
  asset_content?: string;
  asset_image_files?: string;
  asset_audio_files?: string;
}

interface QuestToProjectRow {
  parent_quest_name?: string;
  quest_name: string;
  quest_description?: string;
  quest_tags?: string;
  asset_name: string;
  asset_tags?: string;
  source_images?: string;
  source_content?: string;
  source_audio?: string;
  translation_text?: string;
  translation_audio?: string;
  votes_up?: string;
  votes_down?: string;
  // Backward compatibility fields
  asset_content?: string;
  asset_image_files?: string;
  asset_audio_files?: string;
}

interface UploadResult {
  success: boolean;
  message?: string;
  stats: {
    projects: { read: number; created: number };
    quests: { read: number; created: number };
    assets: { read: number; created: number };
    errors: Array<{ row: number; message: string }>;
    warnings: Array<{ row: number; message: string }>;
  };
  // IDs coletados durante o processamento
  involvedIds?: {
    projectIds: Set<string>;
    questIds: Set<string>;
  };
}

interface FileMap {
  [originalName: string]: string; // original filename -> storage filename
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    const type = formData.get('type') as string;
    const projectId = formData.get('projectId') as string | null;
    const questId = formData.get('questId') as string | null;
    const environment =
      (formData.get('environment') as string) || env.NEXT_PUBLIC_ENVIRONMENT;
    const uploadPath = formData.get('uploadPath') as string;

    // Debug logging
    console.log('[BULK UPLOAD] Received uploadPath:', {
      uploadPath,
      type,
      environment
    });

    if (!uploadPath) {
      return NextResponse.json(
        { error: 'Parameter "uploadPath" is required' },
        { status: 400 }
      );
    }

    if (!type || !['project', 'quest', 'asset'].includes(type)) {
      return NextResponse.json(
        { error: 'Parameter "type" must be one of: project, quest, asset' },
        { status: 400 }
      );
    }

    if (
      !environment ||
      !['production', 'preview', 'development'].includes(environment)
    ) {
      return NextResponse.json(
        {
          error: `Parameter "environment" is invalid: ${environment}`
        },
        { status: 400 }
      );
    }

    if (type === 'quest' && !projectId) {
      return NextResponse.json(
        { error: 'Parameter "projectId" is required when type is "quest"' },
        { status: 400 }
      );
    }

    if (type === 'asset' && !questId) {
      return NextResponse.json(
        { error: 'Parameter "questId" is required when type is "asset"' },
        { status: 400 }
      );
    }

    // Validar se o uploadPath parece ser um ZIP
    if (!uploadPath.toLowerCase().includes('.zip')) {
      return NextResponse.json(
        { error: 'Upload path must reference a ZIP file' },
        { status: 400 }
      );
    }

    // Autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const envAux = (environment || 'production') as SupabaseEnvironment;
    const { url, key } = getSupabaseCredentials(envAux);

    const supabaseAuth = createClient<Database>(url, key);
    const {
      data: { user },
      error: authError
    } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const supabase = createClient<Database>(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    // Download ZIP file from Supabase Storage
    console.log('[BULK UPLOAD] Downloading from:', uploadPath);
    const { data: zipData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(uploadPath);

    if (downloadError || !zipData) {
      console.error('[BULK UPLOAD] Download error:', downloadError);
      return NextResponse.json(
        {
          error: `Failed to download ZIP file: ${downloadError?.message || 'Unknown error'}`
        },
        { status: 500 }
      );
    }

    // Convert blob to array buffer
    const zipBuffer = await zipData.arrayBuffer();
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipBuffer);

    const csvFiles = Object.keys(zipContent.files).filter(
      (name) =>
        name.toLowerCase().endsWith('.csv') && !zipContent.files[name].dir
    );

    if (csvFiles.length === 0) {
      return NextResponse.json(
        { error: 'No CSV file found in ZIP' },
        { status: 400 }
      );
    }

    if (csvFiles.length > 1) {
      return NextResponse.json(
        {
          error:
            'Multiple CSV files found in ZIP. Please include only one CSV file.'
        },
        { status: 400 }
      );
    }

    const csvFileName = csvFiles[0];
    const csvFile = zipContent.files[csvFileName];
    const csvContent = await csvFile.async('text');

    // Parse CSV
    const parseResult = await new Promise<Papa.ParseResult<any>>(
      (resolve, reject) => {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject
        });
      }
    );

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: `CSV parsing error: ${parseResult.errors[0].message}` },
        { status: 400 }
      );
    }

    const csvData = parseResult.data;

    // Validar estrutura do CSV
    const validation = validateCSVStructure(csvData, type);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: `CSV validation failed: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Extrair arquivos de mídia da pasta assets
    const mediaFiles = Object.keys(zipContent.files).filter((name) => {
      if (zipContent.files[name].dir) return false;

      // Verificar se o arquivo está na pasta assets/
      const isInAssetsFolder = name.toLowerCase().startsWith('assets/');
      if (!isInAssetsFolder) return false;

      const lower = name.toLowerCase();
      return (
        (lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.png') ||
          lower.endsWith('.webp') ||
          lower.endsWith('.mp3') ||
          lower.endsWith('.wav') ||
          lower.endsWith('.m4a') ||
          lower.endsWith('.ogg')) &&
        name !== csvFileName
      );
    });

    // Upload media files to Storage
    const fileMap: FileMap = {};
    for (const fileName of mediaFiles) {
      try {
        const file = zipContent.files[fileName];
        const fileBuffer = await file.async('arraybuffer');
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        const baseFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

        // Determine folder based on file type
        let folder = '';
        if (['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)) {
          folder = 'images/';
        } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
          folder = 'audio/';
        }

        const storageFileName = `${folder}${baseFileName}`;

        const { error } = await supabase.storage
          .from('assets')
          .upload(storageFileName, fileBuffer, {
            contentType: getContentType(fileName)
          });

        if (error) {
          console.warn(`Failed to upload ${fileName}:`, error);
        } else {
          // Use only the filename without the assets/ path as key
          const originalFileName = fileName.replace(/^assets\//, '');
          fileMap[originalFileName] = storageFileName;
        }
      } catch (error) {
        console.warn(`Error processing file ${fileName}:`, error);
      }
    }

    // Process data based on type
    let result: UploadResult;

    switch (type) {
      case 'project':
        result = await processProjectUpload(
          csvData as ProjectRow[],
          supabase,
          user.id,
          fileMap,
          environment as SupabaseEnvironment
        );
        break;
      case 'quest':
        result = await processQuestUpload(
          csvData as QuestToProjectRow[],
          supabase,
          user.id,
          projectId!,
          fileMap
        );
        break;
      case 'asset':
        result = await processAssetUpload(
          csvData as QuestRow[],
          supabase,
          user.id,
          questId!,
          fileMap
        );
        break;
      default:
        throw new Error('Invalid type');
    }

    delete result.involvedIds;

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}

function validateCSVStructure(
  data: any[],
  type: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.length === 0) {
    errors.push('CSV file is empty');
    return { isValid: false, errors };
  }

  const firstRow = data[0];
  const csvColumns = Object.keys(firstRow);

  const requiredFields =
    type === 'project'
      ? ['project_name', 'target_language', 'quest_name'] //, 'asset_name']
      : type === 'quest'
        ? ['quest_name'] // , 'asset_name']
        : ['asset_name']; // asset

  // Check if the CSV format matches the expected type
  const hasProjectColumns =
    csvColumns.includes('project_name') &&
    (csvColumns.includes('source_language') ||
      csvColumns.includes('target_language'));
  const hasQuestColumns =
    csvColumns.includes('quest_name') && !csvColumns.includes('project_name');
  const hasOnlyAssetColumns =
    csvColumns.includes('asset_name') && !csvColumns.includes('quest_name');

  if (type === 'project' && !hasProjectColumns) {
    if (hasQuestColumns) {
      errors.push(
        'This appears to be a quest upload CSV. Please use type="quest" instead.'
      );
    } else if (hasOnlyAssetColumns) {
      errors.push(
        'This appears to be an asset upload CSV. Please use type="asset" instead.'
      );
    } else {
      errors.push('Invalid CSV format for project upload.');
    }
  } else if (type === 'quest' && !hasQuestColumns) {
    if (hasProjectColumns) {
      errors.push(
        'This appears to be a project upload CSV. Please use type="project" instead.'
      );
    } else if (hasOnlyAssetColumns) {
      errors.push(
        'This appears to be an asset upload CSV. Please use type="asset" instead.'
      );
    } else {
      errors.push('Invalid CSV format for quest upload.');
    }
  } else if (type === 'asset' && !hasOnlyAssetColumns) {
    if (hasProjectColumns) {
      errors.push(
        'This appears to be a project upload CSV. Please use type="project" instead.'
      );
    } else if (hasQuestColumns) {
      errors.push(
        'This appears to be a quest upload CSV. Please use type="quest" instead.'
      );
    } else {
      errors.push('Invalid CSV format for asset upload.');
    }
  }

  // Check required columns
  if (errors.length === 0) {
    const missingColumns = requiredFields.filter(
      (field) => !(field in firstRow)
    );
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Validar cada linha - check for both new and legacy field names
    data.forEach((row, index) => {
      requiredFields.forEach((field) => {
        const hasNewFormatField =
          row[field] && row[field].toString().trim() !== '';

        // For asset content, also check legacy field names
        if (field === 'asset_name' && !hasNewFormatField) {
          errors.push(`Row ${index + 1}: Missing required field '${field}'`);
        } else if (
          (field === 'project_name' ||
            field === 'quest_name' ||
            field === 'target_language') &&
          !hasNewFormatField
        ) {
          errors.push(`Row ${index + 1}: Missing required field '${field}'`);
        }
      });
    });
  }

  return { isValid: errors.length === 0, errors };
}

function getContentType(fileName: string): string {
  const extension = fileName.toLowerCase().split('.').pop();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    default:
      return 'application/octet-stream';
  }
}

// Helper function to normalize row data from different CSV formats
function normalizeRowData(row: any): {
  assetContent: string | null;
  imageFiles: string | null;
  audioFiles: string | null;
  sourceLanguage: string | null;
} {
  // Priority: new format fields over old format fields
  const assetContent = row.source_content || row.asset_content || null;
  const imageFiles = row.source_images || row.asset_image_files || null;
  const audioFiles = row.source_audio || row.asset_audio_files || null;

  // For source language, try both new and legacy formats
  // Note: Projects no longer have source_language, this is only for assets
  const sourceLanguage = row.source_language || null;

  return {
    assetContent,
    imageFiles,
    audioFiles,
    sourceLanguage
  };
}

// Helper function to process multiple content/audio pairs and create asset_content_link records
async function processContentAndAudio(
  supabase: any,
  assetId: string,
  normalizedData: { assetContent: string | null; audioFiles: string | null },
  fileMap: FileMap,
  rowIndex: number,
  errors: Array<{ row: number; message: string }>
): Promise<void> {
  // Split content and audio by semicolon
  const contentItems = normalizedData.assetContent
    ? normalizedData.assetContent.split(';').map((item) => item.trim())
    : [];

  const audioItems = normalizedData.audioFiles
    ? normalizedData.audioFiles.split(';').map((item) => item.trim())
    : [];

  // Determine the maximum length to iterate over
  const maxLength = Math.max(contentItems.length, audioItems.length);

  // If no content and no audio, skip
  if (maxLength === 0) {
    return;
  }

  // Process each position
  for (let i = 0; i < maxLength; i++) {
    const contentText = contentItems[i] || null; // Use null if no content at this position
    const audioFile = audioItems[i] || null; // Use null if no audio at this position

    let audioFilePath = null;

    // Process audio file if present
    if (audioFile) {
      const fileName = audioFile.split('/').pop() || audioFile;
      if (fileMap[fileName]) {
        audioFilePath = fileMap[fileName];
      } else {
        errors.push({
          row: rowIndex + 1,
          message: `Audio file not found in ZIP: ${fileName}`
        });
      }
    }

    // Create asset_content_link record
    try {
      await supabase.from('asset_content_link').insert({
        asset_id: assetId,
        text: contentText || '', // Use empty string if no content
        audio: audioFilePath ? [audioFilePath] : null, // Use array format for audio
        id: crypto.randomUUID()
      });
    } catch (error: any) {
      errors.push({
        row: rowIndex + 1,
        message: `Failed to create asset content link: ${error.message}`
      });
    }
  }
}

// Helper function to parse and handle tags with key:value format
function parseTagString(
  tagString: string
): Array<{ key: string; value: string }> {
  if (!tagString || tagString.trim() === '') {
    return [];
  }

  return tagString
    .split(';')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => {
      // If tag contains ":", split into key:value
      if (tag.includes(':')) {
        const [key, ...valueParts] = tag.split(':');
        return {
          key: key.trim(),
          value: valueParts.join(':').trim() // Join back in case value contains ":"
        };
      } else {
        // Legacy format: treat entire string as key with empty value
        return {
          key: tag,
          value: ''
        };
      }
    });
}

// Helper function to find or create a tag
async function findOrCreateTag(
  supabase: any,
  key: string,
  value: string
): Promise<string> {
  // First try to find existing tag
  let { data: tag } = await supabase
    .from('tag')
    .select('id')
    .eq('key', key)
    .eq('value', value)
    .single();

  if (!tag) {
    // Create new tag
    const { data: newTag, error: tagError } = await supabase
      .from('tag')
      .insert({ key, value })
      .select('id')
      .single();

    if (tagError) throw tagError;
    tag = newTag;
  }

  return tag.id;
}

async function processProjectUpload(
  data: ProjectRow[],
  supabase: any,
  userId: string,
  fileMap: FileMap,
  environment: SupabaseEnvironment
): Promise<UploadResult> {
  const result: UploadResult = {
    success: true,
    stats: {
      projects: { read: 0, created: 0 },
      quests: { read: 0, created: 0 },
      assets: { read: 0, created: 0 },
      errors: [],
      warnings: []
    },
    involvedIds: {
      projectIds: new Set<string>(),
      questIds: new Set<string>()
    }
  };

  const { projectIdsByName, languageCache, createdCount } =
    await prepareProjects(data, supabase, userId);

  result.stats.projects.created = createdCount;

  // const questMap = new Map<string, string>(); // project_name:quest_name -> quest_id
  // const languageCache = new Map<string, string>(); // language_name -> language_id

  const { questIdsByName /*createdCount: questCount */ } = await prepareQuests(
    data,
    projectIdsByName,
    supabase,
    userId
  );

  result.stats.assets.read = data.length;
  const questSet = new Set<string>();
  const projectSet = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    projectSet.add(row.project_name);
    questSet.add(`${row.project_name}:${row.quest_name}`);

    try {
      // Normalize data from different CSV formats
      const normalizedData = normalizeRowData(row);

      // Get or create project
      const projectId = projectIdsByName.get(row.project_name);
      if (!projectId) {
        throw new Error(
          `Project '${row.project_name}' not found after preparation`
        );
      }
      // Get quest
      const prjId = projectIdsByName.get(row.project_name);
      const questKey = `${prjId}:${row.parent_quest_name}:${row.quest_name}`;

      const questId = questIdsByName.get(questKey);

      // Prepare images array using normalized data
      const imageFiles = normalizedData.imageFiles
        ? normalizedData.imageFiles
            .split(';')
            .map((file) => {
              const fileName = file.trim().split('/').pop() || file.trim();
              if (fileMap[fileName]) {
                return `${fileMap[fileName]}`;
              }
              return null;
            })
            .filter(Boolean)
        : [];

      // Create asset - get source language for asset from normalized data or use target language as fallback
      let assetSourceLanguageId = null;

      // If we have normalized source language from the row, use it
      if (normalizedData.sourceLanguage) {
        assetSourceLanguageId = languageCache.get(
          normalizedData.sourceLanguage
        );

        if (!assetSourceLanguageId) {
          const { data: sourceLang } = await supabase
            .from('language')
            .select('id')
            .eq('english_name', normalizedData.sourceLanguage)
            .single();

          if (sourceLang) {
            assetSourceLanguageId = sourceLang.id;
            languageCache.set(
              normalizedData.sourceLanguage,
              assetSourceLanguageId
            );
          }
        }
      }

      // If no source language specified, use target language as fallback
      if (!assetSourceLanguageId) {
        assetSourceLanguageId = languageCache.get(row.target_language);
      }

      if (row.asset_name.trim() === '') {
        /* This means that is only creating a quest without asset */
        continue;
      }

      const { data: asset, error: assetError } = await supabase
        .from('asset')
        .insert({
          name: row.asset_name,
          source_language_id: assetSourceLanguageId,
          creator_id: userId,
          project_id: projectId,
          visible: true,
          created_at: new Date().toISOString(),
          source_asset_id: null,
          images: imageFiles.length > 0 ? imageFiles : null
        })
        .select('id')
        .single();

      if (assetError) throw assetError;
      result.stats.assets.created++;

      // Add asset content
      //   if (row.asset_content) {
      //     await supabase.from('asset_content_link').insert({
      //       asset_id: asset.id,
      //       text: row.asset_content,
      //       id: crypto.randomUUID()
      //     });
      //   }

      // Handle asset tags
      if (row.asset_tags) {
        const tags = parseTagString(row.asset_tags);
        for (const tagObj of tags) {
          try {
            const tagId = await findOrCreateTag(
              supabase,
              tagObj.key,
              tagObj.value
            );

            await supabase.from('asset_tag_link').insert({
              asset_id: asset.id,
              tag_id: tagId
            });
          } catch (error) {
            console.error('Error creating/linking asset tag:', error);
            result.stats.warnings.push({
              row: i + 1,
              message: `Failed to create/link asset tag "${tagObj.key}:${tagObj.value}"`
            });
          }
        }
      }

      // Link asset to quest
      await supabase.from('quest_asset_link').insert({
        quest_id: questId,
        asset_id: asset.id
      });

      // Handle content and audio files - add to asset_content_link with position correlation
      await processContentAndAudio(
        supabase,
        asset.id,
        normalizedData,
        fileMap,
        i,
        result.stats.errors
      );

      // Handle image files - check if any referenced images were not found
      if (normalizedData.imageFiles) {
        const imageFileNames = normalizedData.imageFiles
          .split(';')
          .map((file) => {
            return file.trim().split('/').pop() || file.trim();
          });

        for (const fileName of imageFileNames) {
          if (!fileMap[fileName]) {
            result.stats.errors.push({
              row: i + 1,
              message: `Image file not found in ZIP: ${fileName}`
            });
          }
        }
      }
    } catch (error: any) {
      result.stats.errors.push({
        row: i + 1,
        message: error.message || 'Unknown error'
      });
    }
  }

  result.stats.projects.read = projectSet.size;
  result.stats.quests.read = questSet.size;
  result.success = result.stats.errors.length === 0;

  return result;
}

async function processQuestUpload(
  data: QuestToProjectRow[],
  supabase: any,
  userId: string,
  projectId: string,
  fileMap: FileMap
): Promise<UploadResult> {
  const result: UploadResult = {
    success: true,
    stats: {
      projects: { read: 1, created: 0 }, // We're adding to existing project
      quests: { read: 0, created: 0 },
      assets: { read: data.length, created: 0 },
      errors: [],
      warnings: []
    },
    involvedIds: {
      projectIds: new Set<string>([projectId]), // Projeto já envolvido
      questIds: new Set<string>()
    }
  };

  // Get project to determine target language (used as default for assets)
  const { data: project } = await supabase
    .from('project')
    .select('target_language_id')
    .eq('id', projectId)
    .single();

  if (!project) {
    throw new Error('Project not found');
  }

  // Create language cache for this upload
  const languageCache = new Map<string, string>();
  languageCache.set('default', project.target_language_id);

  // Prepare all quests at once using projectId as string
  const { questIdsByName, createdCount: questCount } = await prepareQuests(
    data,
    projectId, // Pass projectId as string
    supabase,
    userId
  );

  result.stats.quests.created = questCount;
  result.stats.quests.read = questIdsByName.size - questCount; // Existing quests that were reused

  const questSet = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    questSet.add(row.quest_name);

    try {
      // Normalize data from different CSV formats
      const normalizedData = normalizeRowData(row);

      // Get quest ID from prepared quests
      const questKey = `${projectId}:${row.parent_quest_name}:${row.quest_name}`;
      const questId = questIdsByName.get(questKey);

      if (!questId) {
        throw new Error(
          `Quest '${row.quest_name}' not found in prepared quests`
        );
      }

      // Add questId to involved set
      result.involvedIds!.questIds.add(questId);

      // Determine source language for asset
      let assetSourceLanguageId = project.target_language_id; // Use project target language as default

      // If source language is specified in the row, use it
      if (normalizedData.sourceLanguage) {
        let sourceLanguageId = languageCache.get(normalizedData.sourceLanguage);

        if (!sourceLanguageId) {
          const { data: sourceLang } = await supabase
            .from('language')
            .select('id')
            .eq('english_name', normalizedData.sourceLanguage)
            .single();

          if (sourceLang) {
            sourceLanguageId = sourceLang.id;
            if (sourceLanguageId) {
              languageCache.set(
                normalizedData.sourceLanguage,
                sourceLanguageId
              );
            }
          }
        }

        if (sourceLanguageId) {
          assetSourceLanguageId = sourceLanguageId;
        }
      }

      // Skip if no asset name (quest-only row)
      if (!row.asset_name || row.asset_name.trim() === '') {
        continue;
      }

      // Prepare images array using normalized data
      const imageFiles = normalizedData.imageFiles
        ? normalizedData.imageFiles
            .split(';')
            .map((file) => {
              console.log('Processing image file:', file);
              const fileName = file.trim().split('/').pop() || file.trim();
              if (fileMap[fileName]) {
                return `${fileMap[fileName]}`;
              }
              return null;
            })
            .filter(Boolean)
        : [];

      // Create asset
      const { data: asset, error: assetError } = await supabase
        .from('asset')
        .insert({
          name: row.asset_name,
          source_language_id: assetSourceLanguageId,
          creator_id: userId,
          project_id: projectId,
          visible: true,
          created_at: new Date().toISOString(),
          source_asset_id: null,
          images: imageFiles.length > 0 ? imageFiles : null
        })
        .select('id')
        .single();

      if (assetError) throw assetError;
      result.stats.assets.created++;

      // Handle asset tags
      if (row.asset_tags) {
        const tags = parseTagString(row.asset_tags);
        for (const tagObj of tags) {
          try {
            const tagId = await findOrCreateTag(
              supabase,
              tagObj.key,
              tagObj.value
            );

            await supabase.from('asset_tag_link').insert({
              asset_id: asset.id,
              tag_id: tagId
            });
          } catch (error) {
            console.error('Error creating/linking asset tag:', error);
            result.stats.warnings.push({
              row: i + 1,
              message: `Failed to create/link asset tag "${tagObj.key}:${tagObj.value}"`
            });
          }
        }
      }

      // Link asset to quest
      await supabase.from('quest_asset_link').insert({
        quest_id: questId,
        asset_id: asset.id
      });

      // Handle content and audio files - add to asset_content_link with position correlation
      await processContentAndAudio(
        supabase,
        asset.id,
        normalizedData,
        fileMap,
        i,
        result.stats.errors
      );

      // Handle image files - check if any referenced images were not found
      if (normalizedData.imageFiles) {
        const imageFileNames = normalizedData.imageFiles
          .split(';')
          .map((file) => {
            return file.trim().split('/').pop() || file.trim();
          });

        for (const fileName of imageFileNames) {
          if (!fileMap[fileName]) {
            result.stats.errors.push({
              row: i + 1,
              message: `Image file not found in ZIP: ${fileName}`
            });
          }
        }
      }
    } catch (error: any) {
      result.stats.errors.push({
        row: i + 1,
        message: error.message || 'Unknown error'
      });
    }
  }

  result.stats.quests.read = questSet.size;
  result.success = result.stats.errors.length === 0;
  return result;
}

async function processAssetUpload(
  data: QuestRow[],
  supabase: any,
  userId: string,
  questId: string,
  fileMap: FileMap
): Promise<UploadResult> {
  const result: UploadResult = {
    success: true,
    stats: {
      projects: { read: 0, created: 0 },
      quests: { read: 1, created: 0 }, // We're adding to existing quest
      assets: { read: data.length, created: 0 },
      errors: [],
      warnings: []
    },
    involvedIds: {
      projectIds: new Set<string>(),
      questIds: new Set<string>([questId]) // Quest já envolvido
    }
  };

  // Get quest details for project info
  const { data: quest, error: questError } = await supabase
    .from('quest')
    .select(
      `
      project_id,
      project:project_id(
        target_language_id
      )
    `
    )
    .eq('id', questId)
    .single();

  if (questError || !quest) {
    throw new Error('Failed to fetch quest details');
  }

  // Use target language as default for assets if no source language is specified
  const defaultLanguageId = (quest.project as any).target_language_id;
  const languageCache = new Map<string, string>();

  // Adicionar o project_id ao set de IDs envolvidos
  if (quest.project_id) {
    result.involvedIds!.projectIds.add(quest.project_id);
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      // Normalize data from different CSV formats
      const normalizedData = normalizeRowData(row);

      // Determine source language for asset
      let assetSourceLanguageId = defaultLanguageId; // Use project target language as default

      // If source language is specified in the row, use it
      if (normalizedData.sourceLanguage) {
        let sourceLanguageId = languageCache.get(normalizedData.sourceLanguage);

        if (!sourceLanguageId) {
          const { data: sourceLang } = await supabase
            .from('language')
            .select('id')
            .eq('english_name', normalizedData.sourceLanguage)
            .single();

          if (sourceLang) {
            sourceLanguageId = sourceLang.id;
            if (sourceLanguageId) {
              languageCache.set(
                normalizedData.sourceLanguage,
                sourceLanguageId
              );
            }
          }
        }

        if (sourceLanguageId) {
          assetSourceLanguageId = sourceLanguageId;
        }
      }

      // Prepare images array using normalized data
      const imageFiles = normalizedData.imageFiles
        ? normalizedData.imageFiles
            .split(';')
            .map((file) => {
              console.log('Processing image file:', file);
              const fileName = file.trim().split('/').pop() || file.trim();
              if (fileMap[fileName]) {
                return `${fileMap[fileName]}`;
              }
              return null;
            })
            .filter(Boolean)
        : [];

      // Create asset
      const { data: asset, error: assetError } = await supabase
        .from('asset')
        .insert({
          name: row.asset_name,
          source_language_id: assetSourceLanguageId,
          creator_id: userId,
          project_id: quest.project_id,
          visible: true,
          created_at: new Date().toISOString(),
          source_asset_id: null,
          images: imageFiles.length > 0 ? imageFiles : null
        })
        .select('id')
        .single();

      if (assetError) throw assetError;
      result.stats.assets.created++;

      // Handle asset tags
      if (row.asset_tags) {
        const tags = parseTagString(row.asset_tags);
        for (const tagObj of tags) {
          try {
            const tagId = await findOrCreateTag(
              supabase,
              tagObj.key,
              tagObj.value
            );

            await supabase.from('asset_tag_link').insert({
              asset_id: asset.id,
              tag_id: tagId
            });
          } catch (error) {
            console.error('Error creating/linking asset tag:', error);
            result.stats.warnings.push({
              row: i + 1,
              message: `Failed to create/link asset tag "${tagObj.key}:${tagObj.value}"`
            });
          }
        }
      }

      // Link asset to quest
      await supabase.from('quest_asset_link').insert({
        quest_id: questId,
        asset_id: asset.id
      });

      // Handle content and audio files - add to asset_content_link with position correlation
      await processContentAndAudio(
        supabase,
        asset.id,
        normalizedData,
        fileMap,
        i,
        result.stats.errors
      );

      // Handle image files - check if any referenced images were not found
      if (normalizedData.imageFiles) {
        const imageFileNames = normalizedData.imageFiles
          .split(';')
          .map((file) => {
            return file.trim().split('/').pop() || file.trim();
          });

        for (const fileName of imageFileNames) {
          if (!fileMap[fileName]) {
            result.stats.errors.push({
              row: i + 1,
              message: `Image file not found in ZIP: ${fileName}`
            });
          }
        }
      }
    } catch (error: any) {
      result.stats.errors.push({
        row: i + 1,
        message: error.message || 'Unknown error'
      });
    }
  }

  result.success = result.stats.errors.length === 0;
  return result;
}

// Função para processar upload de quests to project (create quests within existing project)
// async function processQuestToProjectUpload(
//   data: QuestToProjectRow[],
//   supabase: any,
//   userId: string,
//   projectId: string,
//   fileMap: FileMap
// ): Promise<UploadResult> {
//   const result: UploadResult = {
//     success: true,
//     stats: {
//       projects: { read: 1, created: 0 }, // We're adding to existing project
//       quests: { read: 0, created: 0 },
//       assets: { read: data.length, created: 0 },
//       errors: [],
//       warnings: []
//     },
//     involvedIds: {
//       projectIds: new Set<string>([projectId]), // Projeto já envolvido
//       questIds: new Set<string>()
//     }
//   };

//   // Get project to determine target language (used as default for assets)
//   const { data: project } = await supabase
//     .from('project')
//     .select('target_language_id')
//     .eq('id', projectId)
//     .single();

//   if (!project) {
//     throw new Error('Project not found');
//   }

//   const questMap = new Map<string, string>(); // quest_name -> quest_id
//   const questSet = new Set<string>();

//   for (let i = 0; i < data.length; i++) {
//     const row = data[i];
//     questSet.add(row.quest_name);

//     try {
//       // Get or create quest
//       let questId = questMap.get(row.quest_name);
//       if (!questId) {
//         // First check if quest already exists in the project
//         const { data: existingQuest } = await supabase
//           .from('quest')
//           .select('id')
//           .eq('name', row.quest_name)
//           .eq('project_id', projectId)
//           .single();

//         if (existingQuest) {
//           questId = existingQuest.id;
//         } else {
//           // Create new quest
//           const { data: quest, error: questError } = await supabase
//             .from('quest')
//             .insert({
//               name: row.quest_name,
//               description: row.quest_description || null,
//               project_id: projectId,
//               creator_id: userId
//             })
//             .select('id')
//             .single();

//           if (questError) throw questError;
//           questId = quest.id;
//           result.stats.quests.created++;

//           // Adicionar ao set de IDs envolvidos
//           if (questId) {
//             result.involvedIds!.questIds.add(questId);
//           }

//           // Handle quest tags
//           if (row.quest_tags) {
//             const tags = parseTagString(row.quest_tags);
//             for (const tagObj of tags) {
//               try {
//                 const tagId = await findOrCreateTag(
//                   supabase,
//                   tagObj.key,
//                   tagObj.value
//                 );

//                 await supabase.from('quest_tag_link').insert({
//                   quest_id: questId,
//                   tag_id: tagId
//                 });
//               } catch (error) {
//                 console.error('Error creating/linking quest tag:', error);
//                 result.stats.warnings.push({
//                   row: i + 1,
//                   message: `Failed to create/link quest tag "${tagObj.key}:${tagObj.value}"`
//                 });
//               }
//             }
//           }
//         }

//         if (questId) {
//           questMap.set(row.quest_name, questId);
//           // Adicionar ao set de IDs envolvidos (pode ser existente ou novo)
//           result.involvedIds!.questIds.add(questId);
//         }
//       }

//       // Prepare images array using normalized data
//       const normalizedData = normalizeRowData(row);

//       // Determine source language for asset
//       let assetSourceLanguageId = project.target_language_id; // Use project target language as default

//       // If source language is specified in the row, use it
//       if (normalizedData.sourceLanguage) {
//         const { data: sourceLang } = await supabase
//           .from('language')
//           .select('id')
//           .eq('english_name', normalizedData.sourceLanguage)
//           .single();

//         if (sourceLang) {
//           assetSourceLanguageId = sourceLang.id;
//         }
//       }

//       const imageUrls = normalizedData.imageFiles
//         ? normalizedData.imageFiles
//             .split(';')
//             .map((url: string) => {
//               console.log('Processing image URL:', url);
//               const fileName = url.trim().split('/').pop() || url.trim();
//               if (fileMap[fileName]) {
//                 return `${fileMap[fileName]}`;
//               }
//               return null;
//             })
//             .filter(Boolean)
//         : [];

//       // Create asset
//       const { data: asset, error: assetError } = await supabase
//         .from('asset')
//         .insert({
//           name: row.asset_name,
//           source_language_id: assetSourceLanguageId,
//           creator_id: userId,
//           project_id: projectId,
//           visible: true,
//           created_at: new Date().toISOString(),
//           source_asset_id: null,
//           images: imageUrls.length > 0 ? imageUrls : null
//         })
//         .select('id')
//         .single();

//       if (assetError) throw assetError;
//       result.stats.assets.created++;

//       // Add asset content
//       //   if (row.asset_content) {
//       //     await supabase.from('asset_content_link').insert({
//       //       asset_id: asset.id,
//       //       text: row.asset_content,
//       //       id: crypto.randomUUID()
//       //     });
//       //   }

//       // Handle asset tags
//       if (row.asset_tags) {
//         const tagNames = row.asset_tags
//           .split(';')
//           .map((t) => t.trim())
//           .filter(Boolean);
//         for (const tagName of tagNames) {
//           try {
//             const tagObj = parseTagString(tagName)[0];
//             const tag = await findOrCreateTag(
//               supabase,
//               tagObj.key,
//               tagObj.value
//             );

//             await supabase.from('asset_tag_link').insert({
//               asset_id: asset.id,
//               tag_id: tag
//             });
//           } catch (error) {
//             console.error('Error creating/linking asset tag:', error);
//             result.stats.warnings.push({
//               row: i + 1,
//               message: `Failed to create/link asset tag "${tagName}"`
//             });
//           }
//         }
//       }

//       // Link asset to quest
//       if (questId) {
//         await supabase.from('quest_asset_link').insert({
//           quest_id: questId,
//           asset_id: asset.id
//         });
//       }

//       // Handle content and audio files - add to asset_content_link with position correlation
//       await processContentAndAudio(
//         supabase,
//         asset.id,
//         normalizedData,
//         fileMap,
//         i,
//         result.stats.errors
//       );

//       // Handle image files - check if any referenced images were not found
//       if (normalizedData.imageFiles) {
//         const imageFileNames = normalizedData.imageFiles
//           .split(';')
//           .map((file) => {
//             return file.trim().split('/').pop() || file.trim();
//           });

//         for (const fileName of imageFileNames) {
//           if (!fileMap[fileName]) {
//             result.stats.errors.push({
//               row: i + 1,
//               message: `Image file not found in ZIP: ${fileName}`
//             });
//           }
//         }
//       }
//     } catch (error: any) {
//       result.stats.errors.push({
//         row: i + 1,
//         message: error.message || 'Unknown error'
//       });
//     }
//   }

//   result.stats.quests.read = questSet.size;
//   result.success = result.stats.errors.length === 0;
//   return result;
// }

// async function executePostProcessingFunctions(
//   supabase: any,
//   involvedIds: { projectIds: Set<string>; questIds: Set<string> }
//   // userId: string
// ): Promise<void> {
//   const errors: string[] = [];

//   // Executar função para cada project_id
//   for (const projectId of involvedIds.projectIds) {
//     try {
//       console.log(
//         `[POST-PROCESSING] Executing project function for: ${projectId}`
//       );

//       // SUBSTITUA 'refresh_project_stats' pela sua função RPC
//       const { error: projectError } = await supabase.rpc(
//         'rebuild_single_project_closure',
//         {
//           project_id_param: projectId
//         }
//       );

//       if (projectError) {
//         console.error(
//           `Error in project post-processing ${projectId}:`,
//           projectError
//         );
//         errors.push(`Project ${projectId}: ${projectError.message}`);
//       }
//     } catch (error: any) {
//       console.error(
//         `Error executing project function for ${projectId}:`,
//         error
//       );
//       errors.push(`Project ${projectId}: ${error.message}`);
//     }
//   }

//   // Executar função para cada quest_id
//   for (const questId of involvedIds.questIds) {
//     try {
//       console.log(`[POST-PROCESSING] Executing quest function for: ${questId}`);

//       // SUBSTITUA 'refresh_quest_stats' pela sua função RPC
//       const { error: questError } = await supabase.rpc(
//         'rebuild_single_quest_closure',
//         {
//           quest_id_param: questId
//         }
//       );

//       if (questError) {
//         console.error(`Error in quest post-processing ${questId}:`, questError);
//         errors.push(`Quest ${questId}: ${questError.message}`);
//       }
//     } catch (error: any) {
//       console.error(`Error executing quest function for ${questId}:`, error);
//       errors.push(`Quest ${questId}: ${error.message}`);
//     }
//   }

//   // Log final
//   if (errors.length > 0) {
//     console.warn(
//       '[POST-PROCESSING] Some post-processing functions failed:',
//       errors
//     );
//   } else {
//     console.log(
//       '[POST-PROCESSING] All post-processing functions executed successfully'
//     );
//   }
// }

type ProjectIdsByName = Map<string, string>; // projectName -> projectId

async function prepareProjects(
  data: ProjectRow[],
  supabase: any,
  userId: string
): Promise<{
  projectIdsByName: ProjectIdsByName;
  languageCache: Map<string, string>;
  createdCount: number;
}> {
  const languageCache = new Map<string, string>(); // language_name -> language_id
  const projectIdsByName: ProjectIdsByName = new Map();
  let createdCount = 0;

  for (const row of data) {
    const projectName = row.project_name;

    // Skip if we already processed this project
    if (projectIdsByName.has(projectName)) {
      continue;
    }
    // Check if project already exists for this user
    const { data: existingProject } = await supabase
      .from('project')
      .select('id')
      .eq('name', projectName)
      .eq('creator_id', userId)
      .single();

    if (existingProject) {
      // Project exists, use existing ID
      projectIdsByName.set(projectName, existingProject.id);
    } else {
      // Project doesn't exist, create new one
      // Use current row data for project creation

      // Get target language ID
      let targetLanguageId = languageCache.get(row.target_language);

      if (!targetLanguageId) {
        const { data: targetLang } = await supabase
          .from('language')
          .select('id')
          .eq('english_name', row.target_language)
          .single();

        if (!targetLang) {
          throw new Error(`Target language '${row.target_language}' not found`);
        }

        targetLanguageId = targetLang.id;
        if (targetLanguageId) {
          languageCache.set(row.target_language, targetLanguageId);
        }
      }

      // Create new project
      const projectData = {
        name: projectName,
        description: row.project_description || null,
        target_language_id: targetLanguageId,
        creator_id: userId,
        visible: true,
        created_at: new Date().toISOString(),
        template: 'unstructured'
      };

      const { data: newProject, error: projectError } = await supabase
        .from('project')
        .insert(projectData)
        .select('id')
        .single();

      if (projectError) {
        throw new Error(
          `Failed to create project '${projectName}': ${projectError.message}`
        );
      }

      // Create project ownership
      try {
        const { error: ownershipError } = await supabase.rpc(
          'create_project_ownership',
          {
            p_project_id: newProject.id,
            p_profile_id: userId
          }
        );

        if (ownershipError) {
          console.error(
            `Error creating project ownership for ${projectName}:`,
            ownershipError
          );
        }
      } catch (ownershipError) {
        console.error(
          `Error creating project ownership for ${projectName}:`,
          ownershipError
        );
      }

      projectIdsByName.set(projectName, newProject.id);
      createdCount++;
    }
  }

  return { projectIdsByName, languageCache, createdCount };
}

type QuestIdsByKey = Map<string, string>; // projectName -> projectId

/* Generated quests structure into the database and return the keys */
async function prepareQuests(
  data: ProjectRow[] | QuestToProjectRow[],
  projectIdsByName: ProjectIdsByName | string,
  supabase: any,
  userId: string
): Promise<{
  questIdsByName: QuestIdsByKey;
  createdCount: number;
}> {
  const questIdsByName: QuestIdsByKey = new Map();
  const projectQuest = new Map<string, string>();
  let createdCount = 0;

  // First, get all existing quests for the projects involved
  const projectIds = new Set<string>();
  for (const row of data) {
    let projectId: string | undefined;
    if (typeof projectIdsByName === 'string') {
      projectId = projectIdsByName;
    } else if ('project_name' in row) {
      projectId = projectIdsByName.get(row.project_name);
    }
    if (projectId) {
      projectIds.add(projectId);
    }
  }

  // Fetch existing quests for all involved projects
  const existingQuestsMap = new Map<string, string>(); // questName -> questId
  for (const projectId of projectIds) {
    const { data: existingQuests } = await supabase
      .from('quest')
      .select('id, name')
      .eq('project_id', projectId);

    if (existingQuests) {
      for (const quest of existingQuests) {
        const questKey = `${projectId}:${quest.name}`;
        existingQuestsMap.set(questKey, quest.id);
        projectQuest.set(questKey, quest.id);
      }
    }
  }

  for (const row of data) {
    let projectId: string | undefined;
    if (typeof projectIdsByName === 'string') {
      projectId = projectIdsByName;
    } else if ('project_name' in row) {
      projectId = projectIdsByName.get(row.project_name);
    }

    if (!projectId) {
      throw new Error(
        `Project ID not found for project name '${row.quest_name}'`
      );
    }

    const key = projectId + ':' + row.parent_quest_name + ':' + row.quest_name;
    const questLookupKey = `${projectId}:${row.quest_name}`;

    if (!questIdsByName.has(key)) {
      // Check if quest already exists
      const existingQuestId = existingQuestsMap.get(questLookupKey);

      if (existingQuestId) {
        // Use existing quest
        questIdsByName.set(key, existingQuestId);
        projectQuest.set(questLookupKey, existingQuestId);
      } else {
        // Create new quest
        const { questId, error } = await processQuest(
          row,
          projectId,
          supabase,
          userId
        );
        if (error) {
          throw new Error(error);
        }
        projectQuest.set(questLookupKey, questId!);
        questIdsByName.set(key, questId!);
        createdCount++;
      }
    }
  }

  /* Update Quest Parent Links */
  /****** THIS CAN ATTACH QUESTS TO WRONG PARENTS IF NAME OF THE PARENT QUEST IS NOT UNIQUE *******/
  for (const [key, questId] of questIdsByName) {
    const [projectId, parentQuestName] = key.split(':');
    if (parentQuestName) {
      const parentQuestId = projectQuest.get(projectId + ':' + parentQuestName);

      const { error } = await supabase
        .from('quest')
        .update({ parent_id: parentQuestId })
        .eq('id', questId);

      if (error) {
        console.error('Error updating parent link:', error);
      }
    }
  }

  return {
    questIdsByName,
    createdCount
  };
}

async function processQuest(
  row: QuestToProjectRow,
  projectId: string,
  supabase: any,
  userId: string
): Promise<{ questId: string | null; error: string | null }> {
  let opError = null;

  const { data: quest, error: questError } = await supabase
    .from('quest')
    .insert({
      name: row.quest_name,
      description: row.quest_description || null,
      project_id: projectId,
      creator_id: userId
      //    metadata: row.metadata || null
    })
    .select('id')
    .single();

  if (questError) {
    opError = questError;
    return {
      questId: null,
      error: `Failed to create quest: ${questError.message}`
    };
  }

  const questId = quest.id;

  // Handle quest tags
  if (row.quest_tags) {
    const tags = parseTagString(row.quest_tags);
    for (const tagObj of tags) {
      try {
        const tagId = await findOrCreateTag(supabase, tagObj.key, tagObj.value);

        await supabase.from('quest_tag_link').insert({
          quest_id: questId,
          tag_id: tagId
        });
      } catch (error) {
        console.error('Error creating/linking quest tag:', error);
        opError = `Failed to create/link quest tag "${tagObj.key}:${tagObj.value}"`;
      }
    }
  }
  return { questId, error: opError };
}
