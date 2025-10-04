import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../database.types';
import { getSupabaseCredentials, SupabaseEnvironment } from '@/lib/supabase';
import JSZip from 'jszip';
import Papa from 'papaparse';

interface ProjectRow {
  project_name: string;
  project_description?: string;
  source_language: string;
  target_language: string;
  quest_name: string;
  quest_description?: string;
  quest_tags?: string;
  asset_name: string;
  asset_content?: string;
  asset_tags?: string;
  asset_image_files?: string;
  asset_audio_files?: string;
}

interface QuestRow {
  asset_name: string;
  asset_content?: string;
  asset_tags?: string;
  asset_image_files?: string;
  asset_audio_files?: string;
}

interface QuestToProjectRow {
  quest_name: string;
  quest_description?: string;
  quest_tags?: string;
  asset_name: string;
  asset_content?: string;
  asset_tags?: string;
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
    const environment = formData.get('environment') as string;
    const zipFile = formData.get('file') as File;

    // Debug logging
    console.log('[BULK UPLOAD] Received file:', {
      name: zipFile?.name,
      type: zipFile?.type,
      size: zipFile?.size
    });

    // Validação básica
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

    if (!zipFile) {
      return NextResponse.json(
        { error: 'A ZIP file is required' },
        { status: 400 }
      );
    }

    // Validate ZIP file by extension and/or MIME type
    const isZipFile =
      zipFile.name.toLowerCase().endsWith('.zip') ||
      zipFile.type === 'application/zip' ||
      zipFile.type === 'application/x-zip-compressed';

