import JSZip from 'jszip';
import { createBrowserClient } from '@/lib/supabase/client';
import { env } from '@/lib/env';
import { getVerseMetadata, parseMetadata } from '@/lib/templatefunctions';
import {
  concatAclAudio,
  type ConcatProgress
} from '@/components/acl-reorder/audioConcat';
import type { AclWithAudio } from '@/components/acl-reorder/useAclAudioPlayer';

type TagLink = {
  tag?: {
    key?: string | null;
    value?: string | null;
  } | null;
};

type DownloadQuestRow = {
  id: string;
  name: string | null;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  parent_quest?: { name: string | null } | { name: string | null }[] | null;
  tags?: TagLink[] | null;
};

type DownloadAssetContentRow = {
  id: string;
  asset_id: string;
  text: string | null;
  audio: unknown;
  languoid_id: string | null;
  order_index: number | null;
  created_at: string;
};

type DownloadAssetRow = {
  id: string;
  name: string;
  images: unknown;
  metadata: unknown;
  source_language_id: string | null;
  order_index: number | null;
  created_at: string;
  content?: DownloadAssetContentRow[] | null;
  tags?: TagLink[] | null;
};

type QuestAssetLinkRow = {
  quest_id: string;
  asset_id: string;
};

type LanguoidRow = {
  id: string;
  name: string;
};

type QuestUploadCsvRow = {
  parent_quest_name: string;
  quest_name: string;
  quest_description: string;
  quest_tags: string;
  asset_name: string;
  asset_tags: string;
  source_language: string;
  source_images: string;
  source_content: string;
  source_audio: string;
};

export type ProjectDownloadProgress = {
  phase: 'loading' | 'quest' | 'zipping' | 'complete';
  message: string;
  currentQuest: number;
  totalQuests: number;
  questId?: string;
  questName?: string;
  percent: number;
  warnings?: string[];
};

export type DownloadProjectZipOptions = {
  projectId: string;
  questIds: string[];
  assetIds: string[];
  includeCsv: boolean;
  mergeAudioByQuest: boolean;
  onProgress?: (progress: ProjectDownloadProgress) => void;
};

const QUEST_UPLOAD_CSV_HEADERS: Array<keyof QuestUploadCsvRow> = [
  'parent_quest_name',
  'quest_name',
  'quest_description',
  'quest_tags',
  'asset_name',
  'asset_tags',
  'source_language',
  'source_images',
  'source_content',
  'source_audio'
];

const QUERY_CHUNK_SIZE = 40;

