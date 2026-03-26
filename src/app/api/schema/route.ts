import { env } from '@/lib/env';
import { SupabaseEnvironment } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

function getServiceRoleCredentials(environment: SupabaseEnvironment) {
  switch (environment) {
    case 'development':
      return {
        url: 'http://localhost:54321',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
      };
    case 'preview':
      return {
        url: env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL,
        key:
          env.SUPABASE_PREVIEW_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
      };
    case 'production':
    default:
      return {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        key: env.SUPABASE_SERVICE_ROLE_KEY
      };
  }
}

export async function GET(request: NextRequest) {
  try {
    const environment = (request.nextUrl.searchParams.get('environment') ??
      'production') as SupabaseEnvironment;

    const { url, key } = getServiceRoleCredentials(environment);

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
