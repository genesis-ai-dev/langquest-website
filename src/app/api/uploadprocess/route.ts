import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import Papa from 'papaparse';

import { BIBLE_BOOKS } from '@/components/QuestExplorer/template-strategies/bible.template';
import { BIBLE_BOOKS as FIA_BIBLE_BOOKS } from '@/components/QuestExplorer/template-strategies/fia.template';
import { getUploadTemplate } from '@/components/upload-process-modal/lib/template';
import { env } from '@/lib/env';

import type { Database } from '../../../../database.types';

type UploadType = 'project' | 'quest' | 'asset';
type ProjectTemplate = 'unstructured' | 'bible' | 'fia';
type SupabaseClient = ReturnType<typeof createClient<Database>>;
type CsvUploadRow = Record<string, string>;
type UploadedFileMap = Map<string, string>;

type UploadStats = {
  projects: { read: number; created: number };
  quests: { read: number; created: number };
  assets: { read: number; created: number };
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
};

type UploadContext = {
  supabase: SupabaseClient;
  userId: string;
  uploadType: UploadType;
  projectId?: string;
  questId?: string;
  template: ProjectTemplate;
  fileMap: UploadedFileMap;
  languageCache: Map<string, string | null>;
  assetOrderSequencesByQuestVerse: Map<string, number>;
  questMetadata?: Record<string, unknown> | null;
  stats: UploadStats;
};

type QuestRecord = {
  id: string;
  name: string | null;
  parent_id: string | null;
  metadata: unknown;
};

type QuestTarget = {
  questId: string;
  projectId: string;
  rowNumber: number;
  row: CsvUploadRow;
  questMetadata?: Record<string, unknown>;
};

type UnstructuredQuestDefinition = {
  key: string;
  name: string;
  parentName: string;
  description: string | null;
  tags: string;
};

const allowedUploadTypes = new Set<UploadType>(['project', 'quest', 'asset']);
const allowedProjectTemplates = new Set<ProjectTemplate>([
  'unstructured',
  'bible',
  'fia'
]);
const mediaColumns = ['source_images', 'source_audio'] as const;

async function canCreateContentInProject(
  supabase: SupabaseClient,
  projectId: string,
  authUserId: string
): Promise<boolean> {
  if (!projectId || !authUserId) return false;

  const { data: project, error: projectError } = await supabase
    .from('project')
    .select('creator_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return false;
  }

  if (project.creator_id === authUserId) {
    return true;
  }

  const { data: membership } = await supabase
    .from('profile_project_link')
    .select('membership')
    .eq('project_id', projectId)
    .eq('profile_id', authUserId)
    .eq('active', true)
    .in('membership', ['owner', 'admin', 'member'])
    .maybeSingle();

  return !!membership;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

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

    const body = await request.json();
    const uploadType = getUploadType(body.uploadType);
    const uploadPath = getStringValue(body.uploadPath);
    const csvContent = getStringValue(body.csvContent);
    const projectId = getStringValue(body.projectId);
    const questId = getStringValue(body.questId);
    const fiaContentLanguoidId = getStringValue(body.fiaContentLanguoidId);
    const questMetadata = getRecordValue(body.questMetadata);

    if (!uploadType) {
      return NextResponse.json(
        { error: 'uploadType must be one of: project, quest, asset' },
        { status: 400 }
      );
    }

    if (!uploadPath || !uploadPath.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { error: 'uploadPath must reference a ZIP file' },
        { status: 400 }
      );
    }

    if (!csvContent) {
      return NextResponse.json(
        { error: 'csvContent is required' },
        { status: 400 }
      );
    }

    if (uploadType === 'quest' && !projectId) {
      return NextResponse.json(
        { error: 'projectId is required for quest uploads' },
        { status: 400 }
      );
    }

    if (uploadType === 'asset' && (!projectId || !questId)) {
      return NextResponse.json(
        { error: 'projectId and questId are required for asset uploads' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    if (uploadType === 'quest' || uploadType === 'asset') {
      const allowed = await canCreateContentInProject(
        supabase,
        projectId,
        user.id
      );

      if (!allowed) {
        return NextResponse.json(
          { error: 'You must be an active project member to upload content.' },
          { status: 403 }
        );
      }
    }

    if (uploadType === 'asset') {
      const { data: questProject, error: questProjectError } = await supabase
        .from('quest')
        .select('project_id')
        .eq('id', questId)
        .eq('project_id', projectId)
        .single();

      if (questProjectError || !questProject?.project_id) {
        return NextResponse.json(
          { error: 'Failed to validate quest/project relationship.' },
          { status: 400 }
        );
      }
    }

    const parseResult = Papa.parse<CsvUploadRow>(csvContent, {
      header: true,
      skipEmptyLines: true
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: `CSV parsing error: ${parseResult.errors[0].message}` },
        { status: 400 }
      );
    }

    const headerValidation = validateCsvHeaders(
      parseResult.meta.fields ?? [],
      uploadType
    );
    if (headerValidation) {
      return NextResponse.json({ error: headerValidation }, { status: 400 });
    }

    const rows = parseResult.data.map(normalizeCsvRow);
    const requiredFieldValidation = validateRequiredFields(rows, uploadType);
    if (requiredFieldValidation) {
      return NextResponse.json(
        { error: requiredFieldValidation },
        { status: 400 }
      );
    }

    const zipContent = await loadUploadZip(supabase, uploadPath);
    const mediaValidation = validateReferencedMediaFiles(rows, zipContent);
    if (mediaValidation.length > 0) {
      return NextResponse.json(
        { error: 'ZIP media validation failed.', details: mediaValidation },
        { status: 400 }
      );
    }

    const fileMap = await uploadZipMediaFiles(supabase, zipContent);
    const { resolvedProjectId, template, createdProjects } =
      await resolveProjectContext({
        supabase,
        userId: user.id,
        uploadType,
        rows,
        projectId,
        fiaContentLanguoidId
      });

    const stats = createUploadStats();
    stats.projects.created = createdProjects;
    stats.projects.read = uploadType === 'project' ? 1 : 0;

    const context: UploadContext = {
      supabase,
      userId: user.id,
      uploadType,
      projectId: resolvedProjectId,
      questId,
      template,
      fileMap,
      languageCache: new Map(),
      assetOrderSequencesByQuestVerse: new Map(),
      questMetadata,
      stats
    };

    await processUploadRows(context, rows);

    return NextResponse.json({
      success: stats.errors.length === 0,
      message:
        stats.errors.length === 0
          ? 'Upload processed successfully.'
          : 'Upload processed with errors.',
      uploadPath,
      rowsCount: rows.length,
      stats
    }, { status: stats.errors.length === 0 ? 200 : 400 });
  } catch (error) {
    console.error('[UPLOAD PROCESS] Unexpected error:', error);
    const message =
      error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getUploadType(value: unknown): UploadType | null {
  return typeof value === 'string' && allowedUploadTypes.has(value as UploadType)
    ? (value as UploadType)
    : null;
}

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getRecordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeCsvRow(row: CsvUploadRow): CsvUploadRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : ''
    ])
  );
}

