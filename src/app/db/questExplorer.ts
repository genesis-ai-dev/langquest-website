import { SupabaseClient } from '@supabase/supabase-js';

export interface QuestRecord {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  parent_id: string | null;
  created_at: string;
  children: QuestRecord[];
}

export interface QuestTreeResult {
  flat: QuestRecord[];
  roots: QuestRecord[];
  byId: Record<string, QuestRecord>;
}

export interface AssetSummary {
  id: string;
  name: string | null;
  active: boolean;
  order_index?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  last_updated?: string;
  images?: string[] | null;
  content?: Array<{
    id: string;
    text: string;
    audio?: string | null;
  }>;
  tags?: Array<{
    tag: {
      id: string;
      key: string;
      value: string;
    };
  }>;
  translations?: Array<{ count: number }>;
}

export interface AssetDetails {
  id: string;
  name: string;
  images?: string[];
  content: Array<{
    id: string;
    text: string;
    audio: [string] | string;
  }>;
  tags: Array<{
    tag:
      | {
          id: string;
          key: string;
          value: string;
        }
      | string;
  }>;
  quests: Array<{
    quest?: {
      id: string;
      name: string;
      description: string;
      tags: Array<{
        tag:
          | {
              id: string;
              key: string;
              value: string;
            }
          | string;
      }>;
      project: {
        id: string;
        name: string;
        description: string;
      };
    };
  }>;
  translations: Array<{
    id: string;
    content?: Array<{
      text: string;
      audio: string;
    }>;
    votes: Array<{
      id: string;
      polarity: string;
      creator_id: string;
    }>;
  }>;
}

function parseMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata) return null;

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (typeof metadata === 'object') {
    return metadata as Record<string, unknown>;
  }

  return null;
}

function normalizeQuestRow(row: any): QuestRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    metadata: parseMetadata(row.metadata),
    parent_id: row.parent_id,
    created_at: row.created_at,
    children: []
  };
}

export async function fetchProjectQuestTree(
  supabase: SupabaseClient,
  projectId: string
): Promise<QuestTreeResult> {
  const { data, error } = await supabase
    .from('quest')
    .select('*')
    .eq('project_id', projectId)
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const normalized = ((data || []) as any[]).map(normalizeQuestRow);
  const byId: Record<string, QuestRecord> = {};
  normalized.forEach((quest) => {
    byId[quest.id] = quest;
  });

  const roots: QuestRecord[] = [];
  normalized.forEach((quest) => {
    if (!quest.parent_id) {
      roots.push(quest);
      return;
    }

    const parent = byId[quest.parent_id];
    if (parent) {
      parent.children.push(quest);
    }
  });

  return {
    flat: normalized,
    roots,
    byId
  };
}

export async function fetchQuestAssets(
  supabase: SupabaseClient,
  questId: string
): Promise<AssetSummary[]> {
  if (!questId) {
    return [];
  }

  const { data, error } = await supabase
    .from('quest_asset_link')
    .select(
      `
      asset:asset_id (
        id,
        name,
        active,
        order_index,
        metadata,
        created_at,
        last_updated,
        images,
        content:asset_content_link(id, text, audio),
        tags:asset_tag_link(tag(id, key, value)),
        translations:asset!source_asset_id(count)
      )
    `
    )
    .eq('quest_id', questId)
    .is('asset.source_asset_id', null)
    .order('order_index', { ascending: true, referencedTable: 'asset' })
    .order('created_at', { ascending: true, referencedTable: 'asset' });

  if (error) {
    throw error;
  }

  const mappedAssets: Array<AssetSummary | null> = (data || []).map(
    (item: any) => {
      const value = item?.asset;
      const asset = Array.isArray(value) ? value[0] : value;
      if (!asset) return null;

      return {
        id: asset.id,
        name: asset.name,
        active: asset.active,
        order_index: asset.order_index ?? null,
        metadata: parseMetadata(asset.metadata),
        created_at: asset.created_at,
        last_updated: asset.last_updated,
        images: asset.images,
        content: asset.content || [],
        tags: (asset.tags || []).map((tagLink: any) => ({
          tag: Array.isArray(tagLink?.tag) ? tagLink.tag[0] : tagLink?.tag
        })),
        translations: asset.translations || []
      };
    }
  );

  const assets = mappedAssets.filter(
    (asset): asset is AssetSummary => !!asset && !!asset.active
  );

  return assets.sort((a, b) => {
    const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    const aCreated = new Date(a.created_at).getTime();
    const bCreated = new Date(b.created_at).getTime();
    return aCreated - bCreated;
  });
}

