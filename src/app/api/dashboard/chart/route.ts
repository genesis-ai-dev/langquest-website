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

type RpcChartRow = {
  date: string | null;
  quests: number | null;
  assets: number | null;
  quests_project: unknown;
  quests_member: unknown;
  assets_project: unknown;
  assets_member: unknown;
};

const CHART_CACHE_CONTROL = 'private, max-age=300, stale-while-revalidate=300';
const asNumber = (value: number | null | undefined) => value ?? 0;

const chartJsonResponse = <T>(payload: T, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': CHART_CACHE_CONTROL,
      Vary: 'Authorization'
    }
  });

function normalizeBreakdown(value: unknown): BreakdownItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const id =
        'id' in item && typeof item.id === 'string' ? item.id : 'unknown';
      const name =
        'name' in item && typeof item.name === 'string' ? item.name : 'Unknown';
      const qty =
        'qty' in item && typeof item.qty === 'number' && Number.isFinite(item.qty)
          ? item.qty
          : 0;

      return { id, name, qty };
    })
    .filter((item): item is BreakdownItem => item !== null);
}

export async function GET(request: NextRequest) {
  const nowIso = new Date().toISOString();
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
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
    return NextResponse.json(
      { error: 'Invalid authentication token' },
      { status: 401 }
    );
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const projectIdParam = request.nextUrl.searchParams.get('project_id');
  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? 360);
  const days = Number.isFinite(daysParam)
    ? Math.max(1, Math.trunc(daysParam))
    : 360;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'rpc_dashboard_chart_by_profile',
    {
      p_profile_id: user.id,
      p_days: days,
      p_project_id: projectIdParam
    }
  );

  if (rpcError) {
    console.error('dashboard chart route rpc error:', rpcError);
    return NextResponse.json(
      { error: 'Failed to load chart source data' },
      { status: 500 }
    );
  }

  const data: DailyChartRecord[] = ((rpcData ?? []) as RpcChartRow[])
    .filter((row) => typeof row.date === 'string' && row.date.length > 0)
    .map((row) => {
      const date = row.date as string;

    return {
      date,
      quests: asNumber(row.quests),
      assets: asNumber(row.assets),
      details: {
        quests: {
          project: normalizeBreakdown(row.quests_project),
          member: normalizeBreakdown(row.quests_member)
        },
        assets: {
          project: normalizeBreakdown(row.assets_project),
          member: normalizeBreakdown(row.assets_member)
        }
      }
    };
  });

  console.log('dashboard chart route details before send:', {
    profile_id: user.id,
    project_id: projectIdParam,
    requested_days: days,
    range_days: data.length,
    details: data.map((day) => ({ date: day.date, details: day.details }))
  });

  return chartJsonResponse({
    mocked: false,
    range_days: data.length,
    last_updated_at: nowIso,
    data
  });
}