function validateCsvHeaders(headers: string[], uploadType: UploadType) {
  const expectedHeaders = getUploadTemplate(uploadType).headers;
  const missingHeaders = expectedHeaders.filter(
    (header) => !headers.includes(header)
  );
  const extraHeaders = headers.filter(
    (header) => !expectedHeaders.includes(header)
  );

  if (missingHeaders.length > 0) {
    return `Missing required columns: ${missingHeaders.join(', ')}.`;
  }

  if (extraHeaders.length > 0) {
    return `Unexpected columns for ${uploadType} upload: ${extraHeaders.join(', ')}.`;
  }

  if (
    headers.length !== expectedHeaders.length ||
    headers.some((header, index) => header !== expectedHeaders[index])
  ) {
    return `CSV columns must match the ${uploadType} template order.`;
  }

  return null;
}

function validateRequiredFields(rows: CsvUploadRow[], uploadType: UploadType) {
  const requiredFields = getUploadTemplate(uploadType).requiredFields;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const missingField = requiredFields.find((field) => !row[field]);

    if (missingField) {
      return `Missing required field '${missingField}' on row ${rowIndex + 2}.`;
    }
  }

  return null;
}

async function loadUploadZip(supabase: SupabaseClient, uploadPath: string) {
  const { data: zipData, error } = await supabase.storage
    .from('uploads')
    .download(uploadPath);

  if (error || !zipData) {
    throw new Error(`Failed to download ZIP file: ${error?.message ?? ''}`);
  }

  return JSZip.loadAsync(await zipData.arrayBuffer());
}

function validateReferencedMediaFiles(rows: CsvUploadRow[], zipContent: JSZip) {
  const issues: Array<{ row: number; message: string }> = [];
  const assetsFiles = getZipAssetsFiles(zipContent);
  const assetsFileNames = new Set(
    assetsFiles.map((fileName) => getBaseFileName(fileName))
  );

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    mediaColumns.forEach((column) => {
      splitList(row[column]).forEach((filePath) => {
        const fileName = getBaseFileName(filePath);

        if (!assetsFileNames.has(fileName)) {
          issues.push({
            row: rowNumber,
            message: `${column === 'source_images' ? 'Image' : 'Audio'} file not found in ZIP: ${fileName}`
          });
        }
      });
    });
  });

  return issues;
}