export async function fetchAssetDetails(
  supabase: SupabaseClient,
  assetId: string
): Promise<AssetDetails | null> {
  if (!assetId) {
    return null;
  }

  const { data: assets, error } = await supabase
    .from('asset')
    .select(
      `
      id,
      name,
      images,
      content:asset_content_link(id, audio, text),
      tags:asset_tag_link(tag(id, key, value)),
      quests:quest_asset_link(quest(id, name, description, project(id, name, description), tags:quest_tag_link(tag(id, key, value))))
    `
    )
    .eq('id', assetId);

  if (error) {
    throw error;
  }

  if (!assets || assets.length === 0) {
    return null;
  }

  const rawAsset = assets[0] as any;
  const baseAsset: Omit<AssetDetails, 'translations'> = {
    id: rawAsset.id,
    name: rawAsset.name,
    images: rawAsset.images || [],
    content: rawAsset.content || [],
    tags: (rawAsset.tags || []).map((tagLink: any) => ({
      tag: Array.isArray(tagLink?.tag) ? tagLink.tag[0] : tagLink?.tag
    })),
    quests: (rawAsset.quests || []).map((questLink: any) => ({
      quest: Array.isArray(questLink?.quest)
        ? questLink.quest[0]
        : questLink?.quest
    }))
  };

  const { data: translations, error: translationsError } = await supabase
    .from('asset')
    .select(
      `
      id,
      content:asset_content_link(id, text, audio),
      votes:vote!asset_id(id, polarity, creator_id)
    `
    )
    .eq('source_asset_id', baseAsset.id)
    .eq('vote.active', true);

  if (translationsError) {
    throw translationsError;
  }

  return {
    ...baseAsset,
    translations: ((translations || []) as any[]).map((translation) => ({
      id: translation.id,
      content: translation.content || [],
      votes: (translation.votes || []).map((vote: any) => ({
        id: vote.id,
        polarity: vote.polarity,
        creator_id: vote.creator_id
      }))
    }))
  };
}

interface CreateBibleChapterParams {
  projectId: string;
  userId?: string;
  bookId: string;
  bookName: string;
  chapterNumber: number;
  verseCount: number;
  existingBookQuestId?: string | null;
}

export interface CreateBibleChapterResult {
  bookQuestId: string;
  chapterQuestId: string;
}

export async function createBibleChapterQuest(
  supabase: SupabaseClient,
  params: CreateBibleChapterParams
): Promise<CreateBibleChapterResult> {
  const {
    projectId,
    userId,
    bookId,
    bookName,
    chapterNumber,
    verseCount,
    existingBookQuestId
  } = params;

  let bookQuestId = existingBookQuestId || '';

  if (!bookQuestId) {
    const { data: bookQuest, error: bookError } = await supabase
      .from('quest')
      .insert({
        name: bookName,
        description: null,
        project_id: projectId,
        parent_id: null,
        metadata: {
          bible: {
            book: bookId
          }
        },
        creator_id: userId
      })
      .select()
      .single();

    if (bookError) {
      throw bookError;
    }

    bookQuestId = bookQuest.id as string;
  }

  const { data: chapterQuest, error: chapterError } = await supabase
    .from('quest')
    .insert({
      name: `${bookName} ${chapterNumber}`,
      description: `${verseCount} verses`,
      project_id: projectId,
      parent_id: bookQuestId,
      metadata: {
        bible: {
          book: bookId,
          chapter: chapterNumber
        }
      },
      creator_id: userId
    })
    .select()
    .single();

  if (chapterError) {
    throw chapterError;
  }

  return {
    bookQuestId,
    chapterQuestId: chapterQuest.id as string
  };
}

export interface CreateFiaPericopeParams {
  projectId: string;
  userId?: string;
  bookId: string;
  bookName: string;
  pericopeId: string;
  sequence: number;
  verseRange: string;
  existingBookQuestId?: string | null;
}

export interface CreateFiaPericopeResult {
  bookQuestId: string;
  pericopeQuestId: string;
}

export async function createFiaPericopeQuest(
  supabase: SupabaseClient,
  params: CreateFiaPericopeParams
): Promise<CreateFiaPericopeResult> {
  const {
    projectId,
    userId,
    bookId,
    bookName,
    pericopeId,
    sequence,
    verseRange,
    existingBookQuestId
  } = params;

  let bookQuestId = existingBookQuestId || '';

  if (!bookQuestId) {
    const { data: bookQuest, error: bookError } = await supabase
      .from('quest')
      .insert({
        name: bookName,
        description: null,
        project_id: projectId,
        parent_id: null,
        metadata: {
          fia: {
            bookId
          }
        },
        creator_id: userId
      })
      .select()
      .single();

    if (bookError) {
      throw bookError;
    }

    bookQuestId = bookQuest.id as string;
  }

  const { data: pericopeQuest, error: pericopeError } = await supabase
    .from('quest')
    .insert({
      name: `${bookName} ${verseRange}`,
      description: verseRange,
      project_id: projectId,
      parent_id: bookQuestId,
      metadata: {
        fia: {
          bookId,
          pericopeId,
          verseRange
        }
      },
      creator_id: userId
    })
    .select()
    .single();

  if (pericopeError) {
    throw pericopeError;
  }

  return {
    bookQuestId,
    pericopeQuestId: pericopeQuest.id as string
  };
}