    if (!isZipFile) {
      return NextResponse.json(
        {
          error: `Invalid file type. Expected ZIP file, got: ${zipFile.type || 'unknown'} (${zipFile.name})`
        },
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
    const env = (environment || 'production') as SupabaseEnvironment;
    const { url, key } = getSupabaseCredentials(env);

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

    // Processar arquivo ZIP
    const zipBuffer = await zipFile.arrayBuffer();
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipBuffer);

    // Encontrar arquivo CSV
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

    // Extrair arquivos de mídia
    const mediaFiles = Object.keys(zipContent.files).filter((name) => {
      if (zipContent.files[name].dir) return false;
      const lower = name.toLowerCase();
      return (
        (lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.png') ||
          lower.endsWith('.webp') ||
          lower.endsWith('.mp3') ||
          lower.endsWith('.wav') ||
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
          fileMap[fileName] = storageFileName; // Include folder path
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
        result = await processQuestToProjectUpload(
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

    // Executar funções de pós-processamento se houver IDs envolvidos
    if (
      result.involvedIds &&
      (result.involvedIds.projectIds.size > 0 ||
        result.involvedIds.questIds.size > 0)
    ) {
      try {
        await executePostProcessingFunctions(
          supabase,
          result.involvedIds
          // user.id
        );
      } catch (postProcessError) {
        // Não falha o upload, apenas registra o erro
        if (!result.stats.warnings) result.stats.warnings = [];
        result.stats.warnings.push({
          row: 0,
          message: `Post-processing failed: ${postProcessError instanceof Error ? postProcessError.message : 'Unknown error'}`
        });
      }
    }

    // Remover involvedIds do resultado final (não precisa retornar para o cliente)
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
      ? [
          'project_name',
          'source_language',
          'target_language',
          'quest_name',
          'asset_name'
        ]
      : type === 'quest'
        ? ['quest_name', 'asset_name']
        : ['asset_name']; // asset

  // Check if the CSV format matches the expected type
  const hasProjectColumns =
    csvColumns.includes('project_name') &&
    csvColumns.includes('source_language');
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

    // Validar cada linha
    data.forEach((row, index) => {
      requiredFields.forEach((field) => {
        if (!row[field] || row[field].toString().trim() === '') {
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

async function processProjectUpload(
  data: ProjectRow[],
  supabase: any,
  userId: string,
  fileMap: FileMap,
  environment: SupabaseEnvironment
): Promise<UploadResult> {
  console.log('Environment:', environment);

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

  const projectMap = new Map<string, string>(); // project_name -> project_id
  const questMap = new Map<string, string>(); // project_name:quest_name -> quest_id
  const languageCache = new Map<string, string>(); // language_name -> language_id

  result.stats.assets.read = data.length;
  const questSet = new Set<string>();
  const projectSet = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    projectSet.add(row.project_name);
    questSet.add(`${row.project_name}:${row.quest_name}`);

    try {
      // Get or create project
      let projectId = projectMap.get(row.project_name);
      if (!projectId) {
        // Get language IDs
        let sourceLanguageId = languageCache.get(row.source_language);
        let targetLanguageId = languageCache.get(row.target_language);

        if (!sourceLanguageId) {
          const { data: sourceLang } = await supabase
            .from('language')
            .select('id')
            .eq('english_name', row.source_language)
            .single();

          if (!sourceLang) {
            throw new Error(
              `Source language '${row.source_language}' not found`
            );
          }
          sourceLanguageId = sourceLang.id;
          if (sourceLanguageId) {
            languageCache.set(row.source_language, sourceLanguageId);
          }
        }

        if (!targetLanguageId) {
          const { data: targetLang } = await supabase
            .from('language')
            .select('id')
            .eq('english_name', row.target_language)
            .single();

          if (!targetLang) {
            throw new Error(
              `Target language '${row.target_language}' not found`
            );
          }
          targetLanguageId = targetLang.id;
          if (targetLanguageId) {
            languageCache.set(row.target_language, targetLanguageId);
          }
        }

        // Check if project already exists
        const { data: existingProject } = await supabase
          .from('project')
          .select('id')
          .eq('name', row.project_name)
          .eq('creator_id', userId)
          .single();

        if (existingProject) {
          projectId = existingProject.id;
        } else {
          // Create new project
          const { data: project, error: projectError } = await supabase
            .from('project')
            .insert({
              name: row.project_name,
              description: row.project_description || null,
              source_language_id: sourceLanguageId,
              target_language_id: targetLanguageId,
              creator_id: userId
            })
            .select('id')
            .single();

          if (projectError) throw projectError;
          projectId = project.id;

          try {
            // Create project ownership using authenticated supabase client
            const { error: ownershipError } = await supabase.rpc(
              'create_project_ownership',
              {
                p_project_id: project.id,
                p_profile_id: userId
              }
            );
            if (ownershipError) {
              console.error(
                'Error creating project ownership:',
                ownershipError
              );
            }
          } catch (ownershipError) {
            console.error('Error creating project ownership:', ownershipError);
          }

          result.stats.projects.created++;
        }

        if (projectId) {
          projectMap.set(row.project_name, projectId);
          // Adicionar ao set de IDs envolvidos
          result.involvedIds!.projectIds.add(projectId);
        }
      }

      // Get or create quest
      const questKey = `${row.project_name}:${row.quest_name}`;
      let questId = questMap.get(questKey);
      if (!questId) {
        const { data: quest, error: questError } = await supabase
          .from('quest')
          .insert({
            name: row.quest_name,
            description: row.quest_description || null,
            project_id: projectId,
            creator_id: userId
          })
          .select('id')
          .single();

        if (questError) throw questError;
        questId = quest.id;
        if (questId) {
          questMap.set(questKey, questId);
          // Adicionar ao set de IDs envolvidos
          result.involvedIds!.questIds.add(questId);
        }
        result.stats.quests.created++;

        // Handle quest tags
        if (row.quest_tags) {
          const tagNames = row.quest_tags
            .split(';')
            .map((t) => t.trim())
            .filter(Boolean);
          for (const tagName of tagNames) {
            try {
              let { data: tag } = await supabase
                .from('tag')
                .select('id')
                .eq('name', tagName)
                .single();

              if (!tag) {
                const { data: newTag, error: tagError } = await supabase
                  .from('tag')
                  .insert({ name: tagName })
                  .select('id')
                  .single();

                if (tagError) throw tagError;
                tag = newTag;
              }

              await supabase.from('quest_tag_link').insert({
                quest_id: questId,
                tag_id: tag.id
              });
            } catch (error) {
              console.error('Error creating/linking quest tag:', error);
              result.stats.warnings.push({
                row: i + 1,
                message: `Failed to create/link quest tag "${tagName}"`
              });
            }
          }
        }
      }

      // Prepare images array
      const imageFiles = row.asset_image_files
        ? row.asset_image_files
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
      let sourceLanguageId = languageCache.get(row.source_language);

      if (!sourceLanguageId) {
        const { data: sourceLang } = await supabase
          .from('language')
          .select('id')
          .eq('english_name', row.source_language)
          .single();

        if (!sourceLang) {
          throw new Error(`Source language '${row.source_language}' not found`);
        }

        sourceLanguageId = sourceLang.id;
        if (sourceLanguageId) {
          languageCache.set(row.source_language, sourceLanguageId);
        }
      }

      const { data: asset, error: assetError } = await supabase
        .from('asset')
        .insert({
          name: row.asset_name,
          source_language_id: sourceLanguageId,
          creator_id: userId,
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
        const tagNames = row.asset_tags
          .split(';')
          .map((t) => t.trim())
          .filter(Boolean);
        for (const tagName of tagNames) {
          try {
            let { data: tag } = await supabase
              .from('tag')
              .select('id')
              .eq('name', tagName)
              .single();

            if (!tag) {
              const { data: newTag, error: tagError } = await supabase
                .from('tag')
                .insert({ name: tagName })
                .select('id')
                .single();

              if (tagError) throw tagError;
              tag = newTag;
            }

            await supabase.from('asset_tag_link').insert({
              asset_id: asset.id,
              tag_id: tag.id
            });
          } catch (error) {
            console.error('Error creating/linking asset tag:', error);
            result.stats.warnings.push({
              row: i + 1,
              message: `Failed to create/link asset tag "${tagName}"`
            });
          }
        }
      }

      // Link asset to quest
      await supabase.from('quest_asset_link').insert({
        quest_id: questId,
        asset_id: asset.id
      });

      // Handle audio files - add to asset_content_link with audio_id
      if (row.asset_audio_files) {
        const audioFiles = row.asset_audio_files.split(';').filter(Boolean);

        for (const audioFile of audioFiles) {
          const fileName =
            audioFile.trim().split('/').pop() || audioFile.trim();
          if (fileMap[fileName]) {
            // Create audio content link with audio_id
            await supabase.from('asset_content_link').insert({
              asset_id: asset.id,
              audio_id: fileMap[fileName], // Store the file name in storage
              text: row.asset_content, // Required field
              id: crypto.randomUUID()
            });
          } else {
            result.stats.errors.push({
              row: i + 1,
              message: `Audio file not found in ZIP: ${fileName}`
            });
          }
        }
      } else {
        // Add asset content
        if (row.asset_content) {
          await supabase.from('asset_content_link').insert({
            asset_id: asset.id,
            text: row.asset_content,
            id: crypto.randomUUID()
          });
        }
      }

      // Handle image files - check if any referenced images were not found
      if (row.asset_image_files) {
        const imageFileNames = row.asset_image_files.split(';').map((file) => {
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

  // Get quest details for language
  const { data: quest, error: questError } = await supabase
    .from('quest')
    .select(
      `
      project_id,
      project:project_id(
        source_language_id
      )
    `
    )
    .eq('id', questId)
    .single();

  if (questError || !quest) {
    throw new Error('Failed to fetch quest details');
  }

  const sourceLanguageId = (quest.project as any).source_language_id;

  // Adicionar o project_id ao set de IDs envolvidos
  if (quest.project_id) {
    result.involvedIds!.projectIds.add(quest.project_id);
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    try {
      // Prepare images array
      const imageUrls = row.asset_image_files
        ? row.asset_image_files
            .split(';')
            .map((url: string) => {
              console.log('Processing image URL:', url);
              const fileName = url.trim().split('/').pop() || url.trim();
              if (fileMap[fileName]) {
                // return `${supabase.supabaseUrl}/storage/v1/object/public/assets/${fileMap[fileName]}`;
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
          source_language_id: sourceLanguageId,
          creator_id: userId,
          images: imageUrls.length > 0 ? imageUrls : null
        })
        .select('id')
        .single();

      if (assetError) throw assetError;
      result.stats.assets.created++;

      // Handle asset tags
      if (row.asset_tags) {
        const tagNames = row.asset_tags
          .split(';')
          .map((t) => t.trim())
          .filter(Boolean);
        for (const tagName of tagNames) {
          try {
            let { data: tag } = await supabase
              .from('tag')
              .select('id')
              .eq('name', tagName)
              .single();

            if (!tag) {
              const { data: newTag, error: tagError } = await supabase
                .from('tag')
                .insert({ name: tagName })
                .select('id')
                .single();

              if (tagError) throw tagError;
              tag = newTag;
            }

            await supabase.from('asset_tag_link').insert({
              asset_id: asset.id,
              tag_id: tag.id
            });
          } catch (error) {
            console.error('Error creating/linking asset tag:', error);
            result.stats.warnings.push({
              row: i + 1,
              message: `Failed to create/link asset tag "${tagName}"`
            });
          }
        }
      }

      // Link asset to quest
      await supabase.from('quest_asset_link').insert({
        quest_id: questId,
        asset_id: asset.id
      });

      // Handle audio files - add to asset_content_link with audio_id
      if (row.asset_audio_files) {
        const audioUrls = row.asset_audio_files.split(';').filter(Boolean);

        for (const audioUrl of audioUrls) {
          const fileName = audioUrl.trim().split('/').pop() || audioUrl.trim();
          if (fileMap[fileName]) {
            // Create audio content link with audio_id
            await supabase.from('asset_content_link').insert({
              asset_id: asset.id,
              audio_id: fileMap[fileName], // Store the file name in storage
              text: row.asset_content, // Required field
              id: crypto.randomUUID()
            });
          } else {
            result.stats.errors.push({
              row: i + 1,
              message: `Audio file not found in ZIP: ${fileName}`
            });
          }
        }
      } else {
        // Add asset content
        if (row.asset_content) {
          await supabase.from('asset_content_link').insert({
            asset_id: asset.id,
            text: row.asset_content,
            id: crypto.randomUUID()
          });
        }
      }

      // Handle image files - check if any referenced images were not found
      if (row.asset_image_files) {
        const imageFileNames = row.asset_image_files.split(';').map((url) => {
          return url.trim().split('/').pop() || url.trim();
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

async function processAssetUpload(
  data: QuestRow[],
  supabase: any,
  userId: string,
  questId: string,
  fileMap: FileMap
): Promise<UploadResult> {
  return await processQuestUpload(data, supabase, userId, questId, fileMap);
}

// Função para processar upload de quests to project (create quests within existing project)
async function processQuestToProjectUpload(
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

  // Get project to determine source language
  const { data: project } = await supabase
    .from('project')
    .select('source_language_id')
    .eq('id', projectId)
    .single();

  if (!project) {
    throw new Error('Project not found');
  }

  const questMap = new Map<string, string>(); // quest_name -> quest_id
  const questSet = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    questSet.add(row.quest_name);

    try {
      // Get or create quest
      let questId = questMap.get(row.quest_name);
      if (!questId) {
        // First check if quest already exists in the project
        const { data: existingQuest } = await supabase
          .from('quest')
          .select('id')
          .eq('name', row.quest_name)
          .eq('project_id', projectId)
          .single();

        if (existingQuest) {
          questId = existingQuest.id;
        } else {
          // Create new quest
          const { data: quest, error: questError } = await supabase
            .from('quest')
            .insert({
              name: row.quest_name,
              description: row.quest_description || null,
              project_id: projectId,
              creator_id: userId
            })
            .select('id')
            .single();

          if (questError) throw questError;
          questId = quest.id;
          result.stats.quests.created++;

          // Adicionar ao set de IDs envolvidos
          if (questId) {
            result.involvedIds!.questIds.add(questId);
          }

          // Handle quest tags
          if (row.quest_tags) {
            const tagNames = row.quest_tags
              .split(';')
              .map((t) => t.trim())
              .filter(Boolean);
            for (const tagName of tagNames) {
              try {
                let { data: tag } = await supabase
                  .from('tag')
                  .select('id')
                  .eq('name', tagName)
                  .single();

                if (!tag) {
                  const { data: newTag, error: tagError } = await supabase
                    .from('tag')
                    .insert({ name: tagName })
                    .select('id')
                    .single();

                  if (tagError) throw tagError;
                  tag = newTag;
                }

                await supabase.from('quest_tag_link').insert({
                  quest_id: questId,
                  tag_id: tag.id
                });
              } catch (error) {
                console.error('Error creating/linking quest tag:', error);
                result.stats.warnings.push({
                  row: i + 1,
                  message: `Failed to create/link quest tag "${tagName}"`
                });
              }
            }
          }
        }

        if (questId) {
          questMap.set(row.quest_name, questId);
          // Adicionar ao set de IDs envolvidos (pode ser existente ou novo)
          result.involvedIds!.questIds.add(questId);
        }
      }

      // Prepare images array
      const imageUrls = row.asset_image_files
        ? row.asset_image_files
            .split(';')
            .map((url: string) => {
              console.log('Processing image URL:', url);
              const fileName = url.trim().split('/').pop() || url.trim();
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
          source_language_id: project.source_language_id,
          creator_id: userId,
          images: imageUrls.length > 0 ? imageUrls : null
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
        const tagNames = row.asset_tags
          .split(';')
          .map((t) => t.trim())
          .filter(Boolean);
        for (const tagName of tagNames) {
          try {
            let { data: tag } = await supabase
              .from('tag')
              .select('id')
              .eq('name', tagName)
              .single();

            if (!tag) {
              const { data: newTag, error: tagError } = await supabase
                .from('tag')
                .insert({ name: tagName })
                .select('id')
                .single();

              if (tagError) throw tagError;
              tag = newTag;
            }

            await supabase.from('asset_tag_link').insert({
              asset_id: asset.id,
              tag_id: tag.id
            });
          } catch (error) {
            console.error('Error creating/linking asset tag:', error);
            result.stats.warnings.push({
              row: i + 1,
              message: `Failed to create/link asset tag "${tagName}"`
            });
          }
        }
      }

      // Link asset to quest
      if (questId) {
        await supabase.from('quest_asset_link').insert({
          quest_id: questId,
          asset_id: asset.id
        });
      }

      // Handle audio files - add to asset_content_link with audio_id
      if (row.asset_audio_files) {
        const audioUrls = row.asset_audio_files.split(';').filter(Boolean);

        for (const audioUrl of audioUrls) {
          const fileName = audioUrl.trim().split('/').pop() || audioUrl.trim();
          if (fileMap[fileName]) {
            // Create audio content link with audio_id
            await supabase.from('asset_content_link').insert({
              asset_id: asset.id,
              audio_id: fileMap[fileName], // Store the file name in storage
              text: row.asset_content, // Required field
              id: crypto.randomUUID()
            });
          } else {
            result.stats.errors.push({
              row: i + 1,
              message: `Audio file not found in ZIP: ${fileName}`
            });
          }
        }
      } else {
        if (row.asset_content) {
          await supabase.from('asset_content_link').insert({
            asset_id: asset.id,
            text: row.asset_content,
            id: crypto.randomUUID()
          });
        }
      }

      // Handle image files - check if any referenced images were not found
      if (row.asset_image_files) {
        const imageFileNames = row.asset_image_files.split(';').map((file) => {
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

async function executePostProcessingFunctions(
  supabase: any,
  involvedIds: { projectIds: Set<string>; questIds: Set<string> }
  // userId: string
): Promise<void> {
  const errors: string[] = [];

  // Executar função para cada project_id
  for (const projectId of involvedIds.projectIds) {
    try {
      console.log(
        `[POST-PROCESSING] Executing project function for: ${projectId}`
      );

      // SUBSTITUA 'refresh_project_stats' pela sua função RPC
      const { error: projectError } = await supabase.rpc(
        'rebuild_single_project_closure',
        {
          project_id_param: projectId
        }
      );

      if (projectError) {
        console.error(
          `Error in project post-processing ${projectId}:`,
          projectError
        );
        errors.push(`Project ${projectId}: ${projectError.message}`);
      }
    } catch (error: any) {
      console.error(
        `Error executing project function for ${projectId}:`,
        error
      );
      errors.push(`Project ${projectId}: ${error.message}`);
    }
  }

  // Executar função para cada quest_id
  for (const questId of involvedIds.questIds) {
    try {
      console.log(`[POST-PROCESSING] Executing quest function for: ${questId}`);

      // SUBSTITUA 'refresh_quest_stats' pela sua função RPC
      const { error: questError } = await supabase.rpc(
        'rebuild_single_quest_closure',
        {
          quest_id_param: questId
        }
      );

      if (questError) {
        console.error(`Error in quest post-processing ${questId}:`, questError);
        errors.push(`Quest ${questId}: ${questError.message}`);
      }
    } catch (error: any) {
      console.error(`Error executing quest function for ${questId}:`, error);
      errors.push(`Quest ${questId}: ${error.message}`);
    }
  }

  // Log final
  if (errors.length > 0) {
    console.warn(
      '[POST-PROCESSING] Some post-processing functions failed:',
      errors
    );
  } else {
    console.log(
      '[POST-PROCESSING] All post-processing functions executed successfully'
    );
  }
}