function getZipAssetsFiles(zipContent: JSZip) {
  return Object.keys(zipContent.files).filter((fileName) => {
    const entry = zipContent.files[fileName];

    if (entry.dir || !fileName.toLowerCase().startsWith('assets/')) {
      return false;
    }

    return isSupportedMediaFile(fileName);
  });
}

async function uploadZipMediaFiles(
  supabase: SupabaseClient,
  zipContent: JSZip
) {
  const fileMap: UploadedFileMap = new Map();

  for (const fileName of getZipAssetsFiles(zipContent)) {
    const entry = zipContent.files[fileName];
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const fileStorageName = `${Date.now()}-${randomUUID()}.${fileExtension}`;
    const storagePath = isImageExtension(fileExtension)
      ? `images/${fileStorageName}`
      : fileStorageName;
    const fileBuffer = await entry.async('arraybuffer');
    const { error } = await supabase.storage
      .from('assets')
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(fileName)
      });

    if (error) {
      throw new Error(`Failed to upload ${fileName}: ${error.message}`);
    }

    fileMap.set(getBaseFileName(fileName), storagePath);
  }

  return fileMap;
}

async function resolveProjectContext({
  supabase,
  userId,
  uploadType,
  rows,
  projectId,
  fiaContentLanguoidId
}: {
  supabase: SupabaseClient;
  userId: string;
  uploadType: UploadType;
  rows: CsvUploadRow[];
  projectId?: string;
  fiaContentLanguoidId?: string;
}) {
  if (uploadType !== 'project') {
    if (!projectId) {
      throw new Error('projectId is required for this upload type.');
    }

    const { data: project, error } = await supabase
      .from('project')
      .select('id, template')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      throw new Error('Project not found.');
    }

    return {
      resolvedProjectId: project.id,
      template: normalizeProjectTemplate(project.template),
      createdProjects: 0
    };
  }

  const firstRow = rows[0];
  const projectName = firstRow?.project_name;
  const template = normalizeProjectTemplate(firstRow?.project_template);

  if (!projectName) {
    throw new Error('project_name is required for project uploads.');
  }

  const targetLanguageId = await getLanguoidIdByName(
    supabase,
    firstRow.target_language,
    new Map()
  );

  const { data: project, error: projectError } = await supabase
    .from('project')
    .insert({
      name: projectName,
      description: firstRow.project_description || null,
      creator_id: userId,
      target_language_id: targetLanguageId,
      visible: true,
      template
    })
    .select('id')
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to create project: ${projectError?.message ?? ''}`);
  }

  await (supabase as any).rpc('create_project_ownership', {
    p_project_id: project.id,
    p_profile_id: userId
  });

  if (targetLanguageId) {
    await supabase.from('project_language_link').insert({
      project_id: project.id,
      languoid_id: targetLanguageId,
      language_type: 'target'
    });
  }

  if (template === 'fia' && fiaContentLanguoidId) {
    const { error: sourceLanguageError } = await supabase
      .from('project_language_link')
      .insert({
        project_id: project.id,
        languoid_id: fiaContentLanguoidId,
        language_type: 'source'
      });

    if (sourceLanguageError) {
      throw new Error(
        `Failed to link FIA content language: ${sourceLanguageError.message}`
      );
    }
  }

  return {
    resolvedProjectId: project.id,
    template,
    createdProjects: 1
  };
}

async function processUploadRows(context: UploadContext, rows: CsvUploadRow[]) {
  const assetRows = rows.filter((row) => Boolean(row.asset_name));
  context.stats.assets.read = assetRows.length;

  if (context.uploadType === 'asset') {
    const quest = await loadQuestById(context.supabase, context.questId!);
    const questMetadata =
      parseJsonObject(quest.metadata) ?? context.questMetadata ?? undefined;
    await seedExistingAssetOrderSequencesByVerse(context, context.questId!);

    await createAssetsForRows(
      context,
      rows.map((row, index) => ({
        row,
        rowNumber: index + 2,
        questId: context.questId!,
        projectId: context.projectId!,
        questMetadata
      }))
    );
    return;
  }

  const questTargets =
    context.template === 'unstructured'
      ? await prepareUnstructuredQuestTargets(context, rows)
      : await prepareTemplateQuestTargets(context, rows);

  await createAssetsForRows(context, questTargets);
}

async function prepareUnstructuredQuestTargets(
  context: UploadContext,
  rows: CsvUploadRow[]
): Promise<QuestTarget[]> {
  const projectId = context.projectId!;
  const existingQuests = await loadExistingQuests(context.supabase, projectId);
  const { definitionsByKey, definitionsByName } =
    buildUnstructuredQuestDefinitions(rows);
  const questIdsByKey = new Map<string, string>();
  const targets: QuestTarget[] = [];

  async function ensureQuest(
    definition: UnstructuredQuestDefinition,
    stack = new Set<string>()
  ): Promise<string> {
    const existingQuestId = questIdsByKey.get(definition.key);
    if (existingQuestId) {
      return existingQuestId;
    }

    if (stack.has(definition.key)) {
      throw new Error(
        `Circular quest hierarchy detected for '${definition.name}'.`
      );
    }

    stack.add(definition.key);

    const parentDefinition = definition.parentName
      ? getSingleUnstructuredQuestDefinitionByName(
          definitionsByName,
          definition.parentName
        )
      : null;
    const parentId = parentDefinition
      ? await ensureQuest(parentDefinition, stack)
      : definition.parentName
        ? findExistingQuestByName(existingQuests, definition.parentName)
        : null;
    const questId =
      findExistingQuestByName(existingQuests, definition.name, parentId) ??
      (await createQuest(context, {
        name: definition.name,
        description: definition.description,
        parentId,
        metadata: null
      }));

    await linkTags(context.supabase, 'quest', questId, definition.tags);
    questIdsByKey.set(definition.key, questId);
    stack.delete(definition.key);

    return questId;
  }

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2;

    if (!row.quest_name) {
      continue;
    }

    const definition = definitionsByKey.get(
      getUnstructuredQuestDefinitionKey(row.parent_quest_name, row.quest_name)
    );

    if (!definition) {
      continue;
    }

    const questId = await ensureQuest(definition);

    targets.push({ row, rowNumber, questId, projectId });
  }

  return targets;
}

async function prepareTemplateQuestTargets(
  context: UploadContext,
  rows: CsvUploadRow[]
): Promise<QuestTarget[]> {
  const projectId = context.projectId!;
  const existingQuests = await loadExistingQuests(context.supabase, projectId);
  const bookQuestIds = new Map<string, string>();
  const contentQuestIds = new Map<string, QuestTarget>();
  const targets: QuestTarget[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2;

    if (!row.asset_name) {
      continue;
    }

    const templateQuest = resolveTemplateQuest(context.template, row);
    if (!templateQuest) {
      context.stats.errors.push({
        row: rowNumber,
        message: `Could not resolve ${context.template} quest for '${row.quest_name}'.`
      });
      continue;
    }

    let bookQuestId = bookQuestIds.get(templateQuest.book.id);
    if (!bookQuestId) {
      bookQuestId =
        findExistingTemplateBookQuest(
          existingQuests,
          context.template,
          templateQuest.book.id
        ) ??
        (await createQuest(context, {
          name: templateQuest.book.name,
          description: null,
          parentId: null,
          metadata:
            context.template === 'bible'
              ? { bible: { book: templateQuest.book.id } }
              : { fia: { bookId: templateQuest.book.id } }
        }));
      bookQuestIds.set(templateQuest.book.id, bookQuestId);
    }

    const contentKey = `${templateQuest.book.id}:${templateQuest.name}`;
    let contentTarget = contentQuestIds.get(contentKey);

    if (!contentTarget) {
      const questId = await createQuest(context, {
        name: templateQuest.name,
        description: templateQuest.description,
        parentId: bookQuestId,
        metadata: templateQuest.metadata
      });
      contentTarget = {
        row,
        rowNumber,
        questId,
        projectId,
        questMetadata: templateQuest.metadata
      };
      contentQuestIds.set(contentKey, contentTarget);
    }

    targets.push({
      row,
      rowNumber,
      questId: contentTarget.questId,
      projectId,
      questMetadata: contentTarget.questMetadata
    });
  }

  return targets;
}

async function createAssetsForRows(
  context: UploadContext,
  targets: QuestTarget[]
) {
  for (const target of targets) {
    const { row, rowNumber, questId, projectId } = target;

    if (!row.asset_name) {
      continue;
    }

    if (!hasAssetPayload(row)) {
      context.stats.errors.push({
        row: rowNumber,
        message:
          'Asset row must include at least one of source_images, source_content, or source_audio'
      });
      continue;
    }

    try {
      const sourceLanguageId = await getLanguoidIdByName(
        context.supabase,
        row.source_language,
        context.languageCache
      );
      const imageFiles = splitList(row.source_images).map(
        (filePath) => context.fileMap.get(getBaseFileName(filePath))!
      );
      const assetMetadata = buildAssetMetadata(
        context.template,
        row.asset_label,
        target.questMetadata
      );
      const assetOrderIndex = getAssetOrderIndex(
        assetMetadata,
        getNextAssetOrderSequence(context, questId, assetMetadata)
      );
      const assetPayload = {
        name: row.asset_name,
        creator_id: context.userId,
        project_id: projectId,
        source_language_id: sourceLanguageId,
        visible: true,
        source_asset_id: null,
        order_index: assetOrderIndex,
        images: imageFiles.length > 0 ? imageFiles : null,
        metadata: assetMetadata ? JSON.stringify(assetMetadata) : null
      };
      const { data: asset, error: assetError } = await context.supabase
        .from('asset')
        .insert(assetPayload as any)
        .select('id')
        .single();

      if (assetError || !asset) {
        throw new Error(assetError?.message ?? 'Failed to create asset.');
      }

      context.stats.assets.created++;

      await linkTags(context.supabase, 'asset', asset.id, row.asset_tags);
      await context.supabase.from('quest_asset_link').insert({
        quest_id: questId,
        asset_id: asset.id
      });
      await createAssetContentLinks(
        context,
        asset.id,
        row,
        sourceLanguageId
      );
    } catch (error) {
      context.stats.errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

async function createQuest(
  context: UploadContext,
  {
    name,
    description,
    parentId,
    metadata
  }: {
    name: string;
    description: string | null;
    parentId: string | null;
    metadata: Record<string, unknown> | null;
  }
) {
  const { data: quest, error } = await context.supabase
    .from('quest')
    .insert({
      name,
      description,
      project_id: context.projectId!,
      parent_id: parentId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      creator_id: context.userId
    })
    .select('id')
    .single();

  if (error || !quest) {
    throw new Error(`Failed to create quest '${name}': ${error?.message ?? ''}`);
  }

  context.stats.quests.created++;
  return quest.id;
}

async function createAssetContentLinks(
  context: UploadContext,
  assetId: string,
  row: CsvUploadRow,
  sourceLanguageId: string | null
) {
  const contentItems = splitList(row.source_content);
  const audioItems = splitList(row.source_audio);
  const maxLength = Math.max(contentItems.length, audioItems.length);

  for (let index = 0; index < maxLength; index++) {
    const text = contentItems[index] || '';
    const audioFile = audioItems[index];
    const audioPath = audioFile
      ? context.fileMap.get(getBaseFileName(audioFile))
      : null;

    const contentLinkPayload = {
      asset_id: assetId,
      text: text || (audioPath ? ' ' : ''),
      audio: audioPath ? [audioPath] : null,
      languoid_id: sourceLanguageId,
      order_index: index + 1,
      id: randomUUID()
    };

    await context.supabase
      .from('asset_content_link')
      .insert(contentLinkPayload as any);
  }
}

async function linkTags(
  supabase: SupabaseClient,
  targetType: 'asset' | 'quest',
  targetId: string,
  tagString?: string
) {
  for (const tag of parseTagString(tagString ?? '')) {
    const tagId = await findOrCreateTag(supabase, tag.key, tag.value);

    await supabase
      .from(targetType === 'asset' ? 'asset_tag_link' : 'quest_tag_link')
      .insert(
        targetType === 'asset'
          ? { asset_id: targetId, tag_id: tagId }
          : { quest_id: targetId, tag_id: tagId }
      );
  }
}

async function findOrCreateTag(
  supabase: SupabaseClient,
  key: string,
  value: string
) {
  const { data: existingTag } = await supabase
    .from('tag')
    .select('id')
    .eq('key', key)
    .eq('value', value)
    .maybeSingle();

  if (existingTag) {
    return existingTag.id;
  }

  const { data: tag, error } = await supabase
    .from('tag')
    .insert({ key, value })
    .select('id')
    .single();

  if (error || !tag) {
    throw new Error(`Failed to create tag '${key}:${value}'.`);
  }

  return tag.id;
}

async function getLanguoidIdByName(
  supabase: SupabaseClient,
  languageName: string | null | undefined,
  cache: Map<string, string | null>
) {
  if (!languageName) {
    return null;
  }

  const normalizedLanguageName = languageName.trim();
  if (!normalizedLanguageName) {
    return null;
  }

  if (cache.has(normalizedLanguageName)) {
    return cache.get(normalizedLanguageName) ?? null;
  }

  const { data: languoid } = await supabase
    .from('languoid')
    .select('id')
    .ilike('name', normalizedLanguageName)
    .eq('active', true)
    .maybeSingle();

  if (!languoid) {
    throw new Error(
      `Language '${normalizedLanguageName}' not found in languoid table`
    );
  }

  cache.set(normalizedLanguageName, languoid.id);
  return languoid.id;
}

async function loadExistingQuests(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('quest')
    .select('id, name, parent_id, metadata')
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to load existing quests: ${error.message}`);
  }

  return (data ?? []) as QuestRecord[];
}

