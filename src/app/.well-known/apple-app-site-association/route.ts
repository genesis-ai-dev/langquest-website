import { env } from '@/lib/env';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  const qualifiedIds = env.APP_IDS.map((id) => `${env.TEAM_ID}.${id}`);
  const paths = ['/*/reset-password', '/*/registration-confirmation'];

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: qualifiedIds,
            components: [
              {
                '/': '/*/reset-password',
                comment: 'Locale-prefixed reset-password'
              },
              {
                '/': '/*/registration-confirmation',
                comment: 'Locale-prefixed registration confirmation'
              }
            ]
          },
          ...qualifiedIds.map((appID) => ({ appID, paths }))
        ]
      },
      activitycontinuation: { apps: qualifiedIds },
      webcredentials: { apps: qualifiedIds }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    }
  );
}