export async function downloadProjectZip({
  projectId,
  questIds,
  assetIds,
  includeCsv,
  mergeAudioByQuest,
  onProgress
}: DownloadProjectZipOptions) {
  if (!questIds.length || !assetIds.length) {
    throw new Error('Select at least one quest with assets to download.');
  }

  reportProgress(onProgress, {
    phase: 'loading',
    message: 'Loading download data...',
    currentQuest: 0,
    totalQuests: questIds.length,
    percent: 0
  });

  const supabase = createBrowserClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Authentication required');
  }

  const [project, quests, assets, links] = await Promise.all([
    loadProject(projectId),
    loadQuests(questIds),
    loadAssets(projectId, assetIds),
    loadQuestAssetLinks(questIds, assetIds)
  ]);

  const questsById = new Map(quests.map((quest) => [quest.id, quest]));
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const assetIdsByQuestId = groupAssetIdsByQuest(links);
  const languoidIds = collectLanguoidIds(assets);
  const languoidsById = await loadLanguoids([...languoidIds]);

  const zip = new JSZip();
  const csvRows: QuestUploadCsvRow[] = [];
  const usedFileNames = new Set<string>();
  const warnings: string[] = [];

  for (const [questIndex, questId] of questIds.entries()) {
    const quest = questsById.get(questId);
    if (!quest) continue;

    reportProgress(onProgress, {
      phase: 'quest',
      message: `Processing ${quest.name || 'Untitled Quest'}...`,
      currentQuest: questIndex + 1,
      totalQuests: questIds.length,
      questId,
      questName: quest.name || 'Untitled Quest',
      percent: Math.round((questIndex / questIds.length) * 100),
      warnings: [...warnings]
    });

    const orderedAssets = (assetIdsByQuestId.get(questId) ?? [])
      .map((assetId) => assetsById.get(assetId))
      .filter((asset): asset is DownloadAssetRow => Boolean(asset))
      .sort(sortAssets);

    if (mergeAudioByQuest) {
      for (const asset of orderedAssets) {
        await addStorageFilesToZip({
          zip,
          usedFileNames,
          warnings,
          missingFileContext: `${quest.name || 'Untitled Quest'} / ${asset.name} image`,
          files: parseStoragePaths(asset.images).map((path, index) => ({
            path,
            fileNameBase: buildAssetFileNameBase({
              quest,
              asset,
              sequence: `img${index + 1}`
            })
          }))
        });
      }

      if (orderedAssets.length) {
        try {
          const mergedAudio = await mergeQuestAudio({
            assets: orderedAssets,
            onProgress: (concatProgress) => {
              reportProgress(onProgress, {
                phase: 'quest',
                message: formatConcatProgressMessage(
                  quest.name || 'Untitled Quest',
                  concatProgress
                ),
                currentQuest: questIndex + 1,
                totalQuests: questIds.length,
                questId,
                questName: quest.name || 'Untitled Quest',
                percent: Math.round((questIndex / questIds.length) * 100),
                warnings: [...warnings]
              });
            }
          });
          const mergedFileName = uniqueUploadAssetFileName(
            usedFileNames,
            `${buildMergedQuestFileNameBase(quest)}.${getExtensionFromContentType(
              mergedAudio.contentType
            )}`
          );
          zip.file(`assets/${mergedFileName}`, mergedAudio.blob);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Audio merge failed';

          warnings.push(
            `${quest.name || 'Untitled Quest'} audio merge was skipped: ${formatMergeWarningMessage(
              message
            )}`
          );
          reportProgress(onProgress, {
            phase: 'quest',
            message: `Skipped audio merge for ${quest.name || 'Untitled Quest'}.`,
            currentQuest: questIndex + 1,
            totalQuests: questIds.length,
            questId,
            questName: quest.name || 'Untitled Quest',
            percent: Math.round(((questIndex + 1) / questIds.length) * 100),
            warnings: [...warnings]
          });
        }
      }
      continue;
    }

    if (!orderedAssets.length) {
      if (includeCsv) {
        csvRows.push(createQuestOnlyCsvRow(quest));
      }
      continue;
    }

    for (const asset of orderedAssets) {
      const imageFileNames = await addStorageFilesToZip({
        zip,
        usedFileNames,
        warnings,
        missingFileContext: `${quest.name || 'Untitled Quest'} / ${asset.name} image`,
        files: parseStoragePaths(asset.images).map((path, index) => ({
          path,
          fileNameBase: buildAssetFileNameBase({
            quest,
            asset,
            sequence: `img${index + 1}`
          })
        }))
      });

      const contentRows = [...(asset.content ?? [])].sort(sortContentRows);
      const sourceContent: string[] = [];
      const sourceAudio: string[] = [];

      for (const [contentIndex, content] of contentRows.entries()) {
        const audioFileNames = await addStorageFilesToZip({
          zip,
          usedFileNames,
          warnings,
          missingFileContext: `${quest.name || 'Untitled Quest'} / ${asset.name} audio`,
          files: parseStoragePaths(content.audio).map((path, pathIndex) => ({
            path,
            fileNameBase: buildAssetFileNameBase({
              quest,
              asset,
              sequence: buildContentSequence(content, contentIndex, pathIndex)
            })
          }))
        });

        if (!audioFileNames.length) {
          if (content.text?.trim()) {
            sourceContent.push(content.text.trim());
          }
          continue;
        }

        audioFileNames.forEach((audioFileName, index) => {
          sourceContent.push(index === 0 ? content.text?.trim() || '' : '');
          sourceAudio.push(audioFileName);
        });
      }

      if (includeCsv) {
        csvRows.push({
          parent_quest_name: getParentQuestName(quest),
          quest_name: quest.name || 'Untitled Quest',
          quest_description: quest.description || '',
          quest_tags: formatTags(quest.tags),
          asset_name: asset.name,
          asset_tags: formatTags(asset.tags),
          source_language: resolveAssetSourceLanguage(
            asset,
            contentRows,
            languoidsById
          ),
          source_images: imageFileNames.join(';'),
          source_content: sourceContent.join(';'),
          source_audio: sourceAudio.join(';')
        });
      }
    }
  }

  if (includeCsv) {
    zip.file('quest-upload.csv', createQuestUploadCsv(csvRows));
  }

  reportProgress(onProgress, {
    phase: 'zipping',
    message: 'Creating ZIP file...',
    currentQuest: questIds.length,
    totalQuests: questIds.length,
    percent: 95,
    warnings: [...warnings]
  });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
    compressionOptions: {
      level: 0
    }
  });

  const filename = `${sanitizeFileName(project.name || 'project')}-download-${new Date()
    .toISOString()
    .slice(0, 10)}.zip`;

  downloadBlob(zipBlob, filename);

  reportProgress(onProgress, {
    phase: 'complete',
    message: 'Download completed.',
    currentQuest: questIds.length,
    totalQuests: questIds.length,
    percent: 100,
    warnings: [...warnings]
  });

  return { filename, sizeBytes: zipBlob.size, warnings };
}