async function loadQuestById(supabase: SupabaseClient, questId: string) {
  const { data, error } = await supabase
    .from('quest')
    .select('id, name, parent_id, metadata')
    .eq('id', questId)
    .single();

  if (error || !data) {
    throw new Error('Quest not found.');
  }

  return data as QuestRecord;
}

function findExistingQuestByName(
  quests: QuestRecord[],
  name: string,
  parentId?: string | null
) {
  return (
    quests.find(
      (quest) =>
        normalizeName(quest.name ?? '') === normalizeName(name) &&
        (parentId === undefined || quest.parent_id === parentId)
    )?.id ?? null
  );
}

function findExistingTemplateBookQuest(
  quests: QuestRecord[],
  template: ProjectTemplate,
  bookId: string
) {
  return (
    quests.find((quest) => {
      const metadata = parseJsonObject(quest.metadata);
      return template === 'bible'
        ? (metadata?.bible as { book?: string } | undefined)?.book === bookId
        : (metadata?.fia as { bookId?: string } | undefined)?.bookId === bookId;
    })?.id ?? null
  );
}

function resolveTemplateQuest(template: ProjectTemplate, row: CsvUploadRow) {
  const fiaQuestName =
    template === 'fia' ? parseFiaQuestName(row.quest_name) : null;
  const book =
    template === 'fia'
      ? resolveBook(
          getFiaBookIdFromPericopeId(fiaQuestName?.pericopeId) ||
            row.parent_quest_name ||
            row.quest_name,
          template
        )
      : resolveBook(row.parent_quest_name || row.quest_name, template);
  if (!book) {
    return null;
  }

  if (template === 'bible') {
    const chapterNumber = parseTrailingNumber(row.quest_name);
    const verseCount = book.verses[chapterNumber - 1];

    if (!chapterNumber || !verseCount) {
      return null;
    }

    return {
      book,
      name: `${book.name} ${chapterNumber}`,
      description: `${verseCount} verses`,
      metadata: {
        bible: {
          book: book.id,
          chapter: chapterNumber
        }
      }
    };
  }

  const verseRange = fiaQuestName?.verseRange ?? null;
  if (!verseRange) {
    return null;
  }

  const questName = fiaQuestName?.displayName || `${book.name} ${verseRange}`;

  return {
    book,
    name: questName,
    description: verseRange,
    metadata: {
      fia: {
        bookId: book.id,
        pericopeId: fiaQuestName?.pericopeId || `${book.id}:${verseRange}`,
        verseRange
      }
    }
  };
}