export interface SourceQuestVersion {
  id: string;
  name: string | null;
  versionLabel: string;
  createdAt: string;
  authorInitials: string;
  authorName: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CompatibleSourceQuestsResult {
  template: string | null;
  versions: SourceQuestVersion[];
}

function getQuestVersionLabelFromMetadata(
  metadata: Record<string, unknown> | null
): string {
  const value = metadata?.versionName;
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return 'Unnamed version';
}

function getAuthorInitials(username: string | null | undefined): string {
  if (!username?.trim()) {
    return '?';
  }

  const words = username
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return words[0].slice(0, 2).toUpperCase();
}

function getCompatibleQuestMatchKey(
  template: string | null,
  metadata: Record<string, unknown> | null
): string | null {
  if (!metadata) {
    return null;
  }

  if (template === 'fia') {
    const fia = metadata.fia as
      | { bookId?: string; pericopeId?: string }
      | undefined;
    if (!fia?.bookId || !fia?.pericopeId) {
      return null;
    }

    return `fia:${fia.bookId}:${fia.pericopeId}`;
  }

  if (template === 'bible') {
    const bible = metadata.bible as
      | { book?: string; chapter?: number | string }
      | undefined;
    if (!bible?.book || bible.chapter == null || bible.chapter === '') {
      return null;
    }

    const chapter = Number(bible.chapter);
    if (!Number.isFinite(chapter)) {
      return null;
    }

    return `bible:${bible.book}:${chapter}`;
  }

  return null;
}

export async function fetchCompatibleSourceQuests(
  supabase: SupabaseClient,
  projectId: string,
  questId: string
): Promise<CompatibleSourceQuestsResult> {
  const [currentQuestResult, projectResult, questsResult] = await Promise.all([
    supabase.from('quest').select('id, metadata').eq('id', questId).single(),
    supabase.from('project').select('template').eq('id', projectId).single(),
    supabase
      .from('quest')
      .select('id, name, metadata, created_at, creator_id')
      .eq('project_id', projectId)
      .eq('active', true)
      .neq('id', questId)
      .order('created_at', { ascending: false })
  ]);

  if (currentQuestResult.error) {
    throw currentQuestResult.error;
  }

  if (projectResult.error) {
    throw projectResult.error;
  }

  if (questsResult.error) {
    throw questsResult.error;
  }

  const template = (projectResult.data?.template as string | null) || null;
  const currentMatchKey = getCompatibleQuestMatchKey(
    template,
    parseMetadata(currentQuestResult.data?.metadata)
  );

  if (!currentMatchKey) {
    return {
      template,
      versions: []
    };
  }

  const compatibleQuests = ((questsResult.data || []) as Array<{
    id: string;
    name: string | null;
    metadata: unknown;
    created_at: string;
    creator_id: string | null;
  }>).filter((quest) => {
    const matchKey = getCompatibleQuestMatchKey(
      template,
      parseMetadata(quest.metadata)
    );
    return matchKey === currentMatchKey;
  });

  const creatorIds = [
    ...new Set(
      compatibleQuests
        .map((quest) => quest.creator_id)
        .filter((id): id is string => !!id)
    )
  ];

  const usernameById = new Map<string, string | null>();
  if (creatorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profile')
      .select('id, username')
      .in('id', creatorIds);

    if (profilesError) {
      throw profilesError;
    }

    ((profiles || []) as Array<{ id: string; username: string | null }>).forEach(
      (profile) => {
        usernameById.set(profile.id, profile.username);
      }
    );
  }

  return {
    template,
    versions: compatibleQuests.map((quest) => {
      const metadata = parseMetadata(quest.metadata);
      const authorName = quest.creator_id
        ? (usernameById.get(quest.creator_id) ?? null)
        : null;

      return {
        id: quest.id,
        name: quest.name,
        versionLabel: getQuestVersionLabelFromMetadata(metadata),
        createdAt: quest.created_at,
        authorInitials: getAuthorInitials(authorName),
        authorName,
        metadata
      };
    })
  };
}