async function loadProject(projectId: string) {
  const { data, error } = await createBrowserClient()
    .from('project')
    .select('id,name,description')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to load project');
  }

  return data as {
    id: string;
    name: string | null;
    description: string | null;
  };
}

async function loadQuests(questIds: string[]) {
  const quests: DownloadQuestRow[] = [];

  for (const questIdChunk of chunkArray(questIds, QUERY_CHUNK_SIZE)) {
    const { data, error } = await createBrowserClient()
      .from('quest')
      .select(
        'id,name,description,parent_id,created_at,parent_quest:parent_id(name),tags:quest_tag_link(tag(key,value))'
      )
      .in('id', questIdChunk);

    if (error) throw error;
    quests.push(...((data ?? []) as unknown as DownloadQuestRow[]));
  }

  return quests;
}

async function loadAssets(projectId: string, assetIds: string[]) {
  const assets: DownloadAssetRow[] = [];

  for (const assetIdChunk of chunkArray(assetIds, QUERY_CHUNK_SIZE)) {
    const { data, error } = await createBrowserClient()
      .from('asset')
      .select(
        'id,name,images,metadata,source_language_id,order_index,created_at,content:asset_content_link(id,asset_id,text,audio,languoid_id,order_index,created_at),tags:asset_tag_link(tag(key,value))'
      )
      .eq('project_id', projectId)
      .eq('active', true)
      .in('id', assetIdChunk);

    if (error) throw error;
    assets.push(...((data ?? []) as unknown as DownloadAssetRow[]));
  }

  return assets;
}

async function loadQuestAssetLinks(questIds: string[], assetIds: string[]) {
  const links: QuestAssetLinkRow[] = [];

  for (const questIdChunk of chunkArray(questIds, QUERY_CHUNK_SIZE)) {
    for (const assetIdChunk of chunkArray(assetIds, QUERY_CHUNK_SIZE)) {
      const { data, error } = await createBrowserClient()
        .from('quest_asset_link')
        .select('quest_id,asset_id')
        .eq('active', true)
        .in('quest_id', questIdChunk)
        .in('asset_id', assetIdChunk);

      if (error) throw error;
      links.push(...((data ?? []) as QuestAssetLinkRow[]));
    }
  }

  return links;
}

async function loadLanguoids(languoidIds: string[]) {
  if (!languoidIds.length) return new Map<string, string>();

  const languoids: LanguoidRow[] = [];
  for (const languoidIdChunk of chunkArray(languoidIds, QUERY_CHUNK_SIZE)) {
    const { data, error } = await createBrowserClient()
      .from('languoid')
      .select('id,name')
      .eq('active', true)
      .in('id', languoidIdChunk);

    if (error) throw error;
    languoids.push(...((data ?? []) as LanguoidRow[]));
  }

  return new Map(languoids.map((languoid) => [languoid.id, languoid.name]));
}

async function mergeQuestAudio({
  assets,
  onProgress
}: {
  assets: DownloadAssetRow[];
  onProgress?: (progress: ConcatProgress) => void;
}) {
  const acls: AclWithAudio[] = assets.flatMap((asset) =>
    [...(asset.content ?? [])].sort(sortContentRows).map((content) => ({
      id: content.id,
      asset_id: content.asset_id || asset.id,
      order_index: content.order_index,
      audio: content.audio,
      text: content.text,
      created_at: content.created_at
    }))
  );

  const blob = await concatAclAudio(acls, onProgress);

  return {
    blob,
    contentType: blob.type || 'audio/wav'
  };
}