function buildAssetMetadata(
  template: ProjectTemplate,
  label: string | undefined,
  questMetadata?: Record<string, unknown>
) {
  if (!label || template === 'unstructured') {
    return null;
  }

  if (template === 'bible') {
    return parseBibleAssetLabel(label);
  }

  return parseFiaAssetLabel(label, questMetadata);
}

function getAssetOrderIndex(
  assetMetadata: Record<string, unknown> | null,
  sequence: number
) {
  const verseFrom = getAssetVerseFrom(assetMetadata);
  const verseBase =
    typeof verseFrom === 'number' ? Math.floor(verseFrom) : 999;
  const normalizedSequence = Number.isFinite(sequence) ? sequence : 0;

  return verseBase * 1000 * 1000 + normalizedSequence * 1000;
}

async function seedExistingAssetOrderSequencesByVerse(
  context: UploadContext,
  questId: string
) {
  const { data, error } = await context.supabase
    .from('quest_asset_link')
    .select(
      `
      asset:asset_id (
        order_index,
        active
      )
    `
    )
    .eq('quest_id', questId)
    .is('asset.source_asset_id', null);

  if (error) {
    throw new Error(
      `Failed to load existing asset order indexes: ${error.message}`
    );
  }

  (data || []).forEach((item: any) => {
    const value = item?.asset;
    const asset = Array.isArray(value) ? value[0] : value;
    const orderIndex = asset?.order_index;

    if (!asset?.active || typeof orderIndex !== 'number') {
      return;
    }

    const { verseBase, sequence } = parseAssetOrderIndex(orderIndex);
    const sequenceKey = getAssetOrderSequenceKeyFromVerse(
      questId,
      verseBase === 999 ? null : verseBase
    );
    const currentSequence =
      context.assetOrderSequencesByQuestVerse.get(sequenceKey) ?? 0;

    if (sequence > currentSequence) {
      context.assetOrderSequencesByQuestVerse.set(sequenceKey, sequence);
    }
  });
}

