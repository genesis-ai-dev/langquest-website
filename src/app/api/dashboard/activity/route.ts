import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

type ProjectRow = {
  id: string;
  name: string | null;
  creator_id?: string | null;
  last_updated?: string | null;
};

type AssetRow = {
  id: string;
  project_id: string;
  creator_id: string | null;
  last_updated: string;
};

type QuestRow = {
  id: string;
  name: string | null;
  project_id: string;
  creator_id: string | null;
  last_updated: string;
};

type MemberLinkRow = {
  project_id: string;
  profile_id: string;
  membership: string | null;
  last_updated: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

type AssetQuestLinkRow = {
  asset_id: string;
  quest:
    | {
        id: string;
        name: string | null;
        project_id: string | null;
      }
    | Array<{
        id: string;
        name: string | null;
        project_id: string | null;
      }>
    | null;
};

type ActivityUser = {
  id: string;
  name: string;
};

type RecentActivityItem = {
  project_id: string;
  project_name: string;
  description: string;
  user: ActivityUser;
  date_time: string;
  source: 'asset' | 'quest' | 'member' | 'project';
};

const MAX_PER_TABLE = 30;
const MAX_TOTAL = 30;
const WINDOW_DAYS = 30;
const UNKNOWN_USER_ID = 'unknown-user';
const UNKNOWN_USER_NAME = 'Unknown user';
const UNKNOWN_PROJECT_NAME = 'Unknown project';
const UNKNOWN_QUEST_NAME = 'Unknown quest';

const safeDate = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoOrNull = (value: string | null | undefined) => {
  const parsed = safeDate(value);
  return parsed ? parsed.toISOString() : null;
};

const toActivityUser = (id: string | null | undefined, profileNameById: Map<string, string>) => {
  if (!id) return { id: UNKNOWN_USER_ID, name: UNKNOWN_USER_NAME };
  return {
    id,
    name: profileNameById.get(id) ?? `Member ${id.slice(0, 8)}`
  };
};

const unwrapQuest = (quest: AssetQuestLinkRow['quest']) =>
  Array.isArray(quest) ? (quest[0] ?? null) : quest;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);
    const supabaseAuth = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const {
      data: { user },
      error: authError
    } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    const projectIdParam = request.nextUrl.searchParams.get('project_id');

    const { data: ownerLinks, error: linksError } = await supabase
      .from('profile_project_link')
      .select('project_id')
      .eq('profile_id', user.id)
      .eq('active', true)
      .eq('membership', 'owner');

    if (linksError) {
      console.error('dashboard activity route owner-links error:', linksError);
      return NextResponse.json({ error: 'Failed to load owner projects' }, { status: 500 });
    }

    const ownerProjectIds = new Set(
      (ownerLinks ?? []).map((link: { project_id: string }) => link.project_id)
    );

    if (projectIdParam && !ownerProjectIds.has(projectIdParam)) {
      return NextResponse.json(
        { error: 'You do not have access to this project activities' },
        { status: 403 }
      );
    }

    const projectIds = projectIdParam
      ? [projectIdParam]
      : [...ownerProjectIds];

    if (!projectIds.length) {
      return NextResponse.json({
        window_days: WINDOW_DAYS,
        per_table_limit: MAX_PER_TABLE,
        total_limit: MAX_TOTAL,
        data: [] as RecentActivityItem[]
      });
    }

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - WINDOW_DAYS);
    const sinceIso = since.toISOString();

    const [{ data: projects, error: projectsError }, { data: assets, error: assetsError }, { data: quests, error: questsError }, { data: members, error: membersError }] =
      await Promise.all([
        supabase
          .from('project')
          .select('id,name,creator_id,last_updated')
          .in('id', projectIds),
        supabase
          .from('asset')
          .select('id,project_id,creator_id,last_updated')
          .in('project_id', projectIds)
          .eq('active', true)
          .gte('last_updated', sinceIso)
          .order('last_updated', { ascending: false })
          .limit(MAX_PER_TABLE),
        supabase
          .from('quest')
          .select('id,name,project_id,creator_id,last_updated')
          .in('project_id', projectIds)
          .eq('active', true)
          .gte('last_updated', sinceIso)
          .order('last_updated', { ascending: false })
          .limit(MAX_PER_TABLE),
        supabase
          .from('profile_project_link')
          .select('project_id,profile_id,membership,last_updated')
          .in('project_id', projectIds)
          .eq('active', true)
          .gte('last_updated', sinceIso)
          .order('last_updated', { ascending: false })
          .limit(MAX_PER_TABLE)
      ]);

    if (projectsError || assetsError || questsError || membersError) {
      console.error('dashboard activity route base-query error:', {
        projectsError,
        assetsError,
        questsError,
        membersError
      });
      return NextResponse.json(
        { error: 'Failed to load activity source data' },
        { status: 500 }
      );
    }

    const typedProjects = (projects ?? []) as ProjectRow[];
    const typedAssets = (assets ?? []) as AssetRow[];
    const typedQuests = (quests ?? []) as QuestRow[];
    const typedMembers = (members ?? []) as MemberLinkRow[];

    const projectNameById = new Map(
      typedProjects.map((project) => [
        project.id,
        project.name || UNKNOWN_PROJECT_NAME
      ])
    );

    const assetIds = typedAssets.map((asset) => asset.id);
    let assetQuestLinks: AssetQuestLinkRow[] = [];
    if (assetIds.length) {
      const { data: links, error: assetQuestLinksError } = await supabase
        .from('quest_asset_link')
        .select('asset_id,quest:quest_id(id,name,project_id)')
        .in('asset_id', assetIds);

      if (assetQuestLinksError) {
        console.error(
          'dashboard activity route asset-quest-links query error:',
          assetQuestLinksError
        );
        return NextResponse.json(
          { error: 'Failed to load asset quest links' },
          { status: 500 }
        );
      }

      assetQuestLinks = (links ?? []) as AssetQuestLinkRow[];
    }

    const assetById = new Map(typedAssets.map((asset) => [asset.id, asset]));
    const profileIds = new Set<string>();

    typedAssets.forEach((row) => row.creator_id && profileIds.add(row.creator_id));
    typedQuests.forEach((row) => row.creator_id && profileIds.add(row.creator_id));
    typedProjects.forEach((row) => row.creator_id && profileIds.add(row.creator_id));
    typedMembers.forEach((row) => row.profile_id && profileIds.add(row.profile_id));

    let profileNameById = new Map<string, string>();
    if (profileIds.size) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profile')
        .select('id,username')
        .in('id', [...profileIds]);

      if (profilesError) {
        console.error('dashboard activity route profiles query error:', profilesError);
        return NextResponse.json(
          { error: 'Failed to load profile names' },
          { status: 500 }
        );
      }

      profileNameById = new Map(
        ((profiles ?? []) as ProfileRow[]).map((profile) => [
          profile.id,
          profile.username || `Member ${profile.id.slice(0, 8)}`
        ])
      );
    }

    const assetGroupedMap = new Map<
      string,
      {
        project_id: string;
        project_name: string;
        quest_name: string;
        user: ActivityUser;
        date_time: string;
        count: number;
      }
    >();

    assetQuestLinks.forEach((link) => {
      const asset = assetById.get(link.asset_id);
      if (!asset) return;
      const quest = unwrapQuest(link.quest);

      const projectId = asset.project_id;
      const projectName = projectNameById.get(projectId) ?? UNKNOWN_PROJECT_NAME;
      const questId = quest?.id ?? 'unknown-quest';
      const questName = quest?.name || UNKNOWN_QUEST_NAME;
      const userInfo = toActivityUser(asset.creator_id, profileNameById);
      const dateTime = toIsoOrNull(asset.last_updated);
      if (!dateTime) return;

      const key = `${projectId}::${userInfo.id}::${questId}`;
      const previous = assetGroupedMap.get(key);
      if (!previous) {
        assetGroupedMap.set(key, {
          project_id: projectId,
          project_name: projectName,
          quest_name: questName,
          user: userInfo,
          date_time: dateTime,
          count: 1
        });
        return;
      }

      previous.count += 1;
      if (new Date(dateTime) > new Date(previous.date_time)) {
        previous.date_time = dateTime;
      }
    });

    const assetActivities: RecentActivityItem[] = [...assetGroupedMap.values()].map(
      (row) => ({
        project_id: row.project_id,
        project_name: row.project_name,
        description: `Added ${row.count} asset${row.count === 1 ? '' : 's'} to quest "${row.quest_name}"`,
        user: row.user,
        date_time: row.date_time,
        source: 'asset' as const
      })
    )
      .sort(
        (a, b) =>
          new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
      )
      .slice(0, MAX_PER_TABLE);

    const questActivities: RecentActivityItem[] = typedQuests
      .map((quest) => {
        const dateTime = toIsoOrNull(quest.last_updated);
        if (!dateTime) return null;
        return {
          project_id: quest.project_id,
          project_name:
            projectNameById.get(quest.project_id) ?? UNKNOWN_PROJECT_NAME,
          description: `New quest "${quest.name || UNKNOWN_QUEST_NAME}" created`,
          user: toActivityUser(quest.creator_id, profileNameById),
          date_time: dateTime,
          source: 'quest'
        } as RecentActivityItem;
      })
      .filter((item): item is RecentActivityItem => !!item);

    const memberActivities: RecentActivityItem[] = typedMembers
      .map((memberLink) => {
        const dateTime = toIsoOrNull(memberLink.last_updated);
        if (!dateTime) return null;
        const membershipLabel = memberLink.membership
          ? ` (${memberLink.membership})`
          : '';
        return {
          project_id: memberLink.project_id,
          project_name:
            projectNameById.get(memberLink.project_id) ?? UNKNOWN_PROJECT_NAME,
          description: `New member added${membershipLabel}`,
          user: toActivityUser(memberLink.profile_id, profileNameById),
          date_time: dateTime,
          source: 'member'
        } as RecentActivityItem;
      })
      .filter((item): item is RecentActivityItem => !!item);

    const projectActivities: RecentActivityItem[] = typedProjects
      .map((project) => {
        const dateTime = toIsoOrNull(project.last_updated);
        if (!dateTime || new Date(dateTime) < since) return null;
        return {
          project_id: project.id,
          project_name: project.name || UNKNOWN_PROJECT_NAME,
          description: `New project "${project.name || UNKNOWN_PROJECT_NAME}" created`,
          user: toActivityUser(project.creator_id, profileNameById),
          date_time: dateTime,
          source: 'project'
        } as RecentActivityItem;
      })
      .filter((item): item is RecentActivityItem => !!item)
      .slice(0, MAX_PER_TABLE);

    const orderedActivities = [
      ...assetActivities,
      ...questActivities,
      ...memberActivities,
      ...projectActivities
    ]
      .sort(
        (a, b) =>
          new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
      )
      .slice(0, MAX_TOTAL);

    return NextResponse.json({
      window_days: WINDOW_DAYS,
      per_table_limit: MAX_PER_TABLE,
      total_limit: MAX_TOTAL,
      data: orderedActivities
    });
  } catch (error) {
    console.error('dashboard activity route error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