async function addStorageFilesToZip({
  zip,
  usedFileNames,
  warnings,
  missingFileContext,
  files
}: {
  zip: JSZip;
  usedFileNames: Set<string>;
  warnings?: string[];
  missingFileContext: string;
  files: Array<{ path: string; fileNameBase: string }>;
}) {
  const fileNames: string[] = [];

  for (const file of files) {
    const { path, fileNameBase } = file;
    const blob = await fetchFileFromSupabase(path);
    if (!blob) {
      warnings?.push(`${missingFileContext} file was not found: ${path}`);
      continue;
    }

    const fileName = uniqueUploadAssetFileName(
      usedFileNames,
      `${fileNameBase}.${getFileExtension(path) || getExtensionFromContentType(blob.type)}`
    );
    zip.file(`assets/${fileName}`, blob);
    fileNames.push(fileName);
  }

  return fileNames;
}

async function fetchFileFromSupabase(filePath: string): Promise<Blob | null> {
  if (!filePath) return null;

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    try {
      const response = await fetch(filePath);
      return response.ok ? await response.blob() : null;
    } catch {
      return null;
    }
  }

  const supabase = createBrowserClient();
  const pathVariants = createStoragePathVariants(filePath);

  for (const path of pathVariants) {
    const { data, error } = await supabase.storage
      .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
      .download(path);

    if (!error && data) {
      return data;
    }
  }

  return null;
}

function createQuestUploadCsv(rows: QuestUploadCsvRow[]) {
  return [
    QUEST_UPLOAD_CSV_HEADERS.join(','),
    ...rows.map((row) =>
      QUEST_UPLOAD_CSV_HEADERS.map((header) => escapeCsvCell(row[header])).join(
        ','
      )
    )
  ].join('\n');
}

function createQuestOnlyCsvRow(quest: DownloadQuestRow): QuestUploadCsvRow {
  return {
    parent_quest_name: getParentQuestName(quest),
    quest_name: quest.name || 'Untitled Quest',
    quest_description: quest.description || '',
    quest_tags: formatTags(quest.tags),
    asset_name: '',
    asset_tags: '',
    source_language: '',
    source_images: '',
    source_content: '',
    source_audio: ''
  };
}

function collectLanguoidIds(assets: DownloadAssetRow[]) {
  const languoidIds = new Set<string>();

  assets.forEach((asset) => {
    if (asset.source_language_id) {
      languoidIds.add(asset.source_language_id);
    }
    asset.content?.forEach((content) => {
      if (content.languoid_id) {
        languoidIds.add(content.languoid_id);
      }
    });
  });

  return languoidIds;
}

function groupAssetIdsByQuest(links: QuestAssetLinkRow[]) {
  const assetIdsByQuestId = new Map<string, string[]>();

  links.forEach((link) => {
    const current = assetIdsByQuestId.get(link.quest_id) ?? [];
    current.push(link.asset_id);
    assetIdsByQuestId.set(link.quest_id, current);
  });

  return assetIdsByQuestId;
}

function buildMergedQuestFileNameBase(quest: DownloadQuestRow) {
  return sanitizeFileName(
    `${quest.name || 'Untitled Quest'}_${formatDateForFileName(
      quest.created_at
    )}`
  );
}

function formatConcatProgressMessage(
  questName: string,
  progress: ConcatProgress
) {
  switch (progress.phase) {
    case 'downloading':
      return `Merging ${questName}: downloading audio ${progress.current}/${progress.total}...`;
    case 'decoding':
      return `Merging ${questName}: decoding audio ${progress.current}/${progress.total}...`;
    case 'encoding':
      return `Merging ${questName}: encoding WAV...`;
  }
}

function isNoAudioMergeError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('no valid audio') ||
    normalized.includes('no audio files to concatenate')
  );
}

function formatMergeWarningMessage(message: string) {
  if (isNoAudioMergeError(message)) {
    return 'no valid audio found.';
  }

  return message;
}

function buildAssetFileNameBase({
  quest,
  asset,
  sequence
}: {
  quest: DownloadQuestRow;
  asset: DownloadAssetRow;
  sequence: string;
}) {
  const verseRange = getAssetVerseRange(asset);

  return sanitizeFileName(
    [
      quest.name || 'Untitled Quest',
      asset.name,
      verseRange,
      sequence,
      formatDateForFileName(asset.created_at)
    ]
      .filter(Boolean)
      .join('_')
  );
}