function getNextAssetOrderSequence(
  context: UploadContext,
  questId: string,
  assetMetadata: Record<string, unknown> | null
) {
  const sequenceKey = getAssetOrderSequenceKey(questId, assetMetadata);
  const nextSequence =
    (context.assetOrderSequencesByQuestVerse.get(sequenceKey) ?? 0) + 1;
  context.assetOrderSequencesByQuestVerse.set(sequenceKey, nextSequence);

  return nextSequence;
}

function getAssetOrderSequenceKey(
  questId: string,
  assetMetadata: Record<string, unknown> | null
) {
  const verseFrom = getAssetVerseFrom(assetMetadata);
  const verseKey =
    typeof verseFrom === 'number' && Number.isFinite(verseFrom)
      ? Math.floor(verseFrom).toString()
      : 'unlabeled';

  return `${questId}:${verseKey}`;
}

function getAssetOrderSequenceKeyFromVerse(
  questId: string,
  verseFrom: number | null
) {
  const verseKey =
    typeof verseFrom === 'number' && Number.isFinite(verseFrom)
      ? Math.floor(verseFrom).toString()
      : 'unlabeled';

  return `${questId}:${verseKey}`;
}

function parseAssetOrderIndex(orderIndex: number) {
  const verseBase = Math.floor(orderIndex / 1000 / 1000);
  const sequence = Math.floor((orderIndex % (1000 * 1000)) / 1000);

  return { verseBase, sequence };
}

