import { env } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

function getServiceRoleCredentials() {
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY
  };
}

export async function GET(request: NextRequest) {
  try {
    const { url, key } = getServiceRoleCredentials();

    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch schema from Supabase' },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/openapi+json')) {
      return NextResponse.json(
        { error: 'Invalid content type from Supabase' },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching schema:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