function getAssetVerseRange(asset: DownloadAssetRow) {
  const verse = getVerseMetadata(asset.metadata);
  const metadata = parseMetadata(asset.metadata);
  const directFrom = metadata?.from;
  const directTo = metadata?.to;
  const from =
    typeof verse?.from === 'number'
      ? verse.from
      : typeof directFrom === 'number'
        ? directFrom
        : null;
  const to =
    typeof verse?.to === 'number'
      ? verse.to
      : typeof directTo === 'number'
        ? directTo
        : from;

  if (from == null) return '';
  return `${from}-${to ?? from}`;
}

function buildContentSequence(
  content: DownloadAssetContentRow,
  contentIndex: number,
  pathIndex: number
) {
  const contentSequence = content.order_index ?? contentIndex + 1;
  const baseSequence = `seq${contentSequence}`;

  if (pathIndex === 0) {
    return baseSequence;
  }

  return `${baseSequence}-${pathIndex + 1}`;
}

function formatDateForFileName(value: string | null | undefined) {
  if (!value) return 'no_date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'no_date';

  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function resolveAssetSourceLanguage(
  asset: DownloadAssetRow,
  contentRows: DownloadAssetContentRow[],
  languoidsById: Map<string, string>
) {
  const sourceLanguageId =
    asset.source_language_id ||
    contentRows.find((content) => content.languoid_id)?.languoid_id;

  return sourceLanguageId ? languoidsById.get(sourceLanguageId) || '' : '';
}

function getParentQuestName(quest: DownloadQuestRow) {
  const parentQuest = Array.isArray(quest.parent_quest)
    ? quest.parent_quest[0]
    : quest.parent_quest;
  return parentQuest?.name || '';
}

function formatTags(tags?: TagLink[] | null) {
  if (!tags?.length) return '';

  return tags
    .map((tagLink) => {
      const tag = tagLink.tag;
      if (!tag?.key) return null;
      return tag.value ? `${tag.key}:${tag.value}` : tag.key;
    })
    .filter((tag): tag is string => Boolean(tag))
    .join(';');
}

function parseStoragePaths(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === 'string' && item.trim() !== ''
    );
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string => typeof item === 'string' && item.trim() !== ''
      );
    }
  } catch {
    // Fall back to semicolon parsing.
  }

  return trimmed
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function createStoragePathVariants(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return [path];
  }

  const basePath = path.replace(/\.(wav|mp3|m4a|ogg|webm)$/i, '');
  return [
    path,
    path.replace(/^local\//, ''),
    `local/${path}`,
    `audio/${path}`,
    `images/${path}`,
    `shared_attachments/${path}`,
    `shared_attachments/${basePath}.wav`,
    `shared_attachments/${basePath}.mp3`
  ].filter((item, index, list) => item && list.indexOf(item) === index);
}

function uniqueUploadAssetFileName(
  usedFileNames: Set<string>,
  fileName: string
) {
  const safeName = sanitizeFileName(fileName);
  const extension = safeName.includes('.')
    ? `.${getFileExtension(safeName)}`
    : '';
  const baseName = extension ? safeName.slice(0, -extension.length) : safeName;
  let candidate = safeName;
  let counter = 2;

  while (usedFileNames.has(candidate)) {
    candidate = `${baseName}-${counter}${extension}`;
    counter += 1;
  }

  usedFileNames.add(candidate);
  return candidate;
}

function sanitizeFileName(value: string) {
  return (
    value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'file'
  );
}

function getFileExtension(path: string) {
  const cleanPath = path.split('?')[0]?.split('#')[0] || path;
  const extension = cleanPath.split('.').pop()?.toLowerCase() || '';
  return extension === cleanPath ? '' : extension;
}

function getExtensionFromContentType(contentType: string) {
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('ogg')) return 'ogg';
  if (contentType.includes('webm')) return 'webm';
  return 'mp3';
}

function sortAssets(a: DownloadAssetRow, b: DownloadAssetRow) {
  const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function sortContentRows(
  a: DownloadAssetContentRow,
  b: DownloadAssetContentRow
) {
  const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function reportProgress(
  onProgress: DownloadProjectZipOptions['onProgress'],
  progress: ProjectDownloadProgress
) {
  onProgress?.(progress);
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}