function getAssetVerseFrom(assetMetadata: Record<string, unknown> | null) {
  const verseFrom = (assetMetadata as { verse?: { from?: number } } | null)
    ?.verse?.from;

  return typeof verseFrom === 'number' && Number.isFinite(verseFrom)
    ? verseFrom
    : null;
}

function parseBibleAssetLabel(label: string) {
  const match = label.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) {
    return null;
  }

  const from = Number(match[1]);
  const to = match[2] ? Number(match[2]) : from;

  return { verse: { from, to } };
}

function parseFiaAssetLabel(
  label: string,
  questMetadata?: Record<string, unknown>
) {
  const rangeMatch = label
    .trim()
    .match(/^(\d+):(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?$/);
  const fia = questMetadata?.fia as
    | { bookId?: string; verseRange?: string }
    | undefined;
  const pericopeRange = fia?.verseRange
    ? parseChapterVerseRange(fia.verseRange)
    : null;
  const book = FIA_BIBLE_BOOKS.find((item) => item.id === fia?.bookId);

  if (!rangeMatch || !pericopeRange || !book) {
    return null;
  }

  const start = {
    chapter: Number(rangeMatch[1]),
    verse: Number(rangeMatch[2])
  };
  const end = {
    chapter: rangeMatch[3] ? Number(rangeMatch[3]) : start.chapter,
    verse: rangeMatch[4] ? Number(rangeMatch[4]) : start.verse
  };
  const from = toRelativeVerseNumber(book.verses, pericopeRange.start, start);
  const to = toRelativeVerseNumber(book.verses, pericopeRange.start, end);

  if (!from || !to) {
    return null;
  }

  return { verse: { from, to } };
}

function parseChapterVerseRange(value: string) {
  const match = value.trim().match(/^(\d+):(\d+)\s*-\s*(?:(\d+):)?(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    start: {
      chapter: Number(match[1]),
      verse: Number(match[2])
    },
    end: {
      chapter: match[3] ? Number(match[3]) : Number(match[1]),
      verse: Number(match[4])
    }
  };
}

function toRelativeVerseNumber(
  versesPerChapter: number[],
  rangeStart: { chapter: number; verse: number },
  reference: { chapter: number; verse: number }
) {
  const startAbsolute = toAbsoluteVerse(versesPerChapter, rangeStart);
  const referenceAbsolute = toAbsoluteVerse(versesPerChapter, reference);

  if (!startAbsolute || !referenceAbsolute || referenceAbsolute < startAbsolute) {
    return null;
  }

  return referenceAbsolute - startAbsolute + 1;
}

function toAbsoluteVerse(
  versesPerChapter: number[],
  reference: { chapter: number; verse: number }
) {
  const chapterVerseCount = versesPerChapter[reference.chapter - 1];
  if (!chapterVerseCount || reference.verse < 1 || reference.verse > chapterVerseCount) {
    return null;
  }

  return (
    versesPerChapter
      .slice(0, reference.chapter - 1)
      .reduce((sum, verseCount) => sum + verseCount, 0) + reference.verse
  );
}

function resolveBook(bookName: string, template: ProjectTemplate) {
  const books = template === 'bible' ? BIBLE_BOOKS : FIA_BIBLE_BOOKS;
  const normalizedBookName = normalizeName(bookName);

  return books.find(
    (book) => {
      const imgId = (book as { imgId?: string }).imgId;

      return (
        normalizeName(book.id) === normalizedBookName ||
        (imgId ? normalizeName(imgId) === normalizedBookName : false) ||
        normalizeName(book.name) === normalizedBookName ||
        normalizedBookName.startsWith(`${normalizeName(book.name)} `)
      );
    }
  );
}

function parseQuestVerseRange(questName: string) {
  return questName.match(/\d+:\d+\s*-\s*(?:\d+:)?\d+/)?.[0] ?? null;
}

function parseFiaQuestName(questName: string) {
  const [displayNamePart, pericopeIdPart] = questName
    .split(',')
    .map((part) => part.trim());
  const verseRange = parseQuestVerseRange(displayNamePart);

  if (!verseRange) {
    return null;
  }

  return {
    displayName: displayNamePart,
    pericopeId: pericopeIdPart || '',
    verseRange
  };
}

function getFiaBookIdFromPericopeId(pericopeId?: string) {
  return pericopeId?.split('-')[0]?.trim() || null;
}

function parseTrailingNumber(value: string) {
  const match = value.trim().match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function normalizeProjectTemplate(value?: string | null): ProjectTemplate {
  const normalizedValue = (value || 'unstructured').toLowerCase().trim();
  return allowedProjectTemplates.has(normalizedValue as ProjectTemplate)
    ? (normalizedValue as ProjectTemplate)
    : 'unstructured';
}

function createUploadStats(): UploadStats {
  return {
    projects: { read: 0, created: 0 },
    quests: { read: 0, created: 0 },
    assets: { read: 0, created: 0 },
    errors: [],
    warnings: []
  };
}

function hasAssetPayload(row: CsvUploadRow) {
  return Boolean(
    row.source_images?.trim() ||
      row.source_content?.trim() ||
      row.source_audio?.trim()
  );
}

function splitList(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTagString(tagString: string) {
  return splitList(tagString).map((tag) => {
    const [key, ...valueParts] = tag.split(':');
    return {
      key: key.trim(),
      value: valueParts.join(':').trim()
    };
  });
}

function buildUnstructuredQuestDefinitions(rows: CsvUploadRow[]) {
  const definitionsByKey = new Map<string, UnstructuredQuestDefinition>();
  const definitionsByName = new Map<string, UnstructuredQuestDefinition[]>();

  rows.forEach((row) => {
    if (!row.quest_name) {
      return;
    }

    const key = getUnstructuredQuestDefinitionKey(
      row.parent_quest_name,
      row.quest_name
    );
    const existingDefinition = definitionsByKey.get(key);

    if (existingDefinition) {
      existingDefinition.description ||=
        row.quest_description || existingDefinition.description;
      existingDefinition.tags = mergeTagStrings(
        existingDefinition.tags,
        row.quest_tags
      );
      return;
    }

    const definition: UnstructuredQuestDefinition = {
      key,
      name: row.quest_name,
      parentName: row.parent_quest_name || '',
      description: row.quest_description || null,
      tags: row.quest_tags || ''
    };
    const nameKey = normalizeName(definition.name);

    definitionsByKey.set(key, definition);
    definitionsByName.set(nameKey, [
      ...(definitionsByName.get(nameKey) ?? []),
      definition
    ]);
  });

  return { definitionsByKey, definitionsByName };
}

function getSingleUnstructuredQuestDefinitionByName(
  definitionsByName: Map<string, UnstructuredQuestDefinition[]>,
  questName: string
) {
  const definitions = definitionsByName.get(normalizeName(questName)) ?? [];

  return definitions.length === 1 ? definitions[0] : null;
}

function getUnstructuredQuestDefinitionKey(
  parentQuestName: string | undefined,
  questName: string
) {
  return `${normalizeName(parentQuestName ?? '')}::${normalizeName(questName)}`;
}

function mergeTagStrings(currentTags: string, nextTags?: string) {
  return Array.from(new Set([...splitList(currentTags), ...splitList(nextTags)]))
    .join(';');
}

function getBaseFileName(filePath: string) {
  return filePath.split('/').pop() || filePath;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function isSupportedMediaFile(fileName: string) {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  return (
    isImageExtension(extension) ||
    ['mp3', 'wav', 'm4a', 'ogg'].includes(extension)
  );
}

function isImageExtension(extension: string) {
  return ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
}

function getContentType(fileName: string) {
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
    case 'm4a':
      return 'audio/mp4';
    case 'ogg':
      return 'audio/ogg';
    default:
      return 'application/octet-stream';
  }
}
