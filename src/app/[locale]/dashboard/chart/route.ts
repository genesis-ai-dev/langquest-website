import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

type BreakdownItem = {
  id: number;
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

const PROJECTS = [
  { id: 1, name: 'prj 01' },
  { id: 2, name: 'prj 02' },
  { id: 3, name: 'prj 03' }
];

const MEMBERS = [
  { id: 1, name: 'John Cena' },
  { id: 2, name: 'Peter Quill' },
  { id: 3, name: 'Natasha Romanoff' }
];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  timeZone: 'UTC'
});

function splitTotal(
  total: number,
  entities: Array<{ id: number; name: string }>,
  seed: number
): BreakdownItem[] {
  const quantities = entities.map(() => 0);

  for (let index = 0; index < total; index += 1) {
    const entityIndex = (seed + index * 7 + Math.floor(index / 2)) % entities.length;
    quantities[entityIndex] += 1;
  }

  return entities.map((entity, index) => ({
    ...entity,
    qty: quantities[index]
  }));
}

function buildDailyRecord(currentDate: Date, dayIndex: number): DailyChartRecord {
  const quests = 1 + ((dayIndex * 3) % 6);
  const assets = 8 + ((dayIndex * 5) % 16);

  return {
    date: dateFormatter.format(currentDate),
    quests,
    assets,
    details: {
      quests: {
        project: splitTotal(quests, PROJECTS, dayIndex + 1),
        member: splitTotal(quests, MEMBERS, dayIndex + 11)
      },
      assets: {
        project: splitTotal(assets, PROJECTS, dayIndex + 21),
        member: splitTotal(assets, MEMBERS, dayIndex + 31)
      }
    }
  };
}

/**
 * GET /[locale]/dashboard/chart?days=45
 * Mocked daily chart data with quest/asset breakdown by project and member.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const accessToken = authHeader.substring(7);
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

  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? 45);
  const days = Number.isFinite(daysParam)
    ? Math.min(90, Math.max(1, Math.trunc(daysParam)))
    : 45;

  const startDate = new Date('2026-02-01T00:00:00Z');
  const data = Array.from({ length: days }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setUTCDate(startDate.getUTCDate() + index);
    return buildDailyRecord(currentDate, index);
  });

  return NextResponse.json({
    mocked: true,
    range_days: days,
    data
  });
}
