import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

type BreakdownItem = {
  id: string;
  name: string;
  qty: number;
};

type DailyDetails = {
  quests: {
    project: BreakdownItem[];
    member: BreakdownItem[];
  };
  assets: {
    project: BreakdownItem[];
    member: BreakdownItem[];
  };
};

type DailyChartRecord = {
  date: string;
  quests: number;
  assets: number;
  details: DailyDetails;
};

type ProjectRow = { id: string; name: string };
type ProfileRow = { id: string; username: string | null };
type QuestRow = {
  project_id: string;
  creator_id: string | null;
  last_updated: string;
};
type AssetRow = {
  project_id: string;
  creator_id: string | null;
  last_updated: string;
};

type DailyAccumulator = {
  quests: number;
  assets: number;
  details: {
    quests: { project: Map<string, BreakdownItem>; member: Map<string, BreakdownItem> };
    assets: { project: Map<string, BreakdownItem>; member: Map<string, BreakdownItem> };
  };
};

const UNKNOWN_MEMBER_ID = 'unknown-member';
const UNKNOWN_MEMBER_NAME = 'Unknown member';
const UNKNOWN_PROJECT_NAME = 'Unknown project';

const toDateLabel = (isoDateTime: string) => {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const upsertBreakdownItem = (
  map: Map<string, BreakdownItem>,
  id: string,
  name: string
) => {
  const existing = map.get(id);
  if (existing) {
    existing.qty += 1;
    return;
  }
  map.set(id, { id, name, qty: 1 });
};

const mapToSortedArray = (map: Map<string, BreakdownItem>) =>
  [...map.values()].sort((a, b) => a.name.localeCompare(b.name));

const createEmptyAccumulator = (): DailyAccumulator => ({
  quests: 0,
  assets: 0,
  details: {
    quests: { project: new Map(), member: new Map() },
    assets: { project: new Map(), member: new Map() }
  }
});

export async function GET(request: NextRequest) {
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
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const projectIdParam = request.nextUrl.searchParams.get('project_id');
  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? 45);
  const days = Number.isFinite(daysParam)
    ? Math.min(180, Math.max(1, Math.trunc(daysParam)))
    : 45;

  let projectIds: string[] = [];
  if (projectIdParam) {
    projectIds = [projectIdParam];
  } else {
    const { data: ownerLinks, error: linksError } = await supabase
      .from('profile_project_link')
      .select('project_id')
      .eq('profile_id', user.id)
      .eq('active', true)
      .eq('membership', 'owner');

    if (linksError) {
      console.error('dashboard chart route owner-links error:', linksError);
      return NextResponse.json({ error: 'Failed to load owner projects' }, { status: 500 });
    }
    projectIds = [...new Set((ownerLinks ?? []).map((link) => link.project_id))];
  }

  if (!projectIds.length) {
    return NextResponse.json({ mocked: false, range_days: 0, data: [] as DailyChartRecord[] });
  }

  const [{ data: projects, error: projectsError }, { data: quests, error: questsError }, { data: assets, error: assetsError }] =
    await Promise.all([
      supabase.from('project').select('id,name').in('id', projectIds),
      supabase
        .from('quest')
        .select('project_id,creator_id,last_updated')
        .in('project_id', projectIds)
        .eq('active', true),
      supabase
        .from('asset')
        .select('project_id,creator_id,last_updated')
        .in('project_id', projectIds)
        .eq('active', true)
    ]);

  if (projectsError || questsError || assetsError) {
    console.error('dashboard chart route base-query error:', {
      projectsError,
      questsError,
      assetsError
    });
    return NextResponse.json({ error: 'Failed to load chart source data' }, { status: 500 });
  }

  const projectNameById = new Map(
    ((projects ?? []) as ProjectRow[]).map((project) => [
      project.id,
      project.name || UNKNOWN_PROJECT_NAME
    ])
  );

  const creatorIds = new Set<string>();
  ((quests ?? []) as QuestRow[]).forEach((row) => row.creator_id && creatorIds.add(row.creator_id));
  ((assets ?? []) as AssetRow[]).forEach((row) => row.creator_id && creatorIds.add(row.creator_id));

  let profileNameById = new Map<string, string>();
  if (creatorIds.size) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profile')
      .select('id,username')
      .in('id', [...creatorIds]);

    if (profilesError) {
      console.error('dashboard chart route profile-query error:', profilesError);
      return NextResponse.json({ error: 'Failed to load profile names' }, { status: 500 });
    }

    profileNameById = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [
        profile.id,
        profile.username || `Member ${profile.id.slice(0, 8)}`
      ])
    );
  }

  const byDate = new Map<string, DailyAccumulator>();

  ((quests ?? []) as QuestRow[]).forEach((quest) => {
    const dateLabel = toDateLabel(quest.last_updated);
    if (!dateLabel) return;
    const current = byDate.get(dateLabel) ?? createEmptyAccumulator();
    current.quests += 1;

    upsertBreakdownItem(
      current.details.quests.project,
      quest.project_id,
      projectNameById.get(quest.project_id) ?? UNKNOWN_PROJECT_NAME
    );

    const memberId = quest.creator_id ?? UNKNOWN_MEMBER_ID;
    const memberName = quest.creator_id
      ? profileNameById.get(quest.creator_id) ?? `Member ${quest.creator_id.slice(0, 8)}`
      : UNKNOWN_MEMBER_NAME;
    upsertBreakdownItem(current.details.quests.member, memberId, memberName);
    byDate.set(dateLabel, current);
  });

  ((assets ?? []) as AssetRow[]).forEach((asset) => {
    const dateLabel = toDateLabel(asset.last_updated);
    if (!dateLabel) return;
    const current = byDate.get(dateLabel) ?? createEmptyAccumulator();
    current.assets += 1;

    upsertBreakdownItem(
      current.details.assets.project,
      asset.project_id,
      projectNameById.get(asset.project_id) ?? UNKNOWN_PROJECT_NAME
    );

    const memberId = asset.creator_id ?? UNKNOWN_MEMBER_ID;
    const memberName = asset.creator_id
      ? profileNameById.get(asset.creator_id) ?? `Member ${asset.creator_id.slice(0, 8)}`
      : UNKNOWN_MEMBER_NAME;
    upsertBreakdownItem(current.details.assets.member, memberId, memberName);
    byDate.set(dateLabel, current);
  });

  const orderedDates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
  const limitedDates =
    orderedDates.length > days ? orderedDates.slice(orderedDates.length - days) : orderedDates;

  const data: DailyChartRecord[] = limitedDates.map((date) => {
    const day = byDate.get(date) ?? createEmptyAccumulator();
    return {
      date,
      quests: day.quests,
      assets: day.assets,
      details: {
        quests: {
          project: mapToSortedArray(day.details.quests.project),
          member: mapToSortedArray(day.details.quests.member)
        },
        assets: {
          project: mapToSortedArray(day.details.assets.project),
          member: mapToSortedArray(day.details.assets.member)
        }
      }
    };
  });

  return NextResponse.json({ mocked: false, range_days: data.length, data });
}
