import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

interface FiaPericopesRequestBody {
  fiaLanguageCode?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FiaPericopesRequestBody;
    const fiaLanguageCode = body?.fiaLanguageCode?.trim();

    if (!fiaLanguageCode) {
      return NextResponse.json(
        { error: 'fiaLanguageCode is required' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fia-pericopes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader
        },
        body: JSON.stringify({ fiaLanguageCode })
      }
    );

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch FIA pericopes',
          details: data
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
